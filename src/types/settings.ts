export type ThemePreference = 'system' | 'light' | 'dark';
export type DefaultTabPreference = 'For You' | 'Following';
export type ProfileVisibilityPreference = 'public' | 'registered' | 'private';
export type ConnectionPermissionPreference = 'everyone' | 'verified_only' | 'none';
export type MessagePermissionPreference = 'everyone' | 'connections' | 'none';
export type EmailVisibilityPreference = 'public' | 'connections' | 'private';

export interface UserSettings {
  userId: string;

  // Notification Preferences
  notifyLikes: boolean;
  notifyComments: boolean;
  notifyMentions: boolean;
  notifyReposts: boolean;
  notifyPaperDiscussions: boolean;
  notifyCollaborationRequests: boolean;
  notifyResearcherPosts: boolean;
  notifyTopicActivity: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;

  // Privacy & Safety
  profileVisibility: ProfileVisibilityPreference;
  allowConnectionRequests: ConnectionPermissionPreference;
  allowDirectMessages: MessagePermissionPreference;
  emailVisibility: EmailVisibilityPreference;
  showLikesOnProfile: boolean;
  showActivityStatus: boolean;
  filterSensitiveContent: boolean;

  // Networking & Recommendations
  discoverableByInterests: boolean;
  recommendResearchers: boolean;
  recommendTopics: boolean;

  // Appearance & Experience
  theme: ThemePreference;
  defaultTab: DefaultTabPreference;
  reducedMotion: boolean;

  createdAt?: string;
  updatedAt?: string;
}

export const defaultUserSettings: UserSettings = {
  userId: '',
  notifyLikes: true,
  notifyComments: true,
  notifyMentions: true,
  notifyReposts: true,
  notifyPaperDiscussions: true,
  notifyCollaborationRequests: true,
  notifyResearcherPosts: true,
  notifyTopicActivity: true,
  emailNotifications: false,
  pushNotifications: true,
  weeklyDigest: true,

  profileVisibility: 'public',
  allowConnectionRequests: 'everyone',
  allowDirectMessages: 'connections',
  emailVisibility: 'private',
  showLikesOnProfile: true,
  showActivityStatus: true,
  filterSensitiveContent: true,

  discoverableByInterests: true,
  recommendResearchers: true,
  recommendTopics: true,

  theme: 'system',
  defaultTab: 'For You',
  reducedMotion: false,
};
