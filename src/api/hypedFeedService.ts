import { Paper, UserProfile } from '../types';
import { supabase, appStorage } from './client';
import { searchPapers } from './search/providers/paperSearchProvider';
import { usePaperStore } from '../store/usePaperStore';
import {
  getBatchPaperMetrics,
  getDetailedReadPapersRegistry,
  calculate48hHypeScore,
  subscribeToPaperRead,
} from './hypeScoreService';

export interface HypedDomainData {
  domain: string;
  timeframe: '48h' | 'week' | 'month' | 'all';
  papers: Paper[];
  researchers: UserProfile[];
}

// In-memory cache for ultra-fast 0ms instant tab rendering
const domainFeedCache = new Map<string, { timestamp: number; data: HypedDomainData }>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes fresh in-memory TTL
const STORAGE_KEY_HYPED_FEED_PREFIX = 'booffin_hyped_feed_v2_';

/**
 * Builds standard cache key for domain + timeframe + interests
 */
function buildCacheKey(
  domain: string,
  timeframe: '48h' | 'week' | 'month' | 'all',
  userInterests: string[] = []
): string {
  const normDomain = (domain || '').trim().toLowerCase();
  const sortedInterests = [...userInterests].sort().join(',');
  return `${normDomain}_${timeframe}_${sortedInterests}`;
}

/**
 * Returns in-memory cached data immediately (0ms synchronous lookup)
 */
export function getCachedHypedDomainDataSync(
  domain: string,
  timeframe: '48h' | 'week' | 'month' | 'all' = '48h',
  userInterests: string[] = []
): HypedDomainData | null {
  const key = buildCacheKey(domain, timeframe, userInterests);
  const item = domainFeedCache.get(key);
  if (item) {
    return item.data;
  }
  return null;
}

/**
 * Returns persisted disk cached data immediately without waiting for network
 */
export async function getCachedHypedDomainData(
  domain: string,
  timeframe: '48h' | 'week' | 'month' | 'all' = '48h',
  userInterests: string[] = []
): Promise<HypedDomainData | null> {
  const syncData = getCachedHypedDomainDataSync(domain, timeframe, userInterests);
  if (syncData) return syncData;

  const key = buildCacheKey(domain, timeframe, userInterests);
  try {
    const raw = await appStorage.getItem(`${STORAGE_KEY_HYPED_FEED_PREFIX}${key}`);
    if (raw) {
      const data: HypedDomainData = JSON.parse(raw);
      domainFeedCache.set(key, { timestamp: Date.now(), data });
      return data;
    }
  } catch {}
  return null;
}

export function invalidateDomainFeedCache() {
  domainFeedCache.clear();
}

// Invalidate in-memory timestamps smoothly on paper read so background revalidation triggers
subscribeToPaperRead(() => {
  // Mark in-memory cache as stale without deleting data, keeping SWR instant
  for (const [key, val] of domainFeedCache.entries()) {
    domainFeedCache.set(key, { timestamp: 0, data: val.data });
  }
});

/**
 * Domain-specific keyword and query dictionary
 * Ensures complete separation between domains (e.g. Neuroscience vs Artificial Intelligence)
 */
export const SCIENTIFIC_DOMAINS: Record<
  string,
  { searchTerms: string; keywords: string[]; excludedTerms?: string[] }
> = {
  'artificial intelligence': {
    searchTerms: 'artificial intelligence machine learning deep learning neural networks',
    keywords: [
      'artificial intelligence',
      'machine learning',
      'deep learning',
      'neural network',
      'neural networks',
      'language model',
      'large language models',
      'llm',
      'computer vision',
      'generative ai',
      'reinforcement learning',
      'transformers',
      'foundation models',
      'deep neural',
      'convolutional neural',
      'autonomous agents',
      'ai model',
    ],
    excludedTerms: ['nursing', 'geriatric', 'palliative', 'neurological examination', 'nursing care'],
  },
  'ai in science': {
    searchTerms: 'ai in science machine learning scientific discovery computational biology',
    keywords: [
      'ai in science',
      'machine learning',
      'deep learning',
      'alphafold',
      'computational biology',
      'cheminformatics',
      'scientific machine learning',
      'neural network',
      'molecular dynamics',
    ],
  },
  'neuroscience': {
    searchTerms: 'neuroscience brain cognitive neural neurobiology synaptic',
    keywords: [
      'neuroscience',
      'brain',
      'cortex',
      'cognitive neuroscience',
      'hippocampus',
      'synaptic',
      'neurobiology',
      'neurological',
      'neuroimaging',
      'fmri',
      'eeg',
      'cerebral',
      'neuron',
      'nervous system',
      'episodic memory',
      'neurodegeneration',
    ],
  },
  'biotech': {
    searchTerms: 'biotechnology crispr genomics gene therapy synthetic biology',
    keywords: [
      'biotechnology',
      'biotech',
      'crispr',
      'genomics',
      'gene editing',
      'synthetic biology',
      'gene therapy',
      'mrna',
      'bioengineering',
      'cellular therapy',
      'molecular genetics',
    ],
  },
  'quantum': {
    searchTerms: 'quantum computing quantum mechanics qubit superconductivity',
    keywords: [
      'quantum',
      'qubit',
      'quantum computing',
      'superconductivity',
      'quantum mechanics',
      'entanglement',
    ],
  },
  'medicine': {
    searchTerms: 'clinical trial oncology cardiology therapeutics pharmacology',
    keywords: [
      'clinical trial',
      'oncology',
      'cardiology',
      'pathology',
      'therapeutics',
      'pharmacology',
      'immunology',
      'epidemiology',
      'pediatrics',
    ],
  },
};

/**
 * Checks if a paper relates strictly to a target scientific domain
 */
export function isPaperInDomain(paper: Paper, domain: string): boolean {
  const normDomain = domain.trim().toLowerCase();
  if (normDomain === 'for you' || normDomain === 'all' || normDomain === 'hyped' || !normDomain) {
    return true;
  }

  const titleLower = (paper.title || '').toLowerCase();
  const abstractLower = (paper.abstract || '').toLowerCase();
  const topicsLower = (paper.topics || []).map((t) => (t || '').toLowerCase());
  const combinedText = `${titleLower} ${abstractLower} ${topicsLower.join(' ')}`;

  // 1. Direct topic tag match
  if (topicsLower.some((t) => t === normDomain || t.includes(normDomain))) {
    return true;
  }

  // 2. Predefined domain configuration
  const config = SCIENTIFIC_DOMAINS[normDomain];
  if (config) {
    if (config.excludedTerms && config.excludedTerms.some((term) => titleLower.includes(term))) {
      return false;
    }

    return config.keywords.some((kw) => {
      return (
        titleLower.includes(kw) ||
        topicsLower.some((t) => t.includes(kw)) ||
        (abstractLower.length > 0 && abstractLower.includes(kw))
      );
    });
  }

  // 3. User custom added interest (e.g., "Astrophysics", "Genomics")
  const words = normDomain.split(/\s+/).filter((w) => w.length > 2);
  if (words.length <= 1) {
    return (
      titleLower.includes(normDomain) ||
      topicsLower.some((t) => t.includes(normDomain)) ||
      abstractLower.includes(normDomain)
    );
  }

  if (titleLower.includes(normDomain) || topicsLower.some((t) => t.includes(normDomain))) {
    return true;
  }
  return words.every((w) => combinedText.includes(w));
}

/**
 * Derives top researchers with fast 2.5s network timeout and instant fallbacks
 */
async function deriveTopResearchers(
  papers: Paper[],
  domain: string
): Promise<UserProfile[]> {
  const cleanDomain = domain.trim();
  const researchers: UserProfile[] = [];
  const seenIds = new Set<string>();

  // 1. Fetch genuine OpenAlex scholars with timeout to prevent blocking UI
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const oaUrl = `https://api.openalex.org/authors?search=${encodeURIComponent(
      cleanDomain
    )}&sort=cited_by_count:desc&per-page=6&select=id,display_name,last_known_institution,works_count,cited_by_count,orcid,x_concepts&mailto=dev@booffin.science`;

    const res = await fetch(oaUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'BooffIn/1.0 (hyped-scholars; dev@booffin.science)' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const hits: any[] = data.results || [];

      for (const item of hits) {
        if (!item.display_name) continue;
        const openAlexId = (item.id || '').replace(/^https?:\/\/openalex\.org\//i, '').replace(/^authors\//i, '').trim();
        if (!openAlexId) continue;

        const rawOrcid = item.orcid ? String(item.orcid).replace(/^https?:\/\/orcid\.org\//i, '').trim() : undefined;
        const inst = item.last_known_institution?.display_name || 'Academic Institution';
        const works = Number(item.works_count) || 0;
        const citations = Number(item.cited_by_count) || 0;

        const topConcepts: string[] = (item.x_concepts || [])
          .slice(0, 2)
          .map((c: any) => c.display_name)
          .filter(Boolean);

        const calculatedHype = citations > 0
          ? Math.min(5.0, Math.max(3.8, parseFloat((3.6 + Math.log10(citations) * 0.26 + Math.min(0.3, works * 0.002)).toFixed(1))))
          : 4.0;

        researchers.push({
          id: `openalex_author_${openAlexId}`,
          openAlexId,
          handle: item.display_name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 24) || 'scholar',
          fullName: item.display_name,
          academicTitle: topConcepts.length > 0 ? topConcepts.join(' · ') : 'Lead Investigator',
          institution: inst,
          avatarUrl: undefined,
          bio: topConcepts.length > 0 ? `Focusing on ${topConcepts.join(', ')}` : '',
          orcidVerified: Boolean(rawOrcid),
          orcidId: rawOrcid,
          followersCount: 0,
          followingCount: 0,
          postsCount: works,
          savedCount: 0,
          joinedDate: '',
          primaryField: cleanDomain,
          researchInterests: topConcepts.length > 0 ? topConcepts : [cleanDomain],
          worksCount: works,
          citationCount: citations,
          hypeScore: calculatedHype,
          isFollowing: false,
        });

        seenIds.add(openAlexId);
      }
    }
  } catch {}

  // 2. Also check verified registered scholars in Supabase
  try {
    const { data: dbProfiles } = await supabase
      .from('profiles')
      .select(
        'id, username, full_name, avatar_url, academic_title, institution, orcid_id, orcid_verified, followers_count, following_count'
      )
      .eq('orcid_verified', true)
      .order('followers_count', { ascending: false })
      .limit(3);

    if (dbProfiles && dbProfiles.length > 0) {
      dbProfiles.forEach((row: any) => {
        if (!seenIds.has(row.id)) {
          seenIds.add(row.id);
          researchers.unshift({
            id: row.id,
            handle: row.username || 'scholar',
            fullName: row.full_name || 'Verified Scholar',
            avatarUrl: row.avatar_url,
            academicTitle: row.academic_title || 'Lead Investigator',
            institution: row.institution || 'Research Institution',
            bio: '',
            orcidVerified: Boolean(row.orcid_verified),
            orcidId: row.orcid_id,
            followersCount: row.followers_count || 0,
            followingCount: row.following_count || 0,
            postsCount: 0,
            savedCount: 0,
            joinedDate: '',
            primaryField: cleanDomain,
            researchInterests: [cleanDomain],
            hypeScore: 4.8,
          });
        }
      });
    }
  } catch {}

  researchers.sort((a, b) => (b.hypeScore || 0) - (a.hypeScore || 0));
  return researchers.slice(0, 5);
}

/**
 * Fetches domain-specific Hyped feed with Stale-While-Revalidate (SWR) support.
 * Returns in-memory or persisted disk cache in 0ms, then updates cache in background.
 */
export async function getHypedDomainData(
  domain: string,
  timeframe: '48h' | 'week' | 'month' | 'all' = '48h',
  userInterests: string[] = [],
  forceFresh: boolean = false
): Promise<HypedDomainData> {
  const normDomain = (domain || 'For You').trim().toLowerCase();
  const cacheKey = buildCacheKey(domain, timeframe, userInterests);

  // 1. Fast in-memory check (return immediately if fresh and not forced)
  const cached = domainFeedCache.get(cacheKey);
  if (!forceFresh && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // 2. Fast disk cache check if in-memory missing
  if (!forceFresh && !cached) {
    try {
      const raw = await appStorage.getItem(`${STORAGE_KEY_HYPED_FEED_PREFIX}${cacheKey}`);
      if (raw) {
        const diskData: HypedDomainData = JSON.parse(raw);
        domainFeedCache.set(cacheKey, { timestamp: Date.now(), data: diskData });
        // Return disk data immediately and trigger background refresh
        fetchFreshHypedDomainData(domain, timeframe, userInterests, cacheKey).catch(() => {});
        return diskData;
      }
    } catch {}
  }

  // 3. Fetch fresh data
  return fetchFreshHypedDomainData(domain, timeframe, userInterests, cacheKey);
}

/**
 * Executes fresh network retrieval for hyped papers & researchers
 */
async function fetchFreshHypedDomainData(
  domain: string,
  timeframe: '48h' | 'week' | 'month' | 'all',
  userInterests: string[],
  cacheKey: string
): Promise<HypedDomainData> {
  const normDomain = (domain || 'For You').trim().toLowerCase();
  let finalPapers: Paper[] = [];

  // CASE 1: Personalized "For You" or global "Hyped" feed
  if (normDomain === 'for you' || normDomain === 'all' || normDomain === 'hyped') {
    const interests =
      normDomain === 'hyped'
        ? ['Neuroscience', 'Artificial Intelligence', 'Biotech']
        : userInterests.length > 0
        ? userInterests.slice(0, 3)
        : ['Neuroscience', 'Artificial Intelligence', 'Biotech'];

    const subFeeds = await Promise.all(
      interests.map((interest) => fetchSingleDomainHyped(interest, timeframe, 5))
    );

    const merged: Paper[] = [];
    const seenDois = new Set<string>();
    const seenTitles = new Set<string>();

    for (const subList of subFeeds) {
      for (const p of subList) {
        const doiKey = (p.doi || '').toLowerCase().trim();
        const titleKey = (p.title || '')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .slice(0, 50);
        if (doiKey && seenDois.has(doiKey)) continue;
        if (titleKey && seenTitles.has(titleKey)) continue;
        if (doiKey) seenDois.add(doiKey);
        if (titleKey) seenTitles.add(titleKey);
        merged.push(p);
      }
    }

    merged.sort(
      (a, b) => ((b as any).calculatedHype || 0) - ((a as any).calculatedHype || 0)
    );
    finalPapers = merged.slice(0, 5);
  } else {
    // CASE 2: Specific scientific domain (e.g. "Neuroscience", "Artificial Intelligence")
    finalPapers = await fetchSingleDomainHyped(domain, timeframe, 5);
  }

  // Pre-seed into usePaperStore so any click opens instantly
  try {
    const addPaper = usePaperStore.getState().addPaper;
    finalPapers.forEach((p) => addPaper(p));
  } catch {}

  const researchDomain =
    normDomain === 'for you' || normDomain === 'all'
      ? userInterests[0] || 'Neuroscience'
      : domain;
  const domainResearchers = await deriveTopResearchers(finalPapers, researchDomain);

  const result: HypedDomainData = {
    domain,
    timeframe,
    papers: finalPapers,
    researchers: domainResearchers,
  };

  // Persist to in-memory cache
  domainFeedCache.set(cacheKey, { timestamp: Date.now(), data: result });

  // Persist to disk storage asynchronously
  try {
    appStorage.setItem(
      `${STORAGE_KEY_HYPED_FEED_PREFIX}${cacheKey}`,
      JSON.stringify(result)
    ).catch(() => {});
  } catch {}

  return result;
}

/**
 * Evaluates, ranks and returns top 5 hyped papers for a single scientific domain
 * using batch database operations
 */
async function fetchSingleDomainHyped(
  domain: string,
  timeframe: '48h' | 'week' | 'month' | 'all',
  limit: number = 5
): Promise<Paper[]> {
  const normDomain = domain.trim().toLowerCase();

  // 1. Fetch relevant read papers from persistent registry
  let readCandidates: { paper: Paper; lastReadAt: number }[] = [];
  try {
    const allDetailed = await getDetailedReadPapersRegistry();
    readCandidates = allDetailed
      .filter((item) => isPaperInDomain(item.paper, domain))
      .map((item) => ({ paper: item.paper, lastReadAt: item.lastReadAt }));
  } catch {}

  // 2. Fetch live papers specifically for this domain
  let liveCandidates: { paper: Paper; lastReadAt: number }[] = [];
  try {
    const domainConfig = SCIENTIFIC_DOMAINS[normDomain];
    const searchQuery = domainConfig?.searchTerms || domain;
    const searchResults = await searchPapers(searchQuery, 6);

    const filteredLive = searchResults.filter((sp) => {
      const isAlreadyRead = readCandidates.some(
        (rc) =>
          rc.paper.id === sp.id ||
          (rc.paper.doi &&
            sp.doi &&
            rc.paper.doi.toLowerCase() === sp.doi.toLowerCase())
      );
      if (isAlreadyRead) return false;
      return isPaperInDomain(sp, domain);
    });

    liveCandidates = filteredLive.map((p) => ({ paper: p, lastReadAt: 0 }));
  } catch {}

  const allCandidates = [...readCandidates, ...liveCandidates].slice(0, 10);
  if (allCandidates.length === 0) return [];

  // 3. Batch fetch metrics for all candidates in ONE single database call
  const candidateIds = allCandidates.map((c) => c.paper.id);
  const metricsMap = await getBatchPaperMetrics(candidateIds);

  // 4. Compute 48-Hour HYPE scores
  const scored = allCandidates.map(({ paper, lastReadAt }) => {
    const metrics = metricsMap.get(paper.id) || {
      paperId: paper.id,
      views: 0,
      uniqueReaders: 0,
      impactSum: 0,
      impactCount: 0,
      claritySum: 0,
      clarityCount: 0,
      visualsSum: 0,
      visualsCount: 0,
      impactAvg: 0,
      clarityAvg: 0,
      visualsAvg: 0,
      communityRating: 0,
      ratingScore: 0,
      popularityScore: 0,
      hypeScore: 0,
      viewsLastHour: 0,
      viewsLast24h: 0,
      trendScore: 0,
    };
    const hype = calculate48hHypeScore(paper, metrics, lastReadAt);
    return {
      paper: {
        ...paper,
        calculatedHype: hype,
      },
      hype,
      lastReadAt,
      views: metrics.views,
      views24h: metrics.viewsLast24h,
    };
  });

  // 5. Rank by 48h readership momentum & hype score
  scored.sort((a, b) => {
    if (a.hype > 0 && b.hype === 0) return -1;
    if (b.hype > 0 && a.hype === 0) return 1;
    if (a.hype > 0 && b.hype > 0) {
      return b.hype - a.hype || b.views24h - a.views24h;
    }

    if (timeframe === '48h' || timeframe === 'week') {
      const aMomentum = (a.views24h * 4) + (a.views || 0) + (a.paper.discussionCount || 0) * 3 + (a.lastReadAt ? 15 : 0);
      const bMomentum = (b.views24h * 4) + (b.views || 0) + (b.paper.discussionCount || 0) * 3 + (b.lastReadAt ? 15 : 0);
      if (bMomentum !== aMomentum) return bMomentum - aMomentum;
      return (b.paper.citationCount || 0) - (a.paper.citationCount || 0);
    }
    return (b.paper.citationCount || 0) - (a.paper.citationCount || 0) || b.views - a.views;
  });

  return scored.slice(0, limit).map((s) => s.paper);
}

/**
 * Pre-warms Explore feeds in the background during app boot or idle time.
 * Populates memory cache so that when user taps "Explore", feed loads with 0ms delay.
 */
export function prewarmHypedFeeds(userInterests: string[] = []) {
  const targetDomains = [
    'For You',
    'Hyped',
    ...(userInterests.length > 0 ? userInterests.slice(0, 2) : ['Neuroscience', 'Artificial Intelligence']),
  ];

  // Execute in background without awaiting
  setTimeout(async () => {
    for (const domain of targetDomains) {
      try {
        await getHypedDomainData(domain, '48h', userInterests);
      } catch {}
    }
  }, 1000);
}
