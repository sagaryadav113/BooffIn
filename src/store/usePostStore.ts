import { create } from 'zustand';
import { Post, Comment, PostType, Paper, Poll } from '../types';
import { useAuthStore } from './useAuthStore';
import {
  fetchFeed as apiFetchFeed,
  createPost as apiCreatePost,
  updatePost as apiUpdatePost,
  deletePost as apiDeletePost,
  toggleLike as apiToggleLike,
  toggleRepost as apiToggleRepost,
  toggleBookmark as apiToggleBookmark,
  fetchComments as apiFetchComments,
  addComment as apiAddComment,
  deleteComment as apiDeleteComment,
  toggleCommentLike as apiToggleCommentLike,
  votePoll as apiVotePoll,
} from '../api/socialService';

export interface CreatePostParams {
  content: string;
  postType: PostType;
  paper?: Paper;
  images?: string[];
  poll?: import('../types').Poll;
  article?: import('../types').ArticleData;
  topics: string[];
  visibility?: 'public' | 'followers';
  authorId?: string;
}

interface PostState {
  posts: Post[];
  comments: Record<string, Comment[]>;
  activeTab: string; // 'For You', 'Following', or Topic name
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  page: number;
  feedError: string | null;

  // Actions
  fetchFeed: (tab?: string, currentUserId?: string) => Promise<void>;
  refreshFeed: (currentUserId?: string) => Promise<void>;
  loadMoreFeed: (currentUserId?: string) => Promise<void>;
  setActiveTab: (tab: string, currentUserId?: string) => void;
  toggleLikePost: (postId: string, currentUserId?: string) => Promise<void>;
  toggleRepost: (postId: string, currentUserId?: string) => Promise<void>;
  toggleSavePost: (postId: string, currentUserId?: string) => Promise<void>;
  votePoll: (postId: string, optionId: string, currentUserId?: string) => Promise<boolean>;
  createPost: (params: CreatePostParams, currentUserId?: string) => Promise<Post | null>;
  updatePost: (postId: string, content: string, topics?: string[]) => Promise<boolean>;
  deletePost: (postId: string, currentUserId?: string) => Promise<boolean>;
  fetchCommentsForPost: (postId: string, currentUserId?: string) => Promise<void>;
  getCommentsForPost: (postId: string) => Comment[];
  addComment: (postId: string, content: string, parentId?: string, currentUserId?: string) => Promise<Comment | null>;
  deleteComment: (commentId: string, postId: string, currentUserId?: string) => Promise<boolean>;
  toggleLikeComment: (commentId: string, postId: string, currentUserId?: string) => void;
  getPostById: (id: string) => Post | undefined;
  getPostsByPaper: (paperId: string) => Post[];
  getPostsByUser: (userId: string) => Post[];
}

export const usePostStore = create<PostState>((set, get) => ({
  posts: [],
  comments: {},
  activeTab: 'For You',
  isLoading: false,
  isRefreshing: false,
  isLoadingMore: false,
  hasMore: true,
  page: 1,
  feedError: null,

  fetchFeed: async (tab, currentUserId) => {
    const activeTab = tab || get().activeTab;
    const resolvedUserId = currentUserId || useAuthStore.getState().user.id;
    set({ isLoading: true, feedError: null, page: 1 });

    const res = await apiFetchFeed({
      tab: activeTab,
      page: 1,
      pageSize: 10,
      currentUserId: resolvedUserId,
    });

    if (res.error) {
      set({
        isLoading: false,
        feedError: res.error,
        posts: get().posts,
      });
      return;
    }

    set({
      posts: res.posts || [],
      hasMore: res.hasMore,
      isLoading: false,
      feedError: null,
      page: 1,
    });
  },

  refreshFeed: async (currentUserId) => {
    const resolvedUserId = currentUserId || useAuthStore.getState().user?.id;
    set({ isRefreshing: true, feedError: null });
    const res = await apiFetchFeed({
      tab: get().activeTab,
      page: 1,
      pageSize: 10,
      currentUserId: resolvedUserId,
    });

    if (res.error) {
      set({
        isRefreshing: false,
        feedError: res.error,
      });
      return;
    }

    set({
      posts: res.posts || [],
      hasMore: res.hasMore,
      isRefreshing: false,
      feedError: null,
      page: 1,
    });
  },

  loadMoreFeed: async (currentUserId) => {
    if (get().isLoadingMore || !get().hasMore || get().isLoading || get().isRefreshing) return;

    const resolvedUserId = currentUserId || useAuthStore.getState().user?.id;
    const nextPage = get().page + 1;
    set({ isLoadingMore: true });

    const res = await apiFetchFeed({
      tab: get().activeTab,
      page: nextPage,
      pageSize: 10,
      currentUserId: resolvedUserId,
    });

    if (res.error || res.posts.length === 0) {
      set({ isLoadingMore: false, hasMore: false });
      return;
    }

    // Append new posts avoiding duplicates
    const existingIds = new Set(get().posts.map((p) => p.id));
    const uniqueNewPosts = res.posts.filter((p) => !existingIds.has(p.id));

    set({
      posts: [...get().posts, ...uniqueNewPosts],
      hasMore: res.hasMore,
      isLoadingMore: false,
      page: nextPage,
    });
  },

  setActiveTab: (tab, currentUserId) => {
    set({ activeTab: tab });
    get().fetchFeed(tab, currentUserId);
  },

  toggleLikePost: async (postId, currentUserId) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;

    const wasLiked = Boolean(post.isLiked);
    const newIsLiked = !wasLiked;
    const countDelta = newIsLiked ? 1 : -1;

    // 1. Optimistic UI update
    set((state) => ({
      posts: state.posts.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            isLiked: newIsLiked,
            likesCount: Math.max(0, p.likesCount + countDelta),
          };
        }
        return p;
      }),
    }));

    // 2. Perform backend API mutation
    const userId = currentUserId || useAuthStore.getState().user.id;
    const res = await apiToggleLike(postId, wasLiked, userId);

    // 3. Rollback if error
    if (!res.success) {
      console.warn('[usePostStore] Like mutation failed, rolling back:', res.error);
      set((state) => ({
        posts: state.posts.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              isLiked: wasLiked,
              likesCount: Math.max(0, p.likesCount - countDelta),
            };
          }
          return p;
        }),
      }));
    }
  },

  toggleRepost: async (postId, currentUserId) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;

    const wasReposted = Boolean(post.isReposted);
    const newIsReposted = !wasReposted;
    const countDelta = newIsReposted ? 1 : -1;

    // 1. Optimistic UI update
    set((state) => ({
      posts: state.posts.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            isReposted: newIsReposted,
            repostsCount: Math.max(0, p.repostsCount + countDelta),
          };
        }
        return p;
      }),
    }));

    // 2. Backend mutation
    const userId = currentUserId || useAuthStore.getState().user.id;
    const res = await apiToggleRepost(postId, wasReposted, userId);

    // 3. Rollback on failure
    if (!res.success) {
      console.warn('[usePostStore] Repost mutation failed, rolling back:', res.error);
      set((state) => ({
        posts: state.posts.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              isReposted: wasReposted,
              repostsCount: Math.max(0, p.repostsCount - countDelta),
            };
          }
          return p;
        }),
      }));
    }
  },

  toggleSavePost: async (postId, currentUserId) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;

    const wasSaved = Boolean(post.isSaved);
    const newIsSaved = !wasSaved;
    const countDelta = newIsSaved ? 1 : -1;

    // 1. Optimistic update
    set((state) => ({
      posts: state.posts.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            isSaved: newIsSaved,
            savesCount: Math.max(0, p.savesCount + countDelta),
          };
        }
        return p;
      }),
    }));

    // 2. Backend mutation
    const userId = currentUserId || useAuthStore.getState().user.id;
    const res = await apiToggleBookmark({ postId }, wasSaved, userId);

    // 3. Rollback on failure
    if (!res.success) {
      console.warn('[usePostStore] Save mutation failed, rolling back:', res.error);
      set((state) => ({
        posts: state.posts.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              isSaved: wasSaved,
              savesCount: Math.max(0, p.savesCount - countDelta),
            };
          }
          return p;
        }),
      }));
    }
  },

  votePoll: async (postId, optionId, currentUserId) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post || !post.poll) return false;

    const previousPost = {
      ...post,
      poll: post.poll ? { ...post.poll, options: [...post.poll.options] } : undefined,
    };
    const prevVotedOptionId = post.poll.userVotedOptionId;
    const isChangingVote = Boolean(prevVotedOptionId && prevVotedOptionId !== optionId);
    const isSameVote = prevVotedOptionId === optionId;

    if (isSameVote) return true;

    // 1. Optimistic update
    const updatedOptions = post.poll.options.map((opt) => {
      let count = opt.votesCount;
      if (opt.id === optionId) {
        count += 1;
      } else if (opt.id === prevVotedOptionId) {
        count = Math.max(0, count - 1);
      }
      return { ...opt, votesCount: count };
    });

    const updatedTotalVotes = isChangingVote
      ? post.poll.totalVotes
      : post.poll.totalVotes + 1;

    const updatedPoll: Poll = {
      ...post.poll,
      options: updatedOptions,
      totalVotes: updatedTotalVotes,
      userVotedOptionId: optionId,
    };

    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, poll: updatedPoll } : p
      ),
    }));

    // 2. Backend mutation
    const userId = currentUserId || useAuthStore.getState().user.id;
    const res = await apiVotePoll(postId, optionId, userId);

    if (!res.success) {
      console.warn('[usePostStore] Poll vote failed, rolling back:', res.error);
      set((state) => ({
        posts: state.posts.map((p) => (p.id === postId ? previousPost : p)),
      }));
      return false;
    }

    return true;
  },

  createPost: async (params, currentUserId) => {
    const activeUser = useAuthStore.getState().user;
    const authorId = currentUserId || params.authorId || activeUser.id;
    const tempId = `post_${Date.now()}`;

    // 1. Optimistic new post
    const optimisticPost: Post = {
      id: tempId,
      author: activeUser,
      postType: params.postType,
      content: params.content,
      paper: params.paper,
      images: params.images,
      poll: params.poll,
      article: params.article,
      topics: params.topics,
      visibility: params.visibility || 'public',
      likesCount: 0,
      commentsCount: 0,
      repostsCount: 0,
      savesCount: 0,
      isLiked: false,
      isReposted: false,
      isSaved: false,
      createdAt: 'Just now',
    };

    set((state) => ({
      posts: [optimisticPost, ...state.posts],
    }));

    // 2. Real API call
    const res = await apiCreatePost({
      content: params.content,
      postType: params.postType,
      paper: params.paper,
      mediaUrls: params.images,
      poll: params.poll,
      article: params.article,
      topics: params.topics,
      visibility: params.visibility || 'public',
      authorId,
    });

    if (res.post) {
      // Replace optimistic post with returned post
      set((state) => ({
        posts: state.posts.map((p) => (p.id === tempId ? res.post! : p)),
      }));
      return res.post;
    }

    return optimisticPost;
  },

  updatePost: async (postId, content, topics) => {
    // 1. Optimistic update
    const previousPosts = get().posts;
    set((state) => ({
      posts: state.posts.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            content,
            topics: topics !== undefined ? topics : p.topics,
          };
        }
        return p;
      }),
    }));

    // 2. API call
    const res = await apiUpdatePost({ postId, content, topics });
    if (res.error) {
      console.warn('[usePostStore] updatePost failed, rolling back:', res.error);
      set({ posts: previousPosts });
      return false;
    }

    if (res.post) {
      set((state) => ({
        posts: state.posts.map((p) => (p.id === postId ? { ...p, ...res.post! } : p)),
      }));
    }
    return true;
  },

  deletePost: async (postId, currentUserId) => {
    // 1. Optimistic delete
    const previousPosts = get().posts;
    set((state) => ({
      posts: state.posts.filter((p) => p.id !== postId),
    }));

    // 2. API call
    const res = await apiDeletePost(postId, currentUserId);
    if (!res.success) {
      console.warn('[usePostStore] deletePost failed, rolling back:', res.error);
      set({ posts: previousPosts });
      return false;
    }
    return true;
  },

  fetchCommentsForPost: async (postId, currentUserId) => {
    const res = await apiFetchComments(postId, currentUserId);
    set((state) => ({
      comments: {
        ...state.comments,
        [postId]: res.comments,
      },
    }));
  },

  getCommentsForPost: (postId) => get().comments[postId] || [],

  addComment: async (postId, content, parentId, currentUserId) => {
    const activeUser = useAuthStore.getState().user;
    const authorId = currentUserId || activeUser.id;
    const tempCommentId = `c_${Date.now()}`;

    const optimisticComment: Comment = {
      id: tempCommentId,
      postId,
      author: activeUser,
      content,
      parentId,
      likesCount: 0,
      isLiked: false,
      createdAt: 'Just now',
      replies: [],
    };

    // 1. Optimistic insert
    set((state) => {
      const existing = state.comments[postId] || [];
      let updated: Comment[];

      if (parentId) {
        const insertNestedReply = (
          list: Comment[],
          targetId: string,
          replyToAdd: Comment
        ): { updated: Comment[]; found: boolean } => {
          let found = false;
          const resList = list.map((item) => {
            if (item.id === targetId) {
              found = true;
              return {
                ...item,
                replies: [...(item.replies || []), replyToAdd],
              };
            }
            if (item.replies && item.replies.length > 0) {
              const nested = insertNestedReply(item.replies, targetId, replyToAdd);
              if (nested.found) {
                found = true;
                return {
                  ...item,
                  replies: nested.updated,
                };
              }
            }
            return item;
          });
          return { updated: resList, found };
        };

        const result = insertNestedReply(existing, parentId, optimisticComment);
        if (result.found) {
          updated = result.updated;
        } else {
          updated = [optimisticComment, ...existing];
        }
      } else {
        updated = [optimisticComment, ...existing];
      }

      const updatedPosts = state.posts.map((p) =>
        p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
      );

      return {
        comments: {
          ...state.comments,
          [postId]: updated,
        },
        posts: updatedPosts,
      };
    });

    // 2. Real API mutation
    const res = await apiAddComment({
      postId,
      content,
      parentId,
      authorId,
    });

    if (res.comment) {
      // Replace optimistic comment with live DB comment
      const liveComment = res.comment;
      set((state) => {
        const currentList = state.comments[postId] || [];
        const replaceInList = (list: Comment[]): Comment[] => {
          return list.map((c) => {
            if (c.id === tempCommentId) {
              return { ...liveComment, replies: c.replies || [] };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: replaceInList(c.replies) };
            }
            return c;
          });
        };

        return {
          comments: {
            ...state.comments,
            [postId]: replaceInList(currentList),
          },
        };
      });
      return liveComment;
    }

    return optimisticComment;
  },

  deleteComment: async (commentId, postId, currentUserId) => {
    // 1. Optimistic removal
    const previousComments = get().comments[postId] || [];

    const removeFromList = (list: Comment[]): Comment[] => {
      return list
        .filter((c) => c.id !== commentId)
        .map((c) => ({
          ...c,
          replies: c.replies ? removeFromList(c.replies) : [],
        }));
    };

    set((state) => ({
      comments: {
        ...state.comments,
        [postId]: removeFromList(state.comments[postId] || []),
      },
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1) } : p
      ),
    }));

    // 2. Backend mutation
    const res = await apiDeleteComment(commentId, postId, currentUserId);

    // 3. Rollback if failed
    if (!res.success) {
      console.warn('[usePostStore] deleteComment failed, rolling back:', res.error);
      set((state) => ({
        comments: {
          ...state.comments,
          [postId]: previousComments,
        },
        posts: state.posts.map((p) =>
          p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
        ),
      }));
      return false;
    }

    return true;
  },

  toggleLikeComment: (commentId, postId, currentUserId) => {
    const activeUserId = currentUserId || useAuthStore.getState().user?.id;
    let wasLiked = false;

    set((state) => {
      const currentList = state.comments[postId] || [];
      const updateInList = (list: Comment[]): Comment[] => {
        return list.map((c) => {
          if (c.id === commentId) {
            wasLiked = Boolean(c.isLiked);
            return {
              ...c,
              isLiked: !wasLiked,
              likesCount: wasLiked ? Math.max(0, c.likesCount - 1) : c.likesCount + 1,
            };
          }
          if (c.replies && c.replies.length > 0) {
            return {
              ...c,
              replies: updateInList(c.replies),
            };
          }
          return c;
        });
      };

      return {
        comments: {
          ...state.comments,
          [postId]: updateInList(currentList),
        },
      };
    });

    // Asynchronously persist to local storage and DB
    apiToggleCommentLike(commentId, wasLiked, activeUserId).catch((err) => {
      console.warn('[usePostStore] toggleLikeComment persistence warning:', err);
    });
  },

  getPostById: (id) => get().posts.find((p) => p.id === id),
  getPostsByPaper: (paperId) =>
    get().posts.filter((p) => p.paper?.id === paperId || p.paper?.doi === paperId),
  getPostsByUser: (userId) =>
    get().posts.filter((p) => p.author.id === userId || (p.isReposted && p.author.id !== userId)),
}));
