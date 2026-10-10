import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {
  Settings,
  Shield,
  Users,
  MessageSquare,
  Lock,
  CheckCircle2,
  CheckCheck,
  Bell,
  Volume2,
  FileText,
  Download,
  Trash2,
  RotateCcw,
  Sparkles,
  Info,
  ChevronRight,
  Eye,
  Radio,
  Clock,
  Layers,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWorkspaceSettingsStore } from '../../store/useWorkspaceSettingsStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { colors, radii, spacing, typography } from '../../theme';
import { WorkspaceSettings } from '../../types/workspaceSettings';

export const WorkspaceSettingsView: React.FC = () => {
  const currentUser = useAuthStore((s) => s.user);
  const { settings, updateSetting, resetSettings, isLoading } = useWorkspaceSettingsStore();
  const communities = useWorkspaceStore((s) => s.communities);

  const [isClearingCache, setIsClearingCache] = useState(false);
  const [cacheClearedSuccess, setCacheClearedSuccess] = useState(false);

  // Active owned communities count (max 3)
  const activeOwnedCommunitiesCount = (communities || []).filter(
    (c) =>
      (c.owner_id === currentUser?.id || c.creator_id === currentUser?.id) &&
      c.type === 'community' &&
      !c.is_disabled &&
      c.status !== 'disabled'
  ).length;

  const handleToggle = (key: keyof WorkspaceSettings, currentValue: boolean) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    updateSetting(key, !currentValue, currentUser?.id);
  };

  const handleSegmentChange = <K extends keyof WorkspaceSettings>(
    key: K,
    value: WorkspaceSettings[K]
  ) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    updateSetting(key, value, currentUser?.id);
  };

  const handleClearCache = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    setIsClearingCache(true);
    try {
      // Clear cached voice notes, paper abstracts, and ephemeral files
      const allKeys = await AsyncStorage.getAllKeys();
      const wsCacheKeys = allKeys.filter(
        (k) =>
          k.startsWith('booffin_audio_') ||
          k.startsWith('booffin_paper_cache_') ||
          k.startsWith('booffin_media_thumb_')
      );
      if (wsCacheKeys.length > 0) {
        await AsyncStorage.multiRemove(wsCacheKeys);
      }
      setCacheClearedSuccess(true);
      setTimeout(() => setCacheClearedSuccess(false), 3000);
    } catch {
      Alert.alert('Cache Error', 'Failed to clear local workspace cache.');
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleResetDefaults = () => {
    Alert.alert(
      'Reset Workspace Settings',
      'Are you sure you want to reset all workspace settings to their default configuration?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {}
            resetSettings(currentUser?.id);
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#164E3F" />
        <Text style={styles.loadingText}>Loading workspace preferences...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Banner */}
      <View style={styles.headerBanner}>
        <View style={styles.headerIconCircle}>
          <Settings size={24} color="#064E3B" strokeWidth={2.2} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Workspace Settings</Text>
          <Text style={styles.headerSub}>
            Preferences apply in real-time across DMs, Communities & Inner Circles
          </Text>
        </View>
      </View>

      {/* SECTION 1: GLOBAL CHAT & PRIVACY PREFERENCES */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Layers size={17} color="#064E3B" strokeWidth={2.2} />
          <Text style={styles.sectionTitle}>Global Chat & Privacy</Text>
        </View>

        {/* Read Receipts */}
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={styles.iconBox}>
              <CheckCheck size={18} color="#064E3B" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Send Read Receipts</Text>
              <Text style={styles.settingDesc}>
                Show double blue checkmarks (✓✓) when messages are seen
              </Text>
            </View>
          </View>
          <Switch
            value={settings.readReceiptsEnabled}
            onValueChange={() => handleToggle('readReceiptsEnabled', settings.readReceiptsEnabled)}
            trackColor={{ false: '#CBD5E1', true: '#064E3B' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Online Presence */}
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={styles.iconBox}>
              <Radio size={18} color="#064E3B" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Active Online Presence</Text>
              <Text style={styles.settingDesc}>
                Show a green dot when you are actively inside the workspace
              </Text>
            </View>
          </View>
          <Switch
            value={settings.onlinePresenceEnabled}
            onValueChange={() => handleToggle('onlinePresenceEnabled', settings.onlinePresenceEnabled)}
            trackColor={{ false: '#CBD5E1', true: '#064E3B' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Typing Indicators */}
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={styles.iconBox}>
              <Sparkles size={18} color="#064E3B" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Typing Indicators</Text>
              <Text style={styles.settingDesc}>
                Broadcast typing status when composing chat responses
              </Text>
            </View>
          </View>
          <Switch
            value={settings.typingIndicatorsEnabled}
            onValueChange={() => handleToggle('typingIndicatorsEnabled', settings.typingIndicatorsEnabled)}
            trackColor={{ false: '#CBD5E1', true: '#064E3B' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Sound & Haptics */}
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={styles.iconBox}>
              <Volume2 size={18} color="#064E3B" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>In-App Sounds & Haptics</Text>
              <Text style={styles.settingDesc}>
                Play subtle auditory & tactile feedback for new messages
              </Text>
            </View>
          </View>
          <Switch
            value={settings.soundAndHapticsEnabled}
            onValueChange={() => handleToggle('soundAndHapticsEnabled', settings.soundAndHapticsEnabled)}
            trackColor={{ false: '#CBD5E1', true: '#064E3B' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* DOI Paper Auto-Preview */}
        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
          <View style={styles.settingLeft}>
            <View style={styles.iconBox}>
              <FileText size={18} color="#064E3B" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Paper & DOI Auto-Previews</Text>
              <Text style={styles.settingDesc}>
                Automatically fetch abstracts, journal info & citation stats
              </Text>
            </View>
          </View>
          <Switch
            value={settings.doiAutoPreviewEnabled}
            onValueChange={() => handleToggle('doiAutoPreviewEnabled', settings.doiAutoPreviewEnabled)}
            trackColor={{ false: '#CBD5E1', true: '#064E3B' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* SECTION 2: DIRECT MESSAGES (DM) */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <MessageSquare size={17} color="#064E3B" strokeWidth={2.2} />
          <Text style={styles.sectionTitle}>Direct Messages (DM)</Text>
        </View>

        {/* Mutual Follow DM Security */}
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={styles.iconBox}>
              <Shield size={18} color="#064E3B" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Mutual Follow Requirement</Text>
              <Text style={styles.settingDesc}>
                Only researchers whom you mutually follow can initiate 1-on-1 DMs
              </Text>
            </View>
          </View>
          <Switch
            value={settings.mutualFollowDMsOnly}
            onValueChange={() => handleToggle('mutualFollowDMsOnly', settings.mutualFollowDMsOnly)}
            trackColor={{ false: '#CBD5E1', true: '#064E3B' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* E2EE Info Card */}
        <View style={styles.infoBanner}>
          <View style={styles.infoBannerHeader}>
            <Lock size={15} color="#064E3B" strokeWidth={2.2} />
            <Text style={styles.infoBannerTitle}>End-to-End Encryption (E2EE)</Text>
          </View>
          <Text style={styles.infoBannerText}>
            Direct messages between verified researchers are secured with standard asymmetric key encryption. Messages are encrypted on-device.
          </Text>
        </View>
      </View>

      {/* SECTION 3: COMMUNITY MANAGEMENT */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Users size={17} color="#064E3B" strokeWidth={2.2} />
          <Text style={styles.sectionTitle}>Community Settings</Text>
        </View>

        {/* Community Capacity Tracker */}
        <View style={styles.capacityCard}>
          <View style={styles.capacityHeader}>
            <Text style={styles.capacityLabel}>Active Communities Created</Text>
            <View style={styles.capacityPill}>
              <Text style={styles.capacityPillText}>
                {activeOwnedCommunitiesCount}/3 Active
              </Text>
            </View>
          </View>
          <Text style={styles.capacityDesc}>
            You can maintain up to 3 active communities. Inactive/disabled communities remain view-only.
          </Text>
        </View>

        {/* 7-Day History Preview */}
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={styles.iconBox}>
              <Clock size={18} color="#064E3B" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>7-Day Chat History Preview</Text>
              <Text style={styles.settingDesc}>
                Allow prospective researchers to review the past 7 days of chat before joining
              </Text>
            </View>
          </View>
          <Switch
            value={settings.communitySevenDayPreview}
            onValueChange={() => handleToggle('communitySevenDayPreview', settings.communitySevenDayPreview)}
            trackColor={{ false: '#CBD5E1', true: '#064E3B' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Public Directory Discoverability */}
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={styles.iconBox}>
              <Eye size={18} color="#064E3B" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Public Directory Listing</Text>
              <Text style={styles.settingDesc}>
                Show your communities in global search and discovery feeds
              </Text>
            </View>
          </View>
          <Switch
            value={settings.communityDiscoverableByDefault}
            onValueChange={() => handleToggle('communityDiscoverableByDefault', settings.communityDiscoverableByDefault)}
            trackColor={{ false: '#CBD5E1', true: '#064E3B' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Community Notifications Segmented Filter */}
        <View style={[styles.settingRowVertical, { borderBottomWidth: 0 }]}>
          <View style={styles.settingTextWrap}>
            <Text style={styles.settingLabel}>Community Notifications</Text>
            <Text style={styles.settingDesc}>
              Select what triggers push notifications in community channels
            </Text>
          </View>
          <View style={styles.segmentedRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSegmentChange('communityNotificationFilter', 'all')}
              style={[
                styles.segmentBtn,
                settings.communityNotificationFilter === 'all' && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentBtnText,
                  settings.communityNotificationFilter === 'all' && styles.segmentBtnTextActive,
                ]}
              >
                All Messages
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSegmentChange('communityNotificationFilter', 'mentions_only')}
              style={[
                styles.segmentBtn,
                settings.communityNotificationFilter === 'mentions_only' && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentBtnText,
                  settings.communityNotificationFilter === 'mentions_only' && styles.segmentBtnTextActive,
                ]}
              >
                @Mentions Only
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSegmentChange('communityNotificationFilter', 'mute')}
              style={[
                styles.segmentBtn,
                settings.communityNotificationFilter === 'mute' && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentBtnText,
                  settings.communityNotificationFilter === 'mute' && styles.segmentBtnTextActive,
                ]}
              >
                Mute All
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* SECTION 4: INNER CIRCLE (RESEARCH PODS) */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Shield size={17} color="#064E3B" strokeWidth={2.2} />
          <Text style={styles.sectionTitle}>Inner Circle (Research Pods)</Text>
        </View>

        {/* Zero Historical Chat for New Joiners */}
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={styles.iconBox}>
              <Lock size={18} color="#064E3B" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Zero Historical Chat for Joiners</Text>
              <Text style={styles.settingDesc}>
                Newly added members join freshly with no access to past conversations
              </Text>
            </View>
          </View>
          <Switch
            value={settings.innerCircleZeroHistoryDefault}
            onValueChange={() => handleToggle('innerCircleZeroHistoryDefault', settings.innerCircleZeroHistoryDefault)}
            trackColor={{ false: '#CBD5E1', true: '#064E3B' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Admin-Only Invitations */}
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={styles.iconBox}>
              <Shield size={18} color="#064E3B" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Admin-Only Invitations</Text>
              <Text style={styles.settingDesc}>
                Only pod creators and designated admins can invite/add new researchers
              </Text>
            </View>
          </View>
          <Switch
            value={settings.innerCircleAdminOnlyInvites}
            onValueChange={() => handleToggle('innerCircleAdminOnlyInvites', settings.innerCircleAdminOnlyInvites)}
            trackColor={{ false: '#CBD5E1', true: '#064E3B' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Auto-Expiring Pod Messages */}
        <View style={[styles.settingRowVertical, { borderBottomWidth: 0 }]}>
          <View style={styles.settingTextWrap}>
            <Text style={styles.settingLabel}>Auto-Expiring Messages</Text>
            <Text style={styles.settingDesc}>
              Automatically purge old pod messages after a set retention window
            </Text>
          </View>
          <View style={styles.segmentedRow}>
            {(['off', '7d', '30d', '90d'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                activeOpacity={0.8}
                onPress={() => handleSegmentChange('autoExpiringPodMessages', period)}
                style={[
                  styles.segmentBtn,
                  settings.autoExpiringPodMessages === period && styles.segmentBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    settings.autoExpiringPodMessages === period && styles.segmentBtnTextActive,
                  ]}
                >
                  {period === 'off' ? 'Off' : period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* SECTION 5: DATA, STORAGE & RESET */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Download size={17} color="#064E3B" strokeWidth={2.2} />
          <Text style={styles.sectionTitle}>Storage & Maintenance</Text>
        </View>

        {/* Clear Cache */}
        <TouchableOpacity
          style={styles.actionRow}
          onPress={handleClearCache}
          disabled={isClearingCache}
          activeOpacity={0.7}
        >
          <View style={styles.actionLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#F1F5F9' }]}>
              <Trash2 size={18} color="#475569" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={styles.actionTitle}>Clear Local Workspace Cache</Text>
              <Text style={styles.actionDesc}>
                {cacheClearedSuccess
                  ? 'Local cache cleared successfully!'
                  : 'Free up local device storage from voice notes & paper thumbnails'}
              </Text>
            </View>
          </View>
          {isClearingCache ? (
            <ActivityIndicator size="small" color="#064E3B" />
          ) : cacheClearedSuccess ? (
            <CheckCircle2 size={20} color="#059669" />
          ) : (
            <ChevronRight size={18} color="#94A3B8" />
          )}
        </TouchableOpacity>

        {/* Reset Defaults */}
        <TouchableOpacity
          style={[styles.actionRow, { borderBottomWidth: 0 }]}
          onPress={handleResetDefaults}
          activeOpacity={0.7}
        >
          <View style={styles.actionLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
              <RotateCcw size={18} color="#DC2626" />
            </View>
            <View style={styles.settingTextWrap}>
              <Text style={[styles.actionTitle, { color: '#DC2626' }]}>
                Reset to Standard Defaults
              </Text>
              <Text style={styles.actionDesc}>
                Restore all workspace configurations to initial settings
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 14,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#064E3B',
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingRowVertical: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextWrap: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  infoBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  infoBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#064E3B',
  },
  infoBannerText: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 16,
  },
  capacityCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  capacityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  capacityLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  capacityPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  capacityPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#064E3B',
  },
  capacityDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentBtnTextActive: {
    color: '#064E3B',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
});
