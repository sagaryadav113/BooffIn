import { create } from 'zustand';
import { Topic } from '../types';
import { mockTopics } from '../data/mockData';

interface TopicState {
  topics: Topic[];
  toggleFollowTopic: (topicId: string) => void;
  getTopicBySlug: (slug: string) => Topic | undefined;
  getFollowedTopics: () => Topic[];
}

export const useTopicStore = create<TopicState>((set, get) => ({
  topics: mockTopics,
  toggleFollowTopic: (topicId) =>
    set((state) => ({
      topics: state.topics.map((t) => {
        if (t.id === topicId || t.slug === topicId) {
          const isFollowing = !t.isFollowing;
          return {
            ...t,
            isFollowing,
            followersCount: isFollowing ? t.followersCount + 1 : Math.max(0, t.followersCount - 1),
          };
        }
        return t;
      }),
    })),
  getTopicBySlug: (slug) => get().topics.find((t) => t.slug === slug || t.name.toLowerCase() === slug.toLowerCase()),
  getFollowedTopics: () => get().topics.filter((t) => t.isFollowing),
}));
