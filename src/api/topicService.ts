import { supabase } from './client';
import { isSupabaseConfigured } from './socialService';
import { Topic, Paper, Post, UserProfile } from '../types';
import { mockTopics, mockPapers, mockPosts, mockUsers } from '../data/mockData';

// Local relational store for topic follows (used in fallback / local development mode)
const localTopicFollows = new Set<string>([
  'usr_me:top_1', // Neuroscience
  'usr_me:top_4', // Molecular Biology
  'usr_me:top_6', // AI in Science
  'usr_1:top_1',  // Dr. Aanya Rao -> Neuroscience
  'usr_1:top_4',
  'usr_2:top_1',  // PhD Diary -> Neuroscience
  'usr_3:top_1',  // Dr. Elena Park -> Neuroscience
  'usr_4:top_2',  // Prof. Arjun Mehta -> Genetics
]);

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
  if (currentUserId) {
    if (Array.isArray(row.topic_follows) && row.topic_follows.length > 0) {
      isFollowing = true;
    } else {
      isFollowing = localTopicFollows.has(`${currentUserId}:${row.id}`) ||
        localTopicFollows.has(`${currentUserId}:${row.slug}`);
    }
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
 * Fetches all topics with follower counts and follow state for current user
 */
export async function fetchTopics(currentUserId?: string): Promise<{
  topics: Topic[];
  error: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return getFallbackTopics(currentUserId);
  }

  try {
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

    if (error || !data) {
      return getFallbackTopics(currentUserId);
    }

    const topics = data.map((row: any) => mapSupabaseTopic(row, currentUserId));
    return { topics, error: null };
  } catch {
    return getFallbackTopics(currentUserId);
  }
}

/**
 * Fetches single topic by slug or ID
 */
export async function fetchTopicBySlug(
  slug: string,
  currentUserId?: string
): Promise<{ topic: Topic | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    const fallbackList = getFallbackTopics(currentUserId).topics;
    const found = fallbackList.find(
      (t) => t.slug.toLowerCase() === slug.toLowerCase() || t.name.toLowerCase() === slug.toLowerCase()
    );
    return { topic: found || null, error: null };
  }

  try {
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
      .single();

    if (error || !data) {
      const fallbackList = getFallbackTopics(currentUserId).topics;
      const found = fallbackList.find(
        (t) => t.slug.toLowerCase() === slug.toLowerCase() || t.name.toLowerCase() === slug.toLowerCase()
      );
      return { topic: found || null, error: null };
    }

    return { topic: mapSupabaseTopic(data, currentUserId), error: null };
  } catch {
    const fallbackList = getFallbackTopics(currentUserId).topics;
    const found = fallbackList.find(
      (t) => t.slug.toLowerCase() === slug.toLowerCase() || t.name.toLowerCase() === slug.toLowerCase()
    );
    return { topic: found || null, error: null };
  }
}

/**
 * Toggles following a topic using relational database table
 */
export async function toggleFollowTopic(
  topicId: string,
  currentUserId: string
): Promise<{ isFollowing: boolean; error: string | null }> {
  const followKey = `${currentUserId}:${topicId}`;
  const isCurrentlyFollowing = localTopicFollows.has(followKey);
  const nextState = !isCurrentlyFollowing;

  // Update local relationship set
  if (nextState) {
    localTopicFollows.add(followKey);
  } else {
    localTopicFollows.delete(followKey);
  }

  if (!isSupabaseConfigured()) {
    return { isFollowing: nextState, error: null };
  }

  try {
    if (nextState) {
      const { error } = await supabase.from('topic_follows').insert({
        user_id: currentUserId,
        topic_id: topicId,
      });
      if (error && error.code !== '23505') {
        // Rollback
        localTopicFollows.delete(followKey);
        return { isFollowing: false, error: error.message };
      }
    } else {
      const { error } = await supabase
        .from('topic_follows')
        .delete()
        .match({ user_id: currentUserId, topic_id: topicId });
      if (error) {
        // Rollback
        localTopicFollows.add(followKey);
        return { isFollowing: true, error: error.message };
      }
    }

    return { isFollowing: nextState, error: null };
  } catch (err: any) {
    return { isFollowing: nextState, error: null };
  }
}

/**
 * Returns set of followed topic names and slugs for the user
 */
export function getFollowedTopicsForUser(currentUserId: string): string[] {
  const topics = getFallbackTopics(currentUserId).topics;
  return topics
    .filter((t) => localTopicFollows.has(`${currentUserId}:${t.id}`) || localTopicFollows.has(`${currentUserId}:${t.slug}`))
    .flatMap((t) => [t.name.toLowerCase(), t.slug.toLowerCase()]);
}

/**
 * Fetches rich topic page data (Topic info, Trending research, Research shares, Discussions, Interested researchers)
 */
export async function fetchTopicPageData(
  slugOrId: string,
  currentUserId?: string
): Promise<TopicPageData> {
  const topicRes = await fetchTopicBySlug(slugOrId, currentUserId);
  const topic =
    topicRes.topic || {
      id: 'top_1',
      slug: slugOrId.toLowerCase(),
      name: slugOrId.charAt(0).toUpperCase() + slugOrId.slice(1),
      description: 'Academic discourse and peer-reviewed research in this field.',
      iconName: 'Brain',
      category: 'Science',
      followersCount: 125000,
      postsCount: 3400,
      isFollowing: false,
    };

  const topicNameLower = topic.name.toLowerCase();
  const topicSlugLower = topic.slug.toLowerCase();

  // 1. Trending research in this topic (papers tagged with this topic, ranked by discussion count & citations)
  const trendingResearch = mockPapers
    .filter((p) =>
      p.topics.some(
        (t) =>
          t.toLowerCase().includes(topicNameLower) ||
          topicNameLower.includes(t.toLowerCase()) ||
          t.toLowerCase().includes(topicSlugLower)
      )
    )
    .sort((a, b) => b.discussionCount + b.citationCount - (a.discussionCount + a.citationCount));

  // 2. Recent research shares (posts of type 'research_share' with paper reference)
  const recentResearchShares = mockPosts
    .filter(
      (p) =>
        p.postType === 'research_share' &&
        p.topics.some(
          (t) =>
            t.toLowerCase().includes(topicNameLower) ||
            topicNameLower.includes(t.toLowerCase()) ||
            t.toLowerCase().includes(topicSlugLower)
        )
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  // 3. Discussions (posts of type 'discussion', 'question', 'insight' in this topic)
  const discussions = mockPosts
    .filter(
      (p) =>
        p.postType !== 'research_share' &&
        p.topics.some(
          (t) =>
            t.toLowerCase().includes(topicNameLower) ||
            topicNameLower.includes(t.toLowerCase()) ||
            t.toLowerCase().includes(topicSlugLower)
        )
    )
    .sort((a, b) => b.likesCount + b.commentsCount - (a.likesCount + a.commentsCount));

  // 4. Researchers interested in the topic (followers or researchers with matching interests)
  const interestedResearchers = mockUsers.filter((u) => {
    const followsThis =
      localTopicFollows.has(`${u.id}:${topic.id}`) ||
      localTopicFollows.has(`${u.id}:${topic.slug}`);
    const matchesInterests = (u.researchInterests || []).some(
      (interest) =>
        interest.toLowerCase().includes(topicNameLower) ||
        topicNameLower.includes(interest.toLowerCase())
    );
    return followsThis || matchesInterests;
  });

  return {
    topic,
    trendingResearch,
    recentResearchShares,
    discussions,
    interestedResearchers,
  };
}

/**
 * Fallback topics provider
 */
function getFallbackTopics(currentUserId?: string): {
  topics: Topic[];
  error: string | null;
} {
  const mapped = mockTopics.map((t) => {
    const isFollowing = currentUserId
      ? localTopicFollows.has(`${currentUserId}:${t.id}`) ||
        localTopicFollows.has(`${currentUserId}:${t.slug}`)
      : Boolean(t.isFollowing);

    return {
      ...t,
      isFollowing,
      followersCount: isFollowing ? t.followersCount + 1 : t.followersCount,
    };
  });

  return { topics: mapped, error: null };
}
