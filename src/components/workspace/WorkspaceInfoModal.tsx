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
  Switch,
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
  ShieldCheck,
  Crown,
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
  UserCheck,
  UserX,
  Sliders,
  Settings,
  AlertTriangle,
  ChevronRight,
  FolderOpen,
  Camera,
  Image as ImageIcon,
  Clock,
  BookOpen,
  Sparkles,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Workspace, WorkspaceMember, WorkspaceMemberRole } from '../../types/workspace';
import { useAuthStore } from '../../store/useAuthStore';
import { usePresenceStore } from '../../store/usePresenceStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { workspaceService } from '../../api/workspaceService';
import { blockUser, reportContent } from '../../api/moderationService';
import { unfollowUser } from '../../api/socialService';
import { uploadPostImage } from '../../api/storageService';
import { Avatar } from '../core/Avatar';
import { GroupCollageAvatar } from './GroupCollageAvatar';
import { ChatMediaGalleryModal } from '../chat/ChatMediaGalleryModal';
import { WorkspaceExportModal } from './WorkspaceExportModal';

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
  const messages = useWorkspaceStore((s) => s.messages);
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces);
  const updateMemberRole = useWorkspaceStore((s) => s.updateMemberRole);
  const removeMember = useWorkspaceStore((s) => s.removeMember);
  const banMember = useWorkspaceStore((s) => s.banMember);
  const leaveWorkspace = useWorkspaceStore((s) => s.leaveWorkspace);
  const clearChatHistory = useWorkspaceStore((s) => s.clearChatHistory);
  const setMuteWorkspace = useWorkspaceStore((s) => s.setMuteWorkspace);
  const updateWorkspaceDetails = useWorkspaceStore((s) => s.updateWorkspaceDetails);

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isMuted, setIsMuted] = useState(Boolean(workspace.is_muted));
  const [showMediaGalleryModal, setShowMediaGalleryModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(workspace.name || '');
  const [editedDescription, setEditedDescription] = useState(workspace.description || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showMembersList, setShowMembersList] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Selected Member for Role / Kick / Ban Action Sheet
  const [selectedMember, setSelectedMember] = useState<WorkspaceMember | null>(null);
  const [showMemberActionModal, setShowMemberActionModal] = useState(false);
  const [isUpdatingMemberAction, setIsUpdatingMemberAction] = useState(false);

  // Pod Collaboration Permission Controls
  const [showPermissionsSection, setShowPermissionsSection] = useState(false);
  const [onlyAdminsPost, setOnlyAdminsPost] = useState(
    Boolean(workspace.settings?.only_admins_post)
  );
  const [onlyAdminsInvite, setOnlyAdminsInvite] = useState(
    Boolean(workspace.settings?.only_admins_invite)
  );
  const [onlyAdminsPin, setOnlyAdminsPin] = useState(
    Boolean(workspace.settings?.only_admins_pin)
  );
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  // Step 4: Advanced Mute & Notification Scope
  const [showMuteOptionsModal, setShowMuteOptionsModal] = useState(false);
  const [muteDuration, setMuteDuration] = useState<'8h' | '1w' | 'always'>('8h');
  const [muteScope, setMuteScope] = useState<'all' | 'mentions_only'>('all');

  // Step 4: Disappearing / Ephemeral Messages
  const [showEphemeralModal, setShowEphemeralModal] = useState(false);
  const [ephemeralTimer, setEphemeralTimer] = useState<'off' | '24h' | '7d' | '30d'>(
    workspace.settings?.ephemeral_timer || 'off'
  );

  // Step 4: Export Lab Record Modal
  const [showExportModal, setShowExportModal] = useState(false);

  const isOwner = workspace.owner_id === currentUser?.id;
  const isDM = workspace.type === 'dm';
  const partner = workspace.other_user;
  const onlineUserIds = usePresenceStore((s) => s.onlineUserIds);
  const isPartnerOnline = Boolean(isDM && partner?.id && onlineUserIds[partner.id]);

  // Determine current user's role in this pod
  const myMembership = useMemo(() => {
    return members.find((m) => m.user_id === currentUser?.id);
  }, [members, currentUser?.id]);

  const myRole: WorkspaceMemberRole = isOwner
    ? 'owner'
    : (myMembership?.role || workspace.my_role || 'member');

  const canManageRoles = isOwner || myRole === 'owner' || myRole === 'admin';

  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Inappropriate behavior or spam');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Filtered members list based on in-modal search
  const displayedMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return members;
    const q = memberSearchQuery.toLowerCase();
    return members.filter((m) => {
      const nameMatch = (m.profile?.fullName || '').toLowerCase().includes(q);
      const handleMatch = (m.profile?.handle || '').toLowerCase().includes(q);
      const roleMatch = (m.role || '').toLowerCase().includes(q);
      return nameMatch || handleMatch || roleMatch;
    });
  }, [members, memberSearchQuery]);

  // Load members when modal opens
  useEffect(() => {
    if (!visible) {
      setIsEditingName(false);
      setShowMembersList(false);
      setShowOptionsMenu(false);
      setShowReportModal(false);
      setShowMuteOptionsModal(false);
      setShowEphemeralModal(false);
      setShowExportModal(false);
      setSelectedMember(null);
      setShowMemberActionModal(false);
      setMemberSearchQuery('');
      return;
    }

    setEditedName(workspace.name || '');
    setEditedDescription(workspace.description || workspace.settings?.topic || '');
    setIsMuted(Boolean(workspace.is_muted));
    setEphemeralTimer(workspace.settings?.ephemeral_timer || 'off');
    setOnlyAdminsPost(Boolean(workspace.settings?.only_admins_post));
    setOnlyAdminsInvite(Boolean(workspace.settings?.only_admins_invite));
    setOnlyAdminsPin(Boolean(workspace.settings?.only_admins_pin));

    async function fetchMembers() {
      setIsLoadingMembers(true);
      const res = await workspaceService.getWorkspaceMembers(workspace.id);
      if (res.members) {
        setMembers(res.members);
      }
      setIsLoadingMembers(false);
    }

    fetchMembers();
  }, [visible, workspace.id, workspace.name, workspace.description, workspace.settings, workspace.is_muted]);

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

  // Toggle Mute / Open Advanced Mute Sheet
  const handleToggleMute = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setShowMuteOptionsModal(true);
  };

  // Save Mute Option
  const handleConfirmMute = async (duration: '8h' | '1w' | 'always', scope: 'all' | 'mentions_only') => {
    if (!currentUser?.id) return;
    let until: string | null = null;
    const now = new Date();
    if (duration === '8h') {
      until = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString();
    } else if (duration === '1w') {
      until = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    const res = await setMuteWorkspace(workspace.id, true, until);
    if (res.success) {
      setIsMuted(true);
      setShowMuteOptionsModal(false);
      const durationLabel = duration === '8h' ? '8 hours' : duration === '1w' ? '1 week' : 'Always';
      if (Platform.OS === 'web') {
        window.alert(`Notifications muted for ${durationLabel}.`);
      } else {
        Alert.alert('Notifications Muted', `Notifications muted for ${durationLabel}.`);
      }
    }
  };

  const handleUnmute = async () => {
    if (!currentUser?.id) return;
    const res = await setMuteWorkspace(workspace.id, false, null);
    if (res.success) {
      setIsMuted(false);
      setShowMuteOptionsModal(false);
      if (Platform.OS === 'web') {
        window.alert('Notifications unmuted.');
      } else {
        Alert.alert('Unmuted', 'Notifications unmuted for this conversation.');
      }
    }
  };

  // Step 4: Pick Avatar Image
  const handlePickAvatar = async () => {
    if (!canManageRoles) {
      if (Platform.OS === 'web') window.alert('Only Admins and PI can change the pod icon.');
      else Alert.alert('Permission Denied', 'Only Admins and PI can change the pod icon.');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploadingAvatar(true);
        const uploadRes = await uploadPostImage(currentUser?.id || 'pod_avatar', result.assets[0]);
        const avatarUrl = uploadRes.url || result.assets[0].uri;
        await updateWorkspaceDetails(workspace.id, { avatar_url: avatarUrl });
        setIsUploadingAvatar(false);
        if (Platform.OS === 'web') window.alert('Pod icon updated successfully!');
        else Alert.alert('Icon Updated', 'Pod icon has been updated.');
      }
    } catch (err: any) {
      setIsUploadingAvatar(false);
      console.warn('Avatar pick error:', err);
    }
  };

  // Save edited workspace name & topic description
  const handleSaveName = async () => {
    const trimmed = editedName.trim();
    const trimmedDesc = editedDescription.trim();
    if (!trimmed) {
      if (Platform.OS === 'web') window.alert('Pod name cannot be empty.');
      else Alert.alert('Invalid Name', 'Pod name cannot be empty.');
      return;
    }

    setIsSavingName(true);
    try {
      await updateWorkspaceDetails(workspace.id, {
        name: trimmed,
        description: trimmedDesc || null,
        settings: {
          ...(workspace.settings || {}),
          topic: trimmedDesc || null,
        },
      });
      setIsEditingName(false);
    } catch (err) {
      console.warn('Failed to update workspace name/topic:', err);
    } finally {
      setIsSavingName(false);
    }
  };

  // Step 4: Set Ephemeral Timer
  const handleSetEphemeralTimer = async (timer: 'off' | '24h' | '7d' | '30d') => {
    if (!canManageRoles) return;
    try {
      setEphemeralTimer(timer);
      const updatedSettings = {
        ...(workspace.settings || {}),
        ephemeral_timer: timer,
      };
      await updateWorkspaceDetails(workspace.id, { settings: updatedSettings });
      setShowEphemeralModal(false);
      if (Platform.OS === 'web') {
        window.alert(timer === 'off' ? 'Disappearing messages turned off.' : `Disappearing messages set to ${timer}.`);
      } else {
        Alert.alert('Disappearing Messages', timer === 'off' ? 'Disappearing messages turned off.' : `Disappearing messages set to ${timer}.`);
      }
    } catch (err) {
      console.warn('Ephemeral timer error:', err);
    }
  };

  // Step 4: Clear Chat History
  const handleClearChatHistory = () => {
    const executeClear = async () => {
      setIsActionLoading(true);
      try {
        await clearChatHistory(workspace.id);
        if (Platform.OS === 'web') {
          window.alert('Pod chat history cleared.');
        } else {
          Alert.alert('History Cleared', 'All messages have been cleared from this device.');
        }
      } catch (err: any) {
        console.warn('Clear history error:', err);
      } finally {
        setIsActionLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to clear the chat history for this pod? This will remove messages on your device.')) {
        executeClear();
      }
    } else {
      Alert.alert(
        'Clear Chat History',
        'Are you sure you want to clear chat history? All messages will be removed from your device.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear History', style: 'destructive', onPress: executeClear },
        ]
      );
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

  // Handle Role Change
  const handleChangeMemberRole = async (newRole: WorkspaceMemberRole) => {
    if (!selectedMember || !workspace.id) return;
    setIsUpdatingMemberAction(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const res = await updateMemberRole(workspace.id, selectedMember.user_id, newRole);
    setIsUpdatingMemberAction(false);
    setShowMemberActionModal(false);

    if (res.success) {
      setMembers((curr) =>
        curr.map((m) =>
          m.user_id === selectedMember.user_id ? { ...m, role: newRole } : m
        )
      );
      if (Platform.OS === 'web') {
        window.alert(`Updated ${selectedMember.profile?.fullName || 'member'} role to ${newRole}.`);
      } else {
        Alert.alert('Role Updated', `${selectedMember.profile?.fullName || 'Member'} is now a ${newRole}.`);
      }
    } else {
      if (Platform.OS === 'web') {
        window.alert(res.error || 'Failed to update role');
      } else {
        Alert.alert('Error', res.error || 'Failed to update member role');
      }
    }
  };

  // Handle Remove Member (Kick)
  const handleKickMember = async () => {
    if (!selectedMember || !workspace.id) return;
    const target = selectedMember;
    setShowMemberActionModal(false);

    const executeKick = async () => {
      setIsUpdatingMemberAction(true);
      const res = await removeMember(workspace.id, target.user_id);
      setIsUpdatingMemberAction(false);
      if (res.success) {
        setMembers((curr) => curr.filter((m) => m.user_id !== target.user_id));
        if (Platform.OS === 'web') {
          window.alert(`${target.profile?.fullName || 'Member'} has been removed from the pod.`);
        } else {
          Alert.alert('Member Removed', `${target.profile?.fullName || 'Member'} has been removed from this pod.`);
        }
      } else {
        if (Platform.OS === 'web') {
          window.alert(res.error || 'Failed to remove member');
        } else {
          Alert.alert('Error', res.error || 'Failed to remove member');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Remove ${target.profile?.fullName || 'this member'} from the pod?`)) {
        executeKick();
      }
    } else {
      Alert.alert(
        'Remove Member',
        `Are you sure you want to remove ${target.profile?.fullName || 'this member'} from the pod?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: executeKick },
        ]
      );
    }
  };

  // Handle Ban Member
  const handleBanMember = async () => {
    if (!selectedMember || !workspace.id) return;
    const target = selectedMember;
    setShowMemberActionModal(false);

    const executeBan = async () => {
      setIsUpdatingMemberAction(true);
      const res = await banMember(workspace.id, target.user_id, 'Banned by pod admin');
      setIsUpdatingMemberAction(false);
      if (res.success) {
        setMembers((curr) => curr.filter((m) => m.user_id !== target.user_id));
        if (Platform.OS === 'web') {
          window.alert(`${target.profile?.fullName || 'Member'} has been banned from the pod.`);
        } else {
          Alert.alert('Member Banned', `${target.profile?.fullName || 'Member'} has been banned and added to the blocklist.`);
        }
      } else {
        if (Platform.OS === 'web') {
          window.alert(res.error || 'Failed to ban member');
        } else {
          Alert.alert('Error', res.error || 'Failed to ban member');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Ban ${target.profile?.fullName || 'this member'} from the pod? They will be permanently blocked from rejoining.`)) {
        executeBan();
      }
    } else {
      Alert.alert(
        'Ban Member',
        `Are you sure you want to ban ${target.profile?.fullName || 'this member'}? They will be permanently blocked from rejoining this pod.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Ban & Block', style: 'destructive', onPress: executeBan },
        ]
      );
    }
  };

  // Toggle Pod Permission Settings
  const handleTogglePermission = async (key: 'only_admins_post' | 'only_admins_invite' | 'only_admins_pin') => {
    if (!canManageRoles) return;
    setIsSavingPermissions(true);
    let nextPost = onlyAdminsPost;
    let nextInvite = onlyAdminsInvite;
    let nextPin = onlyAdminsPin;

    if (key === 'only_admins_post') {
      nextPost = !onlyAdminsPost;
      setOnlyAdminsPost(nextPost);
    } else if (key === 'only_admins_invite') {
      nextInvite = !onlyAdminsInvite;
      setOnlyAdminsInvite(nextInvite);
    } else if (key === 'only_admins_pin') {
      nextPin = !onlyAdminsPin;
      setOnlyAdminsPin(nextPin);
    }

    try {
      const updatedSettings = {
        ...(workspace.settings || {}),
        only_admins_post: nextPost,
        only_admins_invite: nextInvite,
        only_admins_pin: nextPin,
      };
      await workspaceService.updateWorkspaceDetails(workspace.id, { settings: updatedSettings });
      await loadWorkspaces(true);
    } catch (err) {
      console.warn('Failed to update pod permissions:', err);
    } finally {
      setIsSavingPermissions(false);
    }
  };

  // Leave or Delete Pod Handler
  const handleLeaveOrDeletePod = async () => {
    if (isOwner) {
      const confirmDelete = async () => {
        setIsActionLoading(true);
        try {
          await workspaceService.leaveWorkspace(workspace.id);
          await loadWorkspaces(true);
          onClose();
          router.replace('/workspace' as any);
        } catch (err) {
          console.warn('Delete pod error:', err);
        } finally {
          setIsActionLoading(false);
        }
      };

      if (Platform.OS === 'web') {
        if (window.confirm('Are you sure you want to delete this pod? All discussions and shared items will be permanently removed.')) {
          confirmDelete();
        }
      } else {
        Alert.alert(
          'Delete Research Pod',
          'Are you sure you want to delete this pod? All data will be permanently removed.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete Pod', style: 'destructive', onPress: confirmDelete },
          ]
        );
      }
    } else {
      const confirmLeave = async () => {
        setIsActionLoading(true);
        try {
          const res = await leaveWorkspace(workspace.id);
          if (res.success) {
            onClose();
            router.replace('/workspace' as any);
          }
        } catch (err) {
          console.warn('Leave pod error:', err);
        } finally {
          setIsActionLoading(false);
        }
      };

      if (Platform.OS === 'web') {
        if (window.confirm('Are you sure you want to leave this research pod?')) {
          confirmLeave();
        }
      } else {
        Alert.alert(
          'Leave Research Pod',
          'Are you sure you want to leave this pod?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Leave Pod', style: 'destructive', onPress: confirmLeave },
          ]
        );
      }
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
                <View style={{ position: 'relative' }}>
                  <Avatar
                    uri={partner?.avatarUrl || workspace.avatar_url || undefined}
                    name={displayName}
                    size="xl"
                  />
                  {isPartnerOnline && <View style={styles.presenceDotHero} />}
                </View>
              ) : workspace.avatar_url ? (
                <Avatar
                  uri={workspace.avatar_url}
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

              {/* Camera Icon Overlay to Pick Custom Pod Avatar */}
              {!isDM && canManageRoles && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handlePickAvatar}
                  disabled={isUploadingAvatar}
                  style={styles.avatarEditOverlayBtn}
                >
                  {isUploadingAvatar ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Camera size={15} color="#FFFFFF" strokeWidth={2.2} />
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Editable Title & Description / Topic */}
            {isEditingName ? (
              <View style={styles.editPodCard}>
                <Text style={styles.editSectionLabel}>Pod Name</Text>
                <TextInput
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="e.g., Quantum Biology Working Group"
                  placeholderTextColor="#94A3B8"
                  style={styles.editNameInput}
                  maxLength={60}
                />

                <Text style={[styles.editSectionLabel, { marginTop: 10 }]}>
                  Research Scope / Topic
                </Text>
                <TextInput
                  value={editedDescription}
                  onChangeText={setEditedDescription}
                  placeholder="Describe focus, research goals, or reading schedule..."
                  placeholderTextColor="#94A3B8"
                  style={styles.editDescInput}
                  multiline
                  numberOfLines={3}
                  maxLength={240}
                />
                <Text style={styles.charCountLabel}>{editedDescription.length}/240</Text>

                <View style={styles.editActionsRow}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditedName(workspace.name || '');
                      setEditedDescription(workspace.description || workspace.settings?.topic || '');
                      setIsEditingName(false);
                    }}
                    style={styles.cancelEditBtn}
                  >
                    <Text style={styles.cancelEditBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={isSavingName}
                    onPress={handleSaveName}
                    style={styles.saveNameBtn}
                  >
                    {isSavingName ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveNameBtnText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.groupTitle} numberOfLines={2}>
                  {displayName}
                </Text>
                {(workspace.description || workspace.settings?.topic) && (
                  <Text style={styles.groupDescriptionSnippet} numberOfLines={3}>
                    {workspace.description || workspace.settings?.topic}
                  </Text>
                )}
              </>
            )}

            {/* Subtitle Action */}
            {!isEditingName && (
              !isDM ? (
                canManageRoles && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setIsEditingName(true)}
                    style={styles.changeNameBtn}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Edit3 size={13} color="#3B82F6" />
                      <Text style={styles.changeNameText}>Edit Pod Name & Topic</Text>
                    </View>
                  </TouchableOpacity>
                )
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
              )
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
            {!isDM && (
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
            )}

            {/* 2. People / Members (Expanded List & Roles - Groups & Inner Circles only) */}
            {!isDM && (
              <>
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
                      <View style={styles.capacityBadgeContainer}>
                        <Text style={styles.memberCountBadge}>
                          {members.length}
                          {workspace.type === 'inner_circle' ? '/25' : ''}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.menuSubtitle} numberOfLines={1}>
                      {isLoadingMembers ? 'Loading members...' : membersSubtitle}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Expanded Member List with In-Modal Search & Role Controls */}
                {showMembersList && (
                  <View style={styles.expandedMembersList}>
                    {/* Member Search Bar */}
                    {members.length > 3 && (
                      <View style={styles.memberSearchInputWrap}>
                        <Search size={14} color="#94A3B8" />
                        <TextInput
                          value={memberSearchQuery}
                          onChangeText={setMemberSearchQuery}
                          placeholder="Search pod members or roles..."
                          placeholderTextColor="#94A3B8"
                          style={styles.memberSearchInput}
                        />
                        {memberSearchQuery.length > 0 && (
                          <TouchableOpacity onPress={() => setMemberSearchQuery('')}>
                            <X size={14} color="#64748B" />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {displayedMembers.map((m) => {
                      const isUserOwner = m.role === 'owner' || m.user_id === workspace.owner_id;
                      const isUserAdmin = m.role === 'admin';
                      const isUserMod = m.role === 'moderator';

                      return (
                        <TouchableOpacity
                          key={m.id || m.user_id}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (canManageRoles && !isUserOwner && m.user_id !== currentUser?.id) {
                              setSelectedMember(m);
                              setShowMemberActionModal(true);
                            } else if (m.user_id) {
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
                            <Text style={styles.memberAcademicSub} numberOfLines={1}>
                              {m.profile?.academicTitle || m.profile?.institution || `@${m.profile?.handle || 'user'}`}
                            </Text>
                          </View>

                          {/* Role Pill Badge */}
                          <View
                            style={[
                              styles.rolePill,
                              isUserOwner
                                ? styles.rolePillOwner
                                : isUserAdmin
                                ? styles.rolePillAdmin
                                : isUserMod
                                ? styles.rolePillMod
                                : styles.rolePillMember,
                            ]}
                          >
                            {isUserOwner ? (
                              <Crown size={10} color="#164E3F" />
                            ) : isUserAdmin ? (
                              <ShieldCheck size={10} color="#2563EB" />
                            ) : isUserMod ? (
                              <Shield size={10} color="#7C3AED" />
                            ) : null}
                            <Text
                              style={[
                                styles.rolePillText,
                                isUserOwner
                                  ? styles.rolePillTextOwner
                                  : isUserAdmin
                                  ? styles.rolePillTextAdmin
                                  : isUserMod
                                  ? styles.rolePillTextMod
                                  : styles.rolePillTextMember,
                              ]}
                            >
                              {isUserOwner ? 'Owner • PI' : isUserAdmin ? 'Admin' : isUserMod ? 'Moderator' : 'Member'}
                            </Text>
                          </View>

                          {/* Action trigger chevron for admins */}
                          {canManageRoles && !isUserOwner && m.user_id !== currentUser?.id && (
                            <MoreHorizontal size={16} color="#94A3B8" style={{ marginLeft: 4 }} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </>
            )}

            {/* 3. Pod Collaboration & Permissions Controls (Groups & Inner Circles) */}
            {!isDM && canManageRoles && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowPermissionsSection(!showPermissionsSection)}
                style={styles.menuRow}
              >
                <View style={styles.menuIconWrap}>
                  <Sliders size={22} color="#0F172A" strokeWidth={2} />
                </View>
                <View style={styles.menuTextCol}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.menuTitle}>Pod Permissions</Text>
                    <ChevronRight size={16} color="#94A3B8" />
                  </View>
                  <Text style={styles.menuSubtitle}>
                    Control message posting, invitations, and announcement modes
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Expanded Permissions Switches */}
            {showPermissionsSection && !isDM && canManageRoles && (
              <View style={styles.expandedPermissionsCard}>
                <View style={styles.permissionToggleRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.permissionToggleTitle}>Announcement Mode</Text>
                    <Text style={styles.permissionToggleDesc}>
                      Only Admins and PI can post messages in this pod
                    </Text>
                  </View>
                  <Switch
                    value={onlyAdminsPost}
                    onValueChange={() => handleTogglePermission('only_admins_post')}
                    trackColor={{ false: '#E2E8F0', true: '#164E3F' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.permissionToggleDivider} />

                <View style={styles.permissionToggleRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.permissionToggleTitle}>Admin-Only Invites</Text>
                    <Text style={styles.permissionToggleDesc}>
                      Require Admin approval to invite or add new researchers
                    </Text>
                  </View>
                  <Switch
                    value={onlyAdminsInvite}
                    onValueChange={() => handleTogglePermission('only_admins_invite')}
                    trackColor={{ false: '#E2E8F0', true: '#164E3F' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={styles.permissionToggleDivider} />

                <View style={styles.permissionToggleRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.permissionToggleTitle}>Admin Pin & Schedule</Text>
                    <Text style={styles.permissionToggleDesc}>
                      Only Admins can pin announcements and schedule lab events
                    </Text>
                  </View>
                  <Switch
                    value={onlyAdminsPin}
                    onValueChange={() => handleTogglePermission('only_admins_pin')}
                    trackColor={{ false: '#E2E8F0', true: '#164E3F' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            )}

            {/* Media, links, and docs (Vault Gallery) */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowMediaGalleryModal(true)}
              style={styles.menuRow}
            >
              <View style={styles.menuIconWrap}>
                <FolderOpen size={22} color="#0F172A" strokeWidth={2} />
              </View>
              <View style={styles.menuTextCol}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.menuTitle}>Media, links, and docs</Text>
                  <ChevronRight size={16} color="#94A3B8" />
                </View>
                <Text style={styles.menuSubtitle}>
                  Figures, preprint PDFs, audio notes, and DOI links
                </Text>
              </View>
            </TouchableOpacity>

            {/* Disappearing / Ephemeral Messages Setting (Inner Circles / Groups) */}
            {!isDM && canManageRoles && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowEphemeralModal(true)}
                style={styles.menuRow}
              >
                <View style={styles.menuIconWrap}>
                  <Clock size={22} color="#0F172A" strokeWidth={2} />
                </View>
                <View style={styles.menuTextCol}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.menuTitle}>Disappearing messages</Text>
                    <View style={styles.ephemeralBadgeContainer}>
                      <Text style={styles.ephemeralBadgeText}>
                        {ephemeralTimer === 'off'
                          ? 'Off'
                          : ephemeralTimer === '24h'
                          ? '24 Hours'
                          : ephemeralTimer === '7d'
                          ? '7 Days'
                          : '30 Days'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.menuSubtitle}>
                    {ephemeralTimer === 'off'
                      ? 'Messages remain in pod history indefinitely'
                      : `Messages automatically disappear after ${ephemeralTimer}`}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Export Academic Lab Record & Chat Transcript */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowExportModal(true)}
              style={styles.menuRow}
            >
              <View style={styles.menuIconWrap}>
                <BookOpen size={22} color="#164E3F" strokeWidth={2} />
              </View>
              <View style={styles.menuTextCol}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.menuTitle, { color: '#164E3F' }]}>Export Lab Record</Text>
                  <ChevronRight size={16} color="#94A3B8" />
                </View>
                <Text style={styles.menuSubtitle}>
                  Download or share formatted Markdown, DOI bibliography, and chat logs
                </Text>
              </View>
            </TouchableOpacity>

            {/* Clear Chat History */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleClearChatHistory}
              style={styles.menuRow}
            >
              <View style={styles.menuIconWrap}>
                <Trash2 size={22} color="#64748B" strokeWidth={2} />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={styles.menuTitle}>Clear chat history</Text>
                <Text style={styles.menuSubtitle}>
                  Remove all messages from this device
                </Text>
              </View>
            </TouchableOpacity>

            {/* Privacy & Safety */}
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

            {/* Leave or Delete Pod Button */}
            {!isDM && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleLeaveOrDeletePod}
                style={[styles.menuRow, { marginTop: 8 }]}
              >
                <View style={styles.menuIconWrap}>
                  {isOwner ? (
                    <Trash2 size={22} color="#DC2626" strokeWidth={2} />
                  ) : (
                    <LogOut size={22} color="#DC2626" strokeWidth={2} />
                  )}
                </View>
                <View style={styles.menuTextCol}>
                  <Text style={[styles.menuTitle, { color: '#DC2626' }]}>
                    {isOwner ? 'Delete Research Pod' : 'Leave Research Pod'}
                  </Text>
                  <Text style={styles.menuSubtitle}>
                    {isOwner
                      ? 'Permanently delete this pod and remove all members'
                      : 'Leave this conversation and exit the inner circle'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
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

        {/* Member Role & Moderation Action Sheet Modal */}
        <Modal
          visible={showMemberActionModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowMemberActionModal(false)}
        >
          <TouchableOpacity
            style={styles.optionsOverlay}
            activeOpacity={1}
            onPress={() => setShowMemberActionModal(false)}
          >
            <View style={styles.optionsSheet}>
              <View style={styles.optionsHandleBar} />
              <View style={styles.memberActionHeader}>
                <Avatar
                  uri={selectedMember?.profile?.avatarUrl || undefined}
                  name={selectedMember?.profile?.fullName || 'Researcher'}
                  size="md"
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.memberActionName}>
                    {selectedMember?.profile?.fullName || 'Researcher'}
                  </Text>
                  <Text style={styles.memberActionRoleLabel}>
                    Current Role: {selectedMember?.role ? selectedMember.role.toUpperCase() : 'MEMBER'}
                  </Text>
                </View>
              </View>

              {/* 1. Assign / Demote Admin */}
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={isUpdatingMemberAction}
                onPress={() =>
                  handleChangeMemberRole(
                    selectedMember?.role === 'admin' ? 'member' : 'admin'
                  )
                }
                style={styles.optionsItemRow}
              >
                <ShieldCheck size={20} color="#2563EB" />
                <Text style={[styles.optionsItemText, { color: '#2563EB' }]}>
                  {selectedMember?.role === 'admin' ? 'Demote to Member' : 'Make Pod Admin'}
                </Text>
              </TouchableOpacity>

              {/* 2. Assign / Demote Moderator */}
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={isUpdatingMemberAction}
                onPress={() =>
                  handleChangeMemberRole(
                    selectedMember?.role === 'moderator' ? 'member' : 'moderator'
                  )
                }
                style={styles.optionsItemRow}
              >
                <Shield size={20} color="#7C3AED" />
                <Text style={[styles.optionsItemText, { color: '#7C3AED' }]}>
                  {selectedMember?.role === 'moderator' ? 'Remove Moderator' : 'Make Pod Moderator'}
                </Text>
              </TouchableOpacity>

              {/* 3. View Profile */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  if (selectedMember?.user_id) {
                    setShowMemberActionModal(false);
                    onClose();
                    router.push(`/profile/${selectedMember.user_id}`);
                  }
                }}
                style={styles.optionsItemRow}
              >
                <UserCheck size={20} color="#0F172A" />
                <Text style={styles.optionsItemText}>View Researcher Profile</Text>
              </TouchableOpacity>

              {/* 4. Remove Member (Kick) */}
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={isUpdatingMemberAction}
                onPress={handleKickMember}
                style={styles.optionsItemRow}
              >
                <UserMinus size={20} color="#DC2626" />
                <Text style={[styles.optionsItemText, { color: '#DC2626' }]}>
                  Remove from Pod (Kick)
                </Text>
              </TouchableOpacity>

              {/* 5. Ban Member */}
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={isUpdatingMemberAction}
                onPress={handleBanMember}
                style={styles.optionsItemRow}
              >
                <Ban size={20} color="#DC2626" />
                <Text style={[styles.optionsItemText, { color: '#DC2626' }]}>
                  Ban Member Permanently
                </Text>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowMemberActionModal(false)}
                style={styles.optionsCancelBtn}
              >
                <Text style={styles.optionsCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

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

        {/* Media, Links, and Documents Vault Gallery Modal */}
        <ChatMediaGalleryModal
          visible={showMediaGalleryModal}
          onClose={() => setShowMediaGalleryModal(false)}
          messages={messages}
          chatTitle={displayName}
        />

        {/* Step 4: Advanced Mute Options Modal */}
        <Modal
          visible={showMuteOptionsModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowMuteOptionsModal(false)}
        >
          <TouchableOpacity
            style={styles.optionsOverlay}
            activeOpacity={1}
            onPress={() => setShowMuteOptionsModal(false)}
          >
            <View style={styles.optionsSheet}>
              <View style={styles.optionsHandleBar} />
              <Text style={styles.optionsSheetTitle}>Mute Notifications</Text>
              <Text style={styles.muteModalSub}>
                Choose how long to silence notifications from {displayName}.
              </Text>

              {isMuted && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleUnmute}
                  style={[styles.optionsItemRow, { backgroundColor: '#F0FDF4', borderRadius: 10, paddingHorizontal: 12 }]}
                >
                  <Bell size={20} color="#164E3F" />
                  <Text style={[styles.optionsItemText, { color: '#164E3F' }]}>
                    Unmute Notifications
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleConfirmMute('8h', muteScope)}
                style={styles.optionsItemRow}
              >
                <Clock size={20} color="#0F172A" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionsItemText}>For 8 hours</Text>
                  <Text style={styles.optionsItemSubText}>Silence until later today</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleConfirmMute('1w', muteScope)}
                style={styles.optionsItemRow}
              >
                <Clock size={20} color="#0F172A" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionsItemText}>For 1 week</Text>
                  <Text style={styles.optionsItemSubText}>Silence for 7 days</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleConfirmMute('always', muteScope)}
                style={styles.optionsItemRow}
              >
                <BellOff size={20} color="#DC2626" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionsItemText, { color: '#DC2626' }]}>Always / Until turned back on</Text>
                  <Text style={styles.optionsItemSubText}>Indefinitely mute all notifications</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowMuteOptionsModal(false)}
                style={styles.optionsCancelBtn}
              >
                <Text style={styles.optionsCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Step 4: Disappearing Messages Selector Modal */}
        <Modal
          visible={showEphemeralModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowEphemeralModal(false)}
        >
          <TouchableOpacity
            style={styles.optionsOverlay}
            activeOpacity={1}
            onPress={() => setShowEphemeralModal(false)}
          >
            <View style={styles.optionsSheet}>
              <View style={styles.optionsHandleBar} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                <Clock size={18} color="#164E3F" />
                <Text style={[styles.optionsSheetTitle, { marginBottom: 0 }]}>Disappearing Messages</Text>
              </View>
              <Text style={styles.muteModalSub}>
                When enabled, new discussions and shared files sent in this pod will automatically disappear for all members after the selected duration.
              </Text>

              {[
                { id: 'off', label: 'Off', sub: 'Messages remain in pod history indefinitely' },
                { id: '24h', label: '24 Hours', sub: 'Ephemeral daily lab notes & quick discussions' },
                { id: '7d', label: '7 Days', sub: 'Weekly sprints and temporary collaboration' },
                { id: '30d', label: '30 Days', sub: 'Monthly archive lifecycle' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.7}
                  onPress={() => handleSetEphemeralTimer(opt.id as any)}
                  style={[
                    styles.optionsItemRow,
                    ephemeralTimer === opt.id && { backgroundColor: '#F0FDF4', borderRadius: 10, paddingHorizontal: 12 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.optionsItemText,
                        ephemeralTimer === opt.id && { color: '#164E3F', fontWeight: '800' },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={styles.optionsItemSubText}>{opt.sub}</Text>
                  </View>
                  {ephemeralTimer === opt.id && (
                    <CheckCircle2 size={18} color="#164E3F" strokeWidth={2.5} />
                  )}
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowEphemeralModal(false)}
                style={styles.optionsCancelBtn}
              >
                <Text style={styles.optionsCancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Step 4: Export Academic Lab Record Modal */}
        <WorkspaceExportModal
          visible={showExportModal}
          onClose={() => setShowExportModal(false)}
          workspace={workspace}
          messages={messages}
          members={members}
        />
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
  presenceDotHero: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#15803D',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
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
  capacityBadgeContainer: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  memberSearchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginHorizontal: 12,
    marginVertical: 6,
    height: 36,
    gap: 6,
  },
  memberSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
  },
  memberAcademicSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  rolePillOwner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  rolePillAdmin: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  rolePillMod: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  rolePillMember: {
    backgroundColor: '#F1F5F9',
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  rolePillTextOwner: {
    color: '#164E3F',
  },
  rolePillTextAdmin: {
    color: '#2563EB',
  },
  rolePillTextMod: {
    color: '#7C3AED',
  },
  rolePillTextMember: {
    color: '#64748B',
  },
  expandedPermissionsCard: {
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  permissionToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  permissionToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  permissionToggleDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  permissionToggleDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 6,
  },
  memberActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  memberActionName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  memberActionRoleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#164E3F',
    marginTop: 2,
  },
  avatarEditOverlayBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#164E3F',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  editPodCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 8,
  },
  editSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  editDescInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 64,
    textAlignVertical: 'top',
  },
  charCountLabel: {
    fontSize: 10,
    color: '#94A3B8',
    alignSelf: 'flex-end',
    marginTop: 3,
  },
  editActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  cancelEditBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelEditBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  groupDescriptionSnippet: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
    marginTop: 2,
    marginBottom: 4,
  },
  ephemeralBadgeContainer: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  ephemeralBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#164E3F',
  },
  muteModalSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  optionsItemSubText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
});
