import { supabase } from './client';
import { Post, Comment, PostType, Paper, UserProfile } from '../types';
import { getFeedRanker, buildUserRankingContext } from './ranking/feedRanker';
import { sanitizeExternalUrl, sanitizeTextContent } from '../utils/security';

/**
 * Explainable "For You" Feed Ranking Function
 * Transparent, deterministic scoring based on actual interactions and topics:
 * 1. Followed Topic Match (+150 pts per matching topic followed by user)
 * 2. Peer-Reviewed Paper Reference (+25 pts)
 * 3. Social Interaction Weight (+1.5 per like, +2.5 per comment, +3 per repost)
 * 4. Recency Score (up to +40 pts for fresh scientific discussions)
 */
export function calculateExplainableFeedScore(
  post: Post,
  followedTopicNames: string[]
): number {
  let score = 0;

  if (followedTopicNames && followedTopicNames.length > 0) {
    const matchingCount = post.topics.filter((pt) =>
      followedTopicNames.some(
        (ft) => ft.includes(pt.toLowerCase()) || pt.toLowerCase().includes(ft)
      )
    ).length;
    score += matchingCount * 150;
  }

  if (post.paper) {
    score += 25;
  }

  score += (post.likesCount || 0) * 1.5;
  score += (post.commentsCount || 0) * 2.5;
  score += (post.repostsCount || 0) * 3;

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

// Helper to determine if we're connected to Supabase
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
    : Boolean(row.is_saved);

  return {
    id: row.id,
    doi: row.doi || undefined,
    title: row.title || 'Untitled Paper',
    abstract: row.abstract || '',
    authors: authors.length > 0 ? authors : [{ name: 'Anonymous Researcher' }],
    journal: row.journal || 'Academic Journal',
    publisher: row.publisher || undefined,
    publicationYear: row.publication_year || new Date().getFullYear(),
    publicationDate: row.publication_date || undefined,
    canonicalUrl: row.canonical_url || (row.doi ? `https://doi.org/${row.doi}` : ''),
    openAccessUrl: row.open_access_pdf_url || undefined,
    isOpenAccess: row.open_access_status && row.open_access_status !== 'closed',
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
// 1. READ FEED (Paginated Supabase Query)
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
  const { tab = 'For You', page = 1, pageSize = 10 } = options;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    let resolvedUserId = options.currentUserId;
    if (!resolvedUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      resolvedUserId = user?.id;
    }

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

    // Following tab filter: only posts from followed users
    if (tab === 'Following') {
      if (!resolvedUserId) {
        return { posts: [], hasMore: false, error: null };
      }

      const { data: followRows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', resolvedUserId);

      const followingIds = (followRows || []).map((f) => f.following_id);
      if (followingIds.length > 0) {
        query = query.in('author_id', followingIds);
      } else {
        return { posts: [], hasMore: false, error: null };
      }
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[socialService.fetchFeed] Supabase error:', error.message);
      return { posts: [], hasMore: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { posts: [], hasMore: false, error: null };
    }

    const mappedPosts = data.map((row: any) => mapSupabasePost(row, resolvedUserId));

    let filtered = mappedPosts;
    if (tab === 'For You') {
      let followedTopicNames: string[] = [];
      let followedUserIds: string[] = [];

      if (resolvedUserId) {
        const { data: topicFollows } = await supabase
          .from('topic_follows')
          .select('topic:topics(name, slug)')
          .eq('user_id', resolvedUserId);

        if (topicFollows) {
          followedTopicNames = topicFollows
            .map((tf: any) => tf.topic?.name?.toLowerCase())
            .filter(Boolean);
        }

        const { data: userFollows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', resolvedUserId);

        if (userFollows) {
          followedUserIds = userFollows.map((f: any) => f.following_id);
        }
      }

      const context = buildUserRankingContext(resolvedUserId, followedUserIds);
      if (followedTopicNames.length > 0) {
        followedTopicNames.forEach((name) => context.followedTopicNames.add(name));
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
  } catch (err: any) {
    console.warn('[socialService.fetchFeed] Exception:', err);
    return { posts: [], hasMore: false, error: err?.message || 'Failed to load feed' };
  }
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
  authorId?: string;
  mediaUrls?: string[];
}

export async function createPost(
  payload: CreatePostPayload
): Promise<{ post: Post | null; error: string | null }> {
  const { postType, paper, topics, visibility = 'public', mediaUrls = [] } = payload;
  const content = sanitizeTextContent(payload.content, 5000);

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { post: null, error: 'User must be authenticated to create a post.' };
  }
  const verifiedAuthorId = user.id;

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
          const safeCanonicalUrl = sanitizeExternalUrl(paper.canonicalUrl) || (paper.doi ? `https://doi.org/${paper.doi}` : null);
          const safePdfUrl = sanitizeExternalUrl(paper.openAccessUrl);

          const { data: newPaper, error: paperError } = await supabase
            .from('papers')
            .insert({
              doi: paper.doi || null,
              canonical_url: safeCanonicalUrl || `https://doi.org/${paper.doi || 'unknown'}`,
              title: sanitizeTextContent(paper.title, 500),
              abstract: paper.abstract ? sanitizeTextContent(paper.abstract, 5000) : null,
              journal: paper.journal || 'Academic Preprint',
              publisher: paper.publisher || null,
              publication_year: paper.publicationYear || new Date().getFullYear(),
              publication_date: paper.publicationDate || null,
              open_access_status: paper.isOpenAccess ? 'gold' : 'closed',
              open_access_pdf_url: safePdfUrl,
            })
            .select('id')
            .single();

          if (!paperError && newPaper) {
            paperId = newPaper.id;
            if (paper.authors && paper.authors.length > 0) {
              const authorsToInsert = paper.authors.map((a, idx) => ({
                paper_id: paperId,
                author_name: sanitizeTextContent(a.name, 200),
                author_order: idx + 1,
                affiliation: a.affiliation ? sanitizeTextContent(a.affiliation, 300) : null,
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
        author_id: verifiedAuthorId,
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
        const cleanName = sanitizeTextContent(topicName, 100);
        const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const { data: topicData } = await supabase
          .from('topics')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();

        let topicId = topicData?.id;
        if (!topicId) {
          const { data: createdTopic } = await supabase
            .from('topics')
            .insert({ name: cleanName, slug })
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

/**
 * Delete a post with verified author ownership and RLS enforcement
 */
export async function deletePost(
  postId: string,
  _userId?: string
): Promise<{ success: boolean; error: string | null }> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, error: 'Authentication required to delete post.' };
  }

  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete post' };
  }
}

// ============================================================================
// 3. LIKE & UNLIKE (Database-driven via public.likes)
// ============================================================================
export async function toggleLike(
  postId: string,
  isCurrentlyLiked: boolean,
  _userId?: string
): Promise<{ success: boolean; isLiked: boolean; error: string | null }> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, isLiked: isCurrentlyLiked, error: 'User not authenticated' };
  }
  const verifiedUserId = user.id;

  try {
    if (isCurrentlyLiked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', verifiedUserId)
        .eq('post_id', postId);

      if (error && !error.message.includes('not found')) {
        return { success: false, isLiked: isCurrentlyLiked, error: error.message };
      }
      return { success: true, isLiked: false, error: null };
    } else {
      const { error } = await supabase
        .from('likes')
        .upsert(
          { user_id: verifiedUserId, post_id: postId },
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
// 4. REPOST & UNDO REPOST (Database-driven via public.reposts)
// ============================================================================
export async function toggleRepost(
  postId: string,
  isCurrentlyReposted: boolean,
  _userId?: string
): Promise<{ success: boolean; isReposted: boolean; error: string | null }> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, isReposted: isCurrentlyReposted, error: 'User not authenticated' };
  }
  const verifiedUserId = user.id;

  try {
    if (isCurrentlyReposted) {
      const { error } = await supabase
        .from('reposts')
        .delete()
        .eq('user_id', verifiedUserId)
        .eq('post_id', postId);

      if (error && !error.message.includes('not found')) {
        return { success: false, isReposted: isCurrentlyReposted, error: error.message };
      }
      return { success: true, isReposted: false, error: null };
    } else {
      const { error } = await supabase
        .from('reposts')
        .upsert(
          { user_id: verifiedUserId, post_id: postId },
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
// 5. BOOKMARK & REMOVE BOOKMARK (Database-driven via public.bookmarks)
// ============================================================================
export interface ToggleBookmarkTarget {
  postId?: string;
  paperId?: string;
}

export async function toggleBookmark(
  target: ToggleBookmarkTarget,
  isCurrentlySaved: boolean,
  _userId?: string
): Promise<{ success: boolean; isSaved: boolean; error: string | null }> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, isSaved: isCurrentlySaved, error: 'User not authenticated' };
  }
  const verifiedUserId = user.id;

  if (!target.postId && !target.paperId) {
    return { success: false, isSaved: isCurrentlySaved, error: 'Must specify postId or paperId' };
  }

  try {
    if (isCurrentlySaved) {
      let deleteQuery = supabase.from('bookmarks').delete().eq('user_id', verifiedUserId);
      if (target.postId) deleteQuery = deleteQuery.eq('post_id', target.postId);
      if (target.paperId) deleteQuery = deleteQuery.eq('paper_id', target.paperId);

      const { error } = await deleteQuery;
      if (error && !error.message.includes('not found')) {
        return { success: false, isSaved: isCurrentlySaved, error: error.message };
      }
      return { success: true, isSaved: false, error: null };
    } else {
      const { error } = await supabase.from('bookmarks').insert({
        user_id: verifiedUserId,
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
// 6. COMMENTS (Fetch, Add & Delete via public.comments)
// ============================================================================
export async function fetchComments(
  postId: string,
  currentUserId?: string
): Promise<{ comments: Comment[]; error: string | null }> {
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
      return { comments: [], error: error?.message || null };
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
  } catch (err: any) {
    return { comments: [], error: err?.message || 'Failed to load comments' };
  }
}

export interface AddCommentPayload {
  postId: string;
  content: string;
  parentId?: string;
  authorId?: string;
}

export async function addComment(
  payload: AddCommentPayload
): Promise<{ comment: Comment | null; error: string | null }> {
  const { postId, parentId } = payload;
  const content = sanitizeTextContent(payload.content, 2000);

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { comment: null, error: 'Authentication required to post comment.' };
  }
  const verifiedAuthorId = user.id;

  if (!content) {
    return { comment: null, error: 'Comment cannot be empty.' };
  }

  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        author_id: verifiedAuthorId,
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

    return { comment: mapSupabaseComment(data, verifiedAuthorId), error: null };
  } catch (err: any) {
    return { comment: null, error: err?.message || 'Failed to post comment.' };
  }
}

export async function deleteComment(
  commentId: string,
  _postId: string,
  _userId?: string
): Promise<{ success: boolean; error: string | null }> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, error: 'Authentication required.' };
  }

  try {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('author_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

// ============================================================================
// 7. FOLLOW & UNFOLLOW (Database-driven via public.follows & RPC)
// ============================================================================

export interface ToggleFollowResult {
  success: boolean;
  isFollowing: boolean;
  targetUserId: string;
  targetFollowersCount?: number;
  callerFollowingCount?: number;
  error: string | null;
}

/**
 * Resolves current verified user ID from memory, active session, or Supabase Auth
 */
async function getVerifiedUserId(providedId?: string): Promise<string | null> {
  if (providedId && providedId !== 'unknown') return providedId;
  const authStoreUser = useAuthStore.getState().user;
  if (authStoreUser?.id && authStoreUser.id !== 'unknown') {
    return authStoreUser.id;
  }
  const { data: sessData } = await supabase.auth.getSession();
  if (sessData?.session?.user?.id) {
    return sessData.session.user.id;
  }
  const { data: userData } = await supabase.auth.getUser();
  return userData?.user?.id || null;
}

/**
 * Resolves target profile UUID whether a UUID or username/handle was provided
 */
async function resolveTargetProfileId(targetIdentifier: string): Promise<string | null> {
  if (!targetIdentifier) return null;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetIdentifier);
  if (isUUID) return targetIdentifier;

  const cleanHandle = targetIdentifier.trim().replace(/^@/, '').toLowerCase();
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', cleanHandle)
    .maybeSingle();

  return data?.id || null;
}

/**
 * Executes an atomic, race-condition-safe toggle follow mutation.
 * Uses toggle_follow RPC when available, falling back to direct table mutation.
 */
export async function toggleFollowUserRpc(
  targetUserIdOrHandle: string,
  providedCallerId?: string
): Promise<ToggleFollowResult> {
  const verifiedUserId = await getVerifiedUserId(providedCallerId);
  if (!verifiedUserId) {
    return {
      success: false,
      isFollowing: false,
      targetUserId: targetUserIdOrHandle,
      error: 'Must be authenticated to follow researchers.',
    };
  }

  const targetId = (await resolveTargetProfileId(targetUserIdOrHandle)) || targetUserIdOrHandle;

  if (targetId === verifiedUserId) {
    return {
      success: false,
      isFollowing: false,
      targetUserId: targetId,
      error: 'You cannot follow yourself.',
    };
  }

  try {
    // 1. Attempt server-side RPC toggle_follow
    const { data: rpcData, error: rpcError } = await supabase.rpc('toggle_follow', {
      target_user_id: targetId,
    });

    if (!rpcError && rpcData) {
      const parsed = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
      return {
        success: true,
        isFollowing: Boolean(parsed.is_following),
        targetUserId: targetId,
        targetFollowersCount: parsed.target_followers_count,
        callerFollowingCount: parsed.caller_following_count,
        error: null,
      };
    }

    // 2. Direct table insert / delete fallback with direct count sync
    const isCurrentlyFollowing = await checkIsFollowing(targetId, verifiedUserId);
    if (isCurrentlyFollowing) {
      const unfollowRes = await unfollowUser(targetId, verifiedUserId);
      return {
        success: unfollowRes.success,
        isFollowing: !unfollowRes.success,
        targetUserId: targetId,
        error: unfollowRes.error,
      };
    } else {
      const followRes = await followUser(targetId, verifiedUserId);
      return {
        success: followRes.success,
        isFollowing: followRes.success,
        targetUserId: targetId,
        error: followRes.error,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      isFollowing: false,
      targetUserId: targetId,
      error: err?.message || 'Failed to toggle follow.',
    };
  }
}

export async function followUser(
  targetUserId: string,
  callerId?: string
): Promise<{ success: boolean; error: string | null }> {
  const verifiedUserId = await getVerifiedUserId(callerId);
  if (!verifiedUserId) {
    return { success: false, error: 'Must be logged in to follow users.' };
  }

  const targetId = (await resolveTargetProfileId(targetUserId)) || targetUserId;
  if (targetId === verifiedUserId) {
    return { success: false, error: 'You cannot follow yourself.' };
  }

  try {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: verifiedUserId, following_id: targetId });

    if (error) {
      // 23505 = unique_violation (already following)
      if (error.code === '23505') {
        return { success: true, error: null };
      }
      if (error.code === '23514') {
        return { success: false, error: 'Self-follow is not permitted.' };
      }
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to follow user.' };
  }
}

export async function unfollowUser(
  targetUserId: string,
  callerId?: string
): Promise<{ success: boolean; error: string | null }> {
  const verifiedUserId = await getVerifiedUserId(callerId);
  if (!verifiedUserId) {
    return { success: false, error: 'Must be logged in to unfollow users.' };
  }

  const targetId = (await resolveTargetProfileId(targetUserId)) || targetUserId;

  try {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', verifiedUserId)
      .eq('following_id', targetId);

    if (error && !error.message.includes('not found')) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to unfollow user.' };
  }
}

export async function checkIsFollowing(
  targetUserId: string,
  callerId?: string
): Promise<boolean> {
  const verifiedUserId = await getVerifiedUserId(callerId);
  if (!verifiedUserId) return false;

  const targetId = (await resolveTargetProfileId(targetUserId)) || targetUserId;
  if (!targetId || targetId === verifiedUserId) return false;

  try {
    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', verifiedUserId)
      .eq('following_id', targetId)
      .maybeSingle();

    return Boolean(data);
  } catch {
    return false;
  }
}

/**
 * Fetches all user IDs that the specified user is actively following.
 * Enables instantaneous in-memory reactivity for the frontend follow state.
 */
export async function fetchUserFollowingIds(userIdOrHandle: string): Promise<string[]> {
  if (!userIdOrHandle) return [];
  const targetId = (await resolveTargetProfileId(userIdOrHandle)) || userIdOrHandle;

  try {
    // 1. Direct table query (fastest & most reliable)
    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', targetId);

    if (!error && Array.isArray(data)) {
      return data.map((row) => row.following_id);
    }

    // 2. RPC fallback
    const { data: rpcData } = await supabase.rpc('get_user_following_ids', {
      p_user_id: targetId,
    });
    if (Array.isArray(rpcData)) return rpcData;

    return [];
  } catch {
    return [];
  }
}

/**
 * Fetches list of followers for a given target user with profile details and viewer follow state.
 */
export async function fetchFollowers(
  targetUserIdOrHandle: string,
  viewerId?: string,
  limit: number = 30,
  offset: number = 0
): Promise<{ researchers: UserProfile[]; error: string | null }> {
  if (!targetUserIdOrHandle) return { researchers: [], error: 'User ID is required.' };
  const targetId = (await resolveTargetProfileId(targetUserIdOrHandle)) || targetUserIdOrHandle;
  const verifiedViewerId = await getVerifiedUserId(viewerId);

  try {
    // 1. Direct table query with profile join
    const { data, error } = await supabase
      .from('follows')
      .select(`
        created_at,
        follower:profiles!follower_id (
          id,
          username,
          full_name,
          avatar_url,
          banner_url,
          academic_title,
          institution,
          bio,
          orcid_id,
          orcid_verified,
          followers_count,
          following_count,
          posts_count,
          created_at
        )
      `)
      .eq('following_id', targetId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!error && Array.isArray(data)) {
      const currentFollowingSet = useAuthStore.getState().followingIds;
      const researchers: UserProfile[] = [];
      for (const row of data) {
        if (row.follower) {
          const prof = mapSupabaseProfile(row.follower);
          prof.isFollowing = verifiedViewerId ? currentFollowingSet.has(prof.id) : false;
          researchers.push(prof);
        }
      }
      return { researchers, error: null };
    }

    // 2. RPC fallback
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_followers', {
      p_user_id: targetId,
      p_viewer_id: verifiedViewerId || null,
      p_limit: limit,
      p_offset: offset,
    });

    if (!rpcError && Array.isArray(rpcData)) {
      const mapped = rpcData.map((row: any) => mapSupabaseProfile(row));
      return { researchers: mapped, error: null };
    }

    return { researchers: [], error: error?.message || rpcError?.message || null };
  } catch (err: any) {
    return { researchers: [], error: err?.message || 'Failed to fetch followers.' };
  }
}

/**
 * Fetches list of researchers a given target user is following with profile details and viewer follow state.
 */
export async function fetchFollowing(
  targetUserIdOrHandle: string,
  viewerId?: string,
  limit: number = 30,
  offset: number = 0
): Promise<{ researchers: UserProfile[]; error: string | null }> {
  if (!targetUserIdOrHandle) return { researchers: [], error: 'User ID is required.' };
  const targetId = (await resolveTargetProfileId(targetUserIdOrHandle)) || targetUserIdOrHandle;
  const verifiedViewerId = await getVerifiedUserId(viewerId);

  try {
    // 1. Direct table query with profile join
    const { data, error } = await supabase
      .from('follows')
      .select(`
        created_at,
        following:profiles!following_id (
          id,
          username,
          full_name,
          avatar_url,
          banner_url,
          academic_title,
          institution,
          bio,
          orcid_id,
          orcid_verified,
          followers_count,
          following_count,
          posts_count,
          created_at
        )
      `)
      .eq('follower_id', targetId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!error && Array.isArray(data)) {
      const currentFollowingSet = useAuthStore.getState().followingIds;
      const researchers: UserProfile[] = [];
      for (const row of data) {
        if (row.following) {
          const prof = mapSupabaseProfile(row.following);
          prof.isFollowing = verifiedViewerId ? currentFollowingSet.has(prof.id) : false;
          researchers.push(prof);
        }
      }
      return { researchers, error: null };
    }

    // 2. RPC fallback
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_following', {
      p_user_id: targetId,
      p_viewer_id: verifiedViewerId || null,
      p_limit: limit,
      p_offset: offset,
    });

    if (!rpcError && Array.isArray(rpcData)) {
      const mapped = rpcData.map((row: any) => mapSupabaseProfile(row));
      return { researchers: mapped, error: null };
    }

    return { researchers: [], error: error?.message || rpcError?.message || null };
  } catch (err: any) {
    return { researchers: [], error: err?.message || 'Failed to fetch following.' };
  }
}

// ============================================================================
// 8. USER POSTS & SAVED BOOKMARKS
// ============================================================================
export async function fetchUserPosts(
  userId: string,
  currentUserId?: string
): Promise<{ posts: Post[]; error: string | null }> {
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
      return { posts: [], error: error?.message || null };
    }

    return {
      posts: data.map((row: any) => mapSupabasePost(row, currentUserId)),
      error: null,
    };
  } catch (err: any) {
    return { posts: [], error: err?.message || 'Failed to fetch posts' };
  }
}

export async function fetchSavedPostsAndPapers(
  userId: string
): Promise<{ posts: Post[]; papers: Paper[]; error: string | null }> {
  if (!userId) return { posts: [], papers: [], error: 'User not authenticated' };

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
      return { posts: [], papers: [], error: error?.message || null };
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
  } catch (err: any) {
    return { posts: [], papers: [], error: err?.message || 'Failed to fetch bookmarks' };
  }
}
