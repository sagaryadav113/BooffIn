import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing } from '../../theme';
import { SettingsLayout } from '../../components/settings/SettingsLayout';
import { SettingsCardGroup } from '../../components/settings/SettingsCardGroup';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { SettingsSectionHeader } from '../../components/settings/SettingsSectionHeader';
import { Divider } from '../../components/core/Divider';
import { useAuthStore } from '../../store/useAuthStore';

export default function ContentSettingsScreen() {
  const { user } = useAuthStore();

  const navigateToProfileTab = (tabName: string) => {
    if (user?.id) {
      router.push(`/profile/${user.id}` as any);
    }
  };

  return (
    <SettingsLayout
      title="Content & Activity"
      subtitle="Quick access to your published research notes, saved preprints, and bookmarks."
    >
      {/* 1. My Publications & Content */}
      <SettingsSectionHeader title="Your Research Activity" />
      <SettingsCardGroup>
        <SettingsRow
          icon="FileText"
          title="My Research Notes & Posts"
          subtitle="View and manage all notes published by you"
          onPress={() => navigateToProfileTab('posts')}
        />
        <Divider />
        <SettingsRow
          icon="Bookmark"
          title="Saved Preprints & Bookmarks"
          subtitle="Access literature and discussions you've saved for later"
          onPress={() => navigateToProfileTab('saved')}
        />
        <Divider />
        <SettingsRow
          icon="Heart"
          title="Liked Discussions"
          subtitle="Browse research posts and findings you have endorsed"
          onPress={() => navigateToProfileTab('likes')}
        />
      </SettingsCardGroup>
    </SettingsLayout>
  );
}
