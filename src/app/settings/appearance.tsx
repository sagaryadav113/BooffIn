import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';
import { SettingsLayout } from '../../components/settings/SettingsLayout';
import { SettingsCardGroup } from '../../components/settings/SettingsCardGroup';
import { SettingsRow } from '../../components/settings/SettingsRow';
import { ToggleRow } from '../../components/settings/ToggleRow';
import { SettingsSectionHeader } from '../../components/settings/SettingsSectionHeader';
import { SelectModal, SelectOption } from '../../components/settings/SelectModal';
import { Divider } from '../../components/core/Divider';
import { useSettingsStore } from '../../store/useSettingsStore';

const THEME_OPTIONS: SelectOption[] = [
  {
    label: 'System Default',
    value: 'system',
    description: 'Automatically adjust appearance based on your device settings.',
    icon: 'Sun',
  },
  {
    label: 'Light Mode',
    value: 'light',
    description: 'Clean monochrome light interface optimized for reading.',
    icon: 'Sun',
  },
  {
    label: 'Dark Mode',
    value: 'dark',
    description: 'Low-glare dark appearance for nighttime research.',
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

  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [tabModalOpen, setTabModalOpen] = useState(false);

  const getThemeDisplay = (val: string) => {
    switch (val) {
      case 'system': return 'System Default';
      case 'light': return 'Light Mode';
      case 'dark': return 'Dark Mode';
      default: return 'System Default';
    }
  };

  return (
    <SettingsLayout
      title="Appearance & Display"
      subtitle="Customize themes, default feeds, and accessibility options."
      isSaving={isSaving}
    >
      {/* 1. Theme */}
      <SettingsSectionHeader
        title="Theme & Color Scheme"
        description="Choose how BooffIn looks on your device."
      />
      <SettingsCardGroup>
        <SettingsRow
          icon="Sun"
          title="Theme"
          subtitle="Monochrome academic aesthetic"
          value={getThemeDisplay(settings.theme)}
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

      {/* 3. Accessibility */}
      <SettingsSectionHeader
        title="Accessibility & Motion"
        description="Display preferences for comfortable reading."
      />
      <SettingsCardGroup>
        <ToggleRow
          icon="Activity"
          title="Reduced Motion"
          subtitle="Minimize animations and transition effects throughout the app"
          value={settings.reducedMotion}
          onValueChange={(val) => updateSetting('reducedMotion', val)}
        />
      </SettingsCardGroup>

      {/* Modals */}
      <SelectModal
        visible={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
        title="Choose Theme"
        subtitle="Select your preferred color scheme."
        options={THEME_OPTIONS}
        selectedValue={settings.theme}
        onSelect={(val) => updateSetting('theme', val)}
      />

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
