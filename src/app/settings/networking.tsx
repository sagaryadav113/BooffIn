import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';
import { SettingsLayout } from '../../components/settings/SettingsLayout';
import { SettingsCardGroup } from '../../components/settings/SettingsCardGroup';
import { ToggleRow } from '../../components/settings/ToggleRow';
import { SettingsSectionHeader } from '../../components/settings/SettingsSectionHeader';
import { Divider } from '../../components/core/Divider';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function NetworkingSettingsScreen() {
  const { settings, updateSetting, isSaving } = useSettingsStore();

  return (
    <SettingsLayout
      title="Networking"
      subtitle="Configure how BooffIn discovers potential academic collaborators and presents recommendations."
      isSaving={isSaving}
    >
      {/* 1. Academic Matchmaking */}
      <SettingsSectionHeader
        title="Research Discovery & Matching"
        description="Controls how your academic background is matched with other scientists."
      />
      <SettingsCardGroup>
        <ToggleRow
          icon="Compass"
          title="Discoverable by Research Interests"
          subtitle="Allow your profile to appear in searches for your fields and methodologies"
          value={settings.discoverableByInterests}
          onValueChange={(val) => updateSetting('discoverableByInterests', val)}
        />
        <Divider />
        <ToggleRow
          icon="Users"
          title="Researcher Recommendations"
          subtitle="Receive suggestions for colleagues, co-authors, and labs in related fields"
          value={settings.recommendResearchers}
          onValueChange={(val) => updateSetting('recommendResearchers', val)}
        />
        <Divider />
        <ToggleRow
          icon="TrendingUp"
          title="Topic & Preprint Recommendations"
          subtitle="Highlight trending discussions and preprints aligned with your interests"
          value={settings.recommendTopics}
          onValueChange={(val) => updateSetting('recommendTopics', val)}
        />
      </SettingsCardGroup>
    </SettingsLayout>
  );
}
