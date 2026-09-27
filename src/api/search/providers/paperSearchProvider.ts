import { Paper } from '../../../types';
import { parseReferenceInput } from '../../paper/inputParser';
import { defaultPaperResolver } from '../../paper/metadataResolver';

/**
 * Searches academic literature across Semantic Scholar, Europe PMC, arXiv, and Crossref
 */
export async function searchPapers(query: string, limit = 15): Promise<Paper[]> {
  const cleanQ = query.trim();
  if (!cleanQ) return [];

  // 1. Check if exact reference (DOI, arXiv, URL, PMID)
  const parsed = parseReferenceInput(cleanQ);
  if (parsed.type !== 'generic_url' || parsed.doi || parsed.arxivId || parsed.pmid) {
    try {
      const res = await defaultPaperResolver.resolve(cleanQ);
      if (res.paper) {
        return [res.paper];
      }
    } catch {}
  }

  // 2. Parallel keyword search across Europe PMC and Semantic Scholar
  const results: Paper[] = [];
  const seenDois = new Set<string>();
  const seenTitles = new Set<string>();

  const addPaper = (paper: Paper) => {
    const titleKey = paper.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const doiKey = paper.doi ? paper.doi.toLowerCase() : '';

    if (doiKey && seenDois.has(doiKey)) return;
    if (seenTitles.has(titleKey)) return;

    if (doiKey) seenDois.add(doiKey);
    seenTitles.add(titleKey);
    results.push(paper);
  };

  try {
    const [epmcRes, s2Res] = await Promise.allSettled([
      searchEuropePmc(cleanQ, limit),
      searchSemanticScholar(cleanQ, limit),
    ]);

    if (epmcRes.status === 'fulfilled') {
      epmcRes.value.forEach(addPaper);
    }
    if (s2Res.status === 'fulfilled') {
      s2Res.value.forEach(addPaper);
    }
  } catch (err) {
    console.warn('[paperSearchProvider] Search error:', err);
  }

  return results.slice(0, limit);
}

/**
 * Europe PMC Search
 */
async function searchEuropePmc(query: string, limit: number): Promise<Paper[]> {
  try {
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(
      query
    )}&format=json&resultType=core&pageSize=${limit}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'BooffIn/1.0 (academic-search; dev@booffin.science)' },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const hits = data.resultList?.result || [];

    const papers: Paper[] = [];
    for (const item of hits) {
      if (!item.title) continue;

      const cleanTitle = item.title.replace(/<[^>]+>/g, '').replace(/\.$/, '').trim();
      const doi = item.doi;
      const isOpenAccess = item.isOpenAccess === 'Y' || Boolean(item.pmcid);
      const openAccessUrl = item.pmcid
        ? `https://europepmc.org/backend/ptpmcrender.fcgi?accid=${item.pmcid}&blobtype=pdf`
        : undefined;

      const authors = item.authorList?.author
        ? item.authorList.author.map((a: any, idx: number) => ({
            id: `a_${doi || item.id}_${idx}`,
            name: a.fullName || `${a.firstName || ''} ${a.lastName || ''}`.trim() || 'Author',
            affiliation: a.authorAffiliationDetailsList?.authorAffiliation?.[0]?.affiliation,
          }))
        : item.authorString
        ? item.authorString.split(',').map((name: string, idx: number) => ({
            id: `a_${doi || item.id}_${idx}`,
            name: name.trim(),
          }))
        : [{ id: 'a_0', name: 'Unknown Author' }];

      const journalName = item.journalTitle || item.journalInfo?.journal?.title || 'Scientific Publication';
      const year = item.pubYear ? parseInt(item.pubYear, 10) : new Date().getFullYear();
      const canonicalUrl = doi ? `https://doi.org/${doi}` : `https://europepmc.org/article/MED/${item.id || ''}`;

      papers.push({
        id: `paper_epmc_${item.id || doi || Date.now()}`,
        doi,
        title: cleanTitle,
        abstract: item.abstractText ? item.abstractText.replace(/<[^>]+>/g, '').trim() : 'Abstract available on canonical publisher website.',
        authors,
        journal: journalName,
        publisher: item.journalInfo?.journal?.publisher || 'Academic Publisher',
        publicationYear: year,
        publicationDate: item.firstPublicationDate || `${year}`,
        canonicalUrl,
        openAccessUrl,
        isOpenAccess,
        topics: item.keywordList?.keyword || [journalName],
        citationCount: item.citedByCount || 0,
        discussionCount: 0,
        likesCount: 0,
        savesCount: 0,
      });
    }

    return papers;
  } catch {
    return [];
  }
}

/**
 * Semantic Scholar Graph Search
 */
async function searchSemanticScholar(query: string, limit: number): Promise<Paper[]> {
  try {
    const fields = 'paperId,title,abstract,authors,year,venue,externalIds,openAccessPdf,citationCount';
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(
      query
    )}&limit=${limit}&fields=${fields}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'BooffIn/1.0 (academic-search; dev@booffin.science)' },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const hits = data.data || [];

    const papers: Paper[] = [];
    for (const item of hits) {
      if (!item.title) continue;

      const doi = item.externalIds?.DOI;
      const arxivId = item.externalIds?.ArXiv;
      const isOpenAccess = Boolean(item.openAccessPdf?.url || arxivId);
      const openAccessUrl = item.openAccessPdf?.url || (arxivId ? `https://arxiv.org/pdf/${arxivId}.pdf` : undefined);
      const canonicalUrl = doi
        ? `https://doi.org/${doi}`
        : arxivId
        ? `https://arxiv.org/abs/${arxivId}`
        : `https://www.semanticscholar.org/paper/${item.paperId}`;

      const authors = (item.authors || []).map((a: any, idx: number) => ({
        id: `a_s2_${a.authorId || idx}`,
        name: a.name || 'Author',
      }));

      const journalName = item.venue || (arxivId ? 'arXiv Preprint' : 'Academic Journal');
      const year = item.year || new Date().getFullYear();

      papers.push({
        id: `paper_s2_${item.paperId || doi || Date.now()}`,
        doi,
        title: item.title.trim(),
        abstract: item.abstract || 'Abstract available on canonical publisher website.',
        authors: authors.length > 0 ? authors : [{ id: 'a_0', name: 'Unknown Author' }],
        journal: journalName,
        publisher: journalName,
        publicationYear: year,
        publicationDate: `${year}`,
        canonicalUrl,
        openAccessUrl,
        isOpenAccess,
        topics: [journalName],
        citationCount: item.citationCount || 0,
        discussionCount: 0,
        likesCount: 0,
        savesCount: 0,
      });
    }

    return papers;
  } catch {
    return [];
  }
}
