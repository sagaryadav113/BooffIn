import { Paper } from '../../../types';
import { parseReferenceInput } from '../../paper/inputParser';
import { defaultPaperResolver } from '../../paper/metadataResolver';
import { parseScientificQuery, ParsedScientificQuery } from '../scientificQueryParser';
import { rankScientificPapers, deduplicatePapers } from '../scientificRanker';

/**
 * Fetch with retry on network failure (not on 4xx/5xx)
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit & { signal?: AbortSignal },
  retries = 2
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  throw new Error('fetch failed after retries');
}

/**
 * Searches academic literature across EuropePMC, Semantic Scholar, arXiv, and OpenAlex
 * — 4 sources in parallel for maximum recall, ranked by multi-factor scientific relevance.
 * Supports pagination via page parameter.
 */
export async function searchPapers(query: string, limit = 15, page = 1): Promise<Paper[]> {
  const cleanQ = query.trim();
  if (!cleanQ) return [];

  const parsedQuery = parseScientificQuery(cleanQ);

  // 1. Check if exact reference (DOI, arXiv ID, URL, PMID) on page 1 — resolve directly first
  if (page === 1) {
    const parsed = parseReferenceInput(cleanQ);
    if (parsed.doi || parsed.arxivId || parsed.pmid) {
      try {
        const res = await defaultPaperResolver.resolve(cleanQ);
        if (res.paper) {
          // Still do a broad search too, but put the exact match first
          const broadResults = await _broadKeywordSearch(parsedQuery, limit - 1, page);
          return deduplicatePapers([res.paper, ...broadResults]).slice(0, limit);
        }
      } catch {}
    }
  }

  // 2. Broad keyword search across all sources with scientific multi-factor ranking
  return _broadKeywordSearch(parsedQuery, limit, page);
}

async function _broadKeywordSearch(
  parsedQuery: ParsedScientificQuery,
  limit: number,
  page = 1
): Promise<Paper[]> {
  const perSource = Math.ceil(limit * 0.8); // fetch extra candidates to give ranker a strong pool

  const [epmcRes, s2Res, arxivRes, openAlexRes] = await Promise.allSettled([
    searchEuropePmc(parsedQuery.europePmcQuery, perSource, page),
    searchSemanticScholar(parsedQuery.semanticScholarQuery, perSource, page),
    searchArxiv(parsedQuery.arxivQuery, Math.min(perSource, 10), page),
    searchOpenAlex(parsedQuery.openAlexQuery, perSource, page),
  ]);

  const all: Paper[] = [];
  if (epmcRes.status === 'fulfilled') all.push(...epmcRes.value);
  if (s2Res.status === 'fulfilled') all.push(...s2Res.value);
  if (arxivRes.status === 'fulfilled') all.push(...arxivRes.value);
  if (openAlexRes.status === 'fulfilled') all.push(...openAlexRes.value);

  // Re-rank candidate papers mathematically using our scientific multi-factor scoring model
  return rankScientificPapers(all, parsedQuery).slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// Europe PMC
// ─────────────────────────────────────────────────────────────────────────────
async function searchEuropePmc(query: string, limit: number, page = 1): Promise<Paper[]> {
  try {
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(
      query
    )}&format=json&resultType=core&pageSize=${limit}&page=${page}`;

    const res = await fetchWithRetry(url, {
      headers: { 'User-Agent': 'BooffIn/1.0 (academic-search; dev@booffin.science)' },
      signal: AbortSignal.timeout(7000),
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
            id: `a_epmc_${doi || item.id}_${idx}`,
            name: a.fullName || `${a.firstName || ''} ${a.lastName || ''}`.trim() || 'Author',
            affiliation: a.authorAffiliationDetailsList?.authorAffiliation?.[0]?.affiliation,
          }))
        : item.authorString
        ? item.authorString.split(',').map((name: string, idx: number) => ({
            id: `a_epmc_${doi || item.id}_${idx}`,
            name: name.trim(),
          }))
        : [{ id: 'a_0', name: 'Unknown Author' }];

      const journalName = item.journalTitle || item.journalInfo?.journal?.title || 'Scientific Publication';
      const year = item.pubYear ? parseInt(item.pubYear, 10) : new Date().getFullYear();
      const canonicalUrl = doi
        ? `https://doi.org/${doi}`
        : `https://europepmc.org/article/MED/${item.id || ''}`;

      papers.push({
        id: `paper_epmc_${item.id || doi || Date.now()}`,
        doi,
        title: cleanTitle,
        abstract: item.abstractText
          ? item.abstractText.replace(/<[^>]+>/g, '').trim()
          : 'Abstract available on publisher website.',
        authors,
        journal: journalName,
        publisher: item.journalInfo?.journal?.publisher || 'Academic Publisher',
        publicationYear: year,
        publicationDate: item.firstPublicationDate || `${year}`,
        canonicalUrl,
        openAccessUrl,
        isOpenAccess,
        topics: item.keywordList?.keyword?.filter(Boolean)?.length
          ? item.keywordList.keyword.filter(Boolean)
          : [journalName.split(':')[0].trim().slice(0, 30)],
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

// ─────────────────────────────────────────────────────────────────────────────
// Semantic Scholar
// ─────────────────────────────────────────────────────────────────────────────
async function searchSemanticScholar(query: string, limit: number, page = 1): Promise<Paper[]> {
  try {
    const offset = (page - 1) * limit;
    const fields = 'paperId,title,abstract,authors,year,venue,externalIds,openAccessPdf,citationCount';
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(
      query
    )}&offset=${offset}&limit=${limit}&fields=${fields}`;

    const res = await fetchWithRetry(url, {
      headers: { 'User-Agent': 'BooffIn/1.0 (academic-search; dev@booffin.science)' },
      signal: AbortSignal.timeout(7000),
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
      const openAccessUrl =
        item.openAccessPdf?.url || (arxivId ? `https://arxiv.org/pdf/${arxivId}.pdf` : undefined);
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
        abstract: item.abstract || 'Abstract available on publisher website.',
        authors: authors.length > 0 ? authors : [{ id: 'a_0', name: 'Unknown Author' }],
        journal: journalName,
        publisher: journalName,
        publicationYear: year,
        publicationDate: `${year}`,
        canonicalUrl,
        openAccessUrl,
        isOpenAccess,
        topics: [journalName.split(':')[0].trim().slice(0, 30)],
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

// ─────────────────────────────────────────────────────────────────────────────
// arXiv (excellent for CS, physics, math, biology preprints)
// ─────────────────────────────────────────────────────────────────────────────
async function searchArxiv(query: string, limit: number, page = 1): Promise<Paper[]> {
  try {
    const start = (page - 1) * limit;
    // arXiv Atom feed — search all fields (ti, au, abs)
    const searchQ = `all:${encodeURIComponent(query)}`;
    const url = `https://export.arxiv.org/api/query?search_query=${searchQ}&start=${start}&max_results=${limit}&sortBy=relevance`;

    const res = await fetchWithRetry(url, {
      headers: { 'User-Agent': 'BooffIn/1.0 (academic-search; dev@booffin.science)' },
      signal: AbortSignal.timeout(7000),
    });

    if (!res.ok) return [];
    const text = await res.text();

    // Parse Atom XML
    const entries = text.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
    const papers: Paper[] = [];

    for (const entry of entries.slice(0, limit)) {
      const getTag = (tag: string) => {
        const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
        return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
      };

      const title = getTag('title');
      if (!title) continue;

      const arxivUrl = entry.match(/<id>(.*?)<\/id>/)?.[1]?.trim() || '';
      const arxivIdMatch = arxivUrl.match(/abs\/([^v]+)/);
      const arxivId = arxivIdMatch ? arxivIdMatch[1].trim() : '';

      // Extract DOI if present
      const doiMatch = entry.match(/doi\.org\/([^<"\s]+)/);
      const doi = doiMatch ? doiMatch[1] : undefined;

      // Extract authors
      const authorMatches = [...entry.matchAll(/<name>([\s\S]*?)<\/name>/g)];
      const authors = authorMatches.map((m, idx) => ({
        id: `a_ax_${arxivId}_${idx}`,
        name: m[1].trim(),
      }));

      const abstract = getTag('summary').replace(/\n/g, ' ').trim();
      const published = getTag('published');
      const year = published ? parseInt(published.slice(0, 4), 10) : new Date().getFullYear();

      // Try to determine subject category
      const categoryMatch = entry.match(/<category[^>]+term="([^"]+)"/);
      const category = categoryMatch ? categoryMatch[1] : 'arXiv';

      papers.push({
        id: `paper_arxiv_${arxivId || Date.now()}`,
        doi,
        title,
        abstract: abstract || 'Abstract available on arXiv.',
        authors: authors.length > 0 ? authors : [{ id: 'a_0', name: 'Unknown Author' }],
        journal: 'arXiv Preprint',
        publisher: 'arXiv',
        publicationYear: year,
        publicationDate: published || `${year}`,
        canonicalUrl: arxivId ? `https://arxiv.org/abs/${arxivId}` : arxivUrl,
        openAccessUrl: arxivId ? `https://arxiv.org/pdf/${arxivId}.pdf` : undefined,
        isOpenAccess: true,
        topics: [category, 'arXiv'],
        citationCount: 0,
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

// ─────────────────────────────────────────────────────────────────────────────
// OpenAlex (200M+ works, best broad coverage, completely free)
// ─────────────────────────────────────────────────────────────────────────────
async function searchOpenAlex(query: string, limit: number, page = 1): Promise<Paper[]> {
  try {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(
      query
    )}&page=${page}&per-page=${limit}&select=id,doi,title,abstract_inverted_index,authorships,publication_year,host_venue,open_access,cited_by_count,primary_location&mailto=dev@booffin.science`;

    const res = await fetchWithRetry(url, {
      headers: { 'User-Agent': 'BooffIn/1.0 (academic-search; dev@booffin.science)' },
      signal: AbortSignal.timeout(7000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const hits: any[] = data.results || [];

    const papers: Paper[] = [];
    for (const item of hits) {
      if (!item.title) continue;

      const doi = item.doi?.replace('https://doi.org/', '');
      const oaUrl: string | undefined =
        item.primary_location?.pdf_url ||
        item.open_access?.oa_url ||
        undefined;
      const isOpenAccess = Boolean(item.open_access?.is_oa);
      const canonicalUrl = item.doi || `https://openalex.org/${item.id}`;

      // Reconstruct abstract from inverted index
      let abstract = 'Abstract available on publisher website.';
      if (item.abstract_inverted_index) {
        try {
          const wordMap: Record<number, string> = {};
          for (const [word, positions] of Object.entries(item.abstract_inverted_index as Record<string, number[]>)) {
            for (const pos of positions) {
              wordMap[pos] = word;
            }
          }
          const maxPos = Math.max(...Object.keys(wordMap).map(Number));
          const words: string[] = [];
          for (let i = 0; i <= maxPos; i++) {
            words.push(wordMap[i] || '');
          }
          abstract = words.join(' ').trim() || abstract;
        } catch {}
      }

      const authors = (item.authorships || []).slice(0, 8).map((a: any, idx: number) => ({
        id: `a_oa_${item.id}_${idx}`,
        name: a.author?.display_name || 'Author',
        affiliation: a.institutions?.[0]?.display_name,
      }));

      const journalName = item.host_venue?.display_name || item.primary_location?.source?.display_name || 'Academic Journal';
      const year = item.publication_year || new Date().getFullYear();

      papers.push({
        id: `paper_oa_${item.id?.replace('https://openalex.org/', '') || Date.now()}`,
        doi,
        title: item.title.trim(),
        abstract,
        authors: authors.length > 0 ? authors : [{ id: 'a_0', name: 'Unknown Author' }],
        journal: journalName,
        publisher: journalName,
        publicationYear: year,
        publicationDate: `${year}`,
        canonicalUrl,
        openAccessUrl: oaUrl,
        isOpenAccess,
        topics: [journalName],
        citationCount: item.cited_by_count || 0,
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
