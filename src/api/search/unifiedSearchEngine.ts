import { Paper } from '../../types';
import { UnifiedSearchResults, SearchFilterCategory, ResearcherSearchResult, TopicSearchResult } from './types';
import { searchPapers } from './providers/paperSearchProvider';
import { searchOrcidResearchers } from './providers/orcidSearchProvider';
import { searchBooffInUsers, searchOpenAlexAuthors } from './providers/userSearchProvider';
import { parseReferenceInput } from '../paper/inputParser';
import { isValidOrcidId } from '../orcidService';
import { parseScientificQuery } from './scientificQueryParser';

// In-memory zero-storage bounded LRU cache (10 min TTL, max 50 entries)
const MAX_CACHE_ENTRIES = 50;
const CACHE_TTL_MS = 10 * 60 * 1000;
const searchCache = new Map<string, { timestamp: number; results: UnifiedSearchResults }>();

function getCacheEntry(key: string): UnifiedSearchResults | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  // Refresh LRU insertion order
  searchCache.delete(key);
  searchCache.set(key, entry);
  return entry.results;
}

function setCacheEntry(key: string, results: UnifiedSearchResults): void {
  if (searchCache.has(key)) {
    searchCache.delete(key);
  } else if (searchCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  searchCache.set(key, { timestamp: Date.now(), results });
}

/**
 * Detect if a query looks like a personal name (2-4 words, alpha only).
 * Used to always trigger researcher search alongside paper search.
 */
function looksLikePersonName(query: string): boolean {
  const parts = query.trim().split(/\s+/);
  return (
    parts.length >= 2 &&
    parts.length <= 4 &&
    parts.every((p) => /^[a-zA-ZÀ-ÖØ-öø-ÿ'\-\.]{2,}$/.test(p))
  );
}

/**
 * Universal Search & Discovery Engine for Explore tab.
 *
 * Sources:
 *   Papers     → EuropePMC + Semantic Scholar + arXiv + OpenAlex Works
 *   Researchers → BooffIn profiles (Supabase) + ORCID Registry + OpenAlex Authors
 */
export async function executeUnifiedSearch(
  rawQuery: string,
  category: SearchFilterCategory = 'all'
): Promise<UnifiedSearchResults> {
  const query = rawQuery.trim();
  if (!query) {
    return { papers: [], researchers: [], topics: [], rawQuery: '' };
  }

  const cacheKey = `${query.toLowerCase()}__${category}`;
  const cached = getCacheEntry(cacheKey);
  if (cached) {
    return cached;
  }

  // ── 1. Detect query intent ───────────────────────────────────────────────
  let detectedType: UnifiedSearchResults['detectedInputType'] = 'keyword';
  const parsed = parseReferenceInput(query);
  const isDoi = Boolean(parsed.doi);
  const isArxiv = Boolean(parsed.arxivId);
  const isOrcid = isValidOrcidId(query);
  const isUrl = query.startsWith('http://') || query.startsWith('https://');
  const isUserHandle = query.startsWith('@');
  const isName = looksLikePersonName(query);

  if (isDoi) detectedType = 'doi';
  else if (isArxiv) detectedType = 'arxiv';
  else if (isOrcid) detectedType = 'orcid';
  else if (isUrl) detectedType = 'url';
  else if (isUserHandle) detectedType = 'user';

  // Parse scientific semantic intent for literature inquiries
  const parsedScientific = parseScientificQuery(query);
  const scientificIntent: UnifiedSearchResults['scientificIntent'] = parsedScientific.intent
    ? {
        primaryEntity: parsedScientific.intent.primaryEntity,
        relationshipIntent: parsedScientific.intent.relationshipIntent,
        expandedTerms: parsedScientific.intent.expandedTerms,
        targetTerms: parsedScientific.intent.targetTerms,
      }
    : undefined;

  // ── 2. Determine what to search ──────────────────────────────────────────
  // Papers: always search unless user is only filtering researchers,
  //         OR the query is a pure ORCID ID or @handle
  const shouldSearchPapers =
    !isOrcid &&
    !isUserHandle &&
    (category === 'all' || category === 'papers' || isDoi || isArxiv || isUrl);

  // Researchers: always search when:
  //   - filter = all or researchers
  //   - query is an ORCID ID
  //   - query is an @handle
  //   - query looks like a person's name (NEW — catches "John Smith")
  const shouldSearchResearchers =
    category === 'all' ||
    category === 'researchers' ||
    isOrcid ||
    isUserHandle ||
    isName;

  let papers: Paper[] = [];
  let researchers: ResearcherSearchResult[] = [];
  const topics: TopicSearchResult[] = [];

  const tasks: Promise<any>[] = [];

  // ── Papers search ────────────────────────────────────────────────────────
  if (shouldSearchPapers) {
    tasks.push(
      searchPapers(query, 15)
        .then((res) => { papers = res; })
        .catch(() => {})
    );
  }

  // ── Researchers search ───────────────────────────────────────────────────
  if (shouldSearchResearchers) {
    tasks.push(
      Promise.allSettled([
        searchBooffInUsers(query, 6),   // Always check our own DB first
        searchOrcidResearchers(query, 6),
        searchOpenAlexAuthors(query, 6),  // NEW: OpenAlex author index
      ]).then(([usersRes, orcidRes, oaAuthorsRes]) => {
        const combined: ResearcherSearchResult[] = [];
        const seenIds = new Set<string>();

        const addResearcher = (r: ResearcherSearchResult) => {
          // Deduplicate by ORCID ID if both sources return the same person
          const key = r.orcidId ? `orcid:${r.orcidId}` : r.id;
          if (!seenIds.has(key)) {
            seenIds.add(key);
            // Also dedup by id
            seenIds.add(r.id);
            combined.push(r);
          }
        };

        // Priority: our own users first, then ORCID, then OpenAlex
        if (usersRes.status === 'fulfilled') usersRes.value.forEach(addResearcher);
        if (orcidRes.status === 'fulfilled') orcidRes.value.forEach(addResearcher);
        if (oaAuthorsRes.status === 'fulfilled') oaAuthorsRes.value.forEach(addResearcher);

        researchers = combined;
      })
    );
  }

  await Promise.allSettled(tasks);

  const finalResults: UnifiedSearchResults = {
    papers,
    researchers,
    topics,
    detectedInputType: detectedType,
    rawQuery: query,
    scientificIntent,
  };

  setCacheEntry(cacheKey, finalResults);
  return finalResults;
}

/**
 * Loads additional pages of researchers/scholars matching query
 */
export async function loadMoreScholars(
  query: string,
  page: number,
  limit = 10
): Promise<ResearcherSearchResult[]> {
  return searchOpenAlexAuthors(query, limit, page);
}

/**
 * Loads additional pages of research papers matching query
 */
export async function loadMorePapers(
  query: string,
  page: number,
  limit = 10
): Promise<Paper[]> {
  return searchPapers(query, limit, page);
}

