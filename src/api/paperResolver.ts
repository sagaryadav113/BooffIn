import { Paper, Author } from '../types';

/**
 * Extracts clean DOI from various input formats:
 * - "10.1038/s41586-024-07281-x"
 * - "doi:10.1038/s41586-024-07281-x"
 * - "https://doi.org/10.1038/s41586-024-07281-x"
 * - "https://www.nature.com/articles/s41586-024-07281-x"
 */
export function extractDoi(input: string): string | null {
  const trimmed = input.trim();
  const doiRegex = /(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/i;
  const match = trimmed.match(doiRegex);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Detects publisher/journal brand from DOI or URL
 */
export function detectJournalFromMetadata(containerTitle?: string, doi?: string, publisher?: string): string {
  const text = `${containerTitle || ''} ${doi || ''} ${publisher || ''}`.toLowerCase();
  if (text.includes('nature protocols')) return 'Nature Protocols';
  if (text.includes('nature')) return 'Nature';
  if (text.includes('science')) return 'Science';
  if (text.includes('cell')) return 'Cell';
  if (text.includes('biorxiv')) return 'bioRxiv';
  if (text.includes('arxiv')) return 'arXiv';
  if (text.includes('pnas')) return 'PNAS';
  if (text.includes('lancet')) return 'Lancet';
  if (text.includes('ieee')) return 'IEEE';
  return containerTitle || publisher || 'Academic Paper';
}

/**
 * Resolves paper metadata via Crossref REST API
 */
export async function resolveCrossrefMetadata(doi: string): Promise<Partial<Paper> | null> {
  try {
    const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'BooffIn-Academic-Network/1.0 (mailto:contact@booffin.science)',
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    const message = data.message;

    if (!message) return null;

    const title = Array.isArray(message.title) ? message.title[0] : message.title;
    const authors: Author[] = (message.author || []).map((a: { given?: string; family?: string; affiliation?: { name: string }[]; ORCID?: string }) => ({
      name: `${a.given ? a.given + ' ' : ''}${a.family || ''}`.trim() || 'Unknown Author',
      affiliation: a.affiliation?.[0]?.name,
      orcid: a.ORCID ? a.ORCID.replace('http://orcid.org/', '').replace('https://orcid.org/', '') : undefined,
    }));

    const publicationYear = message.issued?.['date-parts']?.[0]?.[0] || new Date().getFullYear();
    const journal = detectJournalFromMetadata(message['container-title']?.[0], doi, message.publisher);

    return {
      doi,
      title: title || 'Untitled Research',
      abstract: message.abstract ? message.abstract.replace(/<[^>]*>/g, '') : '',
      authors,
      journal,
      publisher: message.publisher,
      publicationYear,
      canonicalUrl: message.URL || `https://doi.org/${doi}`,
      isOpenAccess: !!message['is-referenced-by-count'],
      citationCount: message['is-referenced-by-count'] || 0,
      topics: message.subject || ['Scientific Research'],
    };
  } catch (error) {
    console.warn('[BooffIn] Crossref resolution failed:', error);
    return null;
  }
}

/**
 * Resolves paper metadata via OpenAlex API
 */
export async function resolveOpenAlexMetadata(doi: string): Promise<Partial<Paper> | null> {
  try {
    const url = `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(doi)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'BooffIn-Academic-Network/1.0 (mailto:contact@booffin.science)',
      },
    });

    if (!res.ok) return null;
    const data = await res.json();

    const authors: Author[] = (data.authorships || []).map((a: { author?: { display_name?: string; orcid?: string }; institutions?: { display_name?: string }[] }) => ({
      name: a.author?.display_name || 'Unknown Author',
      affiliation: a.institutions?.[0]?.display_name,
      orcid: a.author?.orcid ? a.author.orcid.replace('https://orcid.org/', '') : undefined,
    }));

    const topics = (data.concepts || []).slice(0, 5).map((c: { display_name: string }) => c.display_name);

    return {
      doi,
      title: data.display_name || data.title,
      abstract: data.abstract || '',
      authors,
      journal: detectJournalFromMetadata(data.primary_location?.source?.display_name, doi),
      publisher: data.primary_location?.source?.host_organization_name,
      publicationYear: data.publication_year || new Date().getFullYear(),
      canonicalUrl: data.doi || `https://doi.org/${doi}`,
      openAccessUrl: data.open_access?.oa_url,
      isOpenAccess: data.open_access?.is_oa || false,
      citationCount: data.cited_by_count || 0,
      topics: topics.length > 0 ? topics : ['Research'],
    };
  } catch (error) {
    console.warn('[BooffIn] OpenAlex resolution failed:', error);
    return null;
  }
}

/**
 * Master Paper Resolver with Multi-Source Waterfall
 */
export async function resolvePaper(queryOrDoi: string): Promise<Paper | null> {
  const doi = extractDoi(queryOrDoi);
  if (!doi) return null;

  // Waterfall: OpenAlex first (richer concepts) -> Crossref fallback
  const openAlexData = await resolveOpenAlexMetadata(doi);
  if (openAlexData && openAlexData.title) {
    return {
      id: `paper_${Date.now()}`,
      doi,
      title: openAlexData.title,
      abstract: openAlexData.abstract || 'Abstract available on publisher website.',
      authors: openAlexData.authors || [{ name: 'Research Team' }],
      journal: openAlexData.journal || 'Journal Reference',
      publisher: openAlexData.publisher,
      publicationYear: openAlexData.publicationYear || 2024,
      canonicalUrl: openAlexData.canonicalUrl || `https://doi.org/${doi}`,
      openAccessUrl: openAlexData.openAccessUrl,
      isOpenAccess: openAlexData.isOpenAccess || false,
      topics: openAlexData.topics || ['Science'],
      citationCount: openAlexData.citationCount || 0,
      discussionCount: 1,
      likesCount: 0,
      savesCount: 0,
      isSaved: false,
      isLiked: false,
    };
  }

  const crossrefData = await resolveCrossrefMetadata(doi);
  if (crossrefData && crossrefData.title) {
    return {
      id: `paper_${Date.now()}`,
      doi,
      title: crossrefData.title,
      abstract: crossrefData.abstract || 'Abstract available on publisher website.',
      authors: crossrefData.authors || [{ name: 'Research Team' }],
      journal: crossrefData.journal || 'Journal Reference',
      publisher: crossrefData.publisher,
      publicationYear: crossrefData.publicationYear || 2024,
      canonicalUrl: crossrefData.canonicalUrl || `https://doi.org/${doi}`,
      isOpenAccess: crossrefData.isOpenAccess || false,
      topics: crossrefData.topics || ['Science'],
      citationCount: crossrefData.citationCount || 0,
      discussionCount: 1,
      likesCount: 0,
      savesCount: 0,
      isSaved: false,
      isLiked: false,
    };
  }

  return null;
}
