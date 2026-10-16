import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';
import { SettingsLayout } from '../../components/settings/SettingsLayout';
import { SettingsCardGroup } from '../../components/settings/SettingsCardGroup';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { SettingsSectionHeader } from '../../components/settings/SettingsSectionHeader';
import { SelectModal, SelectOption } from '../../components/settings/SelectModal';
import { useSettingsStore } from '../../store/useSettingsStore';

const DEFAULT_TAB_OPTIONS: SelectOption[] = [
  {
    label: 'For You',
    value: 'For You',
    description: 'Personalized research feed based on your scientific interests and followed topics.',
    icon: 'Sparkles',
  },
  {
    label: 'Following',
    value: 'Following',
    description: 'Chronological timeline of posts directly from researchers and labs you follow.',
    icon: 'Users',
  },
];

export default function AppearanceSettingsScreen() {
  const { settings, updateSetting, isSaving } = useSettingsStore();
  const [tabModalOpen, setTabModalOpen] = useState(false);

  return (
    <SettingsLayout
      title="Appearance & Display"
      subtitle="Customize your default startup feed and view interface preferences."
      isSaving={isSaving}
    >
      {/* 1. Theme & Color Scheme */}
      <SettingsSectionHeader
        title="Theme & Aesthetic"
        description="BooffIn uses a tailored monochrome light aesthetic optimized for scientific reading."
      />
      <SettingsCardGroup>
        <SettingsRow
          icon="Sun"
          title="Theme"
          subtitle="Curated light academic design"
          value="Monochrome Light"
        />
      </SettingsCardGroup>

      {/* 2. Feed Defaults */}
      <SettingsSectionHeader
        title="Navigation & Default Feed"
        description="Select the default feed displayed when opening BooffIn."
      />
      <SettingsCardGroup>
        <SettingsRow
          icon="Compass"
          title="Default Home Tab"
          subtitle="Choose between personalized discovery or following chronological feed"
          value={settings.defaultTab}
          onPress={() => setTabModalOpen(true)}
        />
      </SettingsCardGroup>

      {/* Modal */}
      <SelectModal
        visible={tabModalOpen}
        onClose={() => setTabModalOpen(false)}
        title="Default Home Feed"
        subtitle="Select which feed opens first."
        options={DEFAULT_TAB_OPTIONS}
        selectedValue={settings.defaultTab}
        onSelect={(val) => updateSetting('defaultTab', val)}
      />
    </SettingsLayout>
  );
}
