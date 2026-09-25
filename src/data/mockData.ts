import { UserProfile, Paper, Topic, Post, Comment, AppNotification } from '../types';

export const emptyUserProfile: UserProfile = {
  id: '',
  handle: '',
  fullName: '',
  academicTitle: '',
  institution: '',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  bio: '',
  researchInterests: [],
  orcidVerified: false,
  followingCount: 0,
  followersCount: 0,
  postsCount: 0,
  savedCount: 0,
  joinedDate: 'September 2026',
};

export const currentUser: UserProfile = emptyUserProfile;
export const mockUsers: UserProfile[] = [];
export const mockTopics: Topic[] = [];
export const mockPapers: Paper[] = [];
export const mockPosts: Post[] = [];
export const mockComments: Record<string, Comment[]> = {};
export const mockNotifications: AppNotification[] = [];
