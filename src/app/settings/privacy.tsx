import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing } from '../../theme';
import { SettingsLayout } from '../../components/settings/SettingsLayout';
import { SettingsCardGroup } from '../../components/settings/SettingsCardGroup';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { ToggleRow } from '../../components/settings/ToggleRow';
import { SettingsSectionHeader } from '../../components/settings/SettingsSectionHeader';
import { SelectModal, SelectOption } from '../../components/settings/SelectModal';
import { Divider } from '../../components/core/Divider';
import { useSettingsStore } from '../../store/useSettingsStore';

const PROFILE_VISIBILITY_OPTIONS: SelectOption[] = [
  {
    label: 'Public (Everyone)',
    value: 'public',
    description: 'Anyone on or off BooffIn can view your research profile and public posts.',
    icon: 'Globe',
  },
  {
    label: 'Registered Researchers Only',
    value: 'registered',
    description: 'Only authenticated BooffIn members can view your profile details.',
    icon: 'Users',
  },
  {
    label: 'Private',
    value: 'private',
    description: 'Only your approved connections can view your full research profile.',
    icon: 'Lock',
  },
];

const CONNECTION_REQUEST_OPTIONS: SelectOption[] = [
  {
    label: 'Everyone',
    value: 'everyone',
    description: 'Any registered scholar on BooffIn can send you a connection request.',
    icon: 'Users',
  },
  {
    label: 'Verified Affiliations Only',
    value: 'verified_only',
    description: 'Only researchers with verified institutional affiliations or ORCID.',
    icon: 'CheckCircle2',
  },
  {
    label: 'Nobody',
    value: 'none',
    description: 'Prevent new incoming connection requests.',
    icon: 'Slash',
  },
];

const MESSAGE_PERMISSION_OPTIONS: SelectOption[] = [
  {
    label: 'Everyone',
    value: 'everyone',
    description: 'Any researcher on BooffIn can send you a direct message.',
    icon: 'MessageSquare',
  },
  {
    label: 'Connections Only',
    value: 'connections',
    description: 'Only researchers you have mutually connected with can message you.',
    icon: 'Users',
  },
  {
    label: 'Nobody',
    value: 'none',
    description: 'Turn off direct messages completely.',
    icon: 'Lock',
  },
];

const EMAIL_VISIBILITY_OPTIONS: SelectOption[] = [
  {
    label: 'Private (Hidden)',
    value: 'private',
    description: 'Your email address is never displayed on your public profile.',
    icon: 'EyeOff',
  },
  {
    label: 'Connections Only',
    value: 'connections',
    description: 'Visible only to researchers you are mutually connected with.',
    icon: 'Users',
  },
  {
    label: 'Public',
    value: 'public',
    description: 'Visible to all visitors for academic correspondence.',
    icon: 'Mail',
  },
];

export default function PrivacySettingsScreen() {
  const { settings, updateSetting, isSaving } = useSettingsStore();

  const [activeModal, setActiveModal] = useState<
    'visibility' | 'connections' | 'messages' | 'email' | null
  >(null);

  const getVisibilityLabel = (val: string) => {
    switch (val) {
      case 'public': return 'Public';
      case 'registered': return 'Registered Only';
      case 'private': return 'Private';
      default: return 'Public';
    }
  };

  const getConnectionsLabel = (val: string) => {
    switch (val) {
      case 'everyone': return 'Everyone';
      case 'verified_only': return 'Verified Only';
      case 'none': return 'Nobody';
      default: return 'Everyone';
    }
  };

  const getMessagesLabel = (val: string) => {
    switch (val) {
      case 'everyone': return 'Everyone';
      case 'connections': return 'Connections Only';
      case 'none': return 'Nobody';
      default: return 'Connections Only';
    }
  };

  const getEmailLabel = (val: string) => {
    switch (val) {
      case 'public': return 'Public';
      case 'connections': return 'Connections';
      case 'private': return 'Private';
      default: return 'Private';
    }
  };

  return (
    <SettingsLayout
      title="Privacy & Safety"
      subtitle="Manage interaction permissions, profile discoverability, and content filtering."
      isSaving={isSaving}
    >
      {/* 1. Who Can Interact */}
      <SettingsSectionHeader
        title="Who Can Interact With You"
        description="Configure who can connect and initiate direct communications."
      />
      <SettingsCardGroup>
        <SettingsRow
          icon="MessageSquare"
          title="Direct Messages"
          subtitle="Who is allowed to send you private messages"
          value={getMessagesLabel(settings.allowDirectMessages)}
          onPress={() => setActiveModal('messages')}
        />
        <Divider />
        <SettingsRow
          icon="Users"
          title="Connection Requests"
          subtitle="Who can request to connect with you"
          value={getConnectionsLabel(settings.allowConnectionRequests)}
          onPress={() => setActiveModal('connections')}
        />
      </SettingsCardGroup>

      {/* 2. Profile Visibility */}
      <SettingsSectionHeader
        title="Profile & Information Visibility"
        description="Choose how visible your academic profile and credentials are."
      />
      <SettingsCardGroup>
        <SettingsRow
          icon="Globe"
          title="Profile Visibility"
          subtitle="Control who can see your academic profile and public work"
          value={getVisibilityLabel(settings.profileVisibility)}
          onPress={() => setActiveModal('visibility')}
        />
        <Divider />
        <SettingsRow
          icon="Mail"
          title="Email Address Visibility"
          subtitle="Control whether peers can see your email for correspondence"
          value={getEmailLabel(settings.emailVisibility)}
          onPress={() => setActiveModal('email')}
        />
      </SettingsCardGroup>

      {/* 3. Activity & Privacy */}
      <SettingsSectionHeader
        title="Activity Privacy"
        description="Control visibility of your activity and interactions."
      />
      <SettingsCardGroup>
        <ToggleRow
          icon="Heart"
          title="Show Likes on Profile"
          subtitle="Allow peers to view posts you have liked on your profile tab"
          value={settings.showLikesOnProfile}
          onValueChange={(val) => updateSetting('showLikesOnProfile', val)}
        />
        <Divider />
        <ToggleRow
          icon="Activity"
          title="Show Active Status"
          subtitle="Let connections see when you were recently active on BooffIn"
          value={settings.showActivityStatus}
          onValueChange={(val) => updateSetting('showActivityStatus', val)}
        />
      </SettingsCardGroup>

      {/* 4. Content Safety */}
      <SettingsSectionHeader
        title="Content Safety & Moderation"
        description="Community protection and safety filters."
      />
      <SettingsCardGroup>
        <ToggleRow
          icon="Shield"
          title="Filter Unverified / Sensitive Content"
          subtitle="Automatically blur potentially sensitive or unmoderated media"
          value={settings.filterSensitiveContent}
          onValueChange={(val) => updateSetting('filterSensitiveContent', val)}
        />
        <Divider />
        <SettingsRow
          icon="UserX"
          title="Blocked Researchers"
          subtitle="Review and manage blocked or restricted accounts"
          onPress={() => router.push('/settings/blocked' as any)}
        />
      </SettingsCardGroup>

      {/* Select Modals */}
      <SelectModal
        visible={activeModal === 'visibility'}
        onClose={() => setActiveModal(null)}
        title="Profile Visibility"
        subtitle="Choose who can view your academic profile."
        options={PROFILE_VISIBILITY_OPTIONS}
        selectedValue={settings.profileVisibility}
        onSelect={(val) => updateSetting('profileVisibility', val)}
      />

      <SelectModal
        visible={activeModal === 'connections'}
        onClose={() => setActiveModal(null)}
        title="Connection Requests"
        subtitle="Choose who can send you connection invitations."
        options={CONNECTION_REQUEST_OPTIONS}
        selectedValue={settings.allowConnectionRequests}
        onSelect={(val) => updateSetting('allowConnectionRequests', val)}
      />

      <SelectModal
        visible={activeModal === 'messages'}
        onClose={() => setActiveModal(null)}
        title="Direct Messages"
        subtitle="Choose who can send you direct private messages."
        options={MESSAGE_PERMISSION_OPTIONS}
        selectedValue={settings.allowDirectMessages}
        onSelect={(val) => updateSetting('allowDirectMessages', val)}
      />

      <SelectModal
        visible={activeModal === 'email'}
        onClose={() => setActiveModal(null)}
        title="Email Visibility"
        subtitle="Choose who can view your academic email address."
        options={EMAIL_VISIBILITY_OPTIONS}
        selectedValue={settings.emailVisibility}
        onSelect={(val) => updateSetting('emailVisibility', val)}
      />
    </SettingsLayout>
  );
}
