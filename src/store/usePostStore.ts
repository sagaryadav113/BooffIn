import { create } from 'zustand';
import { Post, Comment, PostType, Paper } from '../types';
import { mockPosts, mockComments, currentUser } from '../data/mockData';

interface CreatePostParams {
  content: string;
  postType: PostType;
  paper?: Paper;
  topics: string[];
  visibility?: 'public' | 'followers';
}

interface PostState {
  posts: Post[];
  comments: Record<string, Comment[]>;
  activeTab: string; // 'For You', 'Following', or Topic name
  setActiveTab: (tab: string) => void;
  toggleLikePost: (postId: string) => void;
  toggleRepost: (postId: string) => void;
  toggleSavePost: (postId: string) => void;
  createPost: (params: CreatePostParams) => Post;
  getPostById: (id: string) => Post | undefined;
  getCommentsForPost: (postId: string) => Comment[];
  addComment: (postId: string, content: string, parentId?: string) => Comment;
  getPostsByPaper: (paperId: string) => Post[];
  getPostsByUser: (userId: string) => Post[];
}

export const usePostStore = create<PostState>((set, get) => ({
  posts: mockPosts,
  comments: mockComments,
  activeTab: 'For You',
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleLikePost: (postId) =>
    set((state) => ({
      posts: state.posts.map((post) => {
        if (post.id === postId) {
          const isLiked = !post.isLiked;
          return {
            ...post,
            isLiked,
            likesCount: isLiked ? post.likesCount + 1 : Math.max(0, post.likesCount - 1),
          };
        }
        return post;
      }),
    })),
  toggleRepost: (postId) =>
    set((state) => ({
      posts: state.posts.map((post) => {
        if (post.id === postId) {
          const isReposted = !post.isReposted;
          return {
            ...post,
            isReposted,
            repostsCount: isReposted ? post.repostsCount + 1 : Math.max(0, post.repostsCount - 1),
          };
        }
        return post;
      }),
    })),
  toggleSavePost: (postId) =>
    set((state) => ({
      posts: state.posts.map((post) => {
        if (post.id === postId) {
          const isSaved = !post.isSaved;
          return {
            ...post,
            isSaved,
            savesCount: isSaved ? post.savesCount + 1 : Math.max(0, post.savesCount - 1),
          };
        }
        return post;
      }),
    })),
  createPost: ({ content, postType, paper, topics, visibility = 'public' }) => {
    const newPost: Post = {
      id: `post_${Date.now()}`,
      author: currentUser,
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

    set((state) => ({
      posts: [newPost, ...state.posts],
    }));

    return newPost;
  },
  getPostById: (id) => get().posts.find((p) => p.id === id),
  getCommentsForPost: (postId) => get().comments[postId] || [],
  addComment: (postId, content, parentId) => {
    const newComment: Comment = {
      id: `c_${Date.now()}`,
      postId,
      author: currentUser,
      content,
      parentId,
      likesCount: 0,
      isLiked: false,
      createdAt: 'Just now',
      replies: [],
    };

    set((state) => {
      const existing = state.comments[postId] || [];
      let updated: Comment[];

      if (parentId) {
        updated = existing.map((c) => {
          if (c.id === parentId) {
            return {
              ...c,
              replies: [...(c.replies || []), newComment],
            };
          }
          return c;
        });
      } else {
        updated = [newComment, ...existing];
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

    return newComment;
  },
  getPostsByPaper: (paperId) =>
    get().posts.filter((p) => p.paper?.id === paperId || p.paper?.doi === paperId),
  getPostsByUser: (userId) => get().posts.filter((p) => p.author.id === userId),
}));
