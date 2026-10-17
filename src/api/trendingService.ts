import { supabase, appStorage } from './client';
import { TrendingTag, TrendingResponse } from '../types/trending';

const STORAGE_KEY = '@booffin_trending_tags_24h';
const HASHTAG_REGEX = /(?:^|\s)#([a-zA-Z0-9_\u00c0-\u024f]{2,50})/g;

// In-memory cache for synchronous 0ms render
let memoryTrendingCache: TrendingTag[] | null = null;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Intelligent categorization based on scientific topic keywords
 */
function categorizeTag(name: string): string {
  const lower = name.toLowerCase();

  if (
    lower.includes('ai') ||
    lower.includes('llm') ||
    lower.includes('gpt') ||
    lower.includes('deeplearning') ||
    lower.includes('neural') ||
    lower.includes('transformer') ||
    lower.includes('robot') ||
    lower.includes('agent')
  ) {
    return 'Artificial Intelligence';
  }

  if (
    lower.includes('crispr') ||
    lower.includes('gene') ||
    lower.includes('dna') ||
    lower.includes('rna') ||
    lower.includes('protein') ||
    lower.includes('bio') ||
    lower.includes('cell') ||
    lower.includes('mrna')
  ) {
    return 'Biotechnology & Genetics';
  }

  if (
    lower.includes('quantum') ||
    lower.includes('physic') ||
    lower.includes('astro') ||
    lower.includes('gravit') ||
    lower.includes('cosmo') ||
    lower.includes('superconduct')
  ) {
    return 'Quantum & Astrophysics';
  }

  if (
    lower.includes('neuro') ||
    lower.includes('brain') ||
    lower.includes('cognit') ||
    lower.includes('synap') ||
    lower.includes('memory')
  ) {
    return 'Neuroscience';
  }

  if (
    lower.includes('climate') ||
    lower.includes('energy') ||
    lower.includes('solar') ||
    lower.includes('carbon') ||
    lower.includes('battery') ||
    lower.includes('fusion')
  ) {
    return 'Climate & Energy';
  }

  if (
    lower.includes('cancer') ||
    lower.includes('med') ||
    lower.includes('vaccin') ||
    lower.includes('immun') ||
    lower.includes('pharma') ||
    lower.includes('health')
  ) {
    return 'Medicine & Health';
  }

  return 'Trending in Science';
}

/**
 * Curated scientific seed trends used if recent post count is still low
 */
const CURATED_SEED_TRENDS: TrendingTag[] = [
  {
    id: 'trend-crispr',
    tag: '#CRISPR',
    rawName: 'CRISPR',
    isHashtag: true,
    category: 'Biotechnology & Genetics',
    postsCount24h: 342,
    authorsCount24h: 189,
    trendingScore: 98.4,
    rank: 1,
    growthRatePct: 184,
    timeWindow: '24h',
  },
  {
    id: 'trend-quantum',
    tag: '#QuantumComputing',
    rawName: 'QuantumComputing',
    isHashtag: true,
    category: 'Quantum & Astrophysics',
    postsCount24h: 278,
    authorsCount24h: 142,
    trendingScore: 89.1,
    rank: 2,
    growthRatePct: 125,
    timeWindow: '24h',
  },
  {
    id: 'trend-alphafold',
    tag: '#AlphaFold3',
    rawName: 'AlphaFold3',
    isHashtag: true,
    category: 'Artificial Intelligence',
    postsCount24h: 215,
    authorsCount24h: 110,
    trendingScore: 78.5,
    rank: 3,
    growthRatePct: 92,
    timeWindow: '24h',
  },
  {
    id: 'trend-neuro',
    tag: '#Neuroplasticity',
    rawName: 'Neuroplasticity',
    isHashtag: true,
    category: 'Neuroscience',
    postsCount24h: 164,
    authorsCount24h: 94,
    trendingScore: 65.2,
    rank: 4,
    growthRatePct: 68,
    timeWindow: '24h',
  },
  {
    id: 'trend-fusion',
    tag: '#NuclearFusion',
    rawName: 'NuclearFusion',
    isHashtag: true,
    category: 'Climate & Energy',
    postsCount24h: 139,
    authorsCount24h: 81,
    trendingScore: 54.7,
    rank: 5,
    growthRatePct: 45,
    timeWindow: '24h',
  },
  {
    id: 'trend-bci',
    tag: '#BrainComputerInterface',
    rawName: 'BrainComputerInterface',
    isHashtag: true,
    category: 'Neuroscience',
    postsCount24h: 118,
    authorsCount24h: 67,
    trendingScore: 48.3,
    rank: 6,
    growthRatePct: 37,
    timeWindow: '24h',
  },
  {
    id: 'trend-superconductor',
    tag: '#RoomTempSuperconductor',
    rawName: 'RoomTempSuperconductor',
    isHashtag: true,
    category: 'Quantum & Astrophysics',
    postsCount24h: 96,
    authorsCount24h: 53,
    trendingScore: 41.0,
    rank: 7,
    growthRatePct: 29,
    timeWindow: '24h',
  },
];

/**
 * Returns in-memory synchronous cached trends or default curated seeds
 */
export function getTrendingTagsSync(): TrendingTag[] {
  if (memoryTrendingCache && memoryTrendingCache.length > 0) {
    return memoryTrendingCache;
  }
  return CURATED_SEED_TRENDS;
}

/**
 * Loads cached trending tags from persistent storage into memory
 */
export async function initTrendingCache(): Promise<TrendingTag[]> {
  if (memoryTrendingCache && memoryTrendingCache.length > 0) {
    return memoryTrendingCache;
  }

  try {
    const raw = await appStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryTrendingCache = parsed;
        return parsed;
      }
    }
  } catch {}

  memoryTrendingCache = CURATED_SEED_TRENDS;
  return CURATED_SEED_TRENDS;
}

interface RawPostRecord {
  id: string;
  content: string | null;
  author_id: string | null;
  likes_count: number | null;
  comments_count: number | null;
  reposts_count: number | null;
  created_at: string;
  topics?: string[] | null;
  post_topics?: Array<{ topic?: { name?: string; slug?: string } }> | null;
}

interface TagAggregate {
  tag: string;
  rawName: string;
  isHashtag: boolean;
  postsCount24h: number;
  authors: Set<string>;
  weightedScore: number;
  recentWindowPosts: number; // posts in last 6 hours
  priorWindowPosts: number;  // posts in hours 6-24
}

/**
 * Executes Twitter-style Velocity & Acceleration Trending Algorithm
 * over the past 24 hours of scientific discussions and papers.
 */
export async function fetchTrendingTags(forceRefresh = false): Promise<TrendingResponse> {
  const now = Date.now();

  // Return in-memory cache if fresh
  if (!forceRefresh && memoryTrendingCache && now - lastFetchTimestamp < CACHE_TTL_MS) {
    return {
      trends: memoryTrendingCache,
      timeWindow: '24h',
      totalPostsAnalyzed: memoryTrendingCache.reduce((acc, t) => acc + t.postsCount24h, 0),
      generatedAt: new Date(lastFetchTimestamp).toISOString(),
    };
  }

  const cutoff24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const cutoff72hFallback = new Date(now - 72 * 60 * 60 * 1000).toISOString();

  let postsData: RawPostRecord[] = [];

  try {
    // 1. Fetch posts from the past 24 hours
    const { data: recentPosts, error: recentErr } = await supabase
      .from('posts')
      .select(
        `
        id,
        content,
        author_id,
        likes_count,
        comments_count,
        reposts_count,
        created_at,
        post_topics (
          topic:topics!topic_id (
            name,
            slug
          )
        )
      `
      )
      .gte('created_at', cutoff24h)
      .order('created_at', { ascending: false })
      .limit(200);

    if (!recentErr && recentPosts && recentPosts.length >= 5) {
      postsData = recentPosts as unknown as RawPostRecord[];
    } else {
      // Fallback: If 24h has fewer than 5 posts, pull last 72h with exponential decay
      const { data: fallbackPosts } = await supabase
        .from('posts')
        .select(
          `
          id,
          content,
          author_id,
          likes_count,
          comments_count,
          reposts_count,
          created_at,
          post_topics (
            topic:topics!topic_id (
              name,
              slug
            )
          )
        `
        )
        .gte('created_at', cutoff72hFallback)
        .order('created_at', { ascending: false })
        .limit(250);

      if (fallbackPosts && fallbackPosts.length > 0) {
        postsData = fallbackPosts as unknown as RawPostRecord[];
      }
    }
  } catch (e) {
    console.warn('[trendingService] Supabase fetch error:', e);
  }

  // 2. Aggregate tags using Twitter Velocity & Acceleration Formula
  const tagMap = new Map<string, TagAggregate>();

  function registerMention(
    rawCandidate: string,
    isHashtag: boolean,
    post: RawPostRecord,
    recencyFactor: number,
    engagementScore: number,
    isRecent6h: boolean
  ) {
    const cleanName = rawCandidate.replace(/^#/, '').trim();
    if (cleanName.length < 2) return;

    const normalizedKey = cleanName.toLowerCase();
    const displayTag = isHashtag ? `#${cleanName}` : `#${cleanName}`;

    let agg = tagMap.get(normalizedKey);
    if (!agg) {
      agg = {
        tag: displayTag,
        rawName: cleanName,
        isHashtag,
        postsCount24h: 0,
        authors: new Set<string>(),
        weightedScore: 0,
        recentWindowPosts: 0,
        priorWindowPosts: 0,
      };
      tagMap.set(normalizedKey, agg);
    }

    agg.postsCount24h += 1;
    if (post.author_id) {
      agg.authors.add(post.author_id);
    }
    agg.weightedScore += engagementScore * recencyFactor;

    if (isRecent6h) {
      agg.recentWindowPosts += 1;
    } else {
      agg.priorWindowPosts += 1;
    }
  }

  for (const post of postsData) {
    const postTime = new Date(post.created_at).getTime();
    const ageHours = Math.max(0, (now - postTime) / (1000 * 60 * 60));

    // Twitter Recency Multiplier:
    // Posts in last 6 hours get high surge weight (1.6x), 6-12h (1.3x), 12-24h (1.0x)
    let recencyFactor = 1.0;
    const isRecent6h = ageHours <= 6;
    if (ageHours <= 6) {
      recencyFactor = 1.6;
    } else if (ageHours <= 12) {
      recencyFactor = 1.3;
    } else if (ageHours <= 24) {
      recencyFactor = 1.0;
    } else {
      // Exponential decay for posts > 24h
      recencyFactor = Math.max(0.2, Math.exp(-0.06 * (ageHours - 24)));
    }

    // Engagement Weight
    const likes = post.likes_count || 0;
    const comments = post.comments_count || 0;
    const reposts = post.reposts_count || 0;
    const engagementScore = likes * 1.2 + comments * 2.0 + reposts * 1.8 + 1.0;

    // A. Extract Hashtags from post content
    if (post.content) {
      const matches = post.content.matchAll(HASHTAG_REGEX);
      for (const m of matches) {
        if (m[1]) {
          registerMention(m[1], true, post, recencyFactor, engagementScore, isRecent6h);
        }
      }
    }

    // B. Extract Post Topics
    if (post.post_topics && Array.isArray(post.post_topics)) {
      for (const pt of post.post_topics) {
        if (pt.topic?.name) {
          registerMention(pt.topic.name, false, post, recencyFactor, engagementScore, isRecent6h);
        }
      }
    }
  }

  // 3. Compute final Twitter-style trending scores
  const calculatedTrends: TrendingTag[] = [];

  for (const [, agg] of tagMap.entries()) {
    const uniqueAuthorsCount = agg.authors.size || 1;

    // Twitter Anti-Spam Diversity Penalty:
    // If 100 posts come from only 1 author, penalize score
    const authorEntropyMultiplier =
      uniqueAuthorsCount === 1 && agg.postsCount24h > 2
        ? 0.5
        : Math.min(2.5, 1.0 + (uniqueAuthorsCount - 1) * 0.35);

    // Velocity Growth Rate (% surge in recent 6h compared to prior period)
    const baselinePerHour = Math.max(0.5, agg.priorWindowPosts / 18);
    const recentPerHour = agg.recentWindowPosts / 6;
    const growthRatePct = Math.round(
      Math.max(0, ((recentPerHour - baselinePerHour) / baselinePerHour) * 100)
    );

    const finalScore = Number((agg.weightedScore * authorEntropyMultiplier).toFixed(2));

    calculatedTrends.push({
      id: `trend-${agg.rawName.toLowerCase()}`,
      tag: agg.tag,
      rawName: agg.rawName,
      isHashtag: agg.isHashtag,
      category: categorizeTag(agg.rawName),
      postsCount24h: agg.postsCount24h,
      authorsCount24h: uniqueAuthorsCount,
      trendingScore: finalScore,
      rank: 0,
      growthRatePct: growthRatePct > 0 ? growthRatePct : undefined,
      timeWindow: '24h',
    });
  }

  // Sort descending by trending score
  calculatedTrends.sort((a, b) => b.trendingScore - a.trendingScore);

  // If calculated trends from DB are fewer than 5, blend with curated seed trends
  let finalTrends: TrendingTag[] = calculatedTrends;
  if (finalTrends.length < 5) {
    const existingRaw = new Set(finalTrends.map((t) => t.rawName.toLowerCase()));
    for (const seed of CURATED_SEED_TRENDS) {
      if (!existingRaw.has(seed.rawName.toLowerCase())) {
        finalTrends.push(seed);
        if (finalTrends.length >= 7) break;
      }
    }
  }

  // Assign 1-indexed ranks
  finalTrends = finalTrends.slice(0, 10).map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));

  // Update in-memory and persistent cache
  memoryTrendingCache = finalTrends;
  lastFetchTimestamp = now;
  appStorage.setItem(STORAGE_KEY, JSON.stringify(finalTrends)).catch(() => {});

  return {
    trends: finalTrends,
    timeWindow: '24h',
    totalPostsAnalyzed: postsData.length,
    generatedAt: new Date(now).toISOString(),
  };
}
