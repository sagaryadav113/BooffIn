import { supabase } from './client';
import { isSupabaseConfigured, mapSupabasePaper, mapSupabasePost, mapSupabaseProfile } from './socialService';
import { Topic, Paper, Post, UserProfile } from '../types';

export interface TopicPageData {
  topic: Topic;
  trendingResearch: Paper[];
  recentResearchShares: Post[];
  discussions: Post[];
  interestedResearchers: UserProfile[];
}

/**
 * Maps a raw Supabase topic row to Topic
 */
export function mapSupabaseTopic(row: any, currentUserId?: string): Topic {
  let isFollowing = false;
  if (currentUserId && Array.isArray(row.topic_follows)) {
    isFollowing = row.topic_follows.some((tf: any) => tf.user_id === currentUserId);
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description || undefined,
    iconName: row.icon_name || 'Brain',
    category: row.category || 'General Science',
    followersCount: row.followers_count || 0,
    postsCount: row.posts_count || 0,
    isFollowing,
  };
}

/**
 * Gets list of followed topic slugs or names for a user
 */
export function getFollowedTopicsForUser(_userId?: string): string[] {
  return [];
}

/**
 * Fetches all topics with follower counts and follow state for current user
 */
export async function fetchTopics(currentUserId?: string): Promise<{
  topics: Topic[];
  error: string | null;
}> {
  try {
    let resolvedUserId = currentUserId;
    if (!resolvedUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      resolvedUserId = user?.id;
    }

    const { data, error } = await supabase
      .from('topics')
      .select(
        `
        id,
        name,
        slug,
        description,
        icon_name,
        category,
        followers_count,
        posts_count,
        topic_follows!left ( user_id )
      `
      )
      .order('followers_count', { ascending: false });

    if (error) {
      return { topics: [], error: error.message };
    }

    if (!data || data.length === 0) {
      return { topics: [], error: null };
    }

    const topics = data.map((row: any) => mapSupabaseTopic(row, resolvedUserId));
    return { topics, error: null };
  } catch (err: any) {
    return { topics: [], error: err?.message || 'Failed to fetch topics' };
  }
}

/**
 * Fetches single topic by slug or ID
 */
export async function fetchTopicBySlug(
  slug: string,
  currentUserId?: string
): Promise<{ topic: Topic | null; error: string | null }> {
  try {
    let resolvedUserId = currentUserId;
    if (!resolvedUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      resolvedUserId = user?.id;
    }

    const { data, error } = await supabase
      .from('topics')
      .select(
        `
        id,
        name,
        slug,
        description,
        icon_name,
        category,
        followers_count,
        posts_count,
        topic_follows!left ( user_id )
      `
      )
      .or(`slug.eq.${slug},id.eq.${slug}`)
      .maybeSingle();

    if (error) {
      return { topic: null, error: error.message };
    }

    if (!data) {
      return { topic: null, error: null };
    }

    return { topic: mapSupabaseTopic(data, resolvedUserId), error: null };
  } catch (err: any) {
    return { topic: null, error: err?.message || 'Failed to fetch topic' };
  }
}

/**
 * Toggles following a topic using relational database table
 */
export async function toggleFollowTopic(
  topicId: string,
  _currentUserId?: string
): Promise<{ isFollowing: boolean; error: string | null }> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { isFollowing: false, error: 'Must be logged in to follow topics.' };
  }
  const verifiedUserId = user.id;

  try {
    // Check if currently following
    const { data: existingFollow } = await supabase
      .from('topic_follows')
      .select('topic_id')
      .eq('user_id', verifiedUserId)
      .eq('topic_id', topicId)
      .maybeSingle();

    const isCurrentlyFollowing = Boolean(existingFollow);
    const nextState = !isCurrentlyFollowing;

    if (nextState) {
      const { error } = await supabase.from('topic_follows').insert({
        user_id: verifiedUserId,
        topic_id: topicId,
      });
      if (error && error.code !== '23505') {
        return { isFollowing: false, error: error.message };
      }
    } else {
      const { error } = await supabase
        .from('topic_follows')
        .delete()
        .match({ user_id: verifiedUserId, topic_id: topicId });
      if (error) {
        return { isFollowing: true, error: error.message };
      }
    }

    return { isFollowing: nextState, error: null };
  } catch (err: any) {
    return { isFollowing: false, error: err?.message || 'Failed to toggle follow' };
  }
}

/**
 * Fetches rich topic page data from Supabase
 */
export async function fetchTopicPageData(
  slugOrId: string,
  currentUserId?: string
): Promise<TopicPageData> {
  const topicRes = await fetchTopicBySlug(slugOrId, currentUserId);
  const topic: Topic = topicRes.topic || {
    id: slugOrId,
    slug: slugOrId.toLowerCase(),
    name: slugOrId.charAt(0).toUpperCase() + slugOrId.slice(1),
    description: '',
    iconName: 'Brain',
    category: 'Science',
    followersCount: 0,
    postsCount: 0,
    isFollowing: false,
  };

  try {
    // 1. Trending research in this topic
    const { data: papersData } = await supabase
      .from('papers')
      .select(`
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
        paper_authors (*),
        paper_topics!inner (
          topic:topics!inner ( slug, name )
        ),
        bookmarks!left ( user_id )
      `)
      .or(`paper_topics.topic.slug.eq.${slugOrId},paper_topics.topic.id.eq.${slugOrId}`)
      .order('discussion_count', { ascending: false })
      .limit(10);

    const trendingResearch = (papersData || []).map((row) => mapSupabasePaper(row, currentUserId));

    // 2. Recent research shares
    const { data: sharesData } = await supabase
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
        author:profiles!author_id (*),
        paper:papers!paper_id (*),
        post_topics!inner (
          topic:topics!inner ( slug, name )
        ),
        likes!left ( user_id ),
        reposts!left ( user_id ),
        bookmarks!left ( user_id )
      `)
      .eq('post_type', 'research_share')
      .or(`post_topics.topic.slug.eq.${slugOrId},post_topics.topic.id.eq.${slugOrId}`)
      .order('created_at', { ascending: false })
      .limit(10);

    const recentResearchShares = (sharesData || []).map((row) => mapSupabasePost(row, currentUserId));

    // 3. Discussions in this topic
    const { data: discussionsData } = await supabase
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
        author:profiles!author_id (*),
        paper:papers!paper_id (*),
        post_topics!inner (
          topic:topics!inner ( slug, name )
        ),
        likes!left ( user_id ),
        reposts!left ( user_id ),
        bookmarks!left ( user_id )
      `)
      .neq('post_type', 'research_share')
      .or(`post_topics.topic.slug.eq.${slugOrId},post_topics.topic.id.eq.${slugOrId}`)
      .order('likes_count', { ascending: false })
      .limit(10);

    const discussions = (discussionsData || []).map((row) => mapSupabasePost(row, currentUserId));

    // 4. Researchers interested in this topic
    const { data: researchersData } = await supabase
      .from('profiles')
      .select('*')
      .contains('research_interests', [topic.name])
      .limit(10);

    const interestedResearchers = (researchersData || []).map(mapSupabaseProfile);

    return {
      topic,
      trendingResearch,
      recentResearchShares,
      discussions,
      interestedResearchers,
    };
  } catch (err) {
    return {
      topic,
      trendingResearch: [],
      recentResearchShares: [],
      discussions: [],
      interestedResearchers: [],
    };
  }
}
