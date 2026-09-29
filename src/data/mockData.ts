import { UserProfile, Paper, Topic, Post, Comment, AppNotification } from '../types';

/**
 * Blank UserProfile used as the initial/reset state in the auth store.
 * No hardcoded data — all fields are empty defaults.
 */
export const emptyUserProfile: UserProfile = {
  id: '',
  handle: '',
  fullName: '',
  avatarUrl: undefined,
  academicTitle: '',
  institution: '',
  bio: '',
  researchInterests: [],
  orcidVerified: false,
  followingCount: 0,
  followersCount: 0,
  postsCount: 0,
  savedCount: 0,
  joinedDate: '',
};

// These are kept as named exports for any future use, but are intentionally empty.
// Do NOT populate with hardcoded prototype data.
export const mockUsers: UserProfile[] = [];
export const mockTopics: Topic[] = [];
export const mockPapers: Paper[] = [];
export const mockPosts: Post[] = [];
export const mockComments: Record<string, Comment[]> = {};
export const mockNotifications: AppNotification[] = [];
