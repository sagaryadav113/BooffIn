import { create } from 'zustand';
import { Post, Comment, PostType, Paper } from '../types';
import { mockPosts, mockComments, currentUser } from '../data/mockData';
import {
  fetchFeed as apiFetchFeed,
  createPost as apiCreatePost,
  toggleLike as apiToggleLike,
  toggleRepost as apiToggleRepost,
  toggleBookmark as apiToggleBookmark,
  fetchComments as apiFetchComments,
  addComment as apiAddComment,
  deleteComment as apiDeleteComment,
} from '../api/socialService';

export interface CreatePostParams {
  content: string;
  postType: PostType;
  paper?: Paper;
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
  createPost: (params: CreatePostParams, currentUserId?: string) => Promise<Post | null>;
  fetchCommentsForPost: (postId: string, currentUserId?: string) => Promise<void>;
  getCommentsForPost: (postId: string) => Comment[];
  addComment: (postId: string, content: string, parentId?: string, currentUserId?: string) => Promise<Comment | null>;
  deleteComment: (commentId: string, postId: string, currentUserId: string) => Promise<boolean>;
  getPostById: (id: string) => Post | undefined;
  getPostsByPaper: (paperId: string) => Post[];
  getPostsByUser: (userId: string) => Post[];
}

export const usePostStore = create<PostState>((set, get) => ({
  posts: mockPosts,
  comments: mockComments,
  activeTab: 'For You',
  isLoading: false,
  isRefreshing: false,
  isLoadingMore: false,
  hasMore: true,
  page: 1,
  feedError: null,

  fetchFeed: async (tab, currentUserId) => {
    const activeTab = tab || get().activeTab;
    set({ isLoading: true, feedError: null, page: 1 });

    const res = await apiFetchFeed({
      tab: activeTab,
      page: 1,
      pageSize: 10,
      currentUserId,
    });

    if (res.error) {
      set({
        isLoading: false,
        feedError: res.error,
        posts: get().posts.length > 0 ? get().posts : mockPosts,
      });
      return;
    }

    set({
      posts: res.posts,
      hasMore: res.hasMore,
      isLoading: false,
      feedError: null,
      page: 1,
    });
  },

  refreshFeed: async (currentUserId) => {
    set({ isRefreshing: true, feedError: null });
    const res = await apiFetchFeed({
      tab: get().activeTab,
      page: 1,
      pageSize: 10,
      currentUserId,
    });

    set({
      posts: res.posts.length > 0 ? res.posts : get().posts,
      hasMore: res.hasMore,
      isRefreshing: false,
      feedError: res.error,
      page: 1,
    });
  },

  loadMoreFeed: async (currentUserId) => {
    if (get().isLoadingMore || !get().hasMore || get().isLoading) return;

    const nextPage = get().page + 1;
    set({ isLoadingMore: true });

    const res = await apiFetchFeed({
      tab: get().activeTab,
      page: nextPage,
      pageSize: 10,
      currentUserId,
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
    const userId = currentUserId || currentUser.id;
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
    const userId = currentUserId || currentUser.id;
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
    const userId = currentUserId || currentUser.id;
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

  createPost: async (params, currentUserId) => {
    const authorId = currentUserId || params.authorId || currentUser.id;
    const tempId = `post_${Date.now()}`;

    // 1. Optimistic new post
    const optimisticPost: Post = {
      id: tempId,
      author: currentUser,
      postType: params.postType,
      content: params.content,
      paper: params.paper,
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
    const authorId = currentUserId || currentUser.id;
    const tempCommentId = `c_${Date.now()}`;

    const optimisticComment: Comment = {
      id: tempCommentId,
      postId,
      author: currentUser,
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
        updated = existing.map((c) => {
          if (c.id === parentId) {
            return {
              ...c,
              replies: [...(c.replies || []), optimisticComment],
            };
          }
          return c;
        });
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

  getPostById: (id) => get().posts.find((p) => p.id === id),
  getPostsByPaper: (paperId) =>
    get().posts.filter((p) => p.paper?.id === paperId || p.paper?.doi === paperId),
  getPostsByUser: (userId) => get().posts.filter((p) => p.author.id === userId),
}));
