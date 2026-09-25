import { create } from 'zustand';
import { Topic } from '../types';
import {
  fetchTopics as apiFetchTopics,
  toggleFollowTopic as apiToggleFollowTopic,
} from '../api/topicService';

interface TopicState {
  topics: Topic[];
  isLoading: boolean;

  // Actions
  fetchTopics: (currentUserId?: string) => Promise<void>;
  toggleFollowTopic: (topicId: string, currentUserId?: string) => Promise<boolean>;
  getTopicBySlug: (slug: string) => Topic | undefined;
  getFollowedTopics: () => Topic[];
  getFollowedTopicNames: () => string[];
}

export const useTopicStore = create<TopicState>((set, get) => ({
  topics: [],
  isLoading: false,

  fetchTopics: async (currentUserId) => {
    set({ isLoading: true });
    const res = await apiFetchTopics(currentUserId);
    if (!res.error && res.topics) {
      set({ topics: res.topics, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },

  toggleFollowTopic: async (topicId, currentUserId) => {
    // 1. Optimistic update in store
    let nextFollowState = false;
    set((state) => ({
      topics: state.topics.map((t) => {
        if (t.id === topicId || t.slug === topicId) {
          nextFollowState = !t.isFollowing;
          return {
            ...t,
            isFollowing: nextFollowState,
            followersCount: nextFollowState
              ? t.followersCount + 1
              : Math.max(0, t.followersCount - 1),
          };
        }
        return t;
      }),
    }));

    // 2. Persist to relational database / service
    const targetTopic = get().topics.find((t) => t.id === topicId || t.slug === topicId);
    const resolvedId = targetTopic?.id || topicId;

    const res = await apiToggleFollowTopic(resolvedId, currentUserId);
    if (res.error) {
      // Rollback on server error
      set((state) => ({
        topics: state.topics.map((t) => {
          if (t.id === topicId || t.slug === topicId) {
            return {
              ...t,
              isFollowing: !nextFollowState,
              followersCount: !nextFollowState
                ? t.followersCount + 1
                : Math.max(0, t.followersCount - 1),
            };
          }
          return t;
        }),
      }));
      return !nextFollowState;
    }

    return nextFollowState;
  },

  getTopicBySlug: (slug) => {
    const s = slug.toLowerCase().trim();
    return get().topics.find(
      (t) => t.slug.toLowerCase() === s || t.name.toLowerCase() === s || t.id.toLowerCase() === s
    );
  },

  getFollowedTopics: () => get().topics.filter((t) => t.isFollowing),

  getFollowedTopicNames: () =>
    get()
      .topics.filter((t) => t.isFollowing)
      .flatMap((t) => [t.name.toLowerCase(), t.slug.toLowerCase()]),
}));
