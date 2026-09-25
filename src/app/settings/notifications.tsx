import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';
import { SettingsLayout } from '../../components/settings/SettingsLayout';
import { SettingsCardGroup } from '../../components/settings/SettingsCardGroup';
import { ToggleRow } from '../../components/settings/ToggleRow';
import { SettingsSectionHeader } from '../../components/settings/SettingsSectionHeader';
import { Divider } from '../../components/core/Divider';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function NotificationSettingsScreen() {
  const { settings, updateSetting, isSaving } = useSettingsStore();

  return (
    <SettingsLayout
      title="Notifications"
      subtitle="Control how and when BooffIn alerts you about academic citations, discussions, and research updates."
      isSaving={isSaving}
    >
      {/* 1. Engagement Notifications */}
      <SettingsSectionHeader
        title="Engagement & Interactions"
        description="Notifications when peers interact with your ideas and research posts."
      />
      <SettingsCardGroup>
        <ToggleRow
          icon="Heart"
          title="Likes & Endorsements"
          subtitle="When someone likes or endorses your post"
          value={settings.notifyLikes}
          onValueChange={(val) => updateSetting('notifyLikes', val)}
        />
        <Divider />
        <ToggleRow
          icon="MessageSquare"
          title="Comments & Replies"
          subtitle="When someone replies to your research thread or comments"
          value={settings.notifyComments}
          onValueChange={(val) => updateSetting('notifyComments', val)}
        />
        <Divider />
        <ToggleRow
          icon="AtSign"
          title="Mentions"
          subtitle="When a colleague mentions your @handle in a post or comment"
          value={settings.notifyMentions}
          onValueChange={(val) => updateSetting('notifyMentions', val)}
        />
        <Divider />
        <ToggleRow
          icon="Repeat2"
          title="Reposts & Shares"
          subtitle="When someone reposts or shares your research note"
          value={settings.notifyReposts}
          onValueChange={(val) => updateSetting('notifyReposts', val)}
        />
      </SettingsCardGroup>

      {/* 2. Research & Academic Activity */}
      <SettingsSectionHeader
        title="Research & Academic Updates"
        description="Alerts regarding preprints, discussions in your fields, and research peers."
      />
      <SettingsCardGroup>
        <ToggleRow
          icon="FileText"
          title="Paper Discussions"
          subtitle="When someone starts a discussion on papers you follow"
          value={settings.notifyPaperDiscussions}
          onValueChange={(val) => updateSetting('notifyPaperDiscussions', val)}
        />
        <Divider />
        <ToggleRow
          icon="Users"
          title="Collaboration Requests"
          subtitle="When a researcher sends an inquiry to connect or collaborate"
          value={settings.notifyCollaborationRequests}
          onValueChange={(val) => updateSetting('notifyCollaborationRequests', val)}
        />
        <Divider />
        <ToggleRow
          icon="UserCheck"
          title="Following Activity"
          subtitle="New posts from researchers and labs you follow"
          value={settings.notifyResearcherPosts}
          onValueChange={(val) => updateSetting('notifyResearcherPosts', val)}
        />
        <Divider />
        <ToggleRow
          icon="Tag"
          title="Topic Activity"
          subtitle="Trending discussions in your subscribed research disciplines"
          value={settings.notifyTopicActivity}
          onValueChange={(val) => updateSetting('notifyTopicActivity', val)}
        />
      </SettingsCardGroup>

      {/* 3. Delivery Channels */}
      <SettingsSectionHeader
        title="Delivery Channels"
        description="Select your preferred notification delivery methods."
      />
      <SettingsCardGroup>
        <ToggleRow
          icon="Bell"
          title="Push Notifications"
          subtitle="Real-time alerts on your device"
          value={settings.pushNotifications}
          onValueChange={(val) => updateSetting('pushNotifications', val)}
        />
        <Divider />
        <ToggleRow
          icon="Mail"
          title="Email Notifications"
          subtitle="Important direct interactions and message alerts"
          value={settings.emailNotifications}
          onValueChange={(val) => updateSetting('emailNotifications', val)}
        />
        <Divider />
        <ToggleRow
          icon="Inbox"
          title="Weekly Topic Digest"
          subtitle="Weekly summary of top preprints and findings in your fields"
          value={settings.weeklyDigest}
          onValueChange={(val) => updateSetting('weeklyDigest', val)}
        />
      </SettingsCardGroup>
    </SettingsLayout>
  );
}
