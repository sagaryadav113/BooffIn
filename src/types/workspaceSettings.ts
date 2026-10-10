export interface WorkspaceSettings {
  // Global Workspace Preferences
  readReceiptsEnabled: boolean;
  onlinePresenceEnabled: boolean;
  typingIndicatorsEnabled: boolean;
  soundAndHapticsEnabled: boolean;
  doiAutoPreviewEnabled: boolean;
  mediaAutoDownload: 'always' | 'wifi' | 'manual';

  // Direct Message (DM) Settings
  mutualFollowDMsOnly: boolean;
  e2eeEnabled: boolean;

  // Community Settings
  communityNotificationFilter: 'all' | 'mentions_only' | 'mute';
  communitySevenDayPreview: boolean;
  communityDiscoverableByDefault: boolean;

  // Inner Circle Settings
  innerCircleZeroHistoryDefault: boolean;
  innerCircleAdminOnlyInvites: boolean;
  autoExpiringPodMessages: 'off' | '7d' | '30d' | '90d';
}

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  readReceiptsEnabled: true,
  onlinePresenceEnabled: true,
  typingIndicatorsEnabled: true,
  soundAndHapticsEnabled: true,
  doiAutoPreviewEnabled: true,
  mediaAutoDownload: 'always',
  mutualFollowDMsOnly: true,
  e2eeEnabled: true,
  communityNotificationFilter: 'all',
  communitySevenDayPreview: true,
  communityDiscoverableByDefault: true,
  innerCircleZeroHistoryDefault: true,
  innerCircleAdminOnlyInvites: true,
  autoExpiringPodMessages: 'off',
};
