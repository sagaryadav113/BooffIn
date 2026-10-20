import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, useTheme, ThemeMode } from '../../theme';
import { SettingsLayout } from '../../components/settings/SettingsLayout';
import { SettingsCardGroup } from '../../components/settings/SettingsCardGroup';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { SettingsSectionHeader } from '../../components/settings/SettingsSectionHeader';
import { SelectModal, SelectOption } from '../../components/settings/SelectModal';
import { useSettingsStore } from '../../store/useSettingsStore';

const THEME_OPTIONS: SelectOption[] = [
  {
    label: 'System Default',
    value: 'system',
    description: 'Automatically synchronizes with your device operating system appearance.',
    icon: 'Laptop',
  },
  {
    label: 'Monochrome Light',
    value: 'light',
    description: 'Crisp academic paper-white canvas optimized for daylight reading.',
    icon: 'Sun',
  },
  {
    label: 'Obsidian Dark',
    value: 'dark',
    description: 'Calibrated anti-glare dark slate surface with high-contrast text and emerald accents.',
    icon: 'Moon',
  },
];

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
  const { themeMode, setThemeMode } = useTheme();
  const [tabModalOpen, setTabModalOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);

  const themeDisplayLabel =
    themeMode === 'dark'
      ? 'Obsidian Dark'
      : themeMode === 'system'
      ? 'System Auto'
      : 'Monochrome Light';

  const themeIcon =
    themeMode === 'dark' ? 'Moon' : themeMode === 'system' ? 'Laptop' : 'Sun';

  return (
    <SettingsLayout
      title="Appearance & Display"
      subtitle="Customize your default startup feed and view interface preferences."
      isSaving={isSaving}
    >
      {/* 1. Theme & Color Scheme */}
      <SettingsSectionHeader
        title="Theme & Aesthetic"
        description="Choose between academic monochrome light, anti-glare obsidian dark, or automatic system sync."
      />
      <SettingsCardGroup>
        <SettingsRow
          icon={themeIcon}
          title="App Theme"
          subtitle={
            themeMode === 'dark'
              ? 'Calibrated anti-glare slate with emerald accents'
              : themeMode === 'system'
              ? 'Automatically adjusts based on device mode'
              : 'Classic academic paper-white design'
          }
          value={themeDisplayLabel}
          onPress={() => setThemeModalOpen(true)}
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

      {/* Theme Selection Modal */}
      <SelectModal
        visible={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
        title="Select App Theme"
        subtitle="Choose your preferred appearance."
        options={THEME_OPTIONS}
        selectedValue={themeMode}
        onSelect={(val) => setThemeMode(val as ThemeMode)}
      />

      {/* Feed Selection Modal */}
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
