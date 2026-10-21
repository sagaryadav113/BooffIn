import { supabase, appStorage } from './client';
import { PROFILE_MEDIA_BUCKET } from './storageService';
import { Post, Comment, PostType, Paper, UserProfile, FollowRequest } from '../types';
import { getFeedRanker, buildUserRankingContext } from './ranking/feedRanker';
import { sanitizeExternalUrl, sanitizeTextContent } from '../utils/security';
import { useAuthStore } from '../store/useAuthStore';
import {
  isCommentLikedSync,
  loadUserLikedComments,
  toggleCommentLike,
  isPostLikedSync,
  loadUserLikedPosts,
  togglePostLikePersistence,
  isPaperLikedSync,
  loadUserLikedPapers,
  togglePaperLikePersistence,
} from '../utils/persistentLikes';

export {
  toggleCommentLike,
  isPostLikedSync,
  loadUserLikedPosts,
  isPaperLikedSync,
  loadUserLikedPapers,
  togglePaperLikePersistence,
};

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
    bannerUrl: row.banner_url || undefined,
    hasCustomAvatar: Boolean(row.has_custom_avatar),
    hasCustomBanner: Boolean(row.has_custom_banner),
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

  const isLiked =
    isPaperLikedSync(row.id, currentUserId) ||
    (row.doi ? isPaperLikedSync(row.doi, currentUserId) : false) ||
    Boolean(row.is_liked);

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
    isLiked,
  };
}

export interface RawPollData {
  question: string;
  options: { id: string; text: string; votesCount?: number }[];
  expiresAt?: string;
}

export function encodePollIntoContent(
  content: string,
  poll?: import('../types').Poll
): string {
  if (!poll || !poll.options || poll.options.length < 2) {
    return content;
  }
  const pollPayload: RawPollData = {
    question: poll.question,
    options: poll.options.map((opt, idx) => ({
      id: opt.id || `opt_${idx + 1}`,
      text: opt.text,
    })),
    expiresAt: poll.expiresAt,
  };
  const pollMarker = `\n\n<!--POLL_DATA:${JSON.stringify(pollPayload)}-->`;
  return `${content.trim()}${pollMarker}`;
}

export function extractPollAndCleanContent(rawContent?: string | null): {
  cleanContent: string;
  poll?: import('../types').Poll;
} {
  if (!rawContent) {
    return { cleanContent: '' };
  }

  const pollRegex = /(?:\n\n)?<!--POLL_DATA:(.*?)-->|(?:(?:\n\n)?__POLL__:(.*?)(?:\n|$))/s;
  const match = rawContent.match(pollRegex);

  if (match) {
    try {
      const jsonStr = match[1] || match[2];
      const parsed: RawPollData = JSON.parse(jsonStr);
      const cleanContent = rawContent.replace(match[0], '').trim();
      const options = (parsed.options || []).map((opt, idx) => ({
        id: opt.id || `opt_${idx + 1}`,
        text: opt.text || String(opt),
        votesCount: opt.votesCount || 0,
      }));

      return {
        cleanContent,
        poll: {
          question: parsed.question || '',
          options,
          totalVotes: 0,
          expiresAt: parsed.expiresAt,
        },
      };
    } catch (e) {
      console.warn('[socialService] Failed to parse poll metadata from content:', e);
    }
  }

  return { cleanContent: rawContent };
}

export function encodeArticleIntoContent(
  content: string,
  article?: import('../types').ArticleData
): string {
  if (!article) return content;
  const articleMarker = `\n\n<!--ARTICLE_DATA:${JSON.stringify(article)}-->`;
  return `${content.trim()}${articleMarker}`;
}

export function extractArticleAndCleanContent(rawContent?: string | null): {
  cleanContent: string;
  article?: import('../types').ArticleData;
} {
  if (!rawContent) return { cleanContent: '' };
  const articleRegex = /(?:\n\n)?<!--ARTICLE_DATA:(.*?)-->/s;
  const match = rawContent.match(articleRegex);
  if (match) {
    try {
      const parsed: import('../types').ArticleData = JSON.parse(match[1]);
      const cleanContent = rawContent.replace(match[0], '').trim();
      return { cleanContent, article: parsed };
    } catch (e) {
      console.warn('[socialService] Failed to parse article metadata from content:', e);
    }
  }
  return { cleanContent: rawContent };
}

export function encodeQuotedPostIntoContent(
  content: string,
  quotedPost?: Post
): string {
  if (!quotedPost) return content;
  const quotePayload = {
    id: quotedPost.id,
    content: quotedPost.content,
    postType: quotedPost.postType,
    author: {
      id: quotedPost.author.id,
      fullName: quotedPost.author.fullName,
      handle: quotedPost.author.handle,
      avatarUrl: quotedPost.author.avatarUrl,
      academicTitle: quotedPost.author.academicTitle,
      institution: quotedPost.author.institution,
    },
    createdAt: quotedPost.createdAt,
    paper: quotedPost.paper
      ? {
          id: quotedPost.paper.id,
          title: quotedPost.paper.title,
          doi: quotedPost.paper.doi,
          journal: quotedPost.paper.journal,
        }
      : undefined,
    images: quotedPost.images,
  };
  const marker = `\n\n<!--QUOTED_POST_DATA:${JSON.stringify(quotePayload)}-->`;
  return `${content.trim()}${marker}`;
}

export function extractQuotedPostAndCleanContent(rawContent?: string | null): {
  cleanContent: string;
  quotedPost?: Post;
} {
  if (!rawContent) return { cleanContent: '' };
  const quoteRegex = /(?:\n\n)?<!--QUOTED_POST_DATA:(.*?)-->/s;
  const match = rawContent.match(quoteRegex);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      const cleanContent = rawContent.replace(match[0], '').trim();
      const quotedPost: Post = {
        id: parsed.id,
        author: {
          id: parsed.author?.id || 'unknown',
          fullName: parsed.author?.fullName || 'Researcher',
          handle: parsed.author?.handle || 'researcher',
          avatarUrl: parsed.author?.avatarUrl,
          academicTitle: parsed.author?.academicTitle || 'Researcher',
          institution: parsed.author?.institution || 'Independent',
          bio: '',
          orcidVerified: false,
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          savedCount: 0,
          joinedDate: 'Recently',
        },
        postType: parsed.postType || 'discussion',
        content: parsed.content || '',
        paper: parsed.paper
          ? ({
              id: parsed.paper.id,
              title: parsed.paper.title,
              doi: parsed.paper.doi,
              journal: parsed.paper.journal,
              abstract: '',
              authors: [],
              citationCount: 0,
              discussionCount: 0,
              likesCount: 0,
              savesCount: 0,
              topics: [],
            } as any)
          : undefined,
        images: parsed.images || [],
        topics: [],
        visibility: 'public',
        likesCount: 0,
        commentsCount: 0,
        repostsCount: 0,
        savesCount: 0,
        createdAt: parsed.createdAt || 'Recent',
      };
      return { cleanContent, quotedPost };
    } catch (e) {
      console.warn('[socialService] Failed to parse quoted post metadata from content:', e);
    }
  }
  return { cleanContent: rawContent };
}

// Helper to query and populate poll vote totals and current user's voted option
export async function populatePollVotes(
  posts: Post[],
  currentUserId?: string
): Promise<Post[]> {
  if (!posts || posts.length === 0) return posts;

  const pollPosts = posts.filter((p) => Boolean(p.poll && p.poll.options && p.poll.options.length > 0));
  if (pollPosts.length === 0) return posts;

  const pollPostIds = pollPosts.map((p) => p.id);

  try {
    const { data: voteRows, error } = await supabase
      .from('comments')
      .select('post_id, author_id, content')
      .in('post_id', pollPostIds)
      .like('content', '[POLL_VOTE:%');

    if (error) {
      console.warn('[socialService.populatePollVotes] Error fetching votes:', error.message);
      return posts;
    }

    const postVotesMap = new Map<
      string,
      {
        optionVotes: Record<string, number>;
        totalVotes: number;
        userVotedOptionId?: string;
      }
    >();

    for (const post of pollPosts) {
      postVotesMap.set(post.id, {
        optionVotes: {},
        totalVotes: 0,
      });
    }

    if (voteRows && voteRows.length > 0) {
      for (const row of voteRows) {
        const entry = postVotesMap.get(row.post_id);
        if (!entry) continue;

        try {
          const match = row.content.match(/^\[POLL_VOTE:(.*)\]$/);
          if (match) {
            const parsed = JSON.parse(match[1]);
            const optionId = parsed.optionId;
            if (optionId) {
              entry.optionVotes[optionId] = (entry.optionVotes[optionId] || 0) + 1;
              entry.totalVotes += 1;
              if (currentUserId && row.author_id === currentUserId) {
                entry.userVotedOptionId = optionId;
              }
            }
          }
        } catch {}
      }
    }

    for (const post of posts) {
      if (post.poll && postVotesMap.has(post.id)) {
        const stats = postVotesMap.get(post.id)!;
        post.poll = {
          ...post.poll,
          options: post.poll.options.map((opt) => ({
            ...opt,
            votesCount: stats.optionVotes[opt.id] || 0,
          })),
          totalVotes: stats.totalVotes,
          userVotedOptionId: stats.userVotedOptionId || post.poll.userVotedOptionId,
        };
      }
    }
  } catch (err) {
    console.warn('[socialService.populatePollVotes] Unexpected error:', err);
  }

  return posts;
}

// Single-query mapping helper to convert nested Supabase post query to Post
export function mapSupabasePost(row: any, currentUserId?: string): Post {
  const author = mapSupabaseProfile(row.author);
  const paper = row.paper ? mapSupabasePaper(row.paper, currentUserId) : undefined;

  const topics: string[] = Array.isArray(row.post_topics)
    ? row.post_topics.map((pt: any) => pt.topic?.name).filter(Boolean)
    : [];

  const isLiked =
    isPostLikedSync(row.id, currentUserId) ||
    (Array.isArray(row.likes)
      ? row.likes.some((l: any) => l.user_id === currentUserId)
      : Boolean(row.is_liked));

  const isReposted = Array.isArray(row.reposts)
    ? row.reposts.some((r: any) => r.user_id === currentUserId)
    : Boolean(row.is_reposted);

  const isSaved = Array.isArray(row.bookmarks)
    ? row.bookmarks.some((b: any) => b.user_id === currentUserId)
    : Boolean(row.is_saved);

  const { cleanContent: contentWithoutPoll, poll } = extractPollAndCleanContent(row.content || '');
  const { cleanContent: contentWithoutArticle, article } = extractArticleAndCleanContent(contentWithoutPoll);
  const { cleanContent, quotedPost } = extractQuotedPostAndCleanContent(contentWithoutArticle);

  return {
    id: row.id,
    author,
    postType: (row.post_type as PostType) || 'discussion',
    content: cleanContent,
    paper,
    images: Array.isArray(row.media_urls) ? row.media_urls : [],
    poll,
    article,
    quotedPost,
    topics: topics.length > 0 ? topics : [],
    visibility: row.visibility || 'public',
    likesCount: Array.isArray(row.likes) ? row.likes.length : (row.likes_count || 0),
    commentsCount: row.comments_count || 0,
    repostsCount: Array.isArray(row.reposts) ? row.reposts.length : (row.reposts_count || 0),
    savesCount: Array.isArray(row.bookmarks) ? row.bookmarks.length : (row.saves_count || 0),
    isLiked,
    isReposted,
    isSaved,
    createdAt: formatRelativeTime(row.created_at),
    rawCreatedAt: row.created_at || undefined,
  };
}

// Map raw Supabase comment row to Comment
export function mapSupabaseComment(row: any, currentUserId?: string): Comment {
  const author = mapSupabaseProfile(row.author);
  const isLiked = isCommentLikedSync(row.id, currentUserId);
  return {
    id: row.id,
    postId: row.post_id,
    author,
    content: row.content,
    parentId: row.parent_id || undefined,
    likesCount: typeof row.likes_count === 'number' ? row.likes_count : 0,
    isLiked,
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

    await loadUserLikedPosts(resolvedUserId).catch(() => {});
    let mappedPosts = data.map((row: any) => mapSupabasePost(row, resolvedUserId));

    if (resolvedUserId) {
      const { data: blocks } = await supabase
        .from('user_blocks')
        .select('blocker_id, blocked_id')
        .or(`blocker_id.eq.${resolvedUserId},blocked_id.eq.${resolvedUserId}`);
      if (blocks && blocks.length > 0) {
        const blockedSet = new Set(
          blocks.map((b: any) => (b.blocker_id === resolvedUserId ? b.blocked_id : b.blocker_id))
        );
        mappedPosts = mappedPosts.filter((p: any) => !blockedSet.has(p.author?.id));
      }
    }

    let filtered = mappedPosts;
    if (tab === 'For You') {
      let followedTopicNames: string[] = [];
      let followedUserIds: string[] = [];

      if (resolvedUserId) {
        // 1. Fetch user's profile research interests (1,200+ taxonomy fields)
        const { data: profile } = await supabase
          .from('profiles')
          .select('research_interests')
          .eq('id', resolvedUserId)
          .maybeSingle();

        if (profile?.research_interests && Array.isArray(profile.research_interests)) {
          profile.research_interests.forEach((ri: string) => {
            if (ri && typeof ri === 'string' && ri.trim()) {
              followedTopicNames.push(ri.trim().toLowerCase());
            }
          });
        }

        // 2. Fetch explicit topic follows
        const { data: topicFollows } = await supabase
          .from('topic_follows')
          .select('topic:topics(name, slug)')
          .eq('user_id', resolvedUserId);

        if (topicFollows) {
          topicFollows.forEach((tf: any) => {
            const name = tf.topic?.name?.toLowerCase();
            if (name && !followedTopicNames.includes(name)) {
              followedTopicNames.push(name);
            }
          });
        }

        // 3. Fallback to auth store if active user matches (instant local state sync)
        try {
          const authUser = useAuthStore.getState().user;
          if (authUser?.id === resolvedUserId && Array.isArray(authUser.researchInterests)) {
            authUser.researchInterests.forEach((ri: string) => {
              if (ri && typeof ri === 'string' && ri.trim()) {
                const lower = ri.trim().toLowerCase();
                if (!followedTopicNames.includes(lower)) {
                  followedTopicNames.push(lower);
                }
              }
            });
          }
        } catch {}

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
        Array.isArray(p.topics) &&
        p.topics.some((t) => {
          const lower = t.toLowerCase();
          return lower.includes(targetTopic) || targetTopic.includes(lower);
        })
      );
    }

    const postsWithPolls = await populatePollVotes(filtered, resolvedUserId);

    return {
      posts: postsWithPolls,
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
  poll?: import('../types').Poll;
  article?: import('../types').ArticleData;
  topics: string[];
  visibility?: 'public' | 'followers';
  authorId?: string;
  mediaUrls?: string[];
  quotedPost?: Post;
}

export async function createPost(
  payload: CreatePostPayload
): Promise<{ post: Post | null; error: string | null }> {
  const { postType, paper, poll, topics, visibility = 'public', mediaUrls = [] } = payload;
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

    let rawContentWithPoll = encodePollIntoContent(content, poll);
    if (payload.article) {
      rawContentWithPoll = encodeArticleIntoContent(rawContentWithPoll, payload.article);
    }
    if (payload.quotedPost) {
      rawContentWithPoll = encodeQuotedPostIntoContent(rawContentWithPoll, payload.quotedPost);
    }

    const { data: postRow, error: postError } = await supabase
      .from('posts')
      .insert({
        author_id: verifiedAuthorId,
        post_type: postType,
        content: rawContentWithPoll,
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
        author:profiles!author_id (
          id,
          username,
          full_name,
          avatar_url,
          academic_title,
          institution,
          orcid_id,
          orcid_verified
        )
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
      images: mediaUrls,
      poll,
      article: payload.article,
      quotedPost: payload.quotedPost,
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

    // Asynchronously dispatch mention notifications
    sendMentionNotifications({
      content,
      postId: postRow.id,
      actorId: user.id,
      entityType: 'post',
    }).catch((e) => console.warn('Mention notification error:', e));

    return { post: fullPost, error: null };
  } catch (err: any) {
    return { post: null, error: err?.message || 'Failed to publish post.' };
  }
}

/**
 * Scans content for @handle mentions and sends notifications to mentioned users
 */
export async function sendMentionNotifications(params: {
  content: string;
  postId: string;
  actorId: string;
  entityType?: 'post' | 'comment';
}): Promise<void> {
  const { content, postId, actorId, entityType = 'post' } = params;
  if (!content) return;

  const mentionRegex = /@([a-zA-Z0-9_]{2,30})/g;
  const matches = [...content.matchAll(mentionRegex)];
  if (matches.length === 0) return;

  const handles = Array.from(new Set(matches.map((m) => m[1].toLowerCase())));
  if (handles.length === 0) return;

  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username')
      .in('username', handles);

    if (error || !profiles || profiles.length === 0) return;

    const targetProfiles = profiles.filter((p) => p.id !== actorId);
    if (targetProfiles.length === 0) return;

    const snippet = content.length > 80 ? content.slice(0, 80) + '...' : content;
    const notificationRows = targetProfiles.map((p) => ({
      recipient_id: p.id,
      actor_id: actorId,
      notification_type: 'mention',
      entity_type: entityType,
      entity_id: postId,
      message_snippet: snippet,
      metadata: { post_id: postId, handle: p.username },
      read_status: false,
    }));

    await supabase.from('notifications').insert(notificationRows);
  } catch (err) {
    console.warn('[socialService] sendMentionNotifications error:', err);
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
    // 1. Fetch post to get media_urls before deletion so we can clean up orphaned storage
    const { data: postData } = await supabase
      .from('posts')
      .select('media_urls')
      .eq('id', postId)
      .eq('author_id', user.id)
      .maybeSingle();

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    // 2. Clean up physical image files from Supabase storage bucket
    if (postData?.media_urls && Array.isArray(postData.media_urls) && postData.media_urls.length > 0) {
      try {
        const pathsToRemove: string[] = [];
        for (const url of postData.media_urls) {
          if (typeof url === 'string' && url.includes(`/${PROFILE_MEDIA_BUCKET}/`)) {
            const parts = url.split(`/${PROFILE_MEDIA_BUCKET}/`);
            if (parts[1]) {
              const cleanPath = parts[1].split('?')[0];
              pathsToRemove.push(cleanPath);
            }
          }
        }
        if (pathsToRemove.length > 0) {
          await supabase.storage.from(PROFILE_MEDIA_BUCKET).remove(pathsToRemove);
        }
      } catch (storageCleanupErr) {
        console.warn('[socialService.deletePost] Non-critical storage cleanup error:', storageCleanupErr);
      }
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete post' };
  }
}

export interface UpdatePostPayload {
  postId: string;
  content: string;
  topics?: string[];
  article?: import('../types').ArticleData;
}

/**
 * Updates an existing post's text content, research topics, and structured article data
 */
export async function updatePost(
  payload: UpdatePostPayload
): Promise<{ post: Post | null; error: string | null }> {
  const { postId, topics, article } = payload;
  const content = sanitizeTextContent(payload.content, 5000);

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { post: null, error: 'User must be authenticated to edit post.' };
  }

  try {
    // 1. Fetch existing post to preserve any attached poll marker or existing article
    const { data: existingPost } = await supabase
      .from('posts')
      .select('content')
      .eq('id', postId)
      .maybeSingle();

    let finalContent = content;

    // Handle article data: encode new article or preserve existing article
    if (article) {
      finalContent = encodeArticleIntoContent(finalContent, article);
    } else if (existingPost?.content) {
      const { article: existingArticle } = extractArticleAndCleanContent(existingPost.content);
      if (existingArticle) {
        finalContent = encodeArticleIntoContent(finalContent, existingArticle);
      }
    }

    // Preserve poll marker if present
    if (existingPost?.content) {
      const match = existingPost.content.match(/(?:\n\n)?<!--POLL_DATA:(.*?)-->|(?:(?:\n\n)?__POLL__:(.*?)(?:\n|$))/s);
      if (match) {
        finalContent = `${finalContent.trim()}\n\n${match[0].trim()}`;
      }
    }

    // 2. Update content in posts table
    const { data: postRow, error: postError } = await supabase
      .from('posts')
      .update({ content: finalContent })
      .eq('id', postId)
      .eq('author_id', user.id)
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
          orcid_id,
          orcid_verified
        )
      `
      )
      .single();

    if (postError) {
      return { post: null, error: postError.message };
    }

    // 3. Update topics if provided
    if (topics !== undefined) {
      await supabase.from('post_topics').delete().eq('post_id', postId);

      if (topics.length > 0) {
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
              .insert({ post_id: postId, topic_id: topicId });
          }
        }
      }
    }

    const mapped = postRow ? mapSupabasePost(postRow, user.id) : null;
    if (mapped && topics !== undefined) {
      mapped.topics = topics;
    }

    // Populate poll votes if post contains poll
    let finalMappedPost = mapped;
    if (mapped) {
      const [postWithVotes] = await populatePollVotes([mapped], user.id);
      if (postWithVotes) {
        finalMappedPost = postWithVotes;
      }
    }

    // Send mention notifications for edited content
    sendMentionNotifications({
      content,
      postId,
      actorId: user.id,
      entityType: 'post',
    }).catch(() => {});

    return { post: finalMappedPost, error: null };
  } catch (err: any) {
    return { post: null, error: err?.message || 'Failed to update post.' };
  }
}


// ============================================================================
// 3. LIKE & UNLIKE (Persistent cache + Database sync)
// ============================================================================
export async function toggleLike(
  postId: string,
  isCurrentlyLiked: boolean,
  userId?: string
): Promise<{ success: boolean; isLiked: boolean; error: string | null }> {
  return togglePostLikePersistence(postId, isCurrentlyLiked, userId);
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
    let resolvedUserId = currentUserId && currentUserId.trim().length > 0 ? currentUserId.trim() : undefined;
    if (!resolvedUserId) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        resolvedUserId = user?.id;
      } catch {}
    }

    // Preload user liked comment IDs from persistent storage into synchronous memory
    await loadUserLikedComments(resolvedUserId);

    const { data, error } = await supabase
      .from('comments')
      .select(
        `
        id,
        post_id,
        parent_id,
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
          orcid_id,
          orcid_verified
        )
      `
      )
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (error || !data) {
      return { comments: [], error: error?.message || null };
    }

    // Exclude poll vote records so they never show up in comment threads
    const commentRows = data.filter(
      (row: any) => !row.content || !row.content.startsWith('[POLL_VOTE:')
    );

    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    commentRows.forEach((row: any) => {
      const comment = mapSupabaseComment(row, resolvedUserId);
      commentMap.set(comment.id, comment);
    });

    commentRows.forEach((row: any) => {
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
        author:profiles!author_id (
          id,
          username,
          full_name,
          avatar_url,
          academic_title,
          institution,
          orcid_id,
          orcid_verified
        )
      `
      )
      .single();

    if (error) {
      return { comment: null, error: error.message };
    }

    sendMentionNotifications({
      content,
      postId,
      actorId: verifiedAuthorId,
      entityType: 'comment',
    }).catch(() => {});

    // Synchronize posts.comments_count in DB
    try {
      const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);
      if (typeof count === 'number') {
        await supabase.from('posts').update({ comments_count: count }).eq('id', postId);
      }
    } catch {}

    return { comment: mapSupabaseComment(data, verifiedAuthorId), error: null };
  } catch (err: any) {
    return { comment: null, error: err?.message || 'Failed to post comment.' };
  }
}

export async function deleteComment(
  commentId: string,
  postId: string,
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

    // Synchronize posts.comments_count in DB
    try {
      const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);
      if (typeof count === 'number') {
        await supabase.from('posts').update({ comments_count: count }).eq('id', postId);
      }
    } catch {}

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

// ============================================================================
// 7. POLL VOTING (Persisted via public.comments with [POLL_VOTE:] identifier)
// ============================================================================
export async function votePoll(
  postId: string,
  optionId: string,
  userId?: string
): Promise<{ success: boolean; error: string | null; userVotedOptionId?: string }> {
  try {
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      resolvedUserId = user?.id;
    }

    if (!resolvedUserId) {
      return { success: false, error: 'User must be authenticated to vote.' };
    }

    // Check if user already voted on this post's poll
    const { data: existingRows } = await supabase
      .from('comments')
      .select('id, content')
      .eq('post_id', postId)
      .eq('author_id', resolvedUserId)
      .like('content', '[POLL_VOTE:%');

    const voteContent = `[POLL_VOTE:${JSON.stringify({ optionId })}]`;

    if (existingRows && existingRows.length > 0) {
      const existingId = existingRows[0].id;
      const { error: updateError } = await supabase
        .from('comments')
        .update({ content: voteContent })
        .eq('id', existingId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // If duplicate vote rows exist, clean them up
      if (existingRows.length > 1) {
        const extraIds = existingRows.slice(1).map((r) => r.id);
        await supabase.from('comments').delete().in('id', extraIds);
      }
    } else {
      const { error: insertError } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: resolvedUserId,
          content: voteContent,
        });

      if (insertError) {
        return { success: false, error: insertError.message };
      }
    }

    return { success: true, error: null, userVotedOptionId: optionId };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to submit vote' };
  }
}

// ============================================================================
// 7. FOLLOW & UNFOLLOW (Database-driven via public.follows & RPC)
// ============================================================================

export interface ToggleFollowResult {
  success: boolean;
  isFollowing: boolean;
  isRequested?: boolean;
  targetUserId: string;
  targetFollowersCount?: number;
  callerFollowingCount?: number;
  error: string | null;
}

async function getVerifiedUserId(providedId?: string): Promise<string | null> {
  if (providedId && providedId !== 'unknown') return providedId;
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
 * Checks if a target researcher has a private profile.
 */
export async function checkTargetIsPrivate(targetUserId: string): Promise<boolean> {
  if (!targetUserId) return false;
  const targetId = (await resolveTargetProfileId(targetUserId)) || targetUserId;
  try {
    // 1. Direct profiles table column (is_private)
    const { data: profData } = await supabase
      .from('profiles')
      .select('is_private')
      .eq('id', targetId)
      .maybeSingle();

    if (profData && typeof (profData as any).is_private === 'boolean') {
      return Boolean((profData as any).is_private);
    }

    // 2. Database-level security definer visibility check if available
    const { data: rpcVis, error: rpcErr } = await supabase.rpc('get_user_profile_visibility', {
      p_user_id: targetId,
    });
    if (!rpcErr && rpcVis) {
      return rpcVis === 'private';
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Checks if the caller has an active pending follow request to the target user.
 */
export async function checkHasFollowRequest(
  targetUserId: string,
  callerId?: string
): Promise<boolean> {
  const verifiedUserId = await getVerifiedUserId(callerId);
  if (!verifiedUserId) return false;
  const targetId = (await resolveTargetProfileId(targetUserId)) || targetUserId;
  if (!targetId || targetId === verifiedUserId) return false;

  // 1. Check local persistent storage (instant 0ms)
  try {
    const cached = await appStorage.getItem(`booffin_outgoing_follow_requests_${verifiedUserId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.includes(targetId)) {
        return true;
      }
    }
  } catch {}

  // 2. Check follow_requests table
  try {
    const { data, error } = await supabase
      .from('follow_requests')
      .select('id')
      .eq('requester_id', verifiedUserId)
      .eq('target_id', targetId)
      .eq('status', 'pending')
      .maybeSingle();

    if (!error && data?.id) {
      try {
        const cached = await appStorage.getItem(`booffin_outgoing_follow_requests_${verifiedUserId}`);
        const list: string[] = cached ? JSON.parse(cached) : [];
        if (!list.includes(targetId)) {
          list.push(targetId);
          await appStorage.setItem(`booffin_outgoing_follow_requests_${verifiedUserId}`, JSON.stringify(list));
        }
      } catch {}
      return true;
    }
  } catch {}

  return false;
}

/**
 * Fetches all target user IDs that the caller currently has an active pending follow request to.
 */
export async function fetchOutgoingFollowRequestIds(callerId?: string): Promise<string[]> {
  const verifiedUserId = await getVerifiedUserId(callerId);
  if (!verifiedUserId) return [];

  const requestedIds = new Set<string>();

  // 1. Load from local persistent storage (instant 0ms)
  try {
    const cached = await appStorage.getItem(`booffin_outgoing_follow_requests_${verifiedUserId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        parsed.forEach((id: string) => requestedIds.add(id));
      }
    }
  } catch {}

  // 2. Query follow_requests
  try {
    const { data, error } = await supabase
      .from('follow_requests')
      .select('target_id')
      .eq('requester_id', verifiedUserId)
      .eq('status', 'pending');

    if (!error && Array.isArray(data)) {
      data.forEach((row) => {
        if (row.target_id) requestedIds.add(row.target_id);
      });
    }
  } catch {}

  const result = Array.from(requestedIds);
  try {
    await appStorage.setItem(`booffin_outgoing_follow_requests_${verifiedUserId}`, JSON.stringify(result));
  } catch {}

  return result;
}

/**
 * Fetches incoming pending follow requests for the authenticated user.
 */
export async function fetchIncomingFollowRequests(
  userId?: string
): Promise<FollowRequest[]> {
  const verifiedUserId = await getVerifiedUserId(userId);
  if (!verifiedUserId) return [];

  const requests: FollowRequest[] = [];
  const seenRequesters = new Set<string>();

  // Query follow_requests table
  try {
    const { data, error } = await supabase
      .from('follow_requests')
      .select(`
        id,
        requester_id,
        target_id,
        status,
        created_at,
        requester:profiles!requester_id (
          id,
          username,
          full_name,
          avatar_url,
          academic_title,
          institution,
          orcid_id,
          orcid_verified
        )
      `)
      .eq('target_id', verifiedUserId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      data.forEach((row: any) => {
        if (row.requester && !seenRequesters.has(row.requester_id)) {
          seenRequesters.add(row.requester_id);
          requests.push({
            id: row.id,
            requesterId: row.requester_id,
            requester: mapSupabaseProfile(row.requester),
            targetId: row.target_id,
            status: row.status,
            createdAt: row.created_at,
          });
        }
      });
    }
  } catch {}

  return requests;
}

/**
 * Sends a follow request to a private researcher profile.
 * Persists to:
 * 1. Persistent appStorage (instant local backup for 0ms page reloads)
 * 2. collaboration_requests (database persistence permitted by RLS)
 * 3. notifications (notifies the private researcher with inline Accept/Decline)
 * 4. follow_requests (if table exists)
 */
export async function sendFollowRequest(
  targetUserId: string,
  callerId?: string
): Promise<{ success: boolean; error: string | null }> {
  const verifiedUserId = await getVerifiedUserId(callerId);
  if (!verifiedUserId) {
    return { success: false, error: 'Must be logged in to request to follow.' };
  }

  const targetId = (await resolveTargetProfileId(targetUserId)) || targetUserId;
  if (!targetId || targetId === verifiedUserId) {
    return { success: false, error: 'Cannot send follow request to self.' };
  }

  try {
    // 1. Immediately save to persistent appStorage
    try {
      const cached = await appStorage.getItem(`booffin_outgoing_follow_requests_${verifiedUserId}`);
      const list: string[] = cached ? JSON.parse(cached) : [];
      if (!list.includes(targetId)) {
        list.push(targetId);
        await appStorage.setItem(`booffin_outgoing_follow_requests_${verifiedUserId}`, JSON.stringify(list));
      }
    } catch {}

    // 2. Insert into follow_requests
    const { error: frError } = await supabase
      .from('follow_requests')
      .upsert(
        {
          requester_id: verifiedUserId,
          target_id: targetId,
          status: 'pending',
        },
        { onConflict: 'requester_id,target_id' }
      );

    if (frError && frError.code !== '23505') {
      return { success: false, error: frError.message };
    }

    // 3. Insert notification to the target user (dual column support for backward compatibility)
    try {
      await supabase
        .from('notifications')
        .insert({
          recipient_id: targetId,
          actor_id: verifiedUserId,
          type: 'follow_request',
          notification_type: 'follow_request',
          content: 'requested to follow you',
          message_snippet: 'requested to follow you',
          entity_type: 'profile',
          entity_id: verifiedUserId,
          metadata: {
            request_type: 'follow_request',
            requester_id: verifiedUserId,
            target_id: targetId,
          },
          read_status: false,
        });
    } catch {}

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send follow request.' };
  }
}

/**
 * Cancels a pending follow request sent to a private researcher.
 */
export async function cancelFollowRequest(
  targetUserId: string,
  callerId?: string
): Promise<{ success: boolean; error: string | null }> {
  const verifiedUserId = await getVerifiedUserId(callerId);
  if (!verifiedUserId) {
    return { success: false, error: 'Must be logged in to cancel follow request.' };
  }

  const targetId = (await resolveTargetProfileId(targetUserId)) || targetUserId;

  try {
    // 1. Immediately remove from persistent appStorage
    try {
      const cached = await appStorage.getItem(`booffin_outgoing_follow_requests_${verifiedUserId}`);
      if (cached) {
        const list: string[] = JSON.parse(cached);
        const filtered = list.filter((id) => id !== targetId);
        await appStorage.setItem(`booffin_outgoing_follow_requests_${verifiedUserId}`, JSON.stringify(filtered));
      }
    } catch {}

    // 2. Remove from follow_requests table
    try {
      await supabase
        .from('follow_requests')
        .delete()
        .eq('requester_id', verifiedUserId)
        .eq('target_id', targetId);
    } catch {}

    // 3. Remove pending notification
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('actor_id', verifiedUserId)
        .eq('recipient_id', targetId)
        .in('type', ['follow_request']);
    } catch {}

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to cancel follow request.' };
  }
}

/**
 * Accepts an incoming follow request:
 * - Adds the requester to target's followers in `follows`
 * - Updates follow_requests status to 'accepted'
 * - Cleans up requester's outgoing cache
 * - Notifies requester with `follow_accept`
 * - Marks incoming follow request notification as read
 */
export async function acceptFollowRequest(
  requesterId: string,
  targetUserId?: string
): Promise<{ success: boolean; error: string | null }> {
  const verifiedUserId = await getVerifiedUserId(targetUserId);
  if (!verifiedUserId) {
    return { success: false, error: 'Must be authenticated.' };
  }

  try {
    // 1. Add follow relation: requester follows target
    const { error: followError } = await supabase
      .from('follows')
      .insert({
        follower_id: requesterId,
        following_id: verifiedUserId,
      });

    if (followError && followError.code !== '23505') {
      return { success: false, error: followError.message };
    }

    // 2. Update follow_requests status
    try {
      await supabase
        .from('follow_requests')
        .update({ status: 'accepted' })
        .eq('requester_id', requesterId)
        .eq('target_id', verifiedUserId);
    } catch {}

    // 3. Clean up requester's local storage cache
    try {
      const cached = await appStorage.getItem(`booffin_outgoing_follow_requests_${requesterId}`);
      if (cached) {
        const list: string[] = JSON.parse(cached);
        const filtered = list.filter((id) => id !== verifiedUserId);
        await appStorage.setItem(`booffin_outgoing_follow_requests_${requesterId}`, JSON.stringify(filtered));
      }
    } catch {}

    // 4. Mark the follow_request notification as read
    try {
      await supabase
        .from('notifications')
        .update({ read_status: true })
        .eq('recipient_id', verifiedUserId)
        .eq('actor_id', requesterId)
        .in('type', ['follow_request']);
    } catch {}

    // 5. Send follow_accept notification to the requester (dual column support)
    try {
      await supabase
        .from('notifications')
        .insert({
          recipient_id: requesterId,
          actor_id: verifiedUserId,
          type: 'follow_accept',
          notification_type: 'follow_accept',
          content: 'accepted your follow request',
          message_snippet: 'accepted your follow request',
          entity_type: 'profile',
          entity_id: verifiedUserId,
          metadata: {
            accepted_by: verifiedUserId,
          },
          read_status: false,
        });
    } catch {}

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to accept follow request.' };
  }
}

/**
 * Declines an incoming follow request:
 * - Updates follow_requests status to 'declined'
 * - Cleans up requester's outgoing cache
 * - Marks incoming notification as read
 */
export async function declineFollowRequest(
  requesterId: string,
  targetUserId?: string
): Promise<{ success: boolean; error: string | null }> {
  const verifiedUserId = await getVerifiedUserId(targetUserId);
  if (!verifiedUserId) {
    return { success: false, error: 'Must be authenticated.' };
  }

  try {
    // 1. Update follow_requests status
    try {
      await supabase
        .from('follow_requests')
        .update({ status: 'declined' })
        .eq('requester_id', requesterId)
        .eq('target_id', verifiedUserId);
    } catch {}

    // 2. Clean up requester's local storage cache
    try {
      const cached = await appStorage.getItem(`booffin_outgoing_follow_requests_${requesterId}`);
      if (cached) {
        const list: string[] = JSON.parse(cached);
        const filtered = list.filter((id) => id !== verifiedUserId);
        await appStorage.setItem(`booffin_outgoing_follow_requests_${requesterId}`, JSON.stringify(filtered));
      }
    } catch {}

    // 3. Clean up incoming notification
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('recipient_id', verifiedUserId)
        .eq('actor_id', requesterId)
        .in('type', ['follow_request']);
    } catch {}

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to decline follow request.' };
  }
}

/**
 * Executes an atomic, race-condition-safe toggle follow mutation.
 * Distinguishes between Public and Private profiles:
 * - Public: Direct follow/unfollow
 * - Private: Sends follow request if unrequested, cancels follow request if requested, or unfollows if already following
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
    // 1. If currently following, always perform unfollow (whether private or public)
    const isCurrentlyFollowing = await checkIsFollowing(targetId, verifiedUserId);
    if (isCurrentlyFollowing) {
      const unfollowRes = await unfollowUser(targetId, verifiedUserId);
      return {
        success: unfollowRes.success,
        isFollowing: !unfollowRes.success,
        isRequested: false,
        targetUserId: targetId,
        error: unfollowRes.error,
      };
    }

    // 2. Check if target researcher has a private profile
    const isTargetPrivate = await checkTargetIsPrivate(targetId);

    if (isTargetPrivate) {
      // Check if user already has an active pending follow request
      const hasRequest = await checkHasFollowRequest(targetId, verifiedUserId);
      if (hasRequest) {
        // Cancel the follow request
        const cancelRes = await cancelFollowRequest(targetId, verifiedUserId);
        return {
          success: cancelRes.success,
          isFollowing: false,
          isRequested: false,
          targetUserId: targetId,
          error: cancelRes.error,
        };
      } else {
        // Send follow request
        const reqRes = await sendFollowRequest(targetId, verifiedUserId);
        return {
          success: reqRes.success,
          isFollowing: false,
          isRequested: reqRes.success,
          targetUserId: targetId,
          error: reqRes.error,
        };
      }
    }

    // 3. Target is public: attempt atomic server-side RPC toggle_follow
    const { data: rpcData, error: rpcError } = await supabase.rpc('toggle_follow', {
      target_user_id: targetId,
      caller_user_id: verifiedUserId,
    });

    if (!rpcError && rpcData) {
      const parsed = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
      if (parsed && parsed.success === true && parsed.is_following !== undefined) {
        return {
          success: true,
          isFollowing: Boolean(parsed.is_following),
          isRequested: false,
          targetUserId: targetId,
          targetFollowersCount: parsed.target_followers_count,
          callerFollowingCount: parsed.caller_following_count,
          error: null,
        };
      }
    }

    // 4. Direct table insert fallback
    const followRes = await followUser(targetId, verifiedUserId);
    return {
      success: followRes.success,
      isFollowing: followRes.success,
      isRequested: false,
      targetUserId: targetId,
      error: followRes.error,
    };
  } catch (err: any) {
    return {
      success: false,
      isFollowing: false,
      isRequested: false,
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

    // Ensure notification is created (dual column support, noop if trigger handles it)
    try {
      const isFollowBack = await checkTargetFollowsCaller(verifiedUserId, targetId);
      const followMessage = isFollowBack ? 'followed you back' : 'started following you';
      await supabase
        .from('notifications')
        .insert({
          recipient_id: targetId,
          actor_id: verifiedUserId,
          type: 'follow',
          notification_type: 'follow',
          content: followMessage,
          message_snippet: followMessage,
          entity_type: 'profile',
          entity_id: verifiedUserId,
          metadata: { follower_id: verifiedUserId, is_follow_back: isFollowBack },
          read_status: false,
        });
    } catch {}

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

    // Clean up follow notification
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('actor_id', verifiedUserId)
        .eq('recipient_id', targetId)
        .in('type', ['follow', 'follow_accept']);
    } catch {}

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
 * Fetches all user IDs that actively follow the specified user.
 * Enables instantaneous in-memory reactivity for the "Follow Back" button.
 */
export async function fetchUserFollowerIds(userIdOrHandle: string): Promise<string[]> {
  if (!userIdOrHandle) return [];
  const targetId = (await resolveTargetProfileId(userIdOrHandle)) || userIdOrHandle;

  try {
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', targetId);

    if (!error && Array.isArray(data)) {
      return data.map((row) => row.follower_id);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Checks if a target researcher is currently following the caller.
 */
export async function checkTargetFollowsCaller(
  targetUserId: string,
  callerId?: string
): Promise<boolean> {
  const verifiedUserId = await getVerifiedUserId(callerId);
  if (!verifiedUserId || !targetUserId) return false;

  const targetId = (await resolveTargetProfileId(targetUserId)) || targetUserId;
  if (!targetId || targetId === verifiedUserId) return false;

  try {
    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', targetId)
      .eq('following_id', verifiedUserId)
      .maybeSingle();

    return Boolean(data);
  } catch {
    return false;
  }
}

/**
 * Removes a follower from the authenticated user's followers list.
 */
export async function removeFollower(
  followerUserId: string,
  callerId?: string
): Promise<{ success: boolean; error: string | null }> {
  const verifiedUserId = await getVerifiedUserId(callerId);
  if (!verifiedUserId) {
    return { success: false, error: 'Must be logged in to remove followers.' };
  }

  const targetFollowerId = (await resolveTargetProfileId(followerUserId)) || followerUserId;
  if (!targetFollowerId) {
    return { success: false, error: 'Invalid follower ID.' };
  }

  try {
    // 1. Direct delete from follows table
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', targetFollowerId)
      .eq('following_id', verifiedUserId);

    if (!error) {
      return { success: true, error: null };
    }

    // 2. RPC fallback
    const { error: rpcError } = await supabase.rpc('remove_follower', {
      p_follower_id: targetFollowerId,
    });

    if (rpcError) {
      return { success: false, error: rpcError.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to remove follower.' };
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
      const viewerFollowingIds = verifiedViewerId ? await fetchUserFollowingIds(verifiedViewerId) : [];
      const followingSet = new Set(viewerFollowingIds);
      const researchers: UserProfile[] = [];
      for (const row of data) {
        if (row.follower) {
          const prof = mapSupabaseProfile(row.follower);
          prof.isFollowing = verifiedViewerId ? followingSet.has(prof.id) : false;
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
 * Fetches list of researchers who liked/endorsed a specific post.
 */
export async function fetchPostLikers(
  postId: string,
  viewerId?: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ researchers: UserProfile[]; error: string | null }> {
  if (!postId) return { researchers: [], error: 'Post ID is required.' };
  const verifiedViewerId = await getVerifiedUserId(viewerId);

  try {
    const { data, error } = await supabase
      .from('likes')
      .select(`
        created_at,
        user:profiles!user_id (
          id,
          username,
          full_name,
          avatar_url,
          banner_url,
          academic_title,
          institution,
          orcid_id,
          orcid_verified,
          followers_count,
          following_count,
          posts_count,
          created_at
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { researchers: [], error: error.message };
    }

    if (Array.isArray(data)) {
      const viewerFollowingIds = verifiedViewerId ? await fetchUserFollowingIds(verifiedViewerId) : [];
      const followingSet = new Set(viewerFollowingIds);
      const researchers: UserProfile[] = [];
      for (const row of data) {
        if (row.user) {
          const userObj = Array.isArray(row.user) ? row.user[0] : row.user;
          if (userObj) {
            const prof = mapSupabaseProfile(userObj);
            prof.isFollowing = verifiedViewerId ? followingSet.has(prof.id) : false;
            researchers.push(prof);
          }
        }
      }
      return { researchers, error: null };
    }

    return { researchers: [], error: null };
  } catch (err: any) {
    return { researchers: [], error: err?.message || 'Failed to fetch likers.' };
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
      const viewerFollowingIds = verifiedViewerId ? await fetchUserFollowingIds(verifiedViewerId) : [];
      const followingSet = new Set(viewerFollowingIds);
      const researchers: UserProfile[] = [];
      for (const row of data) {
        if (row.following) {
          const prof = mapSupabaseProfile(row.following);
          prof.isFollowing = verifiedViewerId ? followingSet.has(prof.id) : false;
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
    if (currentUserId && currentUserId !== userId) {
      const { data: blockRow } = await supabase
        .from('user_blocks')
        .select('blocker_id')
        .or(
          `and(blocker_id.eq.${currentUserId},blocked_id.eq.${userId}),and(blocker_id.eq.${userId},blocked_id.eq.${currentUserId})`
        )
        .limit(1)
        .maybeSingle();

      if (blockRow) {
        return { posts: [], error: null };
      }
    }

    const postSelectQuery = `
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
        paper_authors (*)
      ),
      post_topics (
        topic:topics!topic_id (*)
      ),
      likes!left ( user_id ),
      reposts!left ( user_id ),
      bookmarks!left ( user_id )
    `;

    // 1. Fetch posts authored by this user
    const authoredPromise = supabase
      .from('posts')
      .select(postSelectQuery)
      .eq('author_id', userId)
      .order('created_at', { ascending: false });

    // 2. Fetch posts reposted by this user
    const repostsPromise = supabase
      .from('reposts')
      .select(
        `
        created_at,
        user_id,
        user:profiles!user_id (
          id,
          username,
          full_name,
          avatar_url,
          academic_title,
          institution,
          orcid_id,
          orcid_verified
        ),
        post:posts!post_id (
          ${postSelectQuery}
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const [authoredRes, repostsRes] = await Promise.all([authoredPromise, repostsPromise]);

    if (authoredRes.error && repostsRes.error) {
      return { posts: [], error: authoredRes.error.message || repostsRes.error.message };
    }

    const authoredPosts: { post: Post; activityDate: string }[] = (authoredRes.data || []).map((row: any) => ({
      post: mapSupabasePost(row, currentUserId),
      activityDate: row.created_at,
    }));

    const repostedPosts: { post: Post; activityDate: string }[] = (repostsRes.data || [])
      .filter((row: any) => row.post)
      .map((row: any) => {
        const basePost = mapSupabasePost(row.post, currentUserId);
        const reposter = row.user ? mapSupabaseProfile(row.user) : undefined;
        return {
          post: {
            ...basePost,
            isReposted: true,
            repostedBy: reposter,
            repostedAt: formatRelativeTime(row.created_at),
          },
          activityDate: row.created_at,
        };
      });

    // Merge and sort by activity date descending
    const combined = [...authoredPosts, ...repostedPosts];
    combined.sort((a, b) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime());

    // Deduplicate posts
    const seenPostIds = new Set<string>();
    const finalPosts: Post[] = [];

    for (const item of combined) {
      if (!seenPostIds.has(item.post.id)) {
        seenPostIds.add(item.post.id);
        finalPosts.push(item.post);
      }
    }

    const postsWithPolls = await populatePollVotes(finalPosts, currentUserId);

    return {
      posts: postsWithPolls,
      error: null,
    };
  } catch (err: any) {
    return { posts: [], error: err?.message || 'Failed to fetch user posts' };
  }
}

export async function fetchSavedPostsAndPapers(
  userId: string
): Promise<{ posts: Post[]; papers: Paper[]; error: string | null }> {
  if (!userId) return { posts: [], papers: [], error: 'User not authenticated' };

  try {
    const postSelectQuery = `
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
        paper_authors (*)
      ),
      post_topics (
        topic:topics!topic_id (*)
      ),
      likes!left ( user_id ),
      reposts!left ( user_id ),
      bookmarks!left ( user_id )
    `;

    const { data, error } = await supabase
      .from('bookmarks')
      .select(
        `
        id,
        created_at,
        post:posts!post_id (
          ${postSelectQuery}
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
        const mappedPost = mapSupabasePost(row.post, userId);
        mappedPost.isSaved = true;
        posts.push(mappedPost);
      }
      if (row.paper) {
        const mappedPaper = mapSupabasePaper(row.paper, userId);
        mappedPaper.isSaved = true;
        papers.push(mappedPaper);
      }
    });

    const postsWithPolls = await populatePollVotes(posts, userId);

    return { posts: postsWithPolls, papers, error: null };
  } catch (err: any) {
    return { posts: [], papers: [], error: err?.message || 'Failed to fetch bookmarks' };
  }
}

export interface UserCommentActivity {
  id: string;
  postId: string;
  content: string;
  likesCount: number;
  createdAt: string;
  parentCommentId?: string | null;
  postTitle?: string;
  postAuthorName?: string;
  postType?: PostType;
}

export async function fetchUserComments(
  userId: string
): Promise<{ comments: UserCommentActivity[]; error: string | null }> {
  if (!isSupabaseConfigured() || !userId) {
    return { comments: [], error: null };
  }
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        post_id,
        parent_id,
        content,
        likes_count,
        created_at,
        post:posts!post_id (
          id,
          content,
          post_type,
          author:profiles!author_id (
            full_name,
            username
          ),
          paper:papers!paper_id (
            title
          )
        )
      `)
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      // Fallback simple query if relationship join isn't direct
      const { data: fallback, error: fbError } = await supabase
        .from('comments')
        .select('id, post_id, parent_id, content, likes_count, created_at')
        .eq('author_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fbError || !fallback) {
        return { comments: [], error: fbError?.message || error.message };
      }

      const rows: UserCommentActivity[] = fallback
        .filter((r: any) => !r.content || !r.content.startsWith('[POLL_VOTE:'))
        .map((r: any) => ({
          id: r.id,
          postId: r.post_id,
          content: r.content,
          likesCount: r.likes_count || 0,
          createdAt: r.created_at,
          parentCommentId: r.parent_id,
        }));
      return { comments: rows, error: null };
    }

    const filtered = (data || []).filter(
      (r: any) => !r.content || !r.content.startsWith('[POLL_VOTE:')
    );

    const rows: UserCommentActivity[] = filtered.map((r: any) => {
      const p = r.post;
      const authorName = p?.author?.full_name || (p?.author?.username ? `@${p.author.username}` : undefined);
      const postTitle = p?.paper?.title || (p?.content ? (p.content.length > 70 ? p.content.slice(0, 70) + '...' : p.content) : undefined);
      return {
        id: r.id,
        postId: r.post_id,
        content: r.content,
        likesCount: r.likes_count || 0,
        createdAt: r.created_at,
        parentCommentId: r.parent_id,
        postTitle,
        postAuthorName: authorName,
        postType: p?.post_type as PostType | undefined,
      };
    });

    return { comments: rows, error: null };
  } catch (err: any) {
    console.warn('[socialService] fetchUserComments error:', err);
    return { comments: [], error: err?.message || 'Failed to fetch user comments' };
  }
}
