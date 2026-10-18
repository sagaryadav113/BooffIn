import { supabase, appStorage } from './client';
import { TrendingTag, TrendingResponse, HashtagDetailData } from '../types/trending';
import { Post } from '../types/post';
import { mapSupabasePost, populatePollVotes } from './socialService';

const STORAGE_KEY = '@booffin_trending_tags_real';
const HASHTAG_REGEX = /(?:^|\s)#([a-zA-Z0-9_\u00c0-\u024f]{2,50})/g;

// In-memory cache for synchronous 0ms render
let memoryTrendingCache: TrendingTag[] | null = null;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Intelligent scientific categorization based on hashtag content keywords
 */
export function categorizeTag(name: string): string {
  const lower = name.toLowerCase();

  if (
    lower.includes('ai') ||
    lower.includes('llm') ||
    lower.includes('gpt') ||
    lower.includes('deeplearning') ||
    lower.includes('machinelearning') ||
    lower.includes('neural') ||
    lower.includes('transformer') ||
    lower.includes('robot') ||
    lower.includes('agent') ||
    lower.includes('alphafold') ||
    lower.includes('nlp')
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
    lower.includes('memory') ||
    lower.includes('bci')
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

  if (lower.includes('booffin') || lower.includes('boffin')) {
    return 'BooffIn Community';
  }

  return 'Trending in Science';
}

/**
 * Returns in-memory synchronous cached trends
 */
export function getTrendingTagsSync(): TrendingTag[] {
  if (memoryTrendingCache && memoryTrendingCache.length > 0) {
    return memoryTrendingCache;
  }
  return [];
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

  return [];
}

interface RawPostActivity {
  id: string;
  content: string | null;
  author_id: string | null;
  likes_count?: number | null;
  comments_count?: number | null;
  reposts_count?: number | null;
  created_at: string;
}

interface TagAggregate {
  tag: string;
  rawName: string;
  postsCount: number;
  authors: Set<string>;
  weightedScore: number;
  recentWindowPosts: number;
}

/**
 * Executes True Twitter-style Virality & Velocity Trending Algorithm
 * using 100% REAL data from the Supabase database.
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

  let records: RawPostActivity[] = [];

  try {
    // Fetch all real posts from Supabase database
    const { data: postsData, error: postsErr } = await supabase
      .from('posts')
      .select('id, content, author_id, likes_count, comments_count, reposts_count, created_at')
      .order('created_at', { ascending: false })
      .limit(300);

    if (!postsErr && postsData) {
      records = postsData;
    }

    // Also fetch comments containing hashtags
    const { data: commentsData } = await supabase
      .from('comments')
      .select('id, content, author_id, created_at')
      .like('content', '%#%')
      .limit(100);

    if (commentsData && commentsData.length > 0) {
      records.push(
        ...commentsData.map((c) => ({
          ...c,
          likes_count: 0,
          comments_count: 0,
          reposts_count: 0,
        }))
      );
    }
  } catch (err) {
    console.warn('[trendingService.fetchTrendingTags] Database query error:', err);
  }

  // Aggregate real hashtags
  const tagMap = new Map<string, TagAggregate>();

  for (const record of records) {
    if (!record.content) continue;

    const matches = record.content.matchAll(HASHTAG_REGEX);
    const postTime = new Date(record.created_at).getTime();
    const isRecent24h = postTime >= now - 24 * 60 * 60 * 1000;

    const likes = record.likes_count || 0;
    const comments = record.comments_count || 0;
    const reposts = record.reposts_count || 0;
    const engagementScore = likes * 1.5 + comments * 2.5 + reposts * 2.0 + 1.0;

    for (const m of matches) {
      const cleanName = (m[1] || '').trim();
      if (cleanName.length < 2) continue;

      const normKey = cleanName.toLowerCase();
      let agg = tagMap.get(normKey);

      if (!agg) {
        agg = {
          tag: `#${cleanName}`,
          rawName: cleanName,
          postsCount: 0,
          authors: new Set<string>(),
          weightedScore: 0,
          recentWindowPosts: 0,
        };
        tagMap.set(normKey, agg);
      }

      agg.postsCount += 1;
      if (record.author_id) {
        agg.authors.add(record.author_id);
      }
      agg.weightedScore += engagementScore;
      if (isRecent24h) {
        agg.recentWindowPosts += 1;
      }
    }
  }

  // Calculate Twitter-style trending scores
  const calculatedTrends: TrendingTag[] = [];

  for (const [, agg] of tagMap.entries()) {
    const uniqueAuthorsCount = agg.authors.size || 1;

    // Twitter Virality Multiplier:
    // Multi-author adoption is rewarded exponentially; single user spam is penalized
    const viralityDiversityMultiplier =
      uniqueAuthorsCount <= 1
        ? 0.2
        : Math.min(25, Math.pow(uniqueAuthorsCount, 1.25) * 1.4);

    const baseActivityScore = agg.postsCount * 5 + agg.weightedScore * 1.2;
    const finalScore = Number((baseActivityScore * viralityDiversityMultiplier).toFixed(2));

    // Growth rate percentage based on real activity
    const growthRatePct = Math.min(
      350,
      Math.max(25, Math.round((agg.recentWindowPosts / Math.max(1, agg.postsCount)) * 120 + agg.postsCount * 8))
    );

    calculatedTrends.push({
      id: `trend-${agg.rawName.toLowerCase()}`,
      tag: agg.tag,
      rawName: agg.rawName,
      isHashtag: true,
      category: categorizeTag(agg.rawName),
      postsCount24h: agg.postsCount,
      authorsCount24h: uniqueAuthorsCount,
      trendingScore: finalScore,
      rank: 0,
      growthRatePct,
      timeWindow: '24h',
    });
  }

  // Sort strictly by trendingScore descending
  calculatedTrends.sort((a, b) => b.trendingScore - a.trendingScore);

  // Assign 1-indexed ranks
  const finalTrends: TrendingTag[] = calculatedTrends.slice(0, 10).map((item, idx) => ({
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
    totalPostsAnalyzed: records.length,
    generatedAt: new Date(now).toISOString(),
  };
}

/**
 * Fetch top and latest posts for a specific hashtag from the real Supabase backend.
 * Returns ONLY real posts from the database (no mock/demo posts).
 */
export async function fetchPostsByHashtag(
  rawTag: string,
  sort: 'top' | 'latest' = 'top'
): Promise<HashtagDetailData> {
  const cleanName = rawTag.replace(/^#/, '').trim();
  const displayTag = `#${cleanName}`;

  try {
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id;

    // Check user blocked list to exclude blocked authors
    const viewerBlockedSet = new Set<string>();
    if (currentUserId) {
      const { data: blocks } = await supabase
        .from('user_blocks')
        .select('blocker_id, blocked_id')
        .or(`blocker_id.eq.${currentUserId},blocked_id.eq.${currentUserId}`);
      if (blocks) {
        blocks.forEach((b: any) => {
          viewerBlockedSet.add(b.blocker_id === currentUserId ? b.blocked_id : b.blocker_id);
        });
      }
    }

    // 1. Query real posts matching the hashtag (case-insensitive ilike)
    let query = supabase
      .from('posts')
      .select(`
        id,
        post_type,
        content,
        visibility,
        media_urls,
        likes_count,
        comments_count,
        reposts_count,
        saves_count,
        created_at,
        author:profiles!author_id (
          id,
          username,
          full_name,
          avatar_url,
          academic_title,
          institution,
          orcid_id,
          orcid_verified
        ),
        paper:papers!paper_id (
          id,
          doi,
          canonical_url,
          title,
          abstract,
          journal,
          publisher,
          publication_date,
          publication_year,
          open_access_status,
          open_access_pdf_url,
          citation_count,
          discussion_count,
          likes_count,
          saves_count,
          paper_authors (
            author_name,
            author_order,
            affiliation,
            external_author_id
          )
        ),
        post_topics (
          topic:topics!topic_id (
            id,
            name,
            slug
          )
        )
      `)
      .ilike('content', `%#${cleanName}%`);

    if (sort === 'top') {
      query = query
        .order('likes_count', { ascending: false })
        .order('comments_count', { ascending: false })
        .order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: rawRows, error } = await query.limit(50);

    if (error) {
      console.warn('[trendingService.fetchPostsByHashtag] Error querying posts:', error.message);
    }

    let posts: Post[] = [];
    if (rawRows && rawRows.length > 0) {
      // Filter out blocked users
      const validRows = rawRows.filter((r: any) => !viewerBlockedSet.has(r.author?.id));
      posts = validRows.map((r: any) => mapSupabasePost(r, currentUserId));
      posts = await populatePollVotes(posts, currentUserId);

      // Populate user's like/save/repost status if authenticated
      if (currentUserId && posts.length > 0) {
        const postIds = posts.map((p) => p.id);
        const [likesRes, savesRes, repostsRes] = await Promise.all([
          supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', currentUserId)
            .in('post_id', postIds),
          supabase
            .from('bookmarks')
            .select('post_id')
            .eq('user_id', currentUserId)
            .in('post_id', postIds),
          supabase
            .from('reposts')
            .select('post_id')
            .eq('user_id', currentUserId)
            .in('post_id', postIds),
        ]);

        const likedIds = new Set(likesRes.data?.map((l: any) => l.post_id) || []);
        const savedIds = new Set(savesRes.data?.map((s: any) => s.post_id) || []);
        const repostedIds = new Set(repostsRes.data?.map((r: any) => r.post_id) || []);

        posts = posts.map((p) => ({
          ...p,
          isLiked: likedIds.has(p.id),
          isSaved: savedIds.has(p.id),
          isReposted: repostedIds.has(p.id),
        }));
      }
    }

    // Dynamic metadata directly from the real posts
    const postsCount = posts.length;
    const uniqueAuthors = new Set(posts.map((p) => p.author?.id).filter(Boolean)).size;

    // Check trending cache for current rank & velocity if available
    const trends = getTrendingTagsSync();
    const trendItem = trends.find((t) => t.rawName.toLowerCase() === cleanName.toLowerCase());

    return {
      tag: displayTag,
      rawName: cleanName,
      category: trendItem?.category || categorizeTag(cleanName),
      rank: trendItem?.rank,
      growthRatePct: trendItem?.growthRatePct || (postsCount > 0 ? 45 : undefined),
      postsCount24h: postsCount,
      authorsCount24h: uniqueAuthors,
      posts,
    };
  } catch (err) {
    console.warn('[trendingService.fetchPostsByHashtag] Unexpected error:', err);
    return {
      tag: displayTag,
      rawName: cleanName,
      category: categorizeTag(cleanName),
      postsCount24h: 0,
      authorsCount24h: 0,
      posts: [],
    };
  }
}
