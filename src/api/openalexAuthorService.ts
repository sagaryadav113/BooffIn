import { Paper } from '../types';

export const OPENALEX_API_BASE = 'https://api.openalex.org';
const OPENALEX_MAILTO = 'dev@booffin.science';

export interface OpenAlexAuthorDetails {
  id: string; // Clean ID e.g. "A5002146542"
  openAlexId: string;
  openAlexUrl: string;
  displayName: string;
  observedName?: string;
  alternativeNames: string[];
  institutions: string[];
  observedInstitutions: string[];
  orcid?: string;
  orcidUrl?: string;
  worksCount: number;
  citationCount: number;
  hIndex: number;
  i10Index: number;
  twoYearMeanCitedness?: number;
  countsByYear: {
    year: number;
    worksCount: number;
    citedByCount: number;
  }[];
  topics: {
    id: string;
    displayName: string;
    count: number;
  }[];
  typeBreakdown: {
    type: string;
    count: number;
  }[];
}

export interface AuthorWorksResponse {
  works: Paper[];
  totalCount: number;
  hasMore: boolean;
  page: number;
}

/**
 * Normalizes OpenAlex author ID from various input forms:
 * - "openalex_author_A5002146542" -> "A5002146542"
 * - "https://openalex.org/A5002146542" -> "A5002146542"
 * - "A5002146542" -> "A5002146542"
 */
export function normalizeOpenAlexAuthorId(rawId: string): string {
  if (!rawId) return '';
  return rawId
    .replace(/^openalex_author_/i, '')
    .replace(/^https?:\/\/openalex\.org\//i, '')
    .trim();
}

/**
 * Decodes an OpenAlex abstract_inverted_index into plain readable text
 */
function decodeOpenAlexAbstract(invertedIndex: Record<string, number[]> | undefined | null): string {
  if (!invertedIndex || typeof invertedIndex !== 'object') return '';
  try {
    const wordPositions: { word: string; pos: number }[] = [];
    for (const [word, positions] of Object.entries(invertedIndex)) {
      if (Array.isArray(positions)) {
        for (const pos of positions) {
          wordPositions.push({ word, pos });
        }
      }
    }
    wordPositions.sort((a, b) => a.pos - b.pos);
    return wordPositions.map((wp) => wp.word).join(' ');
  } catch {
    return '';
  }
}

/**
 * Fetches comprehensive researcher details from OpenAlex Authors API
 */
export async function fetchOpenAlexAuthorDetails(authorId: string): Promise<OpenAlexAuthorDetails | null> {
  const cleanId = normalizeOpenAlexAuthorId(authorId);
  if (!cleanId) return null;

  try {
    const url = `${OPENALEX_API_BASE}/authors/${encodeURIComponent(cleanId)}?mailto=${OPENALEX_MAILTO}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': `BooffIn/1.0 (${OPENALEX_MAILTO})`,
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.id) return null;

    // 1. Observed names (alternatives)
    const alternatives: string[] = Array.isArray(data.display_name_alternatives)
      ? data.display_name_alternatives
      : [];
    const observedName = alternatives.length > 0 ? alternatives[0] : undefined;

    // 2. Institutions
    const primaryInstitutions: string[] = [];
    if (Array.isArray(data.last_known_institutions)) {
      data.last_known_institutions.forEach((inst: any) => {
        if (inst?.display_name && !primaryInstitutions.includes(inst.display_name)) {
          primaryInstitutions.push(inst.display_name);
        }
      });
    } else if (data.last_known_institution?.display_name) {
      primaryInstitutions.push(data.last_known_institution.display_name);
    }

    // 3. Observed Institutions history (from affiliations)
    const observedInstitutions: string[] = [];
    if (Array.isArray(data.affiliations)) {
      data.affiliations.forEach((aff: any) => {
        const name = aff?.institution?.display_name;
        if (name && !observedInstitutions.includes(name) && !primaryInstitutions.includes(name)) {
          observedInstitutions.push(name);
        }
      });
    }

    // 4. Clean ORCID
    const rawOrcid = data.orcid ? String(data.orcid).replace(/^https?:\/\/orcid\.org\//i, '').trim() : undefined;

    // 5. Metrics & stats
    const summaryStats = data.summary_stats || {};
    const hIndex = Number(summaryStats.h_index) || 0;
    const i10Index = Number(summaryStats.i10_index) || 0;
    const twoYearMeanCitedness = summaryStats['2yr_mean_citedness'] ? Number(summaryStats['2yr_mean_citedness']) : undefined;

    // 6. Publication trend by year
    const countsByYear: { year: number; worksCount: number; citedByCount: number }[] = [];
    if (Array.isArray(data.counts_by_year)) {
      data.counts_by_year.forEach((c: any) => {
        if (c?.year) {
          countsByYear.push({
            year: Number(c.year),
            worksCount: Number(c.works_count) || 0,
            citedByCount: Number(c.cited_by_count) || 0,
          });
        }
      });
      countsByYear.sort((a, b) => a.year - b.year);
    }

    // 7. Topics / research fields
    const topics: { id: string; displayName: string; count: number }[] = [];
    if (Array.isArray(data.topics)) {
      data.topics.slice(0, 10).forEach((t: any) => {
        if (t?.display_name) {
          topics.push({
            id: String(t.id || t.display_name),
            displayName: t.display_name,
            count: Number(t.count) || 0,
          });
        }
      });
    } else if (Array.isArray(data.x_concepts)) {
      data.x_concepts.slice(0, 10).forEach((c: any) => {
        if (c?.display_name) {
          topics.push({
            id: String(c.id || c.display_name),
            displayName: c.display_name,
            count: 0,
          });
        }
      });
    }

    // 8. Type breakdown
    const typeBreakdown: { type: string; count: number }[] = [];
    if (Array.isArray(data.counts_by_type)) {
      data.counts_by_type.forEach((tb: any) => {
        if (tb?.type) {
          typeBreakdown.push({
            type: tb.type,
            count: Number(tb.count) || 0,
          });
        }
      });
    } else {
      // Default common distribution if not provided directly
      const worksCount = Number(data.works_count) || 0;
      if (worksCount > 0) {
        typeBreakdown.push({ type: 'article', count: Math.round(worksCount * 0.88) });
        typeBreakdown.push({ type: 'preprint', count: Math.max(0, worksCount - Math.round(worksCount * 0.88)) });
      }
    }

    return {
      id: cleanId,
      openAlexId: cleanId,
      openAlexUrl: `https://openalex.org/${cleanId}`,
      displayName: data.display_name || 'Academic Scholar',
      observedName,
      alternativeNames: alternatives,
      institutions: primaryInstitutions,
      observedInstitutions,
      orcid: rawOrcid,
      orcidUrl: rawOrcid ? `https://orcid.org/${rawOrcid}` : undefined,
      worksCount: Number(data.works_count) || 0,
      citationCount: Number(data.cited_by_count) || 0,
      hIndex,
      i10Index,
      twoYearMeanCitedness,
      countsByYear,
      topics,
      typeBreakdown,
    };
  } catch (err) {
    console.warn('fetchOpenAlexAuthorDetails error:', err);
    return null;
  }
}

/**
 * Fetches paginated publications for a specific OpenAlex author
 * Supports accessFilter: 'all' | 'oa' (Open Access with PDF) | 'closed' (Subscription access)
 */
export async function fetchOpenAlexAuthorWorks(
  authorId: string,
  page = 1,
  pageSize = 20,
  accessFilter: 'all' | 'oa' | 'closed' = 'all'
): Promise<AuthorWorksResponse> {
  const cleanId = normalizeOpenAlexAuthorId(authorId);
  if (!cleanId) {
    return { works: [], totalCount: 0, hasMore: false, page };
  }

  try {
    let filterQuery = `author.id:${cleanId}`;
    if (accessFilter === 'oa') {
      filterQuery += `,is_oa:true`;
    } else if (accessFilter === 'closed') {
      filterQuery += `,is_oa:false`;
    }

    const url = `${OPENALEX_API_BASE}/works?filter=${encodeURIComponent(
      filterQuery
    )}&sort=publication_year:desc,cited_by_count:desc&page=${page}&per-page=${pageSize}&mailto=${OPENALEX_MAILTO}`;

    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': `BooffIn/1.0 (${OPENALEX_MAILTO})`,
      },
    });

    if (!res.ok) {
      return { works: [], totalCount: 0, hasMore: false, page };
    }

    const data = await res.json();
    const hits: any[] = data.results || [];
    const metaCount = data.meta?.count || 0;
    const hasMore = page * pageSize < metaCount;

    const works: Paper[] = hits.map((item) => {
      // Authors mapping
      const authors: { name: string; affiliation?: string }[] = [];
      if (Array.isArray(item.authorships)) {
        item.authorships.forEach((a: any) => {
          if (a?.author?.display_name) {
            authors.push({
              name: a.author.display_name,
              affiliation: a.institutions?.[0]?.display_name,
            });
          }
        });
      }

      // Open Access & PDF detection
      const openAccessInfo = item.open_access || {};
      const primaryLoc = item.primary_location || {};
      const isOpenAccess = Boolean(openAccessInfo.is_oa || primaryLoc.is_oa);
      const openAccessPdfUrl =
        primaryLoc.pdf_url ||
        openAccessInfo.oa_url ||
        (isOpenAccess ? primaryLoc.landing_page_url : undefined);

      const journalName =
        primaryLoc.source?.display_name ||
        item.host_venue?.display_name ||
        (item.type ? item.type.toUpperCase() : 'Academic Publication');

      const cleanDoi = item.doi ? item.doi.replace(/^https?:\/\/doi\.org\//i, '').trim() : undefined;
      const canonicalUrl = item.doi || primaryLoc.landing_page_url || `https://openalex.org/${item.id}`;

      const rawTopics: string[] = [];
      if (Array.isArray(item.topics)) {
        item.topics.forEach((t: any) => {
          if (t?.display_name) rawTopics.push(t.display_name);
        });
      } else if (Array.isArray(item.concepts)) {
        item.concepts.slice(0, 3).forEach((c: any) => {
          if (c?.display_name) rawTopics.push(c.display_name);
        });
      }

      const paperId = `oa_${item.id ? item.id.replace('https://openalex.org/', '') : Math.random().toString(36).substring(2, 9)}`;

      return {
        id: paperId,
        title: item.title || 'Untitled Publication',
        authors: authors.length > 0 ? authors : [{ name: 'Researcher' }],
        journal: journalName,
        publicationYear: item.publication_year || new Date().getFullYear(),
        doi: cleanDoi,
        canonicalUrl,
        openAccessUrl: openAccessPdfUrl,
        isOpenAccess,
        topics: rawTopics,
        citationCount: Number(item.cited_by_count) || 0,
        abstract: decodeOpenAlexAbstract(item.abstract_inverted_index),
        discussionCount: 0,
        likesCount: 0,
        savesCount: 0,
      };
    });

    return {
      works,
      totalCount: metaCount,
      hasMore,
      page,
    };
  } catch (err) {
    console.warn('fetchOpenAlexAuthorWorks error:', err);
    return { works: [], totalCount: 0, hasMore: false, page };
  }
}
