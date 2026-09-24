import { supabase } from './client';
import { Post, Comment, PostType, Paper, UserProfile } from '../types';
import { mockPosts, mockComments, mockUsers, mockPapers } from '../data/mockData';
import { getFollowedTopicsForUser } from './topicService';
import { getFeedRanker, buildUserRankingContext } from './ranking/feedRanker';

/**
 * Explainable "For You" Feed Ranking Function
 * Transparent, deterministic scoring:
 * 1. Followed Topic Match (+50 pts per matching topic followed by the user)
 * 2. Peer-Reviewed Paper Reference (+15 pts if referencing an external paper / DOI)
 * 3. Social Interaction Weight (+2 per like, +3 per comment, +4 per repost)
 * 4. Recency Score (up to +30 pts for fresh scientific discussions)
 */
export function calculateExplainableFeedScore(
  post: Post,
  followedTopicNames: string[]
): number {
  let score = 0;

  // 1. Followed Topic Match (+150 per matching followed topic)
  if (followedTopicNames && followedTopicNames.length > 0) {
    const matchingCount = post.topics.filter((pt) =>
      followedTopicNames.some(
        (ft) => ft.includes(pt.toLowerCase()) || pt.toLowerCase().includes(ft)
      )
    ).length;
    score += matchingCount * 150;
  }

  // 2. Peer-Reviewed Paper Reference Bonus
  if (post.paper) {
    score += 25;
  }

  // 3. Social Interaction Weight
  score += (post.likesCount || 0) * 1.5;
  score += (post.commentsCount || 0) * 2.5;
  score += (post.repostsCount || 0) * 3;

  // 4. Recency Bonus
  if (post.createdAt.includes('m ago') || post.createdAt.includes('Just now')) {
    score += 40;
  } else if (post.createdAt.includes('h ago')) {
    const hours = parseInt(post.createdAt, 10) || 1;
    score += Math.max(0, 30 - hours * 2);
  } else if (post.createdAt.includes('d ago')) {
    const days = parseInt(post.createdAt, 10) || 1;
    score += Math.max(0, 15 - days * 2);
  }

  return Math.round(score);
}

// Helper to determine if we're in real Supabase mode vs local mock mode
export function isSupabaseConfigured(): boolean {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  return Boolean(
    url &&
      !url.includes('dummy') &&
      !url.includes('placeholder') &&
      !url.includes('booffin-project.supabase.co') &&
      key &&
      !key.includes('dummy_anon_key')
  );
}

// In-Memory Social Graph & Interaction Store (used for local mode / offline resilience)
const localLikes = new Set<string>();
const localReposts = new Set<string>();
const localBookmarks = new Set<string>();
const localFollows = new Set<string>(['usr_me:usr_1', 'usr_me:usr_2']);
const localCommentsStore: Record<string, Comment[]> = { ...mockComments };
const localCreatedPosts: Post[] = [];

// Relative time formatting helper
export function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return 'Just now';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (isNaN(diffInSeconds) || diffInSeconds < 0) return dateString;
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}

// Map a raw Supabase profile row to UserProfile
export function mapSupabaseProfile(row: any): UserProfile {
  if (!row) {
    return {
      id: 'unknown',
      handle: 'researcher',
      fullName: 'Researcher',
      academicTitle: 'Independent Scientist',
      institution: 'Independent',
      bio: '',
      orcidVerified: false,
      joinedDate: 'Recently',
      followingCount: 0,
      followersCount: 0,
      postsCount: 0,
      savedCount: 0,
    };
  }
  return {
    id: row.id,
    handle: row.username || row.handle || 'researcher',
    fullName: row.full_name || 'Researcher',
    avatarUrl: row.avatar_url || undefined,
    academicTitle: row.academic_title || 'Researcher',
    institution: row.institution || 'Independent',
    bio: row.bio || '',
    location: row.location || undefined,
    country: row.country || undefined,
    orcidId: row.orcid_id || undefined,
    orcidVerified: Boolean(row.orcid_verified),
    websiteUrl: row.website_url || undefined,
    researchInterests: Array.isArray(row.research_interests) ? row.research_interests : [],
    followersCount: row.followers_count || 0,
    followingCount: row.following_count || 0,
    postsCount: row.posts_count || 0,
    savedCount: row.saved_count || 0,
    joinedDate: row.created_at
      ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : 'Recently',
    isFollowing: row.is_following,
  };
}

// Map a raw Supabase paper row to Paper
export function mapSupabasePaper(row: any, currentUserId?: string): Paper {
  const authors = Array.isArray(row.paper_authors || row.authors)
    ? (row.paper_authors || row.authors)
        .sort((a: any, b: any) => (a.author_order || 0) - (b.author_order || 0))
        .map((a: any) => ({
          name: a.author_name || a.name || 'Author',
          affiliation: a.affiliation || undefined,
          orcid: a.external_author_id || a.orcid || undefined,
        }))
    : [];

  const isSaved = Array.isArray(row.bookmarks)
    ? row.bookmarks.some((b: any) => b.user_id === currentUserId)
    : false;

  return {
    id: row.id,
    doi: row.doi || undefined,
    title: row.title || 'Untitled Paper',
    abstract: row.abstract || '',
    authors: authors.length > 0 ? authors : [{ name: 'Anonymous Researcher' }],
    journal: row.journal || 'Academic Preprint',
    publisher: row.publisher || undefined,
    publicationYear: row.publication_year || new Date().getFullYear(),
    publicationDate: row.publication_date || undefined,
    canonicalUrl: row.canonical_url || '',
    openAccessUrl: row.open_access_pdf_url || undefined,
    isOpenAccess: row.open_access_status !== 'closed',
    topics: Array.isArray(row.paper_topics)
      ? row.paper_topics.map((pt: any) => pt.topic?.name).filter(Boolean)
      : [],
    citationCount: row.citation_count || 0,
    discussionCount: row.discussion_count || 0,
    likesCount: row.likes_count || 0,
    savesCount: row.saves_count || 0,
    isSaved: isSaved || Boolean(row.is_saved),
  };
}

// Single-query mapping helper to convert nested Supabase post query to Post
export function mapSupabasePost(row: any, currentUserId?: string): Post {
  const author = mapSupabaseProfile(row.author);
  const paper = row.paper ? mapSupabasePaper(row.paper, currentUserId) : undefined;

  const topics: string[] = Array.isArray(row.post_topics)
    ? row.post_topics.map((pt: any) => pt.topic?.name).filter(Boolean)
    : [];

  const isLiked = Array.isArray(row.likes)
    ? row.likes.some((l: any) => l.user_id === currentUserId)
    : Boolean(row.is_liked);

  const isReposted = Array.isArray(row.reposts)
    ? row.reposts.some((r: any) => r.user_id === currentUserId)
    : Boolean(row.is_reposted);

  const isSaved = Array.isArray(row.bookmarks)
    ? row.bookmarks.some((b: any) => b.user_id === currentUserId)
    : Boolean(row.is_saved);

  return {
    id: row.id,
    author,
    postType: (row.post_type as PostType) || 'discussion',
    content: row.content || '',
    paper,
    images: Array.isArray(row.media_urls) ? row.media_urls : [],
    topics: topics.length > 0 ? topics : ['General Science'],
    visibility: row.visibility || 'public',
    likesCount: row.likes_count || 0,
    commentsCount: row.comments_count || 0,
    repostsCount: row.reposts_count || 0,
    savesCount: row.saves_count || 0,
    isLiked,
    isReposted,
    isSaved,
    createdAt: formatRelativeTime(row.created_at),
  };
}

// Map raw Supabase comment row to Comment
export function mapSupabaseComment(row: any, _currentUserId?: string): Comment {
  const author = mapSupabaseProfile(row.author);
  return {
    id: row.id,
    postId: row.post_id,
    author,
    content: row.content,
    parentId: row.parent_id || undefined,
    likesCount: row.likes_count || 0,
    isLiked: false,
    createdAt: formatRelativeTime(row.created_at),
    replies: [],
  };
}

// ============================================================================
// 1. READ FEED (Paginated, Non-N+1 Single-Query Join)
// ============================================================================
export interface FetchFeedOptions {
  tab?: string; // 'For You' | 'Following' | Topic Name
  page?: number;
  pageSize?: number;
  currentUserId?: string;
}

export async function fetchFeed(
  options: FetchFeedOptions = {}
): Promise<{ posts: Post[]; hasMore: boolean; error: string | null }> {
  const { tab = 'For You', page = 1, pageSize = 10, currentUserId } = options;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  if (!isSupabaseConfigured()) {
    return getFallbackFeed(tab, page, pageSize, currentUserId);
  }

  try {
    let query = supabase
      .from('posts')
      .select(
        `
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
          bio,
          orcid_id,
          orcid_verified,
          followers_count,
          following_count
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
        ),
        likes!left ( user_id ),
        reposts!left ( user_id ),
        bookmarks!left ( user_id )
      `
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (tab === 'Following' && currentUserId) {
      const { data: followRows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId);

      const followingIds = (followRows || []).map((f) => f.following_id);
      if (followingIds.length > 0) {
        query = query.in('author_id', followingIds);
      } else {
        return { posts: [], hasMore: false, error: null };
      }
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return getFallbackFeed(tab, page, pageSize, currentUserId);
    }

    const mappedPosts = data.map((row: any) => mapSupabasePost(row, currentUserId));

    let filtered = mappedPosts;
    if (tab === 'For You') {
      const followedUserIds = currentUserId
        ? Array.from(localFollows).filter((f) => f.startsWith(`${currentUserId}:`)).map((f) => f.split(':')[1])
        : ['usr_1', 'usr_2'];
      const context = buildUserRankingContext(currentUserId, followedUserIds);
      if (currentUserId) {
        for (const key of localLikes) {
          if (key.startsWith(`${currentUserId}:`)) context.userLikedPostIds.add(key.split(':')[1]);
        }
        for (const key of localBookmarks) {
          if (key.startsWith(`${currentUserId}:post:`)) context.userSavedPostIds.add(key.replace(`${currentUserId}:post:`, ''));
        }
      }
      filtered = getFeedRanker().rank(mappedPosts, context);
    } else if (tab !== 'For You' && tab !== 'Following') {
      const targetTopic = tab.toLowerCase();
      filtered = mappedPosts.filter((p) =>
        p.topics.some((t) => t.toLowerCase().includes(targetTopic))
      );
    }

    return {
      posts: filtered,
      hasMore: data.length === pageSize,
      error: null,
    };
  } catch {
    return getFallbackFeed(tab, page, pageSize, currentUserId);
  }
}

// Fallback mock feed for offline / initial development resilience
function getFallbackFeed(
  tab: string,
  page: number,
  pageSize: number,
  currentUserId?: string
): { posts: Post[]; hasMore: boolean; error: string | null } {
  let allPosts = [...localCreatedPosts, ...mockPosts];

  // Overlay user interaction state
  if (currentUserId) {
    allPosts = allPosts.map((p) => ({
      ...p,
      isLiked: localLikes.has(`${currentUserId}:${p.id}`) || p.isLiked,
      isReposted: localReposts.has(`${currentUserId}:${p.id}`) || p.isReposted,
      isSaved: localBookmarks.has(`${currentUserId}:post:${p.id}`) || p.isSaved,
    }));
  }

  let filtered = allPosts;

  if (tab === 'For You') {
    const followedUserIds = currentUserId
      ? Array.from(localFollows).filter((f) => f.startsWith(`${currentUserId}:`)).map((f) => f.split(':')[1])
      : ['usr_1', 'usr_2'];
    const context = buildUserRankingContext(currentUserId, followedUserIds);
    if (currentUserId) {
      for (const key of localLikes) {
        if (key.startsWith(`${currentUserId}:`)) context.userLikedPostIds.add(key.split(':')[1]);
      }
      for (const key of localBookmarks) {
        if (key.startsWith(`${currentUserId}:post:`)) context.userSavedPostIds.add(key.replace(`${currentUserId}:post:`, ''));
      }
    }
    filtered = getFeedRanker().rank(allPosts, context);
  } else if (tab === 'Following' && currentUserId) {
    filtered = allPosts.filter((p) => localFollows.has(`${currentUserId}:${p.author.id}`));
  } else if (tab !== 'For You' && tab !== 'Following') {
    if (tab === 'AI & Bio') {
      filtered = allPosts.filter((post) =>
        post.topics.some(
          (t) =>
            t.toLowerCase().includes('ai') ||
            t.toLowerCase().includes('bioinformatics') ||
            t.toLowerCase().includes('single cell') ||
            t.toLowerCase().includes('multi-omics')
        )
      );
    } else {
      filtered = allPosts.filter((post) =>
        post.topics.some((t) => t.toLowerCase().includes(tab.toLowerCase()))
      );
    }
  }

  const start = (page - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  return {
    posts: paginated,
    hasMore: start + pageSize < filtered.length,
    error: null,
  };
}

// ============================================================================
// 2. CREATE POST
// ============================================================================
export interface CreatePostPayload {
  content: string;
  postType: PostType;
  paper?: Paper;
  topics: string[];
  visibility?: 'public' | 'followers';
  authorId: string;
  mediaUrls?: string[];
}

export async function createPost(
  payload: CreatePostPayload
): Promise<{ post: Post | null; error: string | null }> {
  const { content, postType, paper, topics, visibility = 'public', authorId, mediaUrls = [] } = payload;

  if (!authorId) {
    return { post: null, error: 'User must be authenticated to create a post.' };
  }

  if (!isSupabaseConfigured()) {
    const authorUser = mockUsers.find((u) => u.id === authorId) || {
      id: authorId,
      handle: 'researcher',
      fullName: 'Researcher',
      academicTitle: 'Scientist',
      institution: 'Independent',
      bio: '',
      orcidVerified: false,
      joinedDate: 'Recently',
      followingCount: 0,
      followersCount: 0,
      postsCount: 1,
      savedCount: 0,
    };

    const newPost: Post = {
      id: `post_${Date.now()}`,
      author: authorUser,
      postType,
      content,
      paper,
      topics: topics.length > 0 ? topics : ['General Science'],
      visibility,
      images: mediaUrls,
      likesCount: 0,
      commentsCount: 0,
      repostsCount: 0,
      savesCount: 0,
      isLiked: false,
      isReposted: false,
      isSaved: false,
      createdAt: 'Just now',
    };

    localCreatedPosts.unshift(newPost);
    return { post: newPost, error: null };
  }

  try {
    let paperId: string | null = null;

    if (paper) {
      if (paper.id && !paper.id.startsWith('paper_')) {
        paperId = paper.id;
      } else {
        const { data: existingPaper } = await supabase
          .from('papers')
          .select('id')
          .eq('doi', paper.doi || '')
          .maybeSingle();

        if (existingPaper?.id) {
          paperId = existingPaper.id;
        } else {
          const { data: newPaper, error: paperError } = await supabase
            .from('papers')
            .insert({
              doi: paper.doi || null,
              canonical_url: paper.canonicalUrl || `https://doi.org/${paper.doi}`,
              title: paper.title,
              abstract: paper.abstract || null,
              journal: paper.journal || 'General Science',
              publisher: paper.publisher || null,
              publication_year: paper.publicationYear || new Date().getFullYear(),
              publication_date: paper.publicationDate || null,
              open_access_status: paper.isOpenAccess ? 'gold' : 'closed',
              open_access_pdf_url: paper.openAccessUrl || null,
            })
            .select('id')
            .single();

          if (!paperError && newPaper) {
            paperId = newPaper.id;
            if (paper.authors && paper.authors.length > 0) {
              const authorsToInsert = paper.authors.map((a, idx) => ({
                paper_id: paperId,
                author_name: a.name,
                author_order: idx + 1,
                affiliation: a.affiliation || null,
                external_author_id: a.orcid || null,
              }));
              await supabase.from('paper_authors').insert(authorsToInsert);
            }
          }
        }
      }
    }

    const { data: postRow, error: postError } = await supabase
      .from('posts')
      .insert({
        author_id: authorId,
        post_type: postType,
        content,
        paper_id: paperId,
        visibility,
        media_urls: mediaUrls,
      })
      .select(
        `
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
        author:profiles!author_id (*)
      `
      )
      .single();

    if (postError) {
      return { post: null, error: postError.message };
    }

    if (topics && topics.length > 0 && postRow?.id) {
      for (const topicName of topics) {
        const slug = topicName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const { data: topicData } = await supabase
          .from('topics')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();

        let topicId = topicData?.id;
        if (!topicId) {
          const { data: createdTopic } = await supabase
            .from('topics')
            .insert({ name: topicName, slug })
            .select('id')
            .maybeSingle();
          topicId = createdTopic?.id;
        }

        if (topicId) {
          await supabase
            .from('post_topics')
            .insert({ post_id: postRow.id, topic_id: topicId });
        }
      }
    }

    const fullPost: Post = {
      id: postRow.id,
      author: mapSupabaseProfile(postRow.author),
      postType,
      content,
      paper,
      topics,
      visibility,
      likesCount: 0,
      commentsCount: 0,
      repostsCount: 0,
      savesCount: 0,
      isLiked: false,
      isReposted: false,
      isSaved: false,
      createdAt: 'Just now',
    };

    return { post: fullPost, error: null };
  } catch (err: any) {
    return { post: null, error: err?.message || 'Failed to publish post.' };
  }
}

// ============================================================================
// 3. LIKE & UNLIKE (Duplicate Prevention & Counter Trigger)
// ============================================================================
export async function toggleLike(
  postId: string,
  isCurrentlyLiked: boolean,
  userId: string
): Promise<{ success: boolean; isLiked: boolean; error: string | null }> {
  if (!userId) {
    return { success: false, isLiked: isCurrentlyLiked, error: 'User not authenticated' };
  }

  const key = `${userId}:${postId}`;

  if (!isSupabaseConfigured()) {
    if (isCurrentlyLiked) {
      localLikes.delete(key);
      return { success: true, isLiked: false, error: null };
    } else {
      localLikes.add(key); // Set inherently prevents duplicate likes
      return { success: true, isLiked: true, error: null };
    }
  }

  try {
    if (isCurrentlyLiked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', postId);

      if (error && !error.message.includes('not found')) {
        return { success: false, isLiked: isCurrentlyLiked, error: error.message };
      }
      return { success: true, isLiked: false, error: null };
    } else {
      const { error } = await supabase
        .from('likes')
        .upsert(
          { user_id: userId, post_id: postId },
          { onConflict: 'user_id,post_id', ignoreDuplicates: true }
        );

      if (error) {
        return { success: false, isLiked: isCurrentlyLiked, error: error.message };
      }
      return { success: true, isLiked: true, error: null };
    }
  } catch (err: any) {
    return { success: false, isLiked: isCurrentlyLiked, error: err?.message };
  }
}

// ============================================================================
// 4. REPOST & UNDO REPOST (Duplicate Prevention & Counter Trigger)
// ============================================================================
export async function toggleRepost(
  postId: string,
  isCurrentlyReposted: boolean,
  userId: string
): Promise<{ success: boolean; isReposted: boolean; error: string | null }> {
  if (!userId) {
    return { success: false, isReposted: isCurrentlyReposted, error: 'User not authenticated' };
  }

  const key = `${userId}:${postId}`;

  if (!isSupabaseConfigured()) {
    if (isCurrentlyReposted) {
      localReposts.delete(key);
      return { success: true, isReposted: false, error: null };
    } else {
      localReposts.add(key);
      return { success: true, isReposted: true, error: null };
    }
  }

  try {
    if (isCurrentlyReposted) {
      const { error } = await supabase
        .from('reposts')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', postId);

      if (error && !error.message.includes('not found')) {
        return { success: false, isReposted: isCurrentlyReposted, error: error.message };
      }
      return { success: true, isReposted: false, error: null };
    } else {
      const { error } = await supabase
        .from('reposts')
        .upsert(
          { user_id: userId, post_id: postId },
          { onConflict: 'user_id,post_id', ignoreDuplicates: true }
        );

      if (error) {
        return { success: false, isReposted: isCurrentlyReposted, error: error.message };
      }
      return { success: true, isReposted: true, error: null };
    }
  } catch (err: any) {
    return { success: false, isReposted: isCurrentlyReposted, error: err?.message };
  }
}

// ============================================================================
// 5. BOOKMARK & REMOVE BOOKMARK (For Posts and Papers)
// ============================================================================
export interface ToggleBookmarkTarget {
  postId?: string;
  paperId?: string;
}

export async function toggleBookmark(
  target: ToggleBookmarkTarget,
  isCurrentlySaved: boolean,
  userId: string
): Promise<{ success: boolean; isSaved: boolean; error: string | null }> {
  if (!userId) {
    return { success: false, isSaved: isCurrentlySaved, error: 'User not authenticated' };
  }
  if (!target.postId && !target.paperId) {
    return { success: false, isSaved: isCurrentlySaved, error: 'Must specify postId or paperId' };
  }

  const key = target.postId
    ? `${userId}:post:${target.postId}`
    : `${userId}:paper:${target.paperId}`;

  if (!isSupabaseConfigured()) {
    if (isCurrentlySaved) {
      localBookmarks.delete(key);
      return { success: true, isSaved: false, error: null };
    } else {
      localBookmarks.add(key);
      return { success: true, isSaved: true, error: null };
    }
  }

  try {
    if (isCurrentlySaved) {
      let deleteQuery = supabase.from('bookmarks').delete().eq('user_id', userId);
      if (target.postId) deleteQuery = deleteQuery.eq('post_id', target.postId);
      if (target.paperId) deleteQuery = deleteQuery.eq('paper_id', target.paperId);

      const { error } = await deleteQuery;
      if (error && !error.message.includes('not found')) {
        return { success: false, isSaved: isCurrentlySaved, error: error.message };
      }
      return { success: true, isSaved: false, error: null };
    } else {
      const { error } = await supabase.from('bookmarks').insert({
        user_id: userId,
        post_id: target.postId || null,
        paper_id: target.paperId || null,
      });

      if (error) {
        if (error.code === '23505') {
          return { success: true, isSaved: true, error: null };
        }
        return { success: false, isSaved: isCurrentlySaved, error: error.message };
      }
      return { success: true, isSaved: true, error: null };
    }
  } catch (err: any) {
    return { success: false, isSaved: isCurrentlySaved, error: err?.message };
  }
}

// ============================================================================
// 6. COMMENTS (Fetch, Add & Delete Own Comment with RLS Enforcement)
// ============================================================================
export async function fetchComments(
  postId: string,
  currentUserId?: string
): Promise<{ comments: Comment[]; error: string | null }> {
  if (!isSupabaseConfigured()) {
    const list = localCommentsStore[postId] || [];
    return { comments: list, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('comments')
      .select(
        `
        id,
        post_id,
        parent_id,
        path,
        content,
        likes_count,
        created_at,
        author:profiles!author_id (
          id,
          username,
          full_name,
          avatar_url,
          academic_title,
          institution,
          bio,
          orcid_id,
          orcid_verified
        )
      `
      )
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error || !data) {
      const mockList = localCommentsStore[postId] || [];
      return { comments: mockList, error: null };
    }

    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    data.forEach((row: any) => {
      const comment = mapSupabaseComment(row, currentUserId);
      commentMap.set(comment.id, comment);
    });

    data.forEach((row: any) => {
      const comment = commentMap.get(row.id);
      if (!comment) return;

      if (row.parent_id && commentMap.has(row.parent_id)) {
        const parent = commentMap.get(row.parent_id)!;
        parent.replies = parent.replies || [];
        parent.replies.push(comment);
      } else {
        rootComments.push(comment);
      }
    });

    return { comments: rootComments, error: null };
  } catch {
    return { comments: localCommentsStore[postId] || [], error: null };
  }
}

export interface AddCommentPayload {
  postId: string;
  content: string;
  parentId?: string;
  authorId: string;
}

export async function addComment(
  payload: AddCommentPayload
): Promise<{ comment: Comment | null; error: string | null }> {
  const { postId, content, parentId, authorId } = payload;

  if (!authorId) {
    return { comment: null, error: 'Authentication required to post comment.' };
  }

  if (!isSupabaseConfigured()) {
    const authorUser = mockUsers.find((u) => u.id === authorId) || {
      id: authorId,
      handle: 'researcher',
      fullName: 'Researcher',
      academicTitle: 'Scientist',
      institution: 'Independent',
      bio: '',
      orcidVerified: false,
      joinedDate: 'Recently',
      followingCount: 0,
      followersCount: 0,
      postsCount: 0,
      savedCount: 0,
    };

    const newComment: Comment = {
      id: `c_${Date.now()}`,
      postId,
      author: authorUser,
      content,
      parentId,
      likesCount: 0,
      isLiked: false,
      createdAt: 'Just now',
      replies: [],
    };

    const existing = localCommentsStore[postId] || [];
    if (parentId) {
      const attachReply = (list: Comment[]): Comment[] => {
        return list.map((c) => {
          if (c.id === parentId) {
            return { ...c, replies: [...(c.replies || []), newComment] };
          }
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: attachReply(c.replies) };
          }
          return c;
        });
      };
      localCommentsStore[postId] = attachReply(existing);
    } else {
      localCommentsStore[postId] = [newComment, ...existing];
    }

    return { comment: newComment, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        author_id: authorId,
        parent_id: parentId || null,
        content,
      })
      .select(
        `
        id,
        post_id,
        parent_id,
        content,
        likes_count,
        created_at,
        author:profiles!author_id (*)
      `
      )
      .single();

    if (error) {
      return { comment: null, error: error.message };
    }

    return { comment: mapSupabaseComment(data, authorId), error: null };
  } catch (err: any) {
    return { comment: null, error: err?.message || 'Failed to post comment.' };
  }
}

export async function deleteComment(
  commentId: string,
  postId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  if (!userId) {
    return { success: false, error: 'Authentication required.' };
  }

  if (!isSupabaseConfigured()) {
    const existing = localCommentsStore[postId] || [];
    const filterOut = (list: Comment[]): Comment[] => {
      return list
        .filter((c) => {
          if (c.id === commentId) {
            // RLS check: only allow author to delete
            return c.author.id !== userId;
          }
          return true;
        })
        .map((c) => ({
          ...c,
          replies: c.replies ? filterOut(c.replies) : [],
        }));
    };
    localCommentsStore[postId] = filterOut(existing);
    return { success: true, error: null };
  }

  try {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('author_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

// ============================================================================
// 7. FOLLOW & UNFOLLOW (Self-Follow Prevention & Duplicate Prevention)
// ============================================================================
export async function followUser(
  targetUserId: string,
  currentUserId: string
): Promise<{ success: boolean; error: string | null }> {
  if (!currentUserId) {
    return { success: false, error: 'Must be logged in to follow users.' };
  }

  // Prevent self-follow
  if (targetUserId === currentUserId) {
    return { success: false, error: 'You cannot follow yourself.' };
  }

  const key = `${currentUserId}:${targetUserId}`;

  if (!isSupabaseConfigured()) {
    localFollows.add(key); // Set prevents duplicate follow
    return { success: true, error: null };
  }

  try {
    const { error } = await supabase
      .from('follows')
      .upsert(
        { follower_id: currentUserId, following_id: targetUserId },
        { onConflict: 'follower_id,following_id', ignoreDuplicates: true }
      );

    if (error) {
      if (error.code === '23514') {
        return { success: false, error: 'Self-follow is not permitted.' };
      }
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function unfollowUser(
  targetUserId: string,
  currentUserId: string
): Promise<{ success: boolean; error: string | null }> {
  if (!currentUserId) {
    return { success: false, error: 'Must be logged in to unfollow users.' };
  }

  const key = `${currentUserId}:${targetUserId}`;

  if (!isSupabaseConfigured()) {
    localFollows.delete(key);
    return { success: true, error: null };
  }

  try {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId);

    if (error && !error.message.includes('not found')) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function checkIsFollowing(
  targetUserId: string,
  currentUserId?: string
): Promise<boolean> {
  if (!currentUserId || targetUserId === currentUserId) return false;

  if (!isSupabaseConfigured()) {
    return localFollows.has(`${currentUserId}:${targetUserId}`);
  }

  try {
    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId)
      .maybeSingle();

    return Boolean(data);
  } catch {
    return false;
  }
}

// ============================================================================
// 8. USER POSTS & SAVED BOOKMARKS
// ============================================================================
export async function fetchUserPosts(
  userId: string,
  currentUserId?: string
): Promise<{ posts: Post[]; error: string | null }> {
  if (!isSupabaseConfigured()) {
    const fallback = [...localCreatedPosts, ...mockPosts].filter((p) => p.author.id === userId);
    return { posts: fallback, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('posts')
      .select(
        `
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
        author:profiles!author_id (*),
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
          paper_authors (*)
        ),
        post_topics (
          topic:topics!topic_id (*)
        ),
        likes!left ( user_id ),
        reposts!left ( user_id ),
        bookmarks!left ( user_id )
      `
      )
      .eq('author_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      const fallback = [...localCreatedPosts, ...mockPosts].filter((p) => p.author.id === userId);
      return { posts: fallback, error: null };
    }

    return {
      posts: data.map((row: any) => mapSupabasePost(row, currentUserId)),
      error: null,
    };
  } catch {
    const fallback = [...localCreatedPosts, ...mockPosts].filter((p) => p.author.id === userId);
    return { posts: fallback, error: null };
  }
}

export async function fetchSavedPostsAndPapers(
  userId: string
): Promise<{ posts: Post[]; papers: Paper[]; error: string | null }> {
  if (!userId) return { posts: [], papers: [], error: 'User not authenticated' };

  if (!isSupabaseConfigured()) {
    return {
      posts: [...localCreatedPosts, ...mockPosts].filter(
        (p) => localBookmarks.has(`${userId}:post:${p.id}`) || p.isSaved
      ),
      papers: mockPapers.filter(
        (p) => localBookmarks.has(`${userId}:paper:${p.id}`) || p.isSaved
      ),
      error: null,
    };
  }

  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select(
        `
        id,
        post:posts (
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
          author:profiles!author_id (*),
          paper:papers!paper_id (*),
          post_topics ( topic:topics!topic_id (*) ),
          likes!left ( user_id ),
          reposts!left ( user_id ),
          bookmarks!left ( user_id )
        ),
        paper:papers (
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
          paper_authors (*)
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return {
        posts: mockPosts.filter((p) => p.isSaved),
        papers: mockPapers.filter((p) => p.isSaved),
        error: null,
      };
    }

    const posts: Post[] = [];
    const papers: Paper[] = [];

    data.forEach((row: any) => {
      if (row.post) {
        posts.push(mapSupabasePost(row.post, userId));
      }
      if (row.paper) {
        papers.push(mapSupabasePaper(row.paper, userId));
      }
    });

    return { posts, papers, error: null };
  } catch {
    return {
      posts: mockPosts.filter((p) => p.isSaved),
      papers: mockPapers.filter((p) => p.isSaved),
      error: null,
    };
  }
}
