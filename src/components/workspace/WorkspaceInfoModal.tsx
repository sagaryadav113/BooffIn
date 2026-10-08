import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  FlatList,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  UserPlus,
  Search,
  Bell,
  BellOff,
  MoreHorizontal,
  Link2,
  Users,
  Shield,
  Lock,
  LogOut,
  Trash2,
  CheckCircle2,
  FileText,
  ExternalLink,
  Edit3,
  X,
  Share2,
  Flag,
  Ban,
  UserMinus,
  AlertTriangle,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Workspace, WorkspaceMember } from '../../types/workspace';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { workspaceService } from '../../api/workspaceService';
import { blockUser, reportContent } from '../../api/moderationService';
import { unfollowUser } from '../../api/socialService';
import { Avatar } from '../core/Avatar';
import { GroupCollageAvatar } from './GroupCollageAvatar';

interface WorkspaceInfoModalProps {
  visible: boolean;
  onClose: () => void;
  workspace: Workspace;
}

export const WorkspaceInfoModal: React.FC<WorkspaceInfoModalProps> = ({
  visible,
  onClose,
  workspace,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces);

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(workspace.name || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [showMembersList, setShowMembersList] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isOwner = workspace.owner_id === currentUser?.id;
  const isDM = workspace.type === 'dm';
  const partner = workspace.other_user;

  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Inappropriate behavior or spam');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Load members when modal opens
  useEffect(() => {
    if (!visible) {
      setIsEditingName(false);
      setShowMembersList(false);
      setShowOptionsMenu(false);
      setShowReportModal(false);
      return;
    }

    setEditedName(workspace.name || '');

    async function loadMembers() {
      setIsLoadingMembers(true);
      const res = await workspaceService.getWorkspaceMembers(workspace.id);
      if (res.members) {
        setMembers(res.members);
      }
      setIsLoadingMembers(false);
    }

    loadMembers();
  }, [visible, workspace.id, workspace.name]);

  // Handle Copy Invite Link
  const handleCopyInviteLink = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const inviteUrl = `https://booffin.com/join/${workspace.id}`;
    if (Clipboard?.setStringAsync) {
      await Clipboard.setStringAsync(inviteUrl);
    }

    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);

    if (Platform.OS === 'web') {
      window.alert('Invite link copied to clipboard!');
    } else {
      Alert.alert('Link Copied', 'Workspace invite link has been copied to your clipboard.');
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsMuted(!isMuted);
    if (Platform.OS === 'web') {
      window.alert(!isMuted ? 'Notifications muted for this conversation.' : 'Notifications unmuted.');
    }
  };

  // Save edited workspace name
  const handleSaveName = async () => {
    const trimmed = editedName.trim();
    if (!trimmed || trimmed === workspace.name) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    try {
      await workspaceService.updateWorkspaceDetails(workspace.id, { name: trimmed });
      await loadWorkspaces(true);
      setIsEditingName(false);
    } catch (err) {
      console.warn('Failed to update workspace name:', err);
    } finally {
      setIsSavingName(false);
    }
  };

  // Unfollow user handler
  const handleUnfollow = async () => {
    if (!partner?.id || !currentUser?.id) {
      setShowOptionsMenu(false);
      return;
    }
    setIsActionLoading(true);
    try {
      const res = await unfollowUser(partner.id, currentUser.id);
      setShowOptionsMenu(false);
      if (res.success) {
        if (Platform.OS === 'web') {
          window.alert(`Unfollowed ${partner.fullName || 'user'}.`);
        } else {
          Alert.alert('Unfollowed', `You have unfollowed ${partner.fullName || 'user'}.`);
        }
      } else {
        if (Platform.OS === 'web') {
          window.alert(res.error || 'Failed to unfollow');
        } else {
          Alert.alert('Error', res.error || 'Failed to unfollow user');
        }
      }
    } catch (err: any) {
      setShowOptionsMenu(false);
      console.warn('Unfollow error:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Block user handler
  const handleBlock = async () => {
    if (!partner?.id) {
      setShowOptionsMenu(false);
      return;
    }

    const confirmBlock = async () => {
      setIsActionLoading(true);
      try {
        const res = await blockUser(partner.id);
        setShowOptionsMenu(false);
        if (res.success) {
          if (Platform.OS === 'web') {
            window.alert(`${partner.fullName || 'User'} has been blocked.`);
          } else {
            Alert.alert('Blocked', `${partner.fullName || 'User'} has been blocked.`);
          }
          onClose();
          router.replace('/workspace' as any);
        } else {
          if (Platform.OS === 'web') {
            window.alert(res.error || 'Failed to block user');
          } else {
            Alert.alert('Error', res.error || 'Failed to block user');
          }
        }
      } catch (err: any) {
        setShowOptionsMenu(false);
        console.warn('Block error:', err);
      } finally {
        setIsActionLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to block ${partner.fullName || 'this user'}? They won't be able to message you or see your profile.`)) {
        confirmBlock();
      }
    } else {
      Alert.alert(
        'Block User',
        `Are you sure you want to block ${partner.fullName || 'this user'}? They will not be able to message you.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Block', style: 'destructive', onPress: confirmBlock },
        ]
      );
    }
  };

  // Submit report handler
  const handleSubmitReport = async () => {
    if (!partner?.id) return;
    setIsSubmittingReport(true);
    try {
      const res = await reportContent({
        reportedType: 'profile',
        reportedId: partner.id,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      });

      setIsSubmittingReport(false);
      setShowReportModal(false);

      if (res.success) {
        if (Platform.OS === 'web') {
          window.alert('Thank you. Your report has been submitted for moderation review.');
        } else {
          Alert.alert('Report Submitted', 'Thank you. Your report has been submitted to the BooffIn trust and safety team.');
        }
      } else {
        if (Platform.OS === 'web') {
          window.alert(res.error || 'Failed to submit report');
        } else {
          Alert.alert('Error', res.error || 'Failed to submit report');
        }
      }
    } catch (err: any) {
      setIsSubmittingReport(false);
      setShowReportModal(false);
      console.warn('Report error:', err);
    }
  };

  // Summary of member names / handles for the People subtitle
  const membersSubtitle = useMemo(() => {
    if (members.length === 0) return 'No other members yet';
    const names = members
      .map((m) => m.profile?.handle || m.profile?.fullName?.split(' ')[0] || 'Member')
      .slice(0, 4)
      .join(', ');
    return members.length > 4 ? `${names} and ${members.length - 4} others` : names;
  }, [members]);

  const displayName = isDM
    ? partner?.fullName || workspace.name || 'Direct Message'
    : workspace.name || 'BooffIn Group';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Top App Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeft size={22} color="#0F172A" strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Hero Profile Avatar & Title */}
          <View style={styles.heroSection}>
            <View style={styles.avatarWrapper}>
              {isDM ? (
                <Avatar
                  uri={partner?.avatarUrl || workspace.avatar_url || undefined}
                  name={displayName}
                  size="xl"
                />
              ) : workspace.type === 'inner_circle' ? (
                <GroupCollageAvatar size={84} name={displayName} />
              ) : (
                <Avatar
                  uri={workspace.avatar_url || undefined}
                  name={displayName}
                  size="xl"
                />
              )}
            </View>

            {/* Editable Title */}
            {isEditingName ? (
              <View style={styles.editNameRow}>
                <TextInput
                  value={editedName}
                  onChangeText={setEditedName}
                  style={styles.editNameInput}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                />
                <TouchableOpacity
                  disabled={isSavingName}
                  onPress={handleSaveName}
                  style={styles.saveNameBtn}
                >
                  {isSavingName ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveNameBtnText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.groupTitle} numberOfLines={2}>
                {displayName}
              </Text>
            )}

            {/* Subtitle Action */}
            {!isDM ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsEditingName(!isEditingName)}
                style={styles.changeNameBtn}
              >
                <Text style={styles.changeNameText}>Change name and image</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  if (partner?.id) {
                    onClose();
                    router.push(`/profile/${partner.id}`);
                  }
                }}
                style={styles.changeNameBtn}
              >
                <Text style={styles.changeNameText}>
                  {partner?.academicTitle ? `${partner.academicTitle} • ` : ''}View Profile
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Action Bar: For DMs: Mute & Options (Add & Search removed per Snapshot 1). For Groups: All 4 */}
          <View style={[styles.actionBar, isDM && styles.dmActionBar]}>
            {/* 1. Add (Groups / Communities only) */}
            {!isDM && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  handleCopyInviteLink();
                }}
                style={styles.actionBtn}
              >
                <View style={styles.actionIconCircle}>
                  <UserPlus size={20} color="#0F172A" strokeWidth={2.2} />
                </View>
                <Text style={styles.actionLabel}>Add</Text>
              </TouchableOpacity>
            )}

            {/* 2. Search (Groups / Communities only) */}
            {!isDM && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  onClose();
                }}
                style={styles.actionBtn}
              >
                <View style={styles.actionIconCircle}>
                  <Search size={20} color="#0F172A" strokeWidth={2.2} />
                </View>
                <Text style={styles.actionLabel}>Search</Text>
              </TouchableOpacity>
            )}

            {/* 3. Mute */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleToggleMute}
              style={styles.actionBtn}
            >
              <View style={[styles.actionIconCircle, isMuted && styles.actionIconCircleActive]}>
                {isMuted ? (
                  <BellOff size={20} color="#FFFFFF" strokeWidth={2.2} />
                ) : (
                  <Bell size={20} color="#0F172A" strokeWidth={2.2} />
                )}
              </View>
              <Text style={styles.actionLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>

            {/* 4. Options */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowOptionsMenu(true);
              }}
              style={styles.actionBtn}
            >
              <View style={styles.actionIconCircle}>
                <MoreHorizontal size={20} color="#0F172A" strokeWidth={2.2} />
              </View>
              <Text style={styles.actionLabel}>Options</Text>
            </TouchableOpacity>
          </View>

          {/* Hairline Divider */}
          <View style={styles.divider} />

          {/* Settings & Info Items */}
          <View style={styles.menuSection}>
            {/* 1. Invite Link */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleCopyInviteLink}
              style={styles.menuRow}
            >
              <View style={styles.menuIconWrap}>
                <Link2 size={22} color="#0F172A" strokeWidth={2} />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Invite link</Text>
                <Text style={styles.menuSubtitle} numberOfLines={1}>
                  {copiedLink ? '✓ Copied to clipboard!' : `https://booffin.com/join/${workspace.id.slice(0, 10)}...`}
                </Text>
              </View>
            </TouchableOpacity>

            {/* 2. People / Members */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowMembersList(!showMembersList)}
              style={styles.menuRow}
            >
              <View style={styles.menuIconWrap}>
                <Users size={22} color="#0F172A" strokeWidth={2} />
              </View>
              <View style={styles.menuTextCol}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.menuTitle}>People</Text>
                  <Text style={styles.memberCountBadge}>{members.length || 1}</Text>
                </View>
                <Text style={styles.menuSubtitle} numberOfLines={1}>
                  {isLoadingMembers ? 'Loading members...' : membersSubtitle}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Expanded Member List */}
            {showMembersList && (
              <View style={styles.expandedMembersList}>
                {members.map((m) => (
                  <TouchableOpacity
                    key={m.id || m.user_id}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (m.user_id) {
                        onClose();
                        router.push(`/profile/${m.user_id}`);
                      }
                    }}
                    style={styles.memberRow}
                  >
                    <Avatar
                      uri={m.profile?.avatarUrl || undefined}
                      name={m.profile?.fullName || 'Researcher'}
                      size="sm"
                    />
                    <View style={styles.memberInfoCol}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={styles.memberName}>{m.profile?.fullName || 'Collaborator'}</Text>
                        {m.profile?.orcidVerified && (
                          <CheckCircle2 size={13} color="#164E3F" strokeWidth={2.5} />
                        )}
                      </View>
                      <Text style={styles.memberRole}>
                        {m.role === 'owner' ? 'Owner • PI' : m.profile?.academicTitle || 'Member'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* 3. Privacy & Safety - Opens https://letsbooffin.com/welcome/policy in browser */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                Linking.openURL('https://letsbooffin.com/welcome/policy').catch(() => {
                  if (Platform.OS === 'web') {
                    window.open('https://letsbooffin.com/welcome/policy', '_blank');
                  }
                });
              }}
              style={styles.menuRow}
            >
              <View style={styles.menuIconWrap}>
                <Lock size={22} color="#0F172A" strokeWidth={2} />
              </View>
              <View style={styles.menuTextCol}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.menuTitle}>Privacy & safety</Text>
                  <ExternalLink size={14} color="#94A3B8" />
                </View>
                <Text style={styles.menuSubtitle}>
                  {workspace.type === 'inner_circle'
                    ? 'End-to-End Encrypted • Private 25-Member Pod'
                    : workspace.type === 'community'
                    ? `${workspace.subscription_tier === 'free' ? 'Open Access' : 'Verified Academic Community'} • SAIF Protected`
                    : 'End-to-End Encrypted 1-on-1 Direct Message'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Hairline Divider */}
          <View style={styles.divider} />

          {/* Shared Media Section Header */}
          <View style={styles.sharedMediaSection}>
            <Text style={styles.sharedMediaTitle}>Shared media</Text>
            <View style={styles.sharedMediaEmptyBox}>
              <FileText size={28} color="#CBD5E1" />
              <Text style={styles.sharedMediaEmptyText}>No shared files or papers yet</Text>
              <Text style={styles.sharedMediaEmptySub}>
                Papers, DOIs, and shared attachments will appear here.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Options Modal (Report, Block, Unfollow) */}
        <Modal
          visible={showOptionsMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowOptionsMenu(false)}
        >
          <TouchableOpacity
            style={styles.optionsOverlay}
            activeOpacity={1}
            onPress={() => setShowOptionsMenu(false)}
          >
            <View style={styles.optionsSheet}>
              <View style={styles.optionsHandleBar} />
              <Text style={styles.optionsSheetTitle}>
                {isDM ? partner?.fullName || 'Options' : workspace.name || 'Group Options'}
              </Text>

              {/* 1. Report */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowOptionsMenu(false);
                  setShowReportModal(true);
                }}
                style={styles.optionsItemRow}
              >
                <Flag size={20} color="#DC2626" />
                <Text style={[styles.optionsItemText, { color: '#DC2626' }]}>Report</Text>
              </TouchableOpacity>

              {/* 2. Block */}
              {isDM && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleBlock}
                  style={styles.optionsItemRow}
                >
                  <Ban size={20} color="#DC2626" />
                  <Text style={[styles.optionsItemText, { color: '#DC2626' }]}>Block</Text>
                </TouchableOpacity>
              )}

              {/* 3. Unfollow */}
              {isDM && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleUnfollow}
                  style={styles.optionsItemRow}
                >
                  <UserMinus size={20} color="#DC2626" />
                  <Text style={[styles.optionsItemText, { color: '#DC2626' }]}>Unfollow</Text>
                </TouchableOpacity>
              )}

              {/* Cancel Button */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowOptionsMenu(false)}
                style={styles.optionsCancelBtn}
              >
                <Text style={styles.optionsCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Report Modal */}
        <Modal
          visible={showReportModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowReportModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.reportModalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Flag size={18} color="#DC2626" />
                  <Text style={styles.modalHeaderTitle}>Report Researcher</Text>
                </View>
                <TouchableOpacity onPress={() => setShowReportModal(false)}>
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.reportSubtitle}>
                Select the main reason for filing this report. Our moderation team investigates all reports within 24 hours.
              </Text>

              {['Spam or academic fraud', 'Harassment or inappropriate behavior', 'Impersonation of researcher', 'Intellectual property violation'].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  onPress={() => setReportReason(reason)}
                  style={[
                    styles.reasonOption,
                    reportReason === reason && styles.reasonOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.reasonOptionText,
                      reportReason === reason && styles.reasonOptionTextSelected,
                    ]}
                  >
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}

              <TextInput
                value={reportDetails}
                onChangeText={setReportDetails}
                placeholder="Additional details (optional)..."
                placeholderTextColor="#94A3B8"
                style={styles.reportDetailsInput}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isSubmittingReport}
                onPress={handleSubmitReport}
                style={styles.submitReportBtn}
              >
                {isSubmittingReport ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitReportBtnText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    padding: 4,
    marginLeft: -4,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
  },
  avatarWrapper: {
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
  },
  editNameInput: {
    borderWidth: 1.5,
    borderColor: '#164E3F',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 180,
  },
  saveNameBtn: {
    backgroundColor: '#164E3F',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveNameBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  changeNameBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  changeNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dmActionBar: {
    justifyContent: 'center',
    gap: 40,
  },
  actionBtn: {
    alignItems: 'center',
    width: 68,
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F2F4F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionIconCircleActive: {
    backgroundColor: '#164E3F',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  menuSection: {
    paddingVertical: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 16,
  },
  menuIconWrap: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextCol: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  memberCountBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#164E3F',
  },
  expandedMembersList: {
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 6,
    marginVertical: 6,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 12,
  },
  memberInfoCol: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  memberRole: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  sharedMediaSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sharedMediaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  sharedMediaEmptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    gap: 6,
  },
  sharedMediaEmptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  sharedMediaEmptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  optionsSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  optionsHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 14,
  },
  optionsSheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  optionsItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionsItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionsCancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
  },
  optionsCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reportModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  reportSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  reasonOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  reasonOptionSelected: {
    borderColor: '#164E3F',
    backgroundColor: '#F0FDF4',
  },
  reasonOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },
  reasonOptionTextSelected: {
    color: '#164E3F',
    fontWeight: '700',
  },
  reportDetailsInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#0F172A',
    height: 70,
    textAlignVertical: 'top',
    marginTop: 6,
    marginBottom: 16,
  },
  submitReportBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitReportBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
