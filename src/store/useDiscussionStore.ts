import { create } from 'zustand';
import {
  DiscussionContribution,
  DiscussionReply,
  DiscussionType,
  InterestedPerson,
  Paper,
  UserProfile,
} from '../types';
import { mockPaperDiscussions } from '../data/mockDiscussions';
import { mockUsers } from '../data/mockData';

interface DiscussionState {
  discussions: Record<string, DiscussionContribution[]>;
  activeFilter: 'all' | DiscussionType;

  // Actions
  setActiveFilter: (filter: 'all' | DiscussionType) => void;
  getDiscussionsForPaper: (paperId: string, filter?: 'all' | DiscussionType) => DiscussionContribution[];
  addDiscussion: (params: {
    paperId: string;
    author: UserProfile;
    type: DiscussionType;
    content: string;
    title?: string;
  }) => DiscussionContribution;
  addReply: (params: {
    paperId: string;
    discussionId: string;
    author: UserProfile;
    content: string;
  }) => DiscussionReply | null;
  toggleLikeDiscussion: (paperId: string, discussionId: string) => void;
  toggleLikeReply: (paperId: string, discussionId: string, replyId: string) => void;
  getParticipatingResearchers: (paperId: string) => UserProfile[];
  getInterestedPeople: (paper: Paper, currentUserId?: string) => InterestedPerson[];
}

/**
 * Extracts @mentions from text content
 */
function extractMentions(text: string): string[] {
  const matches = text.match(/@([a-zA-Z0-9_]+)/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.replace('@', '').toLowerCase())));
}

export const useDiscussionStore = create<DiscussionState>((set, get) => ({
  discussions: mockPaperDiscussions,
  activeFilter: 'all',

  setActiveFilter: (activeFilter) => set({ activeFilter }),

  getDiscussionsForPaper: (paperId: string, filter?: 'all' | DiscussionType) => {
    const list = get().discussions[paperId] || [];
    const active = filter || get().activeFilter;
    if (!active || active === 'all') {
      return list;
    }
    return list.filter((d) => d.type === active);
  },

  addDiscussion: ({ paperId, author, type, content, title }) => {
    const mentions = extractMentions(content);
    const newDiscussion: DiscussionContribution = {
      id: `disc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      paperId,
      author,
      type,
      title: title?.trim() || undefined,
      content: content.trim(),
      mentions,
      likesCount: 0,
      isLiked: false,
      repliesCount: 0,
      createdAt: 'Just now',
      replies: [],
    };

    set((state) => {
      const existing = state.discussions[paperId] || [];
      return {
        discussions: {
          ...state.discussions,
          [paperId]: [newDiscussion, ...existing],
        },
      };
    });

    return newDiscussion;
  },

  addReply: ({ paperId, discussionId, author, content }) => {
    const mentions = extractMentions(content);
    const newReply: DiscussionReply = {
      id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      discussionId,
      author,
      content: content.trim(),
      mentions,
      likesCount: 0,
      isLiked: false,
      createdAt: 'Just now',
    };

    let replyCreated: DiscussionReply | null = null;

    set((state) => {
      const paperList = state.discussions[paperId] || [];
      const updated = paperList.map((disc) => {
        if (disc.id === discussionId) {
          replyCreated = newReply;
          const currentReplies = disc.replies || [];
          return {
            ...disc,
            repliesCount: disc.repliesCount + 1,
            replies: [...currentReplies, newReply],
          };
        }
        return disc;
      });

      return {
        discussions: {
          ...state.discussions,
          [paperId]: updated,
        },
      };
    });

    return replyCreated;
  },

  toggleLikeDiscussion: (paperId: string, discussionId: string) => {
    set((state) => {
      const paperList = state.discussions[paperId] || [];
      const updated = paperList.map((disc) => {
        if (disc.id === discussionId) {
          const isLiked = !disc.isLiked;
          return {
            ...disc,
            isLiked,
            likesCount: isLiked ? disc.likesCount + 1 : Math.max(0, disc.likesCount - 1),
          };
        }
        return disc;
      });

      return {
        discussions: {
          ...state.discussions,
          [paperId]: updated,
        },
      };
    });
  },

  toggleLikeReply: (paperId: string, discussionId: string, replyId: string) => {
    set((state) => {
      const paperList = state.discussions[paperId] || [];
      const updated = paperList.map((disc) => {
        if (disc.id === discussionId && disc.replies) {
          const updatedReplies = disc.replies.map((rep) => {
            if (rep.id === replyId) {
              const isLiked = !rep.isLiked;
              return {
                ...rep,
                isLiked,
                likesCount: isLiked ? rep.likesCount + 1 : Math.max(0, rep.likesCount - 1),
              };
            }
            return rep;
          });

          return {
            ...disc,
            replies: updatedReplies,
          };
        }
        return disc;
      });

      return {
        discussions: {
          ...state.discussions,
          [paperId]: updated,
        },
      };
    });
  },

  getParticipatingResearchers: (paperId: string) => {
    const list = get().discussions[paperId] || [];
    const map = new Map<string, UserProfile>();

    for (const disc of list) {
      if (!map.has(disc.author.id)) {
        map.set(disc.author.id, disc.author);
      }
      if (disc.replies) {
        for (const rep of disc.replies) {
          if (!map.has(rep.author.id)) {
            map.set(rep.author.id, rep.author);
          }
        }
      }
    }

    return Array.from(map.values());
  },

  getInterestedPeople: (paper: Paper, currentUserId?: string) => {
    const users = mockUsers.filter((u) => u.id !== currentUserId && u.id !== 'usr_me');
    const paperTopicsLower = paper.topics.map((t) => t.toLowerCase());

    const results: InterestedPerson[] = [];
    const seenIds = new Set<string>();

    // 1. Topic followers: match researchInterests with paper.topics
    for (const user of users) {
      const interests = user.researchInterests || [];
      const matched = interests.filter((interest) =>
        paperTopicsLower.some(
          (pt) => pt.includes(interest.toLowerCase()) || interest.toLowerCase().includes(pt)
        )
      );

      if (matched.length > 0 && !seenIds.has(user.id)) {
        seenIds.add(user.id);
        results.push({
          user,
          reason: `Follows ${matched[0]}`,
          matchedTopics: matched,
        });
      }
    }

    // 2. Interacting researchers (e.g. users active in discussion or field)
    for (const user of users) {
      if (!seenIds.has(user.id)) {
        seenIds.add(user.id);
        const interests = user.researchInterests || [];
        results.push({
          user,
          reason: `Researches ${interests[0] || 'Life Sciences'}`,
          matchedTopics: interests.slice(0, 2),
        });
      }
    }

    return results.slice(0, 5);
  },
}));
