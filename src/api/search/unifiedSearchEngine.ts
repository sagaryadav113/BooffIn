import { Paper } from '../../types';
import { UnifiedSearchResults, SearchFilterCategory, ResearcherSearchResult, TopicSearchResult } from './types';
import { searchPapers } from './providers/paperSearchProvider';
import { searchOrcidResearchers } from './providers/orcidSearchProvider';
import { searchBooffInUsers } from './providers/userSearchProvider';
import { parseReferenceInput } from '../paper/inputParser';
import { isValidOrcidId } from '../orcidService';

// In-memory LRU-style cache
const searchCache = new Map<string, { timestamp: number; results: UnifiedSearchResults }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Universal Search & Discovery Engine for Explore tab
 */
export async function executeUnifiedSearch(
  rawQuery: string,
  category: SearchFilterCategory = 'all'
): Promise<UnifiedSearchResults> {
  const query = rawQuery.trim();
  if (!query) {
    return {
      papers: [],
      researchers: [],
      topics: [],
      rawQuery: '',
    };
  }

  const cacheKey = `${query.toLowerCase()}_${category}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.results;
  }

  // 1. Detect query intent
  let detectedType: UnifiedSearchResults['detectedInputType'] = 'keyword';
  const parsed = parseReferenceInput(query);
  const isDoi = Boolean(parsed.doi);
  const isArxiv = Boolean(parsed.arxivId);
  const isOrcid = isValidOrcidId(query);
  const isUrl = query.startsWith('http://') || query.startsWith('https://');
  const isUserHandle = query.startsWith('@');

  if (isDoi) detectedType = 'doi';
  else if (isArxiv) detectedType = 'arxiv';
  else if (isOrcid) detectedType = 'orcid';
  else if (isUrl) detectedType = 'url';
  else if (isUserHandle) detectedType = 'user';

  let papers: Paper[] = [];
  let researchers: ResearcherSearchResult[] = [];
  const topics: TopicSearchResult[] = [];

  // 2. Fetch based on intent and active filter
  const tasks: Promise<any>[] = [];

  // Papers fetch
  if (category === 'all' || category === 'papers' || isDoi || isArxiv || isUrl) {
    tasks.push(
      searchPapers(query, 12)
        .then((res) => {
          papers = res;
        })
        .catch(() => {})
    );
  }

  // Researchers fetch
  if (category === 'all' || category === 'researchers' || isOrcid || isUserHandle) {
    tasks.push(
      Promise.allSettled([
        searchBooffInUsers(query, 6),
        searchOrcidResearchers(query, 6),
      ]).then(([usersRes, orcidRes]) => {
        const combined: ResearcherSearchResult[] = [];
        const seenIds = new Set<string>();

        if (usersRes.status === 'fulfilled') {
          usersRes.value.forEach((u) => {
            if (!seenIds.has(u.id)) {
              seenIds.add(u.id);
              combined.push(u);
            }
          });
        }

        if (orcidRes.status === 'fulfilled') {
          orcidRes.value.forEach((r) => {
            if (!seenIds.has(r.id)) {
              seenIds.add(r.id);
              combined.push(r);
            }
          });
        }

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
  };

  searchCache.set(cacheKey, { timestamp: Date.now(), results: finalResults });

  return finalResults;
}
