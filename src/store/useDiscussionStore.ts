import { create } from 'zustand';
import {
  DiscussionContribution,
  DiscussionReply,
  DiscussionType,
  InterestedPerson,
  Paper,
  UserProfile,
} from '../types';
import { supabase } from '../api/client';

interface DiscussionState {
  discussions: Record<string, DiscussionContribution[]>;
  activeFilter: 'all' | DiscussionType;
  isLoading: boolean;

  // Actions
  setActiveFilter: (filter: 'all' | DiscussionType) => void;
  fetchDiscussionsForPaper: (paperId: string) => Promise<void>;
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
  discussions: {},
  activeFilter: 'all',
  isLoading: false,

  setActiveFilter: (activeFilter) => set({ activeFilter }),

  fetchDiscussionsForPaper: async (paperId: string) => {
    set({ isLoading: true });
    try {
      // Find posts and comments referencing this paper in Supabase
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          post_type,
          created_at,
          author:profiles(id, username, full_name, avatar_url, academic_title, institution, orcid_id, is_orcid_verified),
          comments(
            id,
            content,
            created_at,
            author:profiles(id, username, full_name, avatar_url, academic_title, institution, orcid_id, is_orcid_verified)
          )
        `)
        .eq('paper_id', paperId)
        .order('created_at', { ascending: false });

      if (error || !data) {
        set({ isLoading: false });
        return;
      }

      const mapped: DiscussionContribution[] = data.map((row: any) => ({
        id: row.id,
        paperId,
        author: {
          id: row.author?.id || '',
          handle: row.author?.username || 'researcher',
          fullName: row.author?.full_name || 'Researcher',
          avatarUrl: row.author?.avatar_url,
          academicTitle: row.author?.academic_title || 'Researcher',
          institution: row.author?.institution || '',
          bio: '',
          orcidVerified: Boolean(row.author?.is_orcid_verified),
          orcidId: row.author?.orcid_id,
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          savedCount: 0,
          joinedDate: '',
        },
        type: (row.post_type as DiscussionType) || 'discussion',
        content: row.content || '',
        mentions: extractMentions(row.content || ''),
        likesCount: 0,
        isLiked: false,
        repliesCount: row.comments?.length || 0,
        createdAt: 'Recently',
        replies: (row.comments || []).map((c: any) => ({
          id: c.id,
          discussionId: row.id,
          author: {
            id: c.author?.id || '',
            handle: c.author?.username || 'researcher',
            fullName: c.author?.full_name || 'Researcher',
            avatarUrl: c.author?.avatar_url,
            academicTitle: c.author?.academic_title || 'Researcher',
            institution: c.author?.institution || '',
            bio: '',
            orcidVerified: Boolean(c.author?.is_orcid_verified),
            orcidId: c.author?.orcid_id,
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            savedCount: 0,
            joinedDate: '',
          },
          content: c.content || '',
          mentions: extractMentions(c.content || ''),
          likesCount: 0,
          isLiked: false,
          createdAt: 'Recently',
        })),
      }));

      set((state) => ({
        discussions: {
          ...state.discussions,
          [paperId]: mapped,
        },
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

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
    // Return empty list if no real active users participate or match
    return [];
  },
}));
