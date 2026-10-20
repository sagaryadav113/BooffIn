import React, { useState, useEffect, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Modal,
  Platform,
  Linking,
  Alert,
  Animated,
  Image,
  ImageBackground,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Shield,
  MessageSquare,
  Calendar,
  Briefcase,
  Bookmark,
  Plus,
  Send,
  Lock,
  UserPlus,
  Users,
  X,
  Clock,
  ExternalLink,
  CheckCircle2,
  Search,
  Sparkles,
  FileText,
  Trash2,
  LogOut,
  ChevronRight,
  Filter,
  CornerUpLeft,
  CornerUpRight,
  ClipboardList,
  Camera,
  Mic,
  Tag,
  Check,
  CheckCheck,
  Maximize2,
  Image as ImageIcon,
  Pin,
  PinOff,
  Smile,
  Reply,
  Copy,
  Pencil,
  AtSign,
  MoreVertical,
  FolderOpen,
  Paperclip,
  AlertTriangle,
  Heart,
  Vote,
  BarChart2,
  User,
  Sparkles as SparklesIcon,
  Download,
  BookOpen,
  FileUp,
  Bell,
  BellOff,
  Archive,
  Trash,
  Ban,
  Flag,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  EyeOff,
  Columns3,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { colors as staticColors, radii, spacing, typography, useColors, useIsDark } from '../../theme';
import { Avatar } from '../core/Avatar';
import { GroupCollageAvatar } from './GroupCollageAvatar';
import {
  Workspace,
  WorkspaceMessage,
  WorkspaceEvent,
  WorkspaceRoleOpportunity,
  WorkspaceSavedItem,
  WorkspaceMember,
  DoiMetadata,
  WorkspaceDocumentMetadata,
  WorkspacePostMetadata,
  WorkspaceProfileMetadata,
  WorkspaceInviteMetadata,
} from '../../types/workspace';
import { WorkspaceDoiCard } from './WorkspaceDoiCard';
import { WorkspaceInfoModal } from './WorkspaceInfoModal';
import { WorkspaceExportModal } from './WorkspaceExportModal';
import { ImageViewerModal } from '../modals/ImageViewerModal';
import { VoiceNotePlayer } from '../chat/VoiceNotePlayer';
import { VoiceNoteRecorder } from '../chat/VoiceNoteRecorder';
import { ChatDocumentCard } from '../chat/ChatDocumentCard';
import { ChatPostCard } from '../chat/ChatPostCard';
import { ChatProfileCard } from '../chat/ChatProfileCard';
import { ChatWorkspaceInviteCard } from '../chat/ChatWorkspaceInviteCard';
import { ChatMediaGalleryModal } from '../chat/ChatMediaGalleryModal';
import { PaperSearchModal } from '../chat/PaperSearchModal';
import { Paper } from '../../types';
import { Popover, PopoverItem, PopoverDivider } from '../core/Popover';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useWorkspaceSettingsStore } from '../../store/useWorkspaceSettingsStore';
import { useChatThemeStore } from '../../store/useChatThemeStore';
import { useAuthStore } from '../../store/useAuthStore';
import { usePresenceStore } from '../../store/usePresenceStore';
import { resolvePaper } from '../../api/paperResolver';
import { uploadPostImage, uploadVoiceNoteAudio } from '../../api/storageService';
import { workspaceService } from '../../api/workspaceService';
import { searchBooffInUsers } from '../../api/search/providers/userSearchProvider';
import { E2EEStatusBanner } from '../chat/E2EEStatusBanner';
import { derivePodSessionKey, encryptTextMessage, decryptTextMessage } from '../../utils/e2eeCrypto';
import { InteractiveClockPicker, parse24HourToClock } from '../common/InteractiveClockPicker';
import { WorkspaceBooffInManagerView } from './WorkspaceBooffInManagerView';
import { VaultIcon } from '../core/VaultIcon';

const SAMPLE_POD_MANUSCRIPTS = [
  {
    name: 'Quantum_Entanglement_Macroscopic_State_2026.pdf',
    sizeBytes: 1024 * 840,
    pageCount: 14,
    fileUrl: 'https://arxiv.org/pdf/2103.00020.pdf',
  },
  {
    name: 'CRISPR_Targeting_Efficiency_Protocol_v3.pdf',
    sizeBytes: 1024 * 1250,
    pageCount: 22,
    fileUrl: 'https://arxiv.org/pdf/2103.00020.pdf',
  },
  {
    name: 'Deep_Brain_Stimulation_Neural_Plasticity_Dataset.pdf',
    sizeBytes: 1024 * 510,
    pageCount: 8,
    fileUrl: 'https://arxiv.org/pdf/2103.00020.pdf',
  },
];

export function getDateLabel(dateString?: string | null): string {
  if (!dateString) return 'Today';
  const msgDate = new Date(dateString);
  if (isNaN(msgDate.getTime())) return 'Today';

  const now = new Date();
  const isToday =
    msgDate.getDate() === now.getDate() &&
    msgDate.getMonth() === now.getMonth() &&
    msgDate.getFullYear() === now.getFullYear();

  if (isToday) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    msgDate.getDate() === yesterday.getDate() &&
    msgDate.getMonth() === yesterday.getMonth() &&
    msgDate.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Yesterday';

  const isSameYear = msgDate.getFullYear() === now.getFullYear();
  return msgDate.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: isSameYear ? undefined : 'numeric',
  });
}

const AnimatedTypingIndicator: React.FC<{ name: string; count?: number }> = ({ name, count = 1 }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnim = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: -4, duration: 250, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.delay(Math.max(0, 500 - delay)),
        ])
      );

    const a1 = createAnim(dot1, 0);
    const a2 = createAnim(dot2, 150);
    const a3 = createAnim(dot3, 300);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.typingIndicatorBanner}>
      <View style={styles.typingDotsWrap}>
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot1 }] }]} />
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot2 }] }]} />
        <Animated.View style={[styles.typingDot, { transform: [{ translateY: dot3 }] }]} />
      </View>
      <Text style={styles.typingIndicatorText} numberOfLines={1}>
        <Text style={{ fontWeight: '700' }}>{name}</Text> {count > 1 ? 'are typing...' : 'is typing...'}
      </Text>
    </View>
  );
};

export type InnerCircleTab = 'discussions' | 'calendar' | 'manager' | 'vault' | 'bookmarked';

interface WorkspaceInnerCircleViewProps {
  workspace: Workspace;
}

export const WorkspaceInnerCircleView: React.FC<WorkspaceInnerCircleViewProps> = ({ workspace }) => {
  const colors = useColors();
  const isDark = useIsDark();
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<InnerCircleTab>('discussions');
  const [vaultToast, setVaultToast] = useState<{ message: string } | null>(null);
  const [copiedVaultItemId, setCopiedVaultItemId] = useState<string | null>(null);

  // Per-Chat Theme Config
  const activeThemeConfig = useChatThemeStore((s) => s.getThemeConfig(workspace.id));

  useEffect(() => {
    if (workspace.id) {
      useChatThemeStore.getState().loadChatTheme(workspace.id);
    }
  }, [workspace.id]);

  // Workspace Store Data & Actions
  const messages = useWorkspaceStore((s) => s.messages);
  const events = useWorkspaceStore((s) => s.events);
  const opportunities = useWorkspaceStore((s) => s.opportunities);
  const savedItems = useWorkspaceStore((s) => s.savedItems);
  const members = useWorkspaceStore((s) => s.members);
  const isMessagesLoading = useWorkspaceStore((s) => s.isMessagesLoading);
  const isSending = useWorkspaceStore((s) => s.isSending);

  const loadMessages = useWorkspaceStore((s) => s.loadMessages);
  const sendMessage = useWorkspaceStore((s) => s.sendMessage);
  const markAsRead = useWorkspaceStore((s) => s.markAsRead);
  const loadEvents = useWorkspaceStore((s) => s.loadEvents);
  const loadTasks = useWorkspaceStore((s) => s.loadTasks);
  const createEvent = useWorkspaceStore((s) => s.createEvent);
  const updateEvent = useWorkspaceStore((s) => s.updateEvent);
  const deleteEvent = useWorkspaceStore((s) => s.deleteEvent);
  const loadOpportunities = useWorkspaceStore((s) => s.loadOpportunities);
  const createOpportunity = useWorkspaceStore((s) => s.createOpportunity);
  const loadSavedItems = useWorkspaceStore((s) => s.loadSavedItems);
  const saveItem = useWorkspaceStore((s) => s.saveItem);
  const removeSavedItem = useWorkspaceStore((s) => s.removeSavedItem);
  const loadMembers = useWorkspaceStore((s) => s.loadMembers);
  const inviteToInnerCircle = useWorkspaceStore((s) => s.inviteToInnerCircle);
  const removeMember = useWorkspaceStore((s) => s.removeMember);
  const leaveWorkspace = useWorkspaceStore((s) => s.leaveWorkspace);
  const subscribeToWorkspaceMessages = useWorkspaceStore((s) => s.subscribeToWorkspaceMessages);
  const sendTypingIndicator = useWorkspaceStore((s) => s.sendTypingIndicator);
  const typingInThisRoom = useWorkspaceStore((s) => s.typingUsers[workspace.id]);
  const toggleReaction = useWorkspaceStore((s) => s.toggleReaction);
  const votePoll = useWorkspaceStore((s) => s.votePoll);
  const editMessage = useWorkspaceStore((s) => s.editMessage);
  const deleteMessage = useWorkspaceStore((s) => s.deleteMessage);
  const forwardMessage = useWorkspaceStore((s) => s.forwardMessage);
  const togglePinWorkspace = useWorkspaceStore((s) => s.togglePinWorkspace);
  const toggleArchiveWorkspace = useWorkspaceStore((s) => s.toggleArchiveWorkspace);
  const setMuteWorkspace = useWorkspaceStore((s) => s.setMuteWorkspace);
  const clearChatHistory = useWorkspaceStore((s) => s.clearChatHistory);
  const deleteWorkspaceLocally = useWorkspaceStore((s) => s.deleteWorkspaceLocally);
  const deleteCommunityPermanently = useWorkspaceStore((s) => s.deleteCommunityPermanently);
  const leaveAndRemoveCommunity = useWorkspaceStore((s) => s.leaveAndRemoveCommunity);
  const loadOlderMessages = useWorkspaceStore((s) => s.loadOlderMessages);
  const isLoadingOlderMessages = useWorkspaceStore((s) => s.isLoadingOlderMessages);
  const hasMoreOlderMessages = useWorkspaceStore((s) => s.hasMoreOlderMessages[workspace.id] ?? true);
  const unreadBelowCount = useWorkspaceStore((s) => s.unreadBelowCountByRoom[workspace.id] || 0);
  const resetUnreadBelow = useWorkspaceStore((s) => s.resetUnreadBelow);

  const isPinned = Boolean(workspace.settings?.is_pinned);
  const isArchived = Boolean(workspace.settings?.is_archived);
  const isMuted = Boolean(workspace.settings?.is_muted);

  // Global Workspace Settings
  const settings = useWorkspaceSettingsStore((s) => s.settings);

  const isAtBottomRef = useRef(true);
  const hasInitialScrolledRef = useRef(false);
  const [currentRoomId, setCurrentRoomId] = useState(workspace.id);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [localUnreadBelow, setLocalUnreadBelow] = useState(0);
  const prevMsgCountRef = useRef(messages.length);

  if (currentRoomId !== workspace.id) {
    setCurrentRoomId(workspace.id);
    setIsScrolledUp(false);
    setLocalUnreadBelow(0);
    hasInitialScrolledRef.current = false;
    isAtBottomRef.current = true;
  }

  // Initial Room Loader & Realtime Subscription
  useEffect(() => {
    resetUnreadBelow(workspace.id);
    loadMessages(workspace.id);
    loadMembers(workspace.id);
    loadEvents(workspace.id);
    loadTasks(workspace.id);
    loadOpportunities(workspace.id);
    loadSavedItems(workspace.id);
    markAsRead(workspace.id);
    const unsubscribe = subscribeToWorkspaceMessages(workspace.id);
    return () => {
      unsubscribe();
    };
  }, [workspace.id]);

  // Tab switch refresher: reload latest events or tasks when user switches to those tabs
  useEffect(() => {
    if (activeTab === 'calendar') {
      loadEvents(workspace.id);
    } else if (activeTab === 'manager') {
      loadTasks(workspace.id);
    }
  }, [activeTab, workspace.id]);

  // Initial scroll to latest message when messages load
  useEffect(() => {
    if (messages.length > 0 && !hasInitialScrolledRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
        hasInitialScrolledRef.current = true;
      }, 50);
    }
  }, [messages.length, isMessagesLoading]);

  // Handle incoming new messages: unread badge counter if scrolled up, or auto-scroll if at bottom
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      const diff = messages.length - prevMsgCountRef.current;
      if (!isAtBottomRef.current) {
        setLocalUnreadBelow((prev) => prev + diff);
      } else {
        markAsRead(workspace.id);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 60);
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages.length, workspace.id]);

  // Workspaces for Forwarding
  const dms = useWorkspaceStore((s) => s.dms);
  const communities = useWorkspaceStore((s) => s.communities);
  const innerCircles = useWorkspaceStore((s) => s.innerCircles);

  const onlineUserIds = usePresenceStore((s) => s.onlineUserIds);
  const memberCount = members.length > 0 ? members.length : (workspace.members_count || 1);
  const onlineCount = useMemo(() => {
    return (members || []).filter((m) => m.user_id && onlineUserIds[m.user_id]).length;
  }, [members, onlineUserIds]);

  // User Role & Permissions (Step 2: Roles & Permissions)
  const isOwner =
    workspace.owner_id === currentUser?.id ||
    workspace.creator_id === currentUser?.id ||
    workspace.my_role === 'owner';
  const myMembership = members.find((m) => m.user_id === currentUser?.id);
  const isMember = isOwner || myMembership?.status === 'active' || workspace.my_membership_status === 'active';
  const myRole = isOwner ? 'owner' : (myMembership?.role || 'member');
  const isAdminOrOwner = isOwner || myRole === 'owner' || myRole === 'admin';
  const isModOrAbove = isAdminOrOwner || myRole === 'moderator';

  const canPost = (!workspace.settings?.only_admins_post || isAdminOrOwner) && isMember;
  const canInvite = isAdminOrOwner && isMember;
  const canPin = (!workspace.settings?.only_admins_pin || isAdminOrOwner) && isMember;

  const [isJoining, setIsJoining] = useState(false);

  const handleJoinInnerCircle = async () => {
    setIsJoining(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    const res = await workspaceService.joinCommunity(workspace.id);
    if (res.success) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      await loadMembers(workspace.id);
      await useWorkspaceStore.getState().loadWorkspaces();
    } else {
      Alert.alert('Unable to Join', res.error || 'Failed to join inner circle.');
    }
    setIsJoining(false);
  };

  // Discussions State
  const [inputText, setInputText] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSomeoneTyping = Boolean(
    settings.typingIndicatorsEnabled &&
      typingInThisRoom &&
      Object.keys(typingInThisRoom).length > 0
  );
  const typingUserNames = isSomeoneTyping
    ? Object.values(typingInThisRoom).map((u) => u.username).join(', ')
    : null;

  const handleUserTyping = (text: string) => {
    if (!settings.typingIndicatorsEnabled) return;
    if (text.length > 0) {
      sendTypingIndicator(workspace.id, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(workspace.id, false);
      }, 2500);
    } else {
      sendTypingIndicator(workspace.id, false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      sendTypingIndicator(workspace.id, false);
    };
  }, [workspace.id]);
  const [showDoiModal, setShowDoiModal] = useState(false);
  const [doiQuery, setDoiQuery] = useState('');
  const [isResolvingDoi, setIsResolvingDoi] = useState(false);
  const [resolvedDoi, setResolvedDoi] = useState<DoiMetadata | null>(null);
  const [attachedDoi, setAttachedDoi] = useState<DoiMetadata | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const bottomInset = (!isKeyboardVisible && Platform.OS !== 'web' ? insets.bottom : 0) || 0;

  // Replying To State (Group Chat)
  const [replyingTo, setReplyingTo] = useState<WorkspaceMessage | null>(null);

  const getReplyInfo = (target: WorkspaceMessage | null) => {
    if (!target) return null;
    return {
      id: target.id,
      sender_name:
        (target as any).sender_name ||
        (target.sender_id === currentUser?.id ? 'You' : target.sender?.fullName || target.sender?.handle || 'Researcher'),
      content:
        (target.message_type === 'audio' || target.message_type === 'voice_note' || target.audio_metadata ? '🎙️ Voice note' : '') ||
        target.content ||
        (target.doi_metadata ? '📄 Shared research paper' : '') ||
        (target.document_metadata ? '📄 Document' : '') ||
        (target.message_type === 'image' ? '📷 Photo' : '') ||
        'Attachment',
      message_type: target.message_type,
    };
  };

  // Long-Press Message Context Menu State
  const [selectedMessage, setSelectedMessage] = useState<WorkspaceMessage | null>(null);
  const [showMessageActionMenu, setShowMessageActionMenu] = useState(false);
  const [messageActionAnchor, setMessageActionAnchor] = useState<{ x?: number; y?: number; width?: number; height?: number } | null>(null);
  const [deleteTargetMessage, setDeleteTargetMessage] = useState<WorkspaceMessage | null>(null);

  // Edit Message Modal State
  const [editingMessage, setEditingMessage] = useState<WorkspaceMessage | null>(null);
  const [editInputText, setEditInputText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Forward Message Modal State
  const [forwardingMessage, setForwardingMessage] = useState<WorkspaceMessage | null>(null);
  const [forwardSearch, setForwardSearch] = useState('');
  const [forwardingTargetId, setForwardingTargetId] = useState<string | null>(null);

  // Search & Filter State
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [activeChatFilter, setActiveChatFilter] = useState<'all' | 'media' | 'papers' | 'audio' | 'polls' | 'docs'>('all');

  // Pinned Announcement / Message in Pod State
  const [localPinnedMessageId, setLocalPinnedMessageId] = useState<string | null>(null);

  // Mentions (@username, @everyone, @admins) State
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [showMentionPopup, setShowMentionPopup] = useState(false);

  // Full-screen Image Viewer Modal State
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // E2EE Pod Vault Auto-Decryption
  const [decryptedTextMap, setDecryptedTextMap] = useState<Record<string, string>>({});
  const lastDecryptedCipherRef = useRef<Record<string, string>>({});

  useEffect(() => {
    async function decryptPodMessages() {
      if (!workspace.id) return;
      try {
        const podKey = await derivePodSessionKey(workspace.id);
        const updates: Record<string, string> = {};
        for (const m of messages) {
          const isDeletedMsg = Boolean(m.is_deleted === true || m.content === '🚫 This message was deleted');
          if (isDeletedMsg) {
            AsyncStorage.removeItem(`e2ee_cache_${m.id}`).catch(() => {});
            if (decryptedTextMap[m.id]) {
              setDecryptedTextMap((prev) => {
                const next = { ...prev };
                delete next[m.id];
                return next;
              });
            }
            continue;
          }
          let parsedAttachments = m.attachments;
          if (typeof parsedAttachments === 'string') {
            try {
              parsedAttachments = JSON.parse(parsedAttachments);
            } catch {}
          }
          const cipher = m.e2ee_ciphertext || parsedAttachments?.e2ee_ciphertext;
          const nonce = m.e2ee_nonce || parsedAttachments?.e2ee_nonce;

          if (decryptedTextMap[m.id] && cipher && lastDecryptedCipherRef.current[m.id] === cipher) continue;
          if (decryptedTextMap[m.id] && !cipher && !m.is_edited) continue;

          if (cipher && nonce) {
            try {
              const dec = await decryptTextMessage(cipher, nonce, podKey);
              if (dec && !dec.startsWith('🔒 [')) {
                updates[m.id] = dec;
                lastDecryptedCipherRef.current[m.id] = cipher;
                AsyncStorage.setItem(`e2ee_cache_${m.id}`, dec).catch(() => {});
              }
            } catch {}
          } else {
            try {
              const cached = await AsyncStorage.getItem(`e2ee_cache_${m.id}`);
              if (cached && !cached.startsWith('🔒')) {
                updates[m.id] = cached;
              }
            } catch {}
          }
        }
        if (Object.keys(updates).length > 0) {
          setDecryptedTextMap((prev) => ({ ...prev, ...updates }));
        }
      } catch {}
    }
    decryptPodMessages();
  }, [messages, workspace.id]);

  // Helper to extract image URL from message
  const extractImageUrl = (m: WorkspaceMessage) => {
    if (
      m.message_type === 'audio' ||
      m.message_type === 'voice_note' ||
      m.message_type === 'poll' ||
      m.message_type === 'document' ||
      m.message_type === 'call_log' ||
      m.content?.startsWith('🎙️') ||
      Boolean(m.audio_metadata) ||
      Boolean((m.attachments as any)?.audio_metadata)
    ) {
      return null;
    }
    if (m.media_urls && m.media_urls.length > 0 && typeof m.media_urls[0] === 'string' && m.media_urls[0].startsWith('http')) {
      const url = m.media_urls[0].toLowerCase();
      if (
        url.endsWith('.webm') ||
        url.endsWith('.mp3') ||
        url.endsWith('.m4a') ||
        url.endsWith('.ogg') ||
        url.endsWith('.wav') ||
        url.endsWith('.pdf') ||
        url.includes('/audio/')
      ) {
        return null;
      }
      return m.media_urls[0];
    }
    if (Array.isArray(m.attachments)) {
      for (const a of m.attachments) {
        if (typeof a === 'string' && a.startsWith('http')) {
          const url = a.toLowerCase();
          if (!url.endsWith('.webm') && !url.endsWith('.mp3') && !url.endsWith('.m4a') && !url.endsWith('.ogg') && !url.endsWith('.wav') && !url.endsWith('.pdf') && !url.includes('/audio/')) {
            return a;
          }
        }
        if (a?.url && typeof a.url === 'string' && a.url.startsWith('http')) {
          const url = a.url.toLowerCase();
          if (!url.endsWith('.webm') && !url.endsWith('.mp3') && !url.endsWith('.m4a') && !url.endsWith('.ogg') && !url.endsWith('.wav') && !url.endsWith('.pdf') && !url.includes('/audio/')) {
            return a.url;
          }
        }
        if (a?.imageUrl && typeof a.imageUrl === 'string' && a.imageUrl.startsWith('http')) return a.imageUrl;
        if (a?.image_url && typeof a.image_url === 'string' && a.image_url.startsWith('http')) return a.image_url;
      }
    } else if (m.attachments && typeof m.attachments === 'object') {
      if (Array.isArray(m.attachments.media_urls) && m.attachments.media_urls.length > 0) {
        const first = m.attachments.media_urls[0];
        if (typeof first === 'string' && first.startsWith('http')) {
          const url = first.toLowerCase();
          if (!url.endsWith('.webm') && !url.endsWith('.mp3') && !url.endsWith('.m4a') && !url.endsWith('.ogg') && !url.endsWith('.wav') && !url.endsWith('.pdf') && !url.includes('/audio/')) {
            return first;
          }
        }
      }
      if (m.attachments.imageUrl && typeof m.attachments.imageUrl === 'string' && m.attachments.imageUrl.startsWith('http')) {
        return m.attachments.imageUrl;
      }
      if (m.attachments.image_url && typeof m.attachments.image_url === 'string' && m.attachments.image_url.startsWith('http')) {
        return m.attachments.image_url;
      }
    }
    if (typeof m.content === 'string' && (m.message_type === 'image' || m.content === '📷 Shared photo' || m.content === '📷 Captured photo')) {
      if (m.content.startsWith('http://') || m.content.startsWith('https://')) {
        return m.content.trim();
      }
      const match = m.content.match(/https?:\/\/[^\s]+(?:\.jpg|\.jpeg|\.png|\.webp|\.gif|\/profile-media\/[^\s]+|\/storage\/v1\/object\/public\/[^\s]+|\/workspace-media\/[^\s]+)/i);
      if (match) {
        return match[0];
      }
    }
    return null;
  };

  // Filtered & Searched Messages (with Auto-Expiring & Zero-History Settings)
  const displayedMessages = useMemo(() => {
    let list = messages;

    // Auto-expiring message filtering (from settings or workspace configuration)
    const effectiveTimer = settings.autoExpiringPodMessages !== 'off'
      ? settings.autoExpiringPodMessages
      : workspace.settings?.ephemeral_timer;

    if (effectiveTimer && effectiveTimer !== 'off') {
      const now = Date.now();
      let maxAgeMs = 7 * 24 * 60 * 60 * 1000;
      if (effectiveTimer === '7d') maxAgeMs = 7 * 24 * 60 * 60 * 1000;
      else if (effectiveTimer === '30d') maxAgeMs = 30 * 24 * 60 * 60 * 1000;
      else if (effectiveTimer === '90d') maxAgeMs = 90 * 24 * 60 * 60 * 1000;

      list = list.filter((m) => {
        const msgTime = new Date(m.created_at).getTime();
        return now - msgTime < maxAgeMs;
      });
    }

    // Inner Circle Chat Retention Rule: governed by settings.innerCircleZeroHistoryDefault
    if (settings.innerCircleZeroHistoryDefault && !isOwner) {
      const myJoinedAtStr = myMembership?.joined_at || workspace.my_joined_at;
      if (!isMember || !myJoinedAtStr) {
        // Not a joined member yet (reviewing via invite) -> cannot view previous chats
        list = [];
      } else {
        const joinTime = new Date(myJoinedAtStr).getTime();
        list = list.filter((m) => new Date(m.created_at).getTime() >= joinTime);
      }
    }

    // Filter by type if active
    if (activeChatFilter === 'media') {
      list = list.filter(
        (m) =>
          !m.is_deleted &&
          (m.message_type === 'image' ||
            Boolean(extractImageUrl(m)) ||
            m.content === '📷 Shared photo' ||
            m.content === '📷 Captured photo')
      );
    } else if (activeChatFilter === 'papers') {
      list = list.filter((m) => !m.is_deleted && (Boolean(m.doi_metadata) || m.message_type === 'paper_doi'));
    } else if (activeChatFilter === 'audio') {
      list = list.filter(
        (m) =>
          !m.is_deleted &&
          (m.message_type === 'audio' ||
            m.message_type === 'voice_note' ||
            Boolean(m.audio_metadata) ||
            m.content?.startsWith('🎙️'))
      );
    } else if (activeChatFilter === 'polls') {
      list = list.filter((m) => !m.is_deleted && (m.message_type === 'poll' || m.content.startsWith('📊 Poll:')));
    } else if (activeChatFilter === 'docs') {
      list = list.filter((m) => !m.is_deleted && (m.message_type === 'document' || Boolean(m.document_metadata)));
    }

    // Search query
    if (chatSearchQuery.trim()) {
      const q = chatSearchQuery.toLowerCase();
      list = list.filter((m) => {
        const contentMatch = (m.content || '').toLowerCase().includes(q);
        const senderMatch = (m.sender?.fullName || '').toLowerCase().includes(q);
        const doiMatch = (m.doi_metadata?.title || '').toLowerCase().includes(q);
        const docMatch = (m.document_metadata?.name || '').toLowerCase().includes(q);
        return contentMatch || senderMatch || doiMatch || docMatch;
      });
    }

    return list;
  }, [
    messages,
    activeChatFilter,
    chatSearchQuery,
    workspace.settings?.ephemeral_timer,
    isOwner,
    isMember,
    myMembership?.joined_at,
    workspace.my_joined_at,
  ]);

  // Pinned Message
  const pinnedMessage = useMemo(() => {
    if (localPinnedMessageId) {
      return messages.find((m) => m.id === localPinnedMessageId) || null;
    }
    return messages.find((m) => m.is_pinned) || null;
  }, [messages, localPinnedMessageId]);

  // Modals & Calendar State
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<WorkspaceEvent | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventTime, setEventTime] = useState('14:00');
  const [showClockPicker, setShowClockPicker] = useState(true);
  const [eventToDelete, setEventToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [eventType, setEventType] = useState<'lab_meeting' | 'reading_group' | 'milestone' | 'live_session'>('lab_meeting');
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<string[]>([]);
  const [memberFilterQuery, setMemberFilterQuery] = useState('');
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);

  // Collapsible Calendar State
  const [isCalendarCollapsed, setIsCalendarCollapsed] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date().toISOString().split('T')[0]);
  const [calendarViewMode, setCalendarViewMode] = useState<'selected' | 'all'>('selected');

  const calendarYear = currentCalendarMonth.getFullYear();
  const calendarMonthIndex = currentCalendarMonth.getMonth();

  const calendarMonthTitle = currentCalendarMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const firstDayOfMonth = new Date(calendarYear, calendarMonthIndex, 1).getDay();
  const daysInCurrentMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();

  const calendarGrid = useMemo(() => {
    const cells: Array<{
      day: number | null;
      dateStr: string | null;
      isToday: boolean;
      isSelected: boolean;
      hasEvents: boolean;
      eventCount: number;
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push({
        day: null,
        dateStr: null,
        isToday: false,
        isSelected: false,
        hasEvents: false,
        eventCount: 0,
      });
    }

    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${calendarYear}-${String(calendarMonthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = (events || [])
        .filter((e) => !e.id.startsWith('task_seed_') && !e.id.startsWith('demo_'))
        .filter((e) => {
          const evDate = (e.start_time || (e as any).event_date || '').split('T')[0];
          return evDate === dateStr;
        });

      cells.push({
        day: d,
        dateStr,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedCalendarDate,
        hasEvents: dayEvents.length > 0,
        eventCount: dayEvents.length,
      });
    }

    return cells;
  }, [calendarYear, calendarMonthIndex, firstDayOfMonth, daysInCurrentMonth, events, selectedCalendarDate]);

  const formattedSelectedDate = useMemo(() => {
    try {
      const parts = selectedCalendarDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return selectedCalendarDate;
    }
  }, [selectedCalendarDate]);

  const eventsOnSelectedDate = useMemo(() => {
    return (events || [])
      .filter((e) => !e.id.startsWith('task_seed_') && !e.id.startsWith('demo_'))
      .filter((e) => {
        const evDate = (e.start_time || (e as any).event_date || '').split('T')[0];
        return evDate === selectedCalendarDate;
      });
  }, [events, selectedCalendarDate]);

  const displayedEvents = useMemo(() => {
    const validEvents = (events || []).filter((e) => !e.id.startsWith('task_seed_') && !e.id.startsWith('demo_'));
    if (calendarViewMode === 'selected') {
      return eventsOnSelectedDate;
    }
    return validEvents;
  }, [eventsOnSelectedDate, events, calendarViewMode]);

  const formatEventDisplayDateTime = (startTimeStr: string) => {
    try {
      if (!startTimeStr) return { dateFormatted: '', timeFormatted: '' };

      const separator = startTimeStr.includes('T') ? 'T' : ' ';
      const [datePart, timePartRaw] = startTimeStr.split(separator);

      let dateFormatted = datePart;
      if (datePart && datePart.includes('-')) {
        const [y, m, d] = datePart.split('-').map(Number);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          const dObj = new Date(y, m - 1, d);
          dateFormatted = dObj.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        }
      }

      let timeFormatted = '';
      if (timePartRaw && timePartRaw.includes(':')) {
        const [hStr, mStr] = timePartRaw.split(':');
        const h = parseInt(hStr, 10);
        const m = (mStr || '00').substring(0, 2);
        if (!isNaN(h)) {
          const period = h >= 12 ? 'PM' : 'AM';
          const displayH = h % 12 === 0 ? 12 : h % 12;
          timeFormatted = `${String(displayH).padStart(2, '0')}:${m} ${period}`;
        }
      }

      if (!timeFormatted) {
        const d = new Date(startTimeStr);
        timeFormatted = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        dateFormatted = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      }

      return { dateFormatted, timeFormatted };
    } catch {
      return { dateFormatted: startTimeStr, timeFormatted: '' };
    }
  };

  const handlePrevMonth = () => {
    setCurrentCalendarMonth(new Date(calendarYear, calendarMonthIndex - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarMonth(new Date(calendarYear, calendarMonthIndex + 1, 1));
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    const todayStr = now.toISOString().split('T')[0];
    setSelectedCalendarDate(todayStr);
  };

  const openScheduleModalForDate = (dateStr: string) => {
    setEditingEvent(null);
    setEventDate(dateStr);
    setSelectedCalendarDate(dateStr);
    setSelectedAttendeeIds([]);
    setEventTitle('');
    setEventDesc('');
    setEventTime('14:00');
    setEventType('lab_meeting');
    setShowClockPicker(true);
    setShowEventModal(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const openEditModalForEvent = (ev: WorkspaceEvent) => {
    setEditingEvent(ev);
    setEventTitle(ev.title || '');
    // Clean out any previously appended attendee footnote
    const cleanDesc = (ev.description || '')
      .replace(/\n\n👥 Attendees: [^\n]+/g, '')
      .replace(/👥 Attendees: [^\n]+/g, '')
      .trim();
    setEventDesc(cleanDesc);

    const evDate = (ev.start_time || (ev as any).event_date || '').split('T')[0] || selectedCalendarDate;
    setEventDate(evDate);
    setSelectedCalendarDate(evDate);

    let evTime = '14:00';
    if (ev.start_time && ev.start_time.includes('T')) {
      const rawTime = ev.start_time.split('T')[1]?.substring(0, 5);
      if (rawTime && rawTime.includes(':')) {
        evTime = rawTime;
      }
    }
    setEventTime(evTime);
    setEventType((ev.event_type as any) || 'lab_meeting');
    setSelectedAttendeeIds(ev.attendee_ids || []);
    setShowClockPicker(true);
    setShowEventModal(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);

  // Step 3: Voice Note Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  // Step 3: Attachment & Rich Card Modals
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const attachBtnRef = useRef<View>(null);
  const [showDocumentPickerModal, setShowDocumentPickerModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [localPollVotes, setLocalPollVotes] = useState<Record<string, string>>({});

  // Auto-hydrate user's existing poll selections from loaded messages and AsyncStorage so votes persist across restarts
  useEffect(() => {
    if (!currentUser?.id || !messages || messages.length === 0) return;
    const detected: Record<string, string> = {};
    messages.forEach((m) => {
      const reactions = (m.reactions as Record<string, string[]>) || (m.attachments as any)?.reactions || {};
      const pollData = m.poll_data || (m.attachments as any)?.poll_data;

      Object.entries(reactions).forEach(([k, uids]) => {
        if (k.startsWith('vote:') && Array.isArray(uids) && uids.includes(currentUser.id)) {
          detected[m.id] = k.replace('vote:', '');
        }
      });

      if (!detected[m.id] && pollData && Array.isArray(pollData.options)) {
        pollData.options.forEach((opt: any) => {
          if (Array.isArray(opt.votes) && opt.votes.includes(currentUser.id)) {
            detected[m.id] = opt.id;
          }
        });
      }
    });

    // Also check AsyncStorage for any votes cast by this user on these messages
    (async () => {
      for (const m of messages) {
        if (m.message_type === 'poll' || (typeof m.content === 'string' && m.content.startsWith('📊 Poll:'))) {
          if (!detected[m.id]) {
            try {
              const savedVote = await AsyncStorage.getItem(`@booffin_poll_vote_${m.id}_${currentUser.id}`);
              if (savedVote) {
                detected[m.id] = savedVote;
              }
            } catch {}
          }
        }
      }
      if (Object.keys(detected).length > 0) {
        setLocalPollVotes((prev) => ({ ...prev, ...detected }));
      }
    })();
  }, [messages, currentUser?.id]);

  const [showPostPickerModal, setShowPostPickerModal] = useState(false);
  const [postTitleInput, setPostTitleInput] = useState('');
  const [postSnippetInput, setPostSnippetInput] = useState('');

  const [showProfilePickerModal, setShowProfilePickerModal] = useState(false);
  const [userSearchText, setUserSearchText] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearchingProfileUsers, setIsSearchingProfileUsers] = useState(false);

  const [showInvitePickerModal, setShowInvitePickerModal] = useState(false);

  // Options Menu & Sub-Modals States
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [showDeleteChatModal, setShowDeleteChatModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isProcessingChatAction, setIsProcessingChatAction] = useState(false);

  // Options Menu Handlers
  const handleTogglePin = async () => {
    setShowOptionsMenu(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    await togglePinWorkspace(workspace.id);
  };

  const handleToggleArchive = async () => {
    setShowOptionsMenu(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    await toggleArchiveWorkspace(workspace.id);
    if (!isArchived) {
      router.back();
    }
  };

  const handleSelectMuteDuration = async (duration: '8h' | '1w' | 'always' | 'unmute') => {
    setShowMuteModal(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (duration === 'unmute') {
      await setMuteWorkspace(workspace.id, false, null);
      return;
    }

    let until: string | null = null;
    const now = new Date();
    if (duration === '8h') {
      now.setHours(now.getHours() + 8);
      until = now.toISOString();
    } else if (duration === '1w') {
      now.setDate(now.getDate() + 7);
      until = now.toISOString();
    }

    await setMuteWorkspace(workspace.id, true, until);
  };

  const handleClearChatHistory = async () => {
    setIsProcessingChatAction(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    await clearChatHistory(workspace.id);
    setIsProcessingChatAction(false);
    setShowClearHistoryModal(false);
  };

  const handleDeleteConversationLocally = async () => {
    setIsProcessingChatAction(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}

    if (isOwner) {
      const res = await deleteCommunityPermanently(workspace.id);
      setIsProcessingChatAction(false);
      setShowDeleteChatModal(false);
      if (res.success) {
        if (Platform.OS === 'web') {
          window.alert('Research pod permanently deleted for everyone.');
        } else {
          Alert.alert('Pod Deleted', 'This research pod has been permanently deleted for everyone.');
        }
        router.replace('/workspace' as any);
      } else {
        if (Platform.OS === 'web') {
          window.alert(res.error || 'Failed to delete pod');
        } else {
          Alert.alert('Delete Failed', res.error || 'Failed to delete pod');
        }
      }
    } else {
      const res = await leaveAndRemoveCommunity(workspace.id);
      setIsProcessingChatAction(false);
      setShowDeleteChatModal(false);
      if (res.success) {
        if (Platform.OS === 'web') {
          window.alert('You have left and removed this pod from your workspace.');
        } else {
          Alert.alert('Removed', 'You have left and removed this research pod from your workspace.');
        }
        router.replace('/workspace' as any);
      } else {
        if (Platform.OS === 'web') {
          window.alert(res.error || 'Failed to leave pod');
        } else {
          Alert.alert('Action Failed', res.error || 'Failed to leave pod');
        }
      }
    }
  };

  const handleSubmitReport = async () => {
    setIsSubmittingReport(true);
    try {
      setTimeout(() => {
        setIsSubmittingReport(false);
        setShowReportModal(false);
        if (Platform.OS === 'web') window.alert('Thank you. Your report has been submitted to pod moderation.');
        else Alert.alert('Report Submitted', 'Your report has been received and will be reviewed by our team.');
      }, 400);
    } catch {
      setIsSubmittingReport(false);
      setShowReportModal(false);
    }
  };

  // Step 3: Poll Creation Handler
  const handleCreatePoll = async () => {
    const q = pollQuestion.trim();
    const validOpts = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!q || validOpts.length < 2) {
      if (Platform.OS === 'web') {
        window.alert('Please enter a question and at least 2 options for the poll.');
      } else {
        Alert.alert('Incomplete Poll', 'Please enter a question and at least 2 options.');
      }
      return;
    }

    setIsCreatingPoll(true);
    try {
      const pollPayload = {
        question: q,
        options: validOpts.map((opt, idx) => ({
          id: `opt_${idx}`,
          text: opt,
          votes: [] as string[],
        })),
        totalVotes: 0,
      };

      const res = await sendMessage({
        workspace_id: workspace.id,
        content: `📊 Poll: ${q}\n${validOpts.map((opt) => `• ${opt}`).join('\n')}`,
        message_type: 'poll',
        doi_metadata: null,
        poll_data: pollPayload,
        reply_to_id: replyingTo?.id || null,
        reply_to_message: getReplyInfo(replyingTo),
      });

      if (res.success) {
        setShowPollModal(false);
        setShowAttachMenu(false);
        setPollQuestion('');
        setPollOptions(['', '']);
        setReplyingTo(null);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (err: any) {
      console.warn('Create poll error:', err);
    } finally {
      setIsCreatingPoll(false);
    }
  };

  // Step 3: Handle Poll Voting with real-time reaction sync & percentage calculation
  const handleVote = async (messageId: string, optionId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const targetMsg = messages.find((m) => m.id === messageId);
    let prevVote = localPollVotes[messageId];
    if (prevVote === undefined && currentUser?.id && targetMsg) {
      const reactions = (targetMsg.reactions as Record<string, string[]>) || (targetMsg.attachments as any)?.reactions || {};
      Object.entries(reactions).forEach(([k, uids]) => {
        if (k.startsWith('vote:') && Array.isArray(uids) && uids.includes(currentUser.id)) {
          prevVote = k.replace('vote:', '');
        }
      });
      if (!prevVote) {
        const pd = targetMsg.poll_data || (targetMsg.attachments as any)?.poll_data;
        if (pd && Array.isArray(pd.options)) {
          pd.options.forEach((opt: any) => {
            if (Array.isArray(opt.votes) && opt.votes.includes(currentUser.id)) {
              prevVote = opt.id;
            }
          });
        }
      }
    }

    const newVote = prevVote === optionId ? '' : optionId;

    setLocalPollVotes((prev) => ({
      ...prev,
      [messageId]: newVote,
    }));

    await votePoll(workspace.id, messageId, newVote);
  };

  // Step 3: Research Paper & Manuscript Search Handler
  const handleSelectPaperToShare = async (paper: Paper) => {
    setShowDocumentPickerModal(false);
    setShowDoiModal(false);
    setShowAttachMenu(false);

    const doiMeta: DoiMetadata = {
      doi: paper.doi || '',
      title: paper.title,
      authors: (paper.authors || []).map((a) => ({ name: a.name, orcid: a.orcid })),
      publicationYear: paper.publicationYear,
      journal: paper.journal,
      url: paper.openAccessUrl || paper.canonicalUrl || (paper.doi ? `https://doi.org/${paper.doi}` : ''),
      abstract: paper.abstract,
      citationCount: paper.citationCount,
    };

    const docMeta: WorkspaceDocumentMetadata = {
      name: `${paper.title.slice(0, 45).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
      sizeBytes: 1024 * 1024 * 1.8,
      fileUrl: paper.openAccessUrl || paper.canonicalUrl || 'https://arxiv.org/pdf/2103.00020.pdf',
      mimeType: 'application/pdf',
      pageCount: 16,
    };

    await sendMessage({
      workspace_id: workspace.id,
      content: `📄 Manuscript: ${paper.title}`,
      message_type: 'paper_doi',
      doi_metadata: doiMeta,
      document_metadata: docMeta,
      reply_to_id: replyingTo?.id || null,
      reply_to_message: getReplyInfo(replyingTo),
    });

    setReplyingTo(null);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Step 3: Share BooffIn Post Handler
  const handleSharePost = async () => {
    const title = postTitleInput.trim();
    if (!title) return;

    setShowPostPickerModal(false);
    setShowAttachMenu(false);
    const postMeta: WorkspacePostMetadata = {
      id: `post_${Date.now()}`,
      title,
      author_name: currentUser?.fullName || currentUser?.handle || 'BooffIn Researcher',
      author_avatar: currentUser?.avatarUrl || null,
      snippet: postSnippetInput.trim() || 'New research findings, experiment data, and academic analysis shared on BooffIn.',
      upvotes: 42,
      tags: ['Biotechnology', 'PeerReview', 'Preprint'],
    };

    setPostTitleInput('');
    setPostSnippetInput('');

    await sendMessage({
      workspace_id: workspace.id,
      content: `🔬 BooffIn Post: ${title}`,
      message_type: 'post',
      post_metadata: postMeta,
      reply_to_id: replyingTo?.id || null,
      reply_to_message: getReplyInfo(replyingTo),
    });

    setReplyingTo(null);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Step 3: Search Users for Profile Sharing
  const handleSearchProfileUsers = async (query: string) => {
    setUserSearchText(query);
    const clean = query.trim().replace(/^@/, '');
    if (!clean || clean.length < 2) {
      setUserSearchResults([]);
      return;
    }

    setIsSearchingProfileUsers(true);
    try {
      const results = await searchBooffInUsers(clean, 5);
      setUserSearchResults(results);
    } catch {
      setUserSearchResults([]);
    } finally {
      setIsSearchingProfileUsers(false);
    }
  };

  // Step 3: Share Researcher Profile Handler
  const handleShareProfile = async (userProfile: any) => {
    setShowProfilePickerModal(false);
    setShowAttachMenu(false);
    setUserSearchText('');
    setUserSearchResults([]);

    const profileMeta: WorkspaceProfileMetadata = {
      id: userProfile.id,
      fullName: userProfile.fullName || userProfile.name || 'Researcher',
      handle: userProfile.handle || userProfile.username || 'researcher',
      avatarUrl: userProfile.avatarUrl || userProfile.avatar_url || null,
      academicTitle: userProfile.academicTitle || userProfile.title || 'Academic Researcher',
      institution: userProfile.institution || null,
      orcidVerified: Boolean(userProfile.orcidVerified || userProfile.orcid_verified),
    };

    await sendMessage({
      workspace_id: workspace.id,
      content: `👤 Researcher Profile: ${profileMeta.fullName}`,
      message_type: 'profile',
      profile_metadata: profileMeta,
      reply_to_id: replyingTo?.id || null,
      reply_to_message: getReplyInfo(replyingTo),
    });

    setReplyingTo(null);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Step 3: Share Workspace / Pod Invite Handler
  const handleShareWorkspaceInvite = async (targetWs: Workspace) => {
    setShowInvitePickerModal(false);
    setShowAttachMenu(false);
    const inviteMeta: WorkspaceInviteMetadata = {
      id: targetWs.id,
      name: targetWs.name || 'Research Pod',
      type: targetWs.type === 'inner_circle' ? 'inner_circle' : 'community',
      avatarUrl: targetWs.avatar_url || null,
      description: targetWs.description || 'Join our private research pod to collaborate on active projects and papers.',
      members_count: targetWs.members_count || 5,
    };

    await sendMessage({
      workspace_id: workspace.id,
      content: `🏛️ Workspace Invite: ${inviteMeta.name}`,
      message_type: 'workspace_invite',
      workspace_invite_metadata: inviteMeta,
      reply_to_id: replyingTo?.id || null,
      reply_to_message: getReplyInfo(replyingTo),
    });

    setReplyingTo(null);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handlePickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        if (Platform.OS === 'web') window.alert('Please allow photo permissions.');
        else Alert.alert('Permission Denied', 'Please grant photo library access to upload photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        base64: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];
      if (currentUser?.id) {
        setIsUploadingMedia(true);
        const uploadRes = await uploadPostImage(currentUser.id, asset);
        if (uploadRes.success && uploadRes.url) {
          await sendMessage({
            workspace_id: workspace.id,
            content: '📷 Shared photo',
            message_type: 'image',
            media_urls: [uploadRes.url],
            reply_to_id: replyingTo?.id || null,
            reply_to_message: getReplyInfo(replyingTo),
          });
          setReplyingTo(null);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } else {
          if (Platform.OS === 'web') window.alert(uploadRes.error || 'Failed to upload photo.');
          else Alert.alert('Upload Failed', uploadRes.error || 'Failed to upload photo.');
        }
      }
    } catch (err) {
      console.warn('Pick image error:', err);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // Voice Note Send Handler
  const handleSendVoiceNote = async (audioData: {
    duration: number;
    waveform: number[];
    uri?: string;
    blob?: Blob;
    mimeType?: string;
  }) => {
    setIsRecordingVoice(false);
    const replyId = replyingTo?.id || null;

    let finalAudioUrl = audioData.uri || null;

    if (currentUser?.id && audioData.blob) {
      const uploadRes = await uploadVoiceNoteAudio(
        currentUser.id,
        audioData.blob,
        audioData.mimeType || 'audio/webm'
      );
      if (uploadRes.success && uploadRes.url) {
        finalAudioUrl = uploadRes.url;
      }
    }

    const res = await sendMessage({
      workspace_id: workspace.id,
      content: '🎙️ Voice Note',
      message_type: 'audio',
      media_urls: finalAudioUrl ? [finalAudioUrl] : [],
      audio_metadata: {
        duration: audioData.duration,
        waveform: audioData.waveform,
        url: finalAudioUrl || undefined,
      },
      reply_to_id: replyId,
      reply_to_message: getReplyInfo(replyingTo),
    });

    if (res.success) {
      setReplyingTo(null);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };


  // Input change & Mention detection
  const handleInputChange = (text: string) => {
    setInputText(text);
    handleUserTyping(text);
    const lastWord = text.split(/\s+/).pop() || '';
    if (lastWord.startsWith('@')) {
      setMentionQuery(lastWord.slice(1).toLowerCase());
      setShowMentionPopup(true);
    } else {
      setShowMentionPopup(false);
      setMentionQuery(null);
    }
  };

  const handleSelectMention = (tag: string) => {
    const words = inputText.split(/\s+/);
    words.pop();
    const prefix = words.length > 0 ? words.join(' ') + ' ' : '';
    const updated = `${prefix}@${tag} `;
    setInputText(updated);
    setShowMentionPopup(false);
    setMentionQuery(null);
  };

  // Mention Suggestions List
  const mentionSuggestions = useMemo(() => {
    const list: Array<{ id: string; name: string; handle: string; avatarUrl?: string | null; isSpecial?: boolean }> = [
      { id: 'everyone', name: 'Everyone in Pod', handle: 'everyone', isSpecial: true },
      { id: 'admins', name: 'Pod Admins & Leads', handle: 'admins', isSpecial: true },
    ];

    members.forEach((m) => {
      const p = m.profile;
      if (p && p.id !== currentUser?.id) {
        list.push({
          id: p.id,
          name: p.fullName || p.handle || 'Researcher',
          handle: p.handle || (p.fullName ? p.fullName.toLowerCase().replace(/\s+/g, '_') : 'user'),
          avatarUrl: p.avatarUrl,
        });
      }
    });

    if (!mentionQuery) return list;
    const q = mentionQuery.toLowerCase();
    return list.filter(
      (item) => item.name.toLowerCase().includes(q) || item.handle.toLowerCase().includes(q)
    );
  }, [members, currentUser?.id, mentionQuery]);

  // Send Message with reply_to_id
  const handleSendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed && !attachedDoi) return;

    const currentAttachedDoi = attachedDoi;
    const currentReply = replyingTo;

    // Immediately clear input fields so user experiences 0ms UI perception (WhatsApp feel)
    setInputText('');
    setAttachedDoi(null);
    setReplyingTo(null);
    setShowMentionPopup(false);
    setMentionQuery(null);

    if (workspace.id) {
      sendTypingIndicator(workspace.id, false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }

    // Instantly scroll to bottom to view new pending message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 20);

    let e2eeCipher: string | null = null;
    let e2eeNonce: string | null = null;

    if (workspace.id && trimmed && !currentAttachedDoi) {
      try {
        const podKey = await derivePodSessionKey(workspace.id);
        const enc = await encryptTextMessage(trimmed, podKey);
        e2eeCipher = enc.ciphertext;
        e2eeNonce = enc.nonce;
      } catch (err) {
        console.warn('Pod encryption warning:', err);
      }
    }

    const res = await sendMessage({
      workspace_id: workspace.id,
      content: e2eeCipher ? '🔒 Encrypted message' : (trimmed || (currentAttachedDoi ? `Shared paper: ${currentAttachedDoi.title}` : '')),
      plaintextContent: trimmed,
      message_type: currentAttachedDoi ? 'paper_doi' : (e2eeCipher ? 'e2ee_cipher' : 'text'),
      doi_metadata: currentAttachedDoi,
      e2ee_ciphertext: e2eeCipher,
      e2ee_nonce: e2eeNonce,
      reply_to_id: currentReply?.id || null,
      reply_to_message: getReplyInfo(currentReply),
    });

    if (res.success && trimmed) {
      const newMsgId = res.message?.id;
      if (newMsgId) {
        setDecryptedTextMap((prev) => ({ ...prev, [newMsgId]: trimmed }));
        try {
          AsyncStorage.setItem(`e2ee_cache_${newMsgId}`, trimmed).catch(() => {});
        } catch {}
      }
    }
  };

  // Long-Press Message
  const handleOpenMessageMenu = (msg: WorkspaceMessage, coords?: { x: number; y: number }) => {
    if (msg.is_deleted) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setSelectedMessage(msg);
    if (coords && coords.x !== undefined && coords.y !== undefined) {
      setMessageActionAnchor({
        x: coords.x,
        y: coords.y,
        width: 24,
        height: 24,
      });
    } else {
      setMessageActionAnchor(null);
    }
    setShowMessageActionMenu(true);
  };

  const handleLongPressMessage = (msg: WorkspaceMessage) => {
    handleOpenMessageMenu(msg);
  };

  // Toggle Emoji Reaction
  const handleToggleReaction = async (msgId: string, emoji: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setShowMessageActionMenu(false);
    await toggleReaction(msgId, emoji);
  };

  const getDecryptedOrPlaintext = async (msg: WorkspaceMessage): Promise<string> => {
    if (decryptedTextMap[msg.id] && !decryptedTextMap[msg.id].startsWith('🔒')) {
      return decryptedTextMap[msg.id];
    }
    try {
      const cached = await AsyncStorage.getItem(`e2ee_cache_${msg.id}`);
      if (cached && !cached.startsWith('🔒')) {
        return cached;
      }
    } catch {}

    let parsedAttachments = msg.attachments;
    if (typeof parsedAttachments === 'string') {
      try {
        parsedAttachments = JSON.parse(parsedAttachments);
      } catch {}
    }
    const cipher = msg.e2ee_ciphertext || parsedAttachments?.e2ee_ciphertext;
    const nonce = msg.e2ee_nonce || parsedAttachments?.e2ee_nonce;
    if (cipher && nonce && workspace.id) {
      try {
        const podKey = await derivePodSessionKey(workspace.id);
        const dec = await decryptTextMessage(cipher, nonce, podKey);
        if (dec && !dec.startsWith('🔒 [')) {
          setDecryptedTextMap((prev) => ({ ...prev, [msg.id]: dec }));
          lastDecryptedCipherRef.current[msg.id] = cipher;
          return dec;
        }
      } catch {}
    }
    if (msg.content && msg.content !== '🔒 Encrypted message') {
      return msg.content;
    }
    return '';
  };

  // Copy Message Text
  const handleCopyMessage = async () => {
    if (!selectedMessage) return;
    const msg = selectedMessage;
    setShowMessageActionMenu(false);
    setSelectedMessage(null);
    const textToCopy =
      (await getDecryptedOrPlaintext(msg)) ||
      (msg.content !== '🔒 Encrypted message' ? msg.content : '') ||
      '';
    if (textToCopy) {
      await Clipboard.setStringAsync(textToCopy);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      if (Platform.OS === 'web') {
        window.alert('Message copied to clipboard');
      }
    }
  };

  // Toggle Pin Message to Pod
  const handleTogglePinMessage = async () => {
    if (!selectedMessage) return;
    if (!canPin) {
      if (Platform.OS === 'web') window.alert('Only Pod Admins can pin announcements.');
      else Alert.alert('Permission Denied', 'Only Pod Admins can pin announcements in this pod.');
      return;
    }
    const msgId = selectedMessage.id;
    setShowMessageActionMenu(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setLocalPinnedMessageId((curr) => (curr === msgId ? null : msgId));
  };

  // Start Reply
  const handleStartReply = () => {
    if (!selectedMessage) return;
    setReplyingTo(selectedMessage);
    setShowMessageActionMenu(false);
  };

  // Edit Message Handlers
  const handleStartEdit = async () => {
    if (!selectedMessage) return;
    const msg = selectedMessage;
    setShowMessageActionMenu(false);
    setSelectedMessage(null);
    setEditingMessage(msg);

    // Immediate synchronous population from memory
    const syncText =
      decryptedTextMap[msg.id] ||
      (msg.content !== '🔒 Encrypted message' ? (msg.content || '') : '');
    setEditInputText(syncText);

    // Asynchronous resolution if empty
    if (!syncText) {
      const resolved = await getDecryptedOrPlaintext(msg);
      if (resolved) {
        setEditInputText(resolved);
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editInputText.trim()) return;
    setIsSavingEdit(true);
    const newText = editInputText.trim();
    try {
      const isEncrypted = Boolean(
        editingMessage.e2ee_ciphertext ||
        (editingMessage.attachments as any)?.e2ee_ciphertext ||
        editingMessage.content === '🔒 Encrypted message'
      );

      let e2eePayload: { ciphertext?: string; nonce?: string; plaintextContent?: string } | undefined;
      if (isEncrypted) {
        const podKey = await derivePodSessionKey(workspace.id);
        const enc = await encryptTextMessage(newText, podKey);
        e2eePayload = {
          ciphertext: enc.ciphertext,
          nonce: enc.nonce,
          plaintextContent: newText,
        };
        setDecryptedTextMap((prev) => ({ ...prev, [editingMessage.id]: newText }));
        lastDecryptedCipherRef.current[editingMessage.id] = enc.ciphertext;
        AsyncStorage.setItem(`e2ee_cache_${editingMessage.id}`, newText).catch(() => {});
      }

      await editMessage(
        editingMessage.id,
        isEncrypted ? '🔒 Encrypted message' : newText,
        e2eePayload
      );
      setEditingMessage(null);
      setEditInputText('');
    } catch (err) {
      console.warn('Pod edit error:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Message Handlers
  const handleDeleteAction = (msgToDel?: WorkspaceMessage) => {
    const msg = msgToDel || selectedMessage;
    if (!msg) return;
    setShowMessageActionMenu(false);
    setDeleteTargetMessage(msg);
  };

  // Bookmark Message / Save to Vault
  const handleBookmarkMessage = async () => {
    if (!selectedMessage) return;
    const msgToSave = selectedMessage;
    setShowMessageActionMenu(false);
    setSelectedMessage(null);

    const contentText = decryptedTextMap[msgToSave.id] || msgToSave.content || '';
    const titleSnippet = contentText.trim()
      ? (contentText.trim().length > 60 ? contentText.trim().slice(0, 57) + '...' : contentText.trim())
      : (msgToSave.doi_metadata?.title || 'Saved Message');

    const res = await saveItem({
      workspaceId: workspace.id,
      itemType: msgToSave.doi_metadata ? 'doi_paper' : 'message',
      itemId: msgToSave.id,
      title: titleSnippet,
      note: contentText,
      metadata: {
        message_id: msgToSave.id,
        sender_id: msgToSave.sender_id,
        sender_name: msgToSave.sender?.fullName || msgToSave.sender?.handle || 'Researcher',
        sender_handle: msgToSave.sender?.handle || 'researcher',
        sender_avatar: msgToSave.sender?.avatarUrl || null,
        message_type: msgToSave.message_type,
        created_at: msgToSave.created_at,
        attachments: msgToSave.attachments || [],
        doi_metadata: msgToSave.doi_metadata || null,
      },
    });

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    setVaultToast({ message: res.success ? 'Message saved to Vault' : 'Could not save message' });
    setTimeout(() => setVaultToast(null), 3000);
  };

  const handleOpenSavedMessageInDiscussion = (item: WorkspaceSavedItem) => {
    const targetMsgId = item.metadata?.message_id || item.item_id || item.id;
    // 1. Switch active tab to 'discussions'
    setActiveTab('discussions');

    // 2. Clear chat search if active so all messages are visible
    if (chatSearchQuery) {
      setChatSearchQuery('');
    }

    // 3. Highlight target message
    setHighlightedMessageId(targetMsgId);

    // 4. Smoothly scroll to target message in FlatList
    setTimeout(() => {
      const idx = displayedMessages.findIndex(
        (m) => m.id === targetMsgId || (m.content && item.note && m.content === item.note)
      );
      if (idx >= 0 && flatListRef.current) {
        try {
          flatListRef.current.scrollToIndex({
            index: idx,
            animated: true,
            viewPosition: 0.5,
          });
        } catch {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      } else {
        flatListRef.current?.scrollToEnd({ animated: true });
      }

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }, 200);

    // 5. Remove highlight after 3.5s
    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 3500);
  };

  // Forward Handlers
  const handleStartForward = () => {
    if (!selectedMessage) return;
    setForwardingMessage(selectedMessage);
    setShowMessageActionMenu(false);
  };

  const handleSendForward = async (targetId: string) => {
    if (!forwardingMessage) return;
    setForwardingTargetId(targetId);
    const msgToForward = {
      ...forwardingMessage,
      content: decryptedTextMap[forwardingMessage.id] || forwardingMessage.content,
    };
    await forwardMessage(targetId, msgToForward);
    setForwardingTargetId(null);
    setForwardingMessage(null);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const handleResolveDoi = async () => {
    const raw = doiQuery.trim();
    if (!raw) return;
    setIsResolvingDoi(true);
    try {
      const p = await resolvePaper(raw);
      if (p) {
        setResolvedDoi({
          doi: p.doi || raw,
          title: p.title,
          authors: (p.authors || []).map((a) => ({ name: a.name, orcid: a.orcid })),
          publicationYear: p.publicationYear,
          journal: p.journal,
          url: p.openAccessUrl || p.canonicalUrl,
          citationCount: p.citationCount,
        });
      }
    } catch {}
    setIsResolvingDoi(false);
  };

  const handleCreateEvent = async () => {
    if (!eventTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for the event.');
      return;
    }
    setIsSubmittingEvent(true);
    try {
      const cleanTime = eventTime && eventTime.includes(':') ? eventTime : '14:00';
      const resolvedDate = eventDate || selectedCalendarDate || new Date().toISOString().split('T')[0];
      const startTime = `${resolvedDate}T${cleanTime}:00`;

      let finalDesc = eventDesc.trim();
      const taggedMembers = members.filter((m) => selectedAttendeeIds.includes(m.user_id));
      if (taggedMembers.length > 0) {
        const attendeeNames = taggedMembers
          .map((m) => `@${m.profile?.fullName || m.profile?.handle || 'Member'}`)
          .join(', ');
        finalDesc = finalDesc
          ? `${finalDesc}\n\n👥 Attendees: ${attendeeNames}`
          : `👥 Attendees: ${attendeeNames}`;
      }

      const res = await createEvent({
        workspaceId: workspace.id,
        title: eventTitle.trim(),
        description: finalDesc || undefined,
        eventType,
        startTime,
        attendeeIds: selectedAttendeeIds,
      });

      if (res.success) {
        setShowEventModal(false);
        setEventTitle('');
        setEventDesc('');
        setSelectedAttendeeIds([]);
        loadEvents(workspace.id);
        loadTasks(workspace.id);
        setVaultToast({ message: 'Event scheduled successfully' });
        setTimeout(() => setVaultToast(null), 3000);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      } else {
        Alert.alert('Error', res.error || 'Failed to schedule event');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to schedule event');
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;
    if (!eventTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for the event.');
      return;
    }
    setIsSubmittingEvent(true);
    try {
      const cleanTime = eventTime && eventTime.includes(':') ? eventTime : '14:00';
      const resolvedDate = eventDate || selectedCalendarDate || new Date().toISOString().split('T')[0];
      const startTime = `${resolvedDate}T${cleanTime}:00`;

      let finalDesc = eventDesc.trim();
      const taggedMembers = members.filter((m) => selectedAttendeeIds.includes(m.user_id));
      if (taggedMembers.length > 0) {
        const attendeeNames = taggedMembers
          .map((m) => `@${m.profile?.fullName || m.profile?.handle || 'Member'}`)
          .join(', ');
        finalDesc = finalDesc
          ? `${finalDesc}\n\n👥 Attendees: ${attendeeNames}`
          : `👥 Attendees: ${attendeeNames}`;
      }

      const res = await updateEvent(editingEvent.id, workspace.id, {
        title: eventTitle.trim(),
        description: finalDesc || null,
        eventType,
        startTime,
        attendeeIds: selectedAttendeeIds,
      });

      if (res.success) {
        setShowEventModal(false);
        setEditingEvent(null);
        setEventTitle('');
        setEventDesc('');
        setSelectedAttendeeIds([]);
        loadTasks(workspace.id);
        setVaultToast({ message: 'Event updated successfully' });
        setTimeout(() => setVaultToast(null), 3000);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      } else {
        Alert.alert('Error', res.error || 'Failed to update event');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update event');
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  const handleDeleteEvent = (eventId: string, title: string) => {
    setEventToDelete({ id: eventId, title });
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    setIsDeletingEvent(true);
    try {
      const res = await deleteEvent(eventToDelete.id, workspace.id);
      if (res.success) {
        setEventToDelete(null);
        setVaultToast({ message: 'Event deleted successfully' });
        setTimeout(() => setVaultToast(null), 3000);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      } else {
        Alert.alert('Delete Failed', res.error || 'Failed to delete event');
      }
    } catch (err: any) {
      Alert.alert('Delete Failed', err.message || 'Failed to delete event');
    } finally {
      setIsDeletingEvent(false);
    }
  };

  const handleSearchUsers = async (text: string) => {
    setSearchUserQuery(text);
    const clean = text.trim().replace(/^@/, '');
    if (!clean || clean.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const results = await searchBooffInUsers(clean, 6);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleInvite = async (targetId: string) => {
    setInviteStatus('Adding researcher...');
    const res = await inviteToInnerCircle(workspace.id, targetId, 'member');
    if (res.success) {
      setInviteStatus('Researcher added to pod!');
      setTimeout(() => {
        setShowInviteModal(false);
        setSearchUserQuery('');
        setSearchResults([]);
        setInviteStatus(null);
      }, 1000);
    } else {
      setInviteStatus(res.error || 'Failed to add researcher');
    }
  };

  // Helper to render formatted message content with highlight for @mentions
  const renderMessageContent = (content: string, isMe: boolean) => {
    if (!content) return null;
    const parts = content.split(/(@[a-zA-Z0-9_]+)/g);
    return (
      <Text
        style={[
          styles.messageText,
          isMe
            ? [styles.myMessageText, { color: activeThemeConfig.myBubbleTextColor }]
            : [styles.otherMessageText, { color: activeThemeConfig.id === 'default' && isDark ? '#FFFFFF' : activeThemeConfig.otherBubbleTextColor }],
        ]}
      >
        {parts.map((part, i) => {
          if (part.startsWith('@')) {
            const isSpecial = part === '@everyone' || part === '@admins';
            return (
              <Text
                key={i}
                style={[
                  styles.mentionHighlight,
                  isMe ? styles.mentionHighlightMe : styles.mentionHighlightOther,
                  isSpecial && styles.mentionHighlightSpecial,
                ]}
              >
                {part}
              </Text>
            );
          }
          return <Text key={i}>{part}</Text>;
        })}
      </Text>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* 1. Header Bar matching BooffIn academic aesthetic */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={20} color={isDark ? "#34D399" : "#164E3F"} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowInfoModal(true)}
          style={styles.headerCenter}
        >
          <Avatar
            uri={workspace.avatar_url || undefined}
            name={workspace.name || "BooffIn's inner circle"}
            size="sm"
          />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {workspace.name || "BooffIn's inner circle"}
              </Text>
              <Shield size={13} color={isDark ? "#34D399" : "#164E3F"} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {onlineCount > 0 && <View style={styles.onlineDot} />}
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
                {onlineCount > 0 ? ` • ${onlineCount} online` : ''}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowSearchBar((v) => !v)}
            style={[styles.headerIconBtn, showSearchBar && styles.headerIconBtnActive]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Search size={19} color={showSearchBar ? (isDark ? "#34D399" : "#164E3F") : colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowGalleryModal(true)}
            style={styles.headerIconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <FolderOpen size={19} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowOptionsMenu(true)}
            style={styles.headerIconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MoreVertical size={20} color={isDark ? "#34D399" : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Step 4: Disappearing / Ephemeral Messages Header Pill */}
      {workspace.settings?.ephemeral_timer && workspace.settings.ephemeral_timer !== 'off' && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowInfoModal(true)}
          style={styles.ephemeralBannerStrip}
        >
          <Clock size={12} color="#164E3F" />
          <Text style={styles.ephemeralBannerText}>
            Disappearing messages: {workspace.settings.ephemeral_timer === '24h' ? '24 Hours' : workspace.settings.ephemeral_timer === '7d' ? '7 Days' : '30 Days'}
          </Text>
          <Text style={styles.ephemeralBannerSub}>• Tap to adjust</Text>
        </TouchableOpacity>
      )}

      {/* In-Chat Search & Filter Strip */}
      {showSearchBar && (
        <View style={styles.chatSearchContainer}>
          <View style={styles.chatSearchInputRow}>
            <Search size={15} color="#64748B" />
            <TextInput
              value={chatSearchQuery}
              onChangeText={setChatSearchQuery}
              placeholder="Search conversation..."
              placeholderTextColor="#94A3B8"
              style={styles.chatSearchInput}
              autoFocus
            />
            {chatSearchQuery.trim() ? (
              <TouchableOpacity onPress={() => setChatSearchQuery('')}>
                <X size={15} color="#64748B" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Pills Strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsRow}
          >
            {(['all', 'media', 'papers', 'audio', 'polls', 'docs'] as const).map((filter) => {
              const isActive = activeChatFilter === filter;
              const label =
                filter === 'all'
                  ? 'All'
                  : filter === 'media'
                  ? '📷 Photos'
                  : filter === 'papers'
                  ? '📄 Papers'
                  : filter === 'audio'
                  ? '🎙️ Voice'
                  : filter === 'polls'
                  ? '📊 Polls'
                  : '📑 Docs';

              return (
                <TouchableOpacity
                  key={filter}
                  activeOpacity={0.7}
                  onPress={() => setActiveChatFilter(filter)}
                  style={[styles.chatFilterPill, isActive && styles.chatFilterPillActive]}
                >
                  <Text style={[styles.chatFilterPillText, isActive && styles.chatFilterPillTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {(chatSearchQuery.trim() || activeChatFilter !== 'all') && (
            <Text style={styles.searchMatchCountText}>
              {displayedMessages.length} message{displayedMessages.length === 1 ? '' : 's'} found
            </Text>
          )}
        </View>
      )}

      {/* 2. Sub-Filter Pill Strip */}
      <View style={[styles.subFilterStripContainer, { backgroundColor: colors.cardBackground, borderBottomColor: colors.borderLight }]}>
        {vaultToast && (
          <View style={styles.vaultToastBanner}>
            <CheckCircle2 size={16} color="#10B981" />
            <Text style={styles.vaultToastText}>{vaultToast.message}</Text>
          </View>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subFilterStrip}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('discussions')}
            style={[styles.filterPill, { backgroundColor: isDark ? colors.backgroundSecondary : '#F1F5F9' }, activeTab === 'discussions' && [styles.filterPillActive, { backgroundColor: isDark ? '#059669' : '#164E3F' }]]}
          >
            <Text style={[styles.filterPillText, { color: isDark ? colors.textSecondary : '#475569' }, activeTab === 'discussions' && styles.filterPillTextActive]}>
              Discussions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('calendar')}
            style={[styles.filterPill, { backgroundColor: isDark ? colors.backgroundSecondary : '#F1F5F9' }, activeTab === 'calendar' && [styles.filterPillActive, { backgroundColor: isDark ? '#059669' : '#164E3F' }]]}
          >
            <Text style={[styles.filterPillText, { color: isDark ? colors.textSecondary : '#475569' }, activeTab === 'calendar' && styles.filterPillTextActive]}>
              Calendar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setActiveTab('manager');
              loadTasks(workspace.id);
            }}
            style={[styles.filterPill, { backgroundColor: isDark ? colors.backgroundSecondary : '#F1F5F9' }, activeTab === 'manager' && [styles.filterPillActive, { backgroundColor: isDark ? '#059669' : '#164E3F' }]]}
          >
            <Text style={[styles.filterPillText, { color: isDark ? colors.textSecondary : '#475569' }, activeTab === 'manager' && styles.filterPillTextActive]}>
              BooffIn manager
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('vault')}
            style={[styles.filterPill, { backgroundColor: isDark ? colors.backgroundSecondary : '#F1F5F9' }, (activeTab === 'vault' || activeTab === 'bookmarked') && [styles.filterPillActive, { backgroundColor: isDark ? '#059669' : '#164E3F' }]]}
          >
            <Text style={[styles.filterPillText, { color: isDark ? colors.textSecondary : '#475569' }, (activeTab === 'vault' || activeTab === 'bookmarked') && styles.filterPillTextActive]}>
              Vault
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 3. Main Discussions Feed */}
      {activeTab === 'discussions' && (
        <View style={styles.chatAreaWrapper}>
          {/* Fixed Non-Interactive Theme Background Layer */}
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: activeThemeConfig.id === "default" && isDark ? colors.background : activeThemeConfig.backgroundColor,
                overflow: 'hidden',
                width: '100%',
                height: '100%',
              },
            ]}
          >
            {Boolean(activeThemeConfig.backgroundImage) && (
              <Image
                source={activeThemeConfig.backgroundImage}
                resizeMode="cover"
                style={[
                  StyleSheet.absoluteFill,
                  {
                    width: '100%',
                    height: '100%',
                    opacity: 0.96,
                  },
                ]}
              />
            )}
            {Boolean(activeThemeConfig.backgroundImage && activeThemeConfig.overlayOpacity) && (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: activeThemeConfig.accentColor,
                    opacity: activeThemeConfig.overlayOpacity,
                  },
                ]}
              />
            )}
          </View>
          {/* Pinned Announcement / Message Banner */}
          {pinnedMessage && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                const idx = displayedMessages.findIndex((m) => m.id === pinnedMessage.id);
                if (idx >= 0 && flatListRef.current) {
                  flatListRef.current.scrollToIndex({ index: idx, animated: true });
                }
              }}
              style={styles.pinnedBannerContainer}
            >
              <View style={styles.pinnedIconBadge}>
                <Pin size={13} color="#164E3F" fill="#164E3F" />
              </View>
              <View style={styles.pinnedContentWrap}>
                <View style={styles.pinnedHeaderRow}>
                  <Text style={styles.pinnedBadgeLabel}>Pinned Announcement</Text>
                  <Text style={styles.pinnedAuthorLabel}>
                    • {pinnedMessage.sender?.fullName || 'Researcher'}
                  </Text>
                </View>
                <Text style={styles.pinnedSnippetText} numberOfLines={1}>
                  {pinnedMessage.content || (pinnedMessage.doi_metadata ? `📄 ${pinnedMessage.doi_metadata.title}` : '📷 Photo Attachment')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setLocalPinnedMessageId(null)}
                style={styles.pinnedCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={14} color="#64748B" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}

          <FlatList
            ref={flatListRef}
            data={displayedMessages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                  index: info.index,
                  animated: true,
                  viewPosition: 0.5,
                });
              }, 250);
            }}
            onScroll={(e) => {
              const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
              const paddingToBottom = 120;
              const isClose = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
              isAtBottomRef.current = isClose;
              setIsScrolledUp(!isClose);

              if (isClose) {
                setLocalUnreadBelow(0);
                resetUnreadBelow(workspace.id);
              }

              // WhatsApp-style pagination: Load older messages when user scrolls near top
              if (contentOffset.y < 80 && !isLoadingOlderMessages && hasMoreOlderMessages) {
                loadOlderMessages(workspace.id);
              }
            }}
            onContentSizeChange={() => {
              if (!hasInitialScrolledRef.current || isAtBottomRef.current) {
                flatListRef.current?.scrollToEnd({ animated: false });
                hasInitialScrolledRef.current = true;
              }
            }}
            onLayout={() => {
              if (!hasInitialScrolledRef.current || isAtBottomRef.current) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            ListHeaderComponent={
              isLoadingOlderMessages ? (
                <View style={styles.loadingOlderContainer}>
                  <ActivityIndicator size="small" color="#164E3F" />
                  <Text style={styles.loadingOlderText}>Loading older messages...</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyMessagesContainer}>
                <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#ECFDF5" }]}>
                  <MessageSquare size={32} color={isDark ? "#34D399" : "#164E3F"} />
                </View>
                <Text style={[styles.emptyMessagesTitle, { color: colors.textPrimary }]}>
                  {chatSearchQuery.trim()
                    ? 'No matching discussions'
                    : !isMember
                    ? 'Reviewing Inner Circle'
                    : !isOwner && (!myMembership?.joined_at || displayedMessages.length === 0)
                    ? 'Fresh Pod Workspace'
                    : 'Welcome to the Research Pod'}
                </Text>
                <Text style={[styles.emptyMessagesSub, { color: colors.textSecondary }]}>
                  {chatSearchQuery.trim()
                    ? `No messages matched "${chatSearchQuery}". Try clearing filters.`
                    : !isMember
                    ? 'Previous pod chats are kept private. Click Join below to join freshly and collaborate.'
                    : !isOwner && (!myMembership?.joined_at || displayedMessages.length === 0)
                    ? 'You joined freshly without previous chats. Start the conversation below!'
                    : 'Share preprints, discuss methodology, assign tasks, and tag collaborators.'}
                </Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const isMe = item.sender_id === currentUser?.id;
              const isPinnedThis = item.is_pinned || item.id === localPinnedMessageId;
              const isDeleted = Boolean(item.is_deleted || item.content === '🚫 This message was deleted');
              const isFirstOfDateGroup =
                index === 0 ||
                getDateLabel(item.created_at) !== getDateLabel(displayedMessages[index - 1]?.created_at);

              const msgImageUrl = extractImageUrl(item);
              const resolvedDocMeta = item.document_metadata || (item.attachments as any)?.document_metadata || (
                (item.message_type === 'document' || item.content?.startsWith('📄 Manuscript:')) ? {
                  name: item.content?.replace(/^📄\s*(?:Manuscript:\s*)?/, '').trim() || 'Novel_Neural_Mechanisms_Preprint.pdf',
                  sizeBytes: 1024 * 1024 * 2.4,
                  fileUrl: 'https://arxiv.org/pdf/2103.00020.pdf',
                  mimeType: 'application/pdf',
                  pageCount: 18,
                } : null
              );

              const resolvedInviteMeta = item.workspace_invite_metadata || (item.attachments as any)?.workspace_invite_metadata || (
                (item.message_type === 'workspace_invite' || item.content?.startsWith('🤝 Pod Invite:')) ? {
                  workspaceId: workspace.id,
                  name: item.content?.replace(/^🤝\s*(?:Pod Invite:\s*)?/, '').trim() || workspace.name || 'Inner Circle Pod',
                  description: workspace.description || 'Collaborative private research pod on BoffIn',
                  role: 'member' as const,
                  memberCount: 8,
                  privacy: 'private' as const,
                } : null
              );

              const resolvedPostMeta = item.post_metadata || (item.attachments as any)?.post_metadata || null;
              const resolvedProfileMeta = item.profile_metadata || (item.attachments as any)?.profile_metadata || null;
              const resolvedCallMeta = item.call_metadata || (item.attachments as any)?.call_metadata || null;
              const resolvedAudioMeta = item.audio_metadata || (item.attachments as any)?.audio_metadata || null;
              const resolvedDoiMeta = item.doi_metadata || (item.attachments as any)?.doi_metadata || null;
              const resolvedPollData = item.poll_data || (item.attachments as any)?.poll_data || null;

              const isDocument = !isDeleted && Boolean(resolvedDocMeta);
              const isWorkspaceInvite = !isDeleted && Boolean(resolvedInviteMeta);
              const isPost = !isDeleted && Boolean(resolvedPostMeta);
              const isProfile = !isDeleted && Boolean(resolvedProfileMeta);
              const isCallLog = !isDeleted && (Boolean(resolvedCallMeta) || item.message_type === 'call_log');
              const isAudio =
                !isDeleted &&
                (item.message_type === 'audio' ||
                  item.message_type === 'voice_note' ||
                  Boolean(resolvedAudioMeta) ||
                  item.content?.startsWith('🎙️'));
              const isImage = !isDeleted && !isAudio && (item.message_type === 'image' || Boolean(msgImageUrl) || item.content === '📷 Shared photo');
              const isPoll = !isDeleted && (item.message_type === 'poll' || item.content.startsWith('📊 Poll:') || Boolean(resolvedPollData));

              // Parse poll options if poll message
              let pollQuestionText = '';
              let pollOptionItems: Array<{ id: string; text: string }> = [];
              if (isPoll) {
                if (resolvedPollData && Array.isArray(resolvedPollData.options) && resolvedPollData.options.length > 0) {
                  pollQuestionText = resolvedPollData.question || '';
                  pollOptionItems = resolvedPollData.options.map((opt: any, idx: number) => ({
                    id: opt.id || `opt_${idx}`,
                    text: opt.text,
                  }));
                } else {
                  const lines = item.content.split('\n').filter(Boolean);
                  pollQuestionText = lines[0].replace('📊 Poll:', '').trim();
                  pollOptionItems = lines.slice(1).map((line: string, idx: number) => ({
                    id: `opt_${idx}`,
                    text: line.replace(/^[•\-\d\.]+\s*/, '').trim(),
                  }));
                }
                if (pollOptionItems.length === 0) {
                  pollOptionItems = [
                    { id: 'opt_0', text: 'Agree / Support' },
                    { id: 'opt_1', text: 'Needs Revision' },
                  ];
                }
              }

              const mySelectedVote = localPollVotes[item.id];

              // Reactions summary (excluding poll vote tags)
              const reactionsMap: Record<string, string[]> = (item.reactions as Record<string, string[]>) || {};
              const reactionEntries = Object.entries(reactionsMap).filter(
                ([k, uids]) => !k.startsWith('vote:') && !k.startsWith('poll:') && Array.isArray(uids) && uids.length > 0
              );

              // Quoted reply lookup
              const replyParent =
                item.reply_to_message ||
                item.attachments?.reply_to_message ||
                ((item.reply_to_id || item.attachments?.reply_to_id)
                  ? messages.find((m) => m.id === (item.reply_to_id || item.attachments?.reply_to_id))
                  : null);

                  const hasMediaContent = !isDeleted && (isAudio || isDocument || Boolean(resolvedDoiMeta) || isPost || isProfile || isWorkspaceInvite || isPoll);

                  return (
                    <View key={item.id} style={[{ width: '100%' }, highlightedMessageId === item.id && styles.highlightedMessageRow]}>
                      {isFirstOfDateGroup && (
                        <View style={styles.dateSeparatorRow}>
                          <View style={[styles.dateSeparatorLine, { backgroundColor: colors.borderLight }]} />
                          <View style={[styles.dateSeparatorPill, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
                            <Text style={[styles.dateSeparatorText, { color: colors.textSecondary }]}>{getDateLabel(item.created_at)}</Text>
                          </View>
                          <View style={[styles.dateSeparatorLine, { backgroundColor: colors.borderLight }]} />
                        </View>
                      )}
                      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
                      {!isMe && (
                        <Avatar
                          uri={item.sender?.avatarUrl || undefined}
                          name={item.sender?.fullName || 'Researcher'}
                          size="sm"
                          style={{ marginRight: 8, alignSelf: 'flex-end', marginBottom: 4 }}
                        />
                      )}

                      <View style={[styles.bubbleWrapper, hasMediaContent && styles.bubbleWithMedia]}>
                        <TouchableOpacity
                          activeOpacity={0.92}
                          onLongPress={(e) => {
                            const { pageX, pageY } = e.nativeEvent;
                            handleOpenMessageMenu(item, { x: pageX, y: pageY });
                          }}
                          onPress={(e) => {
                            if (Platform.OS === 'web') {
                              const { pageX, pageY } = e.nativeEvent;
                              handleOpenMessageMenu(item, { x: pageX, y: pageY });
                            }
                          }}
                          delayLongPress={280}
                          style={[
                            styles.messageBubble,
                            isMe
                              ? [styles.myBubble, { backgroundColor: activeThemeConfig.myBubbleColor }]
                              : [styles.otherBubble, { backgroundColor: activeThemeConfig.id === 'default' && isDark ? '#1F2636' : activeThemeConfig.otherBubbleColor, borderWidth: activeThemeConfig.id !== 'default' || isDark ? 1 : 0, borderColor: isDark ? colors.borderLight : 'rgba(0,0,0,0.06)' }],
                            hasMediaContent && styles.bubbleWithMedia,
                            highlightedMessageId === item.id && styles.highlightedMessageBubble,
                          ]}
                        >
                    {/* Forwarded Indicator */}
                    {Boolean(item.is_forwarded || (item.attachments as any)?.is_forwarded) && !isDeleted && (
                      <View style={styles.forwardedBadgeRow}>
                        <CornerUpRight size={11} color={isMe ? 'rgba(255, 255, 255, 0.8)' : '#64748B'} style={{ marginRight: 4 }} />
                        <Text style={[styles.forwardedBadgeText, isMe ? styles.forwardedBadgeTextMy : styles.forwardedBadgeTextOther]}>
                          Forwarded
                        </Text>
                      </View>
                    )}

                    {/* Pinned Tag */}
                    {isPinnedThis && (
                      <View style={styles.bubblePinTag}>
                        <Pin size={10} color={isMe ? '#A7F3D0' : '#164E3F'} fill={isMe ? '#A7F3D0' : '#164E3F'} />
                        <Text style={[styles.bubblePinTagText, isMe && { color: '#A7F3D0' }]}>Pinned</Text>
                      </View>
                    )}

                    {!isMe && (
                      <Text style={[styles.senderName, { color: isDark ? '#34D399' : '#164E3F' }]}>{item.sender?.fullName || 'Researcher'}</Text>
                    )}

                    {/* Quoted Reply Box */}
                    {replyParent && (
                      <View style={[styles.quotedReplyBox, isMe ? styles.quotedReplyBoxMe : styles.quotedReplyBoxOther]}>
                        <View style={[styles.quotedReplyAccent, isMe ? styles.quotedAccentMe : styles.quotedAccentOther]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.quotedReplySender, isMe ? styles.quotedSenderMe : styles.quotedSenderOther]} numberOfLines={1}>
                            {(replyParent as any).sender_name || replyParent.sender?.fullName || replyParent.sender?.handle || (replyParent.sender_id === currentUser?.id ? 'You' : 'Researcher')}
                          </Text>
                          <Text style={[styles.quotedReplySnippet, isMe ? styles.quotedSnippetMe : styles.quotedSnippetOther]} numberOfLines={2}>
                            {replyParent.content || (replyParent.doi_metadata ? '📄 Shared research paper' : (replyParent.message_type === 'audio' || replyParent.message_type === 'voice_note' || replyParent.audio_metadata ? '🎙️ Voice note' : (replyParent.message_type === 'image' ? '📷 Photo' : 'Shared attachment')))}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* DOI Paper Card */}
                    {resolvedDoiMeta && <WorkspaceDoiCard doiMeta={resolvedDoiMeta} />}

                    {/* Voice Note / Audio Player */}
                    {isAudio && (
                      <VoiceNotePlayer
                        audioUrl={
                          item.media_urls?.[0] ||
                          resolvedAudioMeta?.url ||
                          (item.attachments as any)?.audio_url ||
                          (item.attachments as any)?.url ||
                          resolvedAudioMeta?.uri
                        }
                        duration={resolvedAudioMeta?.duration || 18}
                        waveform={resolvedAudioMeta?.waveform}
                        isMe={isMe}
                      />
                    )}

                    {/* Shared Document / PDF Manuscript Card */}
                    {isDocument && resolvedDocMeta && (
                      <ChatDocumentCard docMeta={resolvedDocMeta} isMe={isMe} />
                    )}

                    {/* Shared BooffIn Post Card */}
                    {isPost && resolvedPostMeta && (
                      <ChatPostCard postMeta={resolvedPostMeta} isMe={isMe} />
                    )}

                    {/* Shared Researcher Profile Card */}
                    {isProfile && resolvedProfileMeta && (
                      <ChatProfileCard profileMeta={resolvedProfileMeta} isMe={isMe} />
                    )}

                    {/* Shared Workspace / Pod Invite Card */}
                    {isWorkspaceInvite && resolvedInviteMeta && (
                      <ChatWorkspaceInviteCard inviteMeta={resolvedInviteMeta} isMe={isMe} />
                    )}

                    {/* Image Attachment */}
                    {isImage && !isDeleted && (
                      <TouchableOpacity
                        activeOpacity={0.88}
                        onPress={() => {
                          if (msgImageUrl) {
                            setViewerImages([msgImageUrl]);
                            setViewerVisible(true);
                          }
                        }}
                        style={styles.imageMsgContainer}
                      >
                        {msgImageUrl ? (
                          <>
                            <ExpoImage
                              source={{ uri: msgImageUrl }}
                              style={styles.imageMsg}
                              contentFit="cover"
                              transition={200}
                            />
                            <View style={styles.imageOverlayBadge}>
                              <Maximize2 size={12} color="#FFFFFF" />
                              <Text style={styles.imageOverlayText}>View photo</Text>
                            </View>
                          </>
                        ) : (
                          <View style={styles.imagePlaceholderBox}>
                            <ImageIcon size={30} color="#94A3B8" />
                            <Text style={styles.imagePlaceholderText}>Photo attachment</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Interactive Poll / Consensus Voting */}
                    {isPoll && (() => {
                      const optionVotersMap: Record<string, Set<string>> = {};
                      pollOptionItems.forEach((opt) => {
                        optionVotersMap[opt.id] = new Set<string>();
                      });

                      // 1. Reactions (keys starting with vote:)
                      const reactionsMapRaw = (item.reactions as Record<string, string[]>) || (item.attachments as any)?.reactions || {};
                      if (reactionsMapRaw && typeof reactionsMapRaw === 'object') {
                        Object.entries(reactionsMapRaw).forEach(([key, userIds]) => {
                          if (key.startsWith('vote:') && Array.isArray(userIds)) {
                            const rawOptId = key.replace('vote:', '');
                            const targetOpt = pollOptionItems.find((o, idx) => o.id === rawOptId || `opt_${idx}` === rawOptId || `opt_${o.id}` === rawOptId || o.id === `opt_${rawOptId}`);
                            const optKey = targetOpt ? targetOpt.id : rawOptId;
                            if (!optionVotersMap[optKey]) optionVotersMap[optKey] = new Set();
                            userIds.forEach((uid) => optionVotersMap[optKey].add(uid));
                          }
                        });
                      }

                      // 2. Poll data if attached
                      if (resolvedPollData && Array.isArray(resolvedPollData.options)) {
                        resolvedPollData.options.forEach((opt: any, idx: number) => {
                          const targetOpt = pollOptionItems.find((o, oIdx) => o.id === opt.id || o.id === `opt_${idx}` || opt.id === `opt_${oIdx}`);
                          const optKey = targetOpt ? targetOpt.id : opt.id;
                          if (!optionVotersMap[optKey]) optionVotersMap[optKey] = new Set();
                          if (Array.isArray(opt.votes)) {
                            opt.votes.forEach((uid: string) => optionVotersMap[optKey].add(uid));
                          }
                        });
                      }

                      // 3. Optimistic local vote reconciliation
                      if (currentUser?.id) {
                        const localVote = localPollVotes[item.id];
                        if (localVote) {
                          Object.keys(optionVotersMap).forEach((optId) => {
                            if (optId === localVote) {
                              optionVotersMap[optId].add(currentUser.id);
                            } else {
                              optionVotersMap[optId].delete(currentUser.id);
                            }
                          });
                        } else if (localVote === '') {
                          Object.keys(optionVotersMap).forEach((optId) => {
                            optionVotersMap[optId].delete(currentUser.id);
                          });
                        }
                      }

                      let totalVotes = 0;
                      Object.values(optionVotersMap).forEach((vSet) => {
                        totalVotes += vSet.size;
                      });

                      const userHasVoted = currentUser?.id
                        ? Object.values(optionVotersMap).some((vSet) => vSet.has(currentUser.id))
                        : false;

                      return (
                        <View style={styles.pollMsgContainer}>
                          <View style={styles.pollHeader}>
                            <BarChart2 size={16} color="#164E3F" />
                            <Text style={styles.pollBadgeText}>RESEARCH POLL</Text>
                          </View>
                          <Text style={styles.pollQuestionTitle}>{pollQuestionText || item.content}</Text>

                          <View style={styles.pollOptionsList}>
                            {pollOptionItems.map((opt) => {
                              const voteCount = optionVotersMap[opt.id]?.size || 0;
                              const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                              const isSelected = currentUser?.id ? Boolean(optionVotersMap[opt.id]?.has(currentUser.id)) : false;

                              return (
                                <TouchableOpacity
                                  key={opt.id}
                                  activeOpacity={0.7}
                                  onPress={() => handleVote(item.id, opt.id)}
                                  style={[styles.pollOptionBtn, isSelected && styles.pollOptionBtnSelected]}
                                >
                                  <View
                                    style={[
                                      styles.pollProgressFill,
                                      { width: `${percent}%` },
                                      isSelected && styles.pollProgressFillSelected,
                                    ]}
                                  />
                                  <View style={styles.pollOptionContent}>
                                    <View style={[styles.pollRadio, isSelected && styles.pollRadioSelected]}>
                                      {isSelected && <View style={styles.pollRadioInner} />}
                                    </View>
                                    <Text
                                      style={[styles.pollOptionText, isSelected && styles.pollOptionTextSelected]}
                                      numberOfLines={2}
                                    >
                                      {opt.text}
                                    </Text>
                                  </View>
                                  <View style={styles.pollOptionRight}>
                                    <Text style={[styles.pollOptionPercent, isSelected && styles.pollOptionPercentSelected]}>
                                      {percent}%
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </View>

                          <View style={styles.pollFooterRow}>
                            <Text style={styles.pollTotalVotesText}>
                              {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                            </Text>
                            {userHasVoted ? (
                              <Text style={styles.pollVotedBadgeText}>• Voted</Text>
                            ) : (
                              <Text style={styles.pollHintText}>• Tap an option to vote</Text>
                            )}
                          </View>
                        </View>
                      );
                    })()}

                    {/* Deleted or Regular Message Content */}
                    {isDeleted ? (
                      <View style={styles.deletedMsgWrap}>
                        <Text style={[styles.deletedMsgText, isMe && { color: '#D1FAE5' }]}>
                          🚫 This message was deleted
                        </Text>
                      </View>
                    ) : (() => {
                      const isEncrypted = Boolean(item.e2ee_ciphertext || item.attachments?.e2ee_ciphertext || item.content === '🔒 Encrypted message');
                      const displayContent = isEncrypted
                        ? (decryptedTextMap[item.id] || (item.content !== '🔒 Encrypted message' ? item.content : '🔒 Encrypted message'))
                        : item.content;

                      if (
                        displayContent &&
                        !isImage &&
                        !isAudio &&
                        !isDocument &&
                        !isPost &&
                        !isProfile &&
                        !isWorkspaceInvite &&
                        !isPoll &&
                        item.content !== '📷 Shared photo' &&
                        item.content !== msgImageUrl
                      ) {
                        return renderMessageContent(displayContent, isMe);
                      }
                      return null;
                    })()}

                    {/* Metadata: Edited, Time, Status */}
                    <View style={styles.messageFooterRow}>
                      {item.is_edited && !item.is_deleted && (
                        <Text style={[styles.editedIndicator, isMe ? styles.myEditedIndicator : styles.otherEditedIndicator]}>
                          (edited)
                        </Text>
                      )}
                      <Text
                        style={[
                          styles.timestamp,
                          isMe
                            ? [styles.myTimestamp, { color: activeThemeConfig.timestampMyColor }]
                            : [styles.otherTimestamp, { color: activeThemeConfig.id === 'default' && isDark ? '#94A3B8' : activeThemeConfig.timestampOtherColor }],
                        ]}
                      >
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {isMe && (
                        item.status === 'pending' || item.id.startsWith('temp_') ? (
                          <Clock size={11} color="rgba(255,255,255,0.7)" strokeWidth={2} style={{ marginLeft: 3 }} />
                        ) : item.status === 'error' ? (
                          <AlertTriangle size={12} color="#FCA5A5" strokeWidth={2.2} style={{ marginLeft: 3 }} />
                        ) : settings.readReceiptsEnabled ? (
                          <CheckCheck size={12} color="#A7F3D0" style={{ marginLeft: 3 }} />
                        ) : (
                          <Check size={12} color="#A7F3D0" style={{ marginLeft: 3 }} />
                        )
                      )}
                    </View>

                    {/* Emoji Reactions Badges */}
                    {reactionEntries.length > 0 && (
                      <View style={styles.reactionsRow}>
                        {reactionEntries.map(([emoji, uids]) => {
                          const hasReacted = currentUser?.id ? uids.includes(currentUser.id) : false;
                          return (
                            <TouchableOpacity
                              key={emoji}
                              activeOpacity={0.7}
                              onPress={() => handleToggleReaction(item.id, emoji)}
                              style={[
                                styles.reactionBadge,
                                hasReacted && (isMe ? styles.reactionBadgeMeActive : styles.reactionBadgeOtherActive),
                              ]}
                            >
                              <Text style={styles.reactionEmojiText}>{emoji}</Text>
                              <Text
                                style={[
                                  styles.reactionCountText,
                                  hasReacted && (isMe ? styles.reactionCountMeActive : styles.reactionCountOtherActive),
                                ]}
                              >
                                {uids.length}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
            }}
          />

          {/* Floating WhatsApp-style Scroll to Bottom Arrow & Unread Badge */}
          {isScrolledUp && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                flatListRef.current?.scrollToEnd({ animated: true });
                isAtBottomRef.current = true;
                setIsScrolledUp(false);
                setLocalUnreadBelow(0);
                resetUnreadBelow(workspace.id);
              }}
              style={[styles.scrollToBottomBtn, { bottom: 80 + bottomInset }]}
              accessibilityLabel="Scroll to bottom"
            >
              <ChevronDown size={22} color="#164E3F" strokeWidth={2.5} />
              {(localUnreadBelow > 0 || unreadBelowCount > 0) && (
                <View style={styles.unreadBelowBadge}>
                  <Text style={styles.unreadBelowBadgeText}>
                    {(localUnreadBelow || unreadBelowCount) > 99 ? '99+' : (localUnreadBelow || unreadBelowCount)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Mention Autocomplete Floating Popup */}
          {showMentionPopup && mentionSuggestions.length > 0 && (
            <View style={styles.mentionPopupContainer}>
              <View style={styles.mentionPopupHeader}>
                <AtSign size={13} color="#164E3F" />
                <Text style={styles.mentionPopupHeaderText}>Mention in Pod</Text>
              </View>
              <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="always">
                {mentionSuggestions.map((sug) => (
                  <TouchableOpacity
                    key={sug.id}
                    onPress={() => handleSelectMention(sug.handle)}
                    style={styles.mentionSuggestionRow}
                  >
                    {sug.isSpecial ? (
                      <View style={styles.mentionSpecialIconBadge}>
                        {sug.id === 'everyone' ? <Users size={14} color="#164E3F" /> : <Shield size={14} color="#164E3F" />}
                      </View>
                    ) : (
                      <Avatar uri={sug.avatarUrl || undefined} name={sug.name} size="xs" />
                    )}
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.mentionSuggestionName}>{sug.name}</Text>
                      <Text style={styles.mentionSuggestionHandle}>@{sug.handle}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Attached DOI Preview banner if preparing to send */}
          {attachedDoi && (
            <View style={styles.attachedDoiPreview}>
              <FileText size={14} color="#164E3F" />
              <View style={{ flex: 1 }}>
                <Text style={styles.attachedDoiTitle} numberOfLines={1}>
                  {attachedDoi.title}
                </Text>
                <Text style={styles.attachedDoiSub}>DOI: {attachedDoi.doi}</Text>
              </View>
              <TouchableOpacity onPress={() => setAttachedDoi(null)}>
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
          )}

          {/* Realtime Pod Members Typing Bubble Indicator */}
          {isSomeoneTyping && (
            <AnimatedTypingIndicator
              name={typingUserNames || 'Someone'}
              count={Object.keys(typingInThisRoom || {}).length}
            />
          )}

          {/* Docked Replying-To Bar */}
          {replyingTo && (
            <View style={styles.replyingToDock}>
              <View style={styles.replyingToAccent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.replyingToTitle} numberOfLines={1}>
                  Replying to {replyingTo.sender?.fullName || 'Researcher'}
                </Text>
                <Text style={styles.replyingToSnippet} numberOfLines={1}>
                  {replyingTo.content || (replyingTo.doi_metadata ? `📄 ${replyingTo.doi_metadata.title}` : 'Attachment')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setReplyingTo(null)}
                style={styles.replyingToCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom Capsule Input Dock / Voice Note Recorder / Announcement Mode Dock / Review Bar */}
          {!isMember ? (
            <View style={[styles.reviewBottomBar, { paddingBottom: bottomInset > 0 ? bottomInset + 12 : 12 }]}>
              <View style={styles.reviewTextContainer}>
                <Text style={styles.reviewTitle}>Previewing Inner Circle</Text>
                <Text style={styles.reviewSubtitle}>
                  Join this private research pod freshly to access discussions
                </Text>
              </View>
              <TouchableOpacity
                style={styles.reviewJoinButton}
                onPress={handleJoinInnerCircle}
                disabled={isJoining}
                activeOpacity={0.8}
              >
                {isJoining ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.reviewJoinButtonText}>Join Inner Circle</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : canPost ? (
            isRecordingVoice ? (
              <View style={{ paddingBottom: bottomInset > 0 ? bottomInset + 8 : 0, backgroundColor: '#FFFFFF' }}>
                <VoiceNoteRecorder
                  onSendVoiceNote={handleSendVoiceNote}
                  onCancel={() => setIsRecordingVoice(false)}
                />
              </View>
            ) : (
              <View style={[styles.bottomDockContainer, { backgroundColor: colors.cardBackground, borderTopColor: colors.borderLight, paddingBottom: bottomInset > 0 ? bottomInset + 8 : 8 }]}>
                <View
                  style={[
                    styles.inputCapsule,
                    { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight },
                    (isInputFocused || Boolean(inputText.trim())) && [
                      styles.inputCapsuleFocused,
                      { backgroundColor: isDark ? colors.backgroundSecondary : '#FFFFFF', borderColor: isDark ? '#10B981' : '#164E3F' },
                      activeThemeConfig?.accentColor ? { borderColor: activeThemeConfig.accentColor } : null,
                    ],
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handlePickImage}
                    style={styles.mediaIconBtn}
                    disabled={isUploadingMedia}
                  >
                    {isUploadingMedia ? (
                      <ActivityIndicator size="small" color="#164E3F" />
                    ) : (
                      <Camera size={19} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>

                  <TextInput
                    value={inputText}
                    onChangeText={handleInputChange}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    placeholder={replyingTo ? 'Write a reply...' : 'Message...'}
                    placeholderTextColor={colors.textMuted}
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    multiline
                    maxLength={2000}
                  />

                  <View ref={attachBtnRef} collapsable={false}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setShowAttachMenu(true)}
                      style={styles.mediaIconBtn}
                    >
                      <Paperclip size={19} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {!inputText.trim() && !attachedDoi ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setIsRecordingVoice(true)}
                    style={[styles.detachedMicBtn, { backgroundColor: isDark ? '#059669' : '#164E3F' }]}
                  >
                    <Mic size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleSendMessage}
                    style={[styles.detachedSendBtn, { backgroundColor: isDark ? '#059669' : '#164E3F' }]}
                  >
                    <Send size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>
            )
          ) : (
            <View style={[styles.announcementModeDockContainer, { paddingBottom: bottomInset > 0 ? bottomInset + 12 : 12 }]}>
              <View style={styles.announcementModeDock}>
                <Lock size={15} color="#047857" />
                <Text style={styles.announcementModeDockText}>
                  Only Pod Admins & Leads can send messages in Announcement Mode.
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* POPOVER: Message Context Menu & Emoji Reaction Bar (Hovering Card) */}
      <Popover
        visible={showMessageActionMenu}
        onClose={() => {
          setShowMessageActionMenu(false);
          setSelectedMessage(null);
        }}
        anchorCoords={messageActionAnchor}
        position="auto"
        align={selectedMessage?.sender_id === currentUser?.id ? 'end' : 'start'}
        estimatedWidth={240}
        estimatedHeight={280}
        style={styles.messagePopoverCard}
      >
        {/* Quick Floating Reaction Bar */}
        <View style={styles.popoverEmojiReactionsRow}>
          {['👍', '❤️', '🔬', '👏', '💡', '🔥', '🎉'].map((emoji) => (
            <TouchableOpacity
              key={emoji}
              activeOpacity={0.7}
              onPress={() => selectedMessage && handleToggleReaction(selectedMessage.id, emoji)}
              style={styles.popoverEmojiReactionBtn}
            >
              <Text style={styles.popoverEmojiReactionText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <PopoverDivider />

        {/* 1. Reply */}
        <PopoverItem
          icon={<Reply size={16} color="#164E3F" />}
          label="Reply"
          onPress={handleStartReply}
        />

        {/* 2. Copy Text */}
        {selectedMessage?.content && !selectedMessage.is_deleted && (
          <>
            <PopoverDivider />
            <PopoverItem
              icon={<Copy size={16} color="#0F172A" />}
              label="Copy Text"
              onPress={handleCopyMessage}
            />
          </>
        )}

        {/* 3. Pin / Unpin */}
        <PopoverDivider />
        <PopoverItem
          icon={<Pin size={16} color="#0F172A" />}
          label={
            selectedMessage && (selectedMessage.is_pinned || selectedMessage.id === localPinnedMessageId)
              ? 'Unpin from Pod'
              : 'Pin to Pod Banner'
          }
          onPress={handleTogglePinMessage}
        />

        {/* 4. Edit Message */}
        {selectedMessage?.sender_id === currentUser?.id && !selectedMessage?.is_deleted && (
          <>
            <PopoverDivider />
            <PopoverItem
              icon={<Pencil size={16} color="#0F172A" />}
              label="Edit Message"
              onPress={handleStartEdit}
            />
          </>
        )}

        {/* 5. Forward */}
        <PopoverDivider />
        <PopoverItem
          icon={<CornerUpRight size={16} color="#0F172A" />}
          label="Forward"
          onPress={handleStartForward}
        />

        {/* 6. Save to Vault */}
        <PopoverDivider />
        <PopoverItem
          icon={<VaultIcon size={16} color="#0F172A" />}
          label="Save to Vault"
          onPress={handleBookmarkMessage}
        />

        {/* 7. Delete Message */}
        <PopoverDivider />
        <PopoverItem
          icon={<Trash2 size={16} color="#DC2626" />}
          label={
            selectedMessage?.sender_id === currentUser?.id || workspace.owner_id === currentUser?.id
              ? 'Delete Message'
              : 'Delete for Me'
          }
          destructive
          onPress={() => handleDeleteAction(selectedMessage || undefined)}
        />
      </Popover>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Delete Message Confirmation (Delete for Me vs Everyone) */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={Boolean(deleteTargetMessage)}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTargetMessage(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDeleteTargetMessage(null)}
        >
          <View
            style={styles.deleteModalCard}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.deleteModalHeader}>
              <View style={styles.deleteModalIconWrap}>
                <Trash2 size={24} color="#DC2626" />
              </View>
              <Text style={styles.deleteModalTitle}>Delete Message</Text>
              <Text style={styles.deleteModalSubtitle}>
                Choose how you would like to delete this message:
              </Text>
            </View>

            <View style={styles.deleteModalOptions}>
              {/* Option 1: Delete for Me */}
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.deleteOptionBtn}
                onPress={() => {
                  if (deleteTargetMessage) {
                    deleteMessage(deleteTargetMessage.id, false);
                    setDeleteTargetMessage(null);
                  }
                }}
              >
                <View style={[styles.deleteOptionIconWrap, { backgroundColor: '#F1F5F9' }]}>
                  <EyeOff size={18} color="#475569" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deleteOptionTitle}>Delete for Me</Text>
                  <Text style={styles.deleteOptionDesc}>
                    Removes this message from your chat history only
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 2: Delete for Everyone (if sender or workspace owner) */}
              {(deleteTargetMessage?.sender_id === currentUser?.id ||
                workspace.owner_id === currentUser?.id) && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.deleteOptionBtn, styles.deleteForEveryoneBtn]}
                  onPress={() => {
                    if (deleteTargetMessage) {
                      deleteMessage(deleteTargetMessage.id, true);
                      setDeleteTargetMessage(null);
                    }
                  }}
                >
                  <View style={[styles.deleteOptionIconWrap, { backgroundColor: '#FEE2E2' }]}>
                    <Trash2 size={18} color="#DC2626" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.deleteOptionTitle, { color: '#DC2626' }]}>
                      Delete for Everyone
                    </Text>
                    <Text style={styles.deleteOptionDesc}>
                      Deletes this message for all participants in this chat
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.deleteModalCancelBtn}
              onPress={() => setDeleteTargetMessage(null)}
            >
              <Text style={styles.deleteModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal: Edit Message */}
      <Modal
        visible={Boolean(editingMessage)}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingMessage(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Message</Text>
              <TouchableOpacity onPress={() => setEditingMessage(null)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <TextInput
              value={editInputText}
              onChangeText={setEditInputText}
              placeholder="Edit your message..."
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { height: 90, textAlignVertical: 'top', paddingTop: 10 }]}
              multiline
              autoFocus
            />
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                onPress={() => setEditingMessage(null)}
                style={styles.cancelModalBtn}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={!editInputText.trim() || isSavingEdit}
                style={[styles.confirmAttachBtn, { marginTop: 0, flex: 1 }]}
              >
                {isSavingEdit ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmAttachBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Forward Message */}
      <Modal
        visible={Boolean(forwardingMessage)}
        transparent
        animationType="fade"
        onRequestClose={() => setForwardingMessage(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Forward to Workspace</Text>
              <TouchableOpacity onPress={() => setForwardingMessage(null)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <TextInput
              value={forwardSearch}
              onChangeText={setForwardSearch}
              placeholder="Search chat or workspace..."
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginBottom: 12 }]}
            />
            <ScrollView style={{ maxHeight: 220 }}>
              {[...innerCircles, ...communities, ...dms]
                .filter((ws) => ws.id !== workspace.id)
                .filter((ws) => (ws.name || '').toLowerCase().includes(forwardSearch.toLowerCase()))
                .map((ws) => (
                  <TouchableOpacity
                    key={ws.id}
                    onPress={() => handleSendForward(ws.id)}
                    disabled={forwardingTargetId === ws.id}
                    style={styles.forwardWsRow}
                  >
                    <Avatar uri={ws.avatar_url || undefined} name={ws.name || 'Chat'} size="sm" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.forwardWsName}>{ws.name || 'Chat'}</Text>
                      <Text style={styles.forwardWsType}>
                        {ws.type === 'inner_circle' ? 'Inner Circle Pod' : ws.type === 'community' ? 'Community' : 'Direct Message'}
                      </Text>
                    </View>
                    {forwardingTargetId === ws.id ? (
                      <ActivityIndicator size="small" color="#164E3F" />
                    ) : (
                      <Send size={15} color="#164E3F" />
                    )}
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* TAB 2: Collapsible Interactive Calendar */}
      {activeTab === 'calendar' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Top Action & Collapse Toggle Bar */}
          <View style={styles.tabActionBar}>
            <View style={{ flex: 1, minWidth: 160, marginRight: 8 }}>
              <Text style={styles.tabActionTitle}>Calendar & Milestones</Text>
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                Schedule group meetings, project reviews, or milestones.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, flexShrink: 0 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsCalendarCollapsed(!isCalendarCollapsed)}
                style={styles.calendarTogglePill}
              >
                {isCalendarCollapsed ? (
                  <ChevronDown size={14} color="#164E3F" />
                ) : (
                  <ChevronUp size={14} color="#164E3F" />
                )}
                <Text style={styles.calendarTogglePillText} numberOfLines={1}>
                  {isCalendarCollapsed ? 'Expand' : 'Collapse'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => openScheduleModalForDate(selectedCalendarDate)}
                style={styles.addBtn}
              >
                <Plus size={13} color="#FFFFFF" />
                <Text style={styles.addBtnText} numberOfLines={1}>Schedule Event</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Collapsible Month Calendar Grid */}
          {!isCalendarCollapsed ? (
            <View style={styles.calendarCard}>
              {/* Month Navigation Row */}
              <View style={styles.calendarMonthHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity
                    onPress={handlePrevMonth}
                    style={styles.calendarNavBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <ChevronLeft size={16} color="#0F172A" />
                  </TouchableOpacity>
                  <Text style={styles.calendarMonthTitle}>{calendarMonthTitle}</Text>
                  <TouchableOpacity
                    onPress={handleNextMonth}
                    style={styles.calendarNavBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <ChevronRight size={16} color="#0F172A" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={handleGoToday} style={styles.todayBtn}>
                  <Text style={styles.todayBtnText}>Today</Text>
                </TouchableOpacity>
              </View>

              {/* Day of Week Headers */}
              <View style={styles.calendarWeekRow}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <View key={d} style={styles.calendarWeekHeaderCell}>
                    <Text style={styles.calendarWeekHeaderText}>{d}</Text>
                  </View>
                ))}
              </View>

              {/* 7-Column Days Grid */}
              <View style={styles.calendarGridRow}>
                {calendarGrid.map((cell, idx) => {
                  if (cell.day === null || !cell.dateStr) {
                    return <View key={`blank-${idx}`} style={styles.calendarDayCellWrap} />;
                  }

                  return (
                    <View key={cell.dateStr} style={styles.calendarDayCellWrap}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          setSelectedCalendarDate(cell.dateStr!);
                          try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          } catch {}
                        }}
                        style={[
                          styles.calendarDayCell,
                          cell.isToday && styles.calendarDayCellToday,
                          cell.isSelected && styles.calendarDayCellSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            cell.isToday && styles.calendarDayTextToday,
                            cell.isSelected && styles.calendarDayTextSelected,
                          ]}
                        >
                          {cell.day}
                        </Text>
                        {cell.eventCount > 0 && (
                          <View style={styles.calendarDotsRow}>
                            {Array.from({ length: Math.min(cell.eventCount, 3) }).map((_, dotIdx) => (
                              <View
                                key={dotIdx}
                                style={[
                                  styles.calendarEventDot,
                                  cell.isSelected && styles.calendarEventDotSelected,
                                ]}
                              />
                            ))}
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            /* Compact Collapsed Banner */
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsCalendarCollapsed(false)}
              style={styles.calendarCollapsedBanner}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, marginRight: 8 }}>
                <Calendar size={16} color="#166534" />
                <Text style={styles.calendarCollapsedText} numberOfLines={1} ellipsizeMode="tail">
                  {calendarMonthTitle} • Selected: {formattedSelectedDate} • {events.length} total event{events.length === 1 ? '' : 's'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#166534' }}>Expand</Text>
                <ChevronDown size={14} color="#166534" />
              </View>
            </TouchableOpacity>
          )}

          {/* Agenda & Day Events Section */}
          <View style={styles.agendaHeaderRow}>
            <View style={{ flexGrow: 1, flexShrink: 1, minWidth: 150, marginRight: 8 }}>
              <Text style={styles.agendaTitle} numberOfLines={1} ellipsizeMode="tail">
                {calendarViewMode === 'selected'
                  ? `Events for ${formattedSelectedDate}`
                  : 'All Scheduled Events'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, flexShrink: 0 }}>
              <View style={styles.agendaFilterPills}>
                <TouchableOpacity
                  onPress={() => setCalendarViewMode('selected')}
                  style={[
                    styles.agendaFilterPill,
                    calendarViewMode === 'selected' && styles.agendaFilterPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.agendaFilterPillText,
                      calendarViewMode === 'selected' && styles.agendaFilterPillTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    On Date ({eventsOnSelectedDate.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setCalendarViewMode('all')}
                  style={[
                    styles.agendaFilterPill,
                    calendarViewMode === 'all' && styles.agendaFilterPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.agendaFilterPillText,
                      calendarViewMode === 'all' && styles.agendaFilterPillTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    All ({(events || []).filter((e) => !e.id.startsWith('task_seed_') && !e.id.startsWith('demo_')).length})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Events List or Empty State */}
          {displayedEvents.length === 0 ? (
            <View style={styles.emptyDayBox}>
              <Calendar size={36} color="#94A3B8" />
              <Text style={styles.emptyDayText}>
                {calendarViewMode === 'selected'
                  ? `No events scheduled for ${formattedSelectedDate}`
                  : 'No scheduled events found in this pod'}
              </Text>
              <TouchableOpacity
                onPress={() => openScheduleModalForDate(selectedCalendarDate)}
                style={styles.addBtn}
              >
                <Plus size={13} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Schedule Event for this Date</Text>
              </TouchableOpacity>
            </View>
          ) : (
            displayedEvents.map((ev) => {
              const { dateFormatted, timeFormatted } = formatEventDisplayDateTime(ev.start_time);
              const canDelete =
                !ev.creator_id ||
                ev.creator_id === currentUser?.id ||
                isAdminOrOwner ||
                isMember;

              // Find tagged attendees
              const taggedAttendees = (members || []).filter(
                (m) => ev.attendee_ids && ev.attendee_ids.includes(m.user_id)
              );

              return (
                <View key={ev.id} style={styles.eventCardEnhanced}>
                  <View style={styles.eventCardHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.eventTitle}>{ev.title}</Text>
                    </View>

                    <View style={styles.eventActionsRow}>
                      {canDelete && (
                        <TouchableOpacity
                          onPress={() => openEditModalForEvent(ev)}
                          style={styles.eventEditBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Pencil size={15} color="#164E3F" />
                        </TouchableOpacity>
                      )}

                      {canDelete && (
                        <TouchableOpacity
                          onPress={() => handleDeleteEvent(ev.id, ev.title)}
                          style={styles.eventDeleteBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 size={16} color="#DC2626" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={styles.eventTimeRow}>
                    <Clock size={12} color="#64748B" />
                    <Text style={styles.eventTimeText}>
                      {dateFormatted} at {timeFormatted}
                    </Text>
                  </View>

                  {ev.description ? (
                    <Text style={styles.eventDesc}>{ev.description}</Text>
                  ) : null}

                  {/* Attendees from Group */}
                  <View style={styles.eventAttendeesSection}>
                    <View style={styles.eventAttendeesTitleRow}>
                      <Users size={12} color="#059669" />
                      <Text style={styles.eventAttendeesTitle}>
                        {taggedAttendees.length > 0
                          ? `Invited from Group (${taggedAttendees.length}):`
                          : 'Invited from Group: All pod members'}
                      </Text>
                    </View>
                    {taggedAttendees.length > 0 && (
                      <View style={styles.attendeeChipsContainer}>
                        {taggedAttendees.map((att) => {
                          const attName = att.profile?.fullName || att.profile?.handle || 'Member';
                          return (
                            <View key={att.user_id} style={styles.attendeeChip}>
                              <Avatar url={att.profile?.avatarUrl || undefined} name={attName} size={18} />
                              <Text style={styles.attendeeChipText}>{attName}</Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>

                  {/* Link to BooffIn Manager if milestone/task */}
                  {(ev.event_type === 'milestone' || ev.title.includes('[Task]')) && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        setActiveTab('manager');
                        loadTasks(workspace.id);
                      }}
                      style={styles.eventViewManagerBtn}
                    >
                      <Columns3 size={11} color="#059669" />
                      <Text style={styles.eventViewManagerBtnText}>View in BooffIn manager</Text>
                      <ChevronRight size={11} color="#059669" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* TAB 3: BooffIn Manager (Kanban Board) */}
      {activeTab === 'manager' && (
        <WorkspaceBooffInManagerView
          workspace={workspace}
          members={members || []}
          onOpenCalendar={(targetDate) => {
            if (targetDate) {
              setSelectedCalendarDate(targetDate);
            }
            setActiveTab('calendar');
          }}
        />
      )}

      {/* TAB 4: Vault */}
      {(activeTab === 'vault' || activeTab === 'bookmarked') && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
          <View style={styles.vaultHeaderRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <VaultIcon size={22} color="#059669" />
                <Text style={styles.tabActionTitle}>Pod Vault</Text>
              </View>
              <Text style={styles.vaultSubtitle}>
                Confidential discussions, research papers, and messages saved by your pod members.
              </Text>
            </View>
            {savedItems.length > 0 && (
              <View style={styles.vaultCountBadge}>
                <Text style={styles.vaultCountBadgeText}>
                  {savedItems.length} {savedItems.length === 1 ? 'item' : 'items'}
                </Text>
              </View>
            )}
          </View>

          {savedItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.vaultEmptyIconCircle}>
                <VaultIcon size={38} color="#059669" />
              </View>
              <Text style={styles.emptyTitle}>Vault is Empty</Text>
              <Text style={styles.emptySub}>
                When you find an important message or paper in discussions, tap &quot;Save to Vault&quot; from the message menu to keep it here.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12, marginTop: 12 }}>
              {savedItems.map((item) => {
                const meta = item.metadata || {};
                const senderName = meta.sender_name || 'Researcher';
                const senderHandle = meta.sender_handle ? `@${meta.sender_handle}` : '';
                const senderAvatar = meta.sender_avatar;
                const messageText = item.note || item.title || 'Saved Message';
                const createdDate = meta.created_at || item.created_at;
                const formattedDate = createdDate
                  ? new Date(createdDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';
                const isCopied = copiedVaultItemId === item.id;
                const doiMeta = meta.doi_metadata;

                return (
                  <View key={item.id} style={styles.vaultItemCard}>
                    {/* Top row: Sender info + item type + delete button */}
                    <View style={styles.vaultCardTopRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <Avatar url={senderAvatar || undefined} name={senderName} size={32} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={styles.vaultSenderName} numberOfLines={1}>
                              {senderName}
                            </Text>
                            {senderHandle ? (
                              <Text style={styles.vaultSenderHandle} numberOfLines={1}>
                                {senderHandle}
                              </Text>
                            ) : null}
                          </View>
                          {formattedDate ? (
                            <Text style={styles.vaultItemDate}>{formattedDate}</Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={styles.vaultTypeBadge}>
                          <Text style={styles.vaultTypeBadgeText}>
                            {item.item_type === 'doi_paper' || doiMeta ? 'DOI Paper' : 'Message'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={async () => {
                            await removeSavedItem(workspace.id, item.item_id || item.id);
                            try {
                              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            } catch {}
                            setVaultToast({ message: 'Removed from Vault' });
                            setTimeout(() => setVaultToast(null), 2500);
                          }}
                          style={styles.vaultDeleteBtn}
                          accessibilityLabel="Remove from Vault"
                        >
                          <Trash2 size={16} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Middle: Message Content (Tappable to jump to discussion) */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleOpenSavedMessageInDiscussion(item)}
                      style={styles.vaultMessageBody}
                    >
                      <Text style={styles.vaultMessageText} selectable={false}>
                        {messageText}
                      </Text>
                      <View style={styles.vaultTapHintRow}>
                        <MessageSquare size={11} color="#059669" />
                        <Text style={styles.vaultTapHintText}>Tap to open in discussion</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Optional: DOI Paper Banner if present */}
                    {doiMeta && (
                      <View style={styles.vaultDoiSnippet}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <BookOpen size={14} color="#059669" />
                          <Text style={styles.vaultDoiSnippetLabel}>Research Paper Reference</Text>
                        </View>
                        <Text style={styles.vaultDoiSnippetTitle} numberOfLines={2}>
                          {doiMeta.title || 'Referenced Research Paper'}
                        </Text>
                        {doiMeta.doi ? (
                          <Text style={styles.vaultDoiSnippetCode}>DOI: {doiMeta.doi}</Text>
                        ) : null}
                        {doiMeta.url && (
                          <TouchableOpacity
                            onPress={() => Linking.openURL(doiMeta.url)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}
                          >
                            <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600' }}>Read Paper</Text>
                            <ExternalLink size={12} color="#059669" />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {/* Bottom: Action footer */}
                    <View style={styles.vaultCardFooter}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleOpenSavedMessageInDiscussion(item)}
                          style={styles.vaultOpenDiscussionBtn}
                        >
                          <MessageSquare size={13} color="#164E3F" />
                          <Text style={styles.vaultOpenDiscussionBtnText}>Open in Discussion</Text>
                          <ChevronRight size={13} color="#164E3F" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={async () => {
                            try {
                              await Clipboard.setStringAsync(messageText);
                              setCopiedVaultItemId(item.id);
                              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                              setTimeout(() => setCopiedVaultItemId(null), 2000);
                            } catch {}
                          }}
                          style={styles.vaultCopyBtn}
                        >
                          {isCopied ? (
                            <>
                              <Check size={13} color="#059669" />
                              <Text style={styles.vaultCopyBtnTextCopied}>Copied</Text>
                            </>
                          ) : (
                            <>
                              <Copy size={13} color="#475569" />
                              <Text style={styles.vaultCopyBtnText}>Copy Text</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Lock size={12} color="#94A3B8" />
                        <Text style={styles.vaultEncryptedLabel}>Confidential Pod Item</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* Modal: Share Paper via DOI */}
      <Modal visible={showDoiModal} transparent animationType="fade" onRequestClose={() => setShowDoiModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share Research Paper</Text>
              <TouchableOpacity onPress={() => setShowDoiModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Enter paper DOI to resolve and attach verified metadata.</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <TextInput
                value={doiQuery}
                onChangeText={setDoiQuery}
                placeholder="10.1038/s41586-..."
                placeholderTextColor="#94A3B8"
                style={styles.doiInput}
              />
              <TouchableOpacity
                onPress={handleResolveDoi}
                style={styles.doiLookupBtn}
              >
                {isResolvingDoi ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Sparkles size={16} color="#FFFFFF" />}
              </TouchableOpacity>
            </View>
            {resolvedDoi && (
              <View>
                <WorkspaceDoiCard doiMeta={resolvedDoi} />
                <TouchableOpacity
                  onPress={() => {
                    setAttachedDoi(resolvedDoi);
                    setShowDoiModal(false);
                    setDoiQuery('');
                    setResolvedDoi(null);
                  }}
                  style={styles.confirmAttachBtn}
                >
                  <Text style={styles.confirmAttachBtnText}>Attach to Pod Discussion</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal: Schedule / Edit Event with Add People from Group */}
      <Modal visible={showEventModal} transparent animationType="fade" onRequestClose={() => { setShowEventModal(false); setEditingEvent(null); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '92%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{editingEvent ? 'Edit Event' : 'Schedule Event'}</Text>
                <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600', marginTop: 2 }}>
                  📅 {formattedSelectedDate}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setShowEventModal(false); setEditingEvent(null); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 8 }}>
              {/* Event Name */}
              <Text style={styles.modalLabel}>Event Title *</Text>
              <TextInput
                value={eventTitle}
                onChangeText={setEventTitle}
                placeholder="e.g. Model Architecture Review, Journal Club"
                placeholderTextColor="#94A3B8"
                style={[styles.doiInput, { marginBottom: 12 }]}
              />

              {/* Event Time Section with Interactive Clock Picker */}
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={styles.modalLabel}>Event Time *</Text>
                  <TouchableOpacity
                    onPress={() => setShowClockPicker(!showClockPicker)}
                    style={styles.clockTogglePill}
                  >
                    <Clock size={13} color="#164E3F" />
                    <Text style={styles.clockTogglePillText}>
                      {showClockPicker ? 'Hide Time' : 'Set Time'}
                    </Text>
                    {showClockPicker ? (
                      <ChevronUp size={13} color="#164E3F" />
                    ) : (
                      <ChevronDown size={13} color="#164E3F" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Selected Time Display Banner */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowClockPicker(!showClockPicker)}
                  style={styles.selectedTimeBanner}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={styles.clockIconCircle}>
                      <Clock size={16} color="#164E3F" />
                    </View>
                    <View>
                      <Text style={styles.selectedTimeValue}>
                        {(() => {
                          const parsed = parse24HourToClock(eventTime);
                          return `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')} ${parsed.period}`;
                        })()}
                      </Text>
                      <Text style={styles.selectedTimeSub}>
                        Tap to {showClockPicker ? 'collapse' : 'open time picker & adjust'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.clockBadgePill}>
                    <Text style={styles.clockBadgePillText}>
                      {showClockPicker ? 'Active Picker' : 'Change Time'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Interactive Clock Picker */}
                {showClockPicker && (
                  <InteractiveClockPicker
                    value={eventTime}
                    onChange={(newTime) => setEventTime(newTime)}
                  />
                )}
              </View>

              {/* Description & Agenda */}
              <Text style={styles.modalLabel}>Description & Agenda</Text>
              <TextInput
                value={eventDesc}
                onChangeText={setEventDesc}
                placeholder="Add meeting agenda, discussion topics, preprint links..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                style={[styles.doiInput, { height: 72, textAlignVertical: 'top', paddingVertical: 8, marginBottom: 12 }]}
              />

              {/* Add People from Group Section */}
              <View style={styles.eventModalSection}>
                <View style={styles.eventModalSectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Users size={15} color="#164E3F" />
                    <Text style={styles.eventModalSectionTitle}>Add People from Group</Text>
                  </View>
                  <Text style={styles.eventModalSelectedBadge}>
                    {selectedAttendeeIds.length} of {members.length} selected
                  </Text>
                </View>
                <Text style={styles.eventModalSectionSub}>
                  Select members of this Inner Circle to attend or collaborate
                </Text>

                <View style={styles.eventModalMemberActions}>
                  <TextInput
                    value={memberFilterQuery}
                    onChangeText={setMemberFilterQuery}
                    placeholder="Search pod members..."
                    placeholderTextColor="#94A3B8"
                    style={styles.eventModalSearchInput}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      if (selectedAttendeeIds.length === members.length) {
                        setSelectedAttendeeIds([]);
                      } else {
                        setSelectedAttendeeIds(members.map((m) => m.user_id));
                      }
                    }}
                    style={styles.selectAllBtn}
                  >
                    <Text style={styles.selectAllBtnText}>
                      {selectedAttendeeIds.length === members.length ? 'Clear' : 'Select All'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.eventModalMemberList} nestedScrollEnabled>
                  {members.length === 0 ? (
                    <Text style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', paddingVertical: 12 }}>
                      No other pod members found
                    </Text>
                  ) : (
                    members
                      .filter((m) => {
                        if (!memberFilterQuery.trim()) return true;
                        const q = memberFilterQuery.toLowerCase();
                        const name = (m.profile?.fullName || '').toLowerCase();
                        const handle = (m.profile?.handle || '').toLowerCase();
                        return name.includes(q) || handle.includes(q);
                      })
                      .map((m) => {
                        const isSelected = selectedAttendeeIds.includes(m.user_id);
                        const name = m.profile?.fullName || m.profile?.handle || 'Pod Member';
                        const handle = m.profile?.handle ? `@${m.profile.handle}` : '';
                        const isCurrentUser = m.user_id === currentUser?.id;

                        return (
                          <TouchableOpacity
                            key={m.id || m.user_id}
                            activeOpacity={0.7}
                            onPress={() => {
                              if (isSelected) {
                                setSelectedAttendeeIds((prev) => prev.filter((id) => id !== m.user_id));
                              } else {
                                setSelectedAttendeeIds((prev) => [...prev, m.user_id]);
                              }
                            }}
                            style={[
                              styles.eventMemberRow,
                              isSelected && styles.eventMemberRowSelected,
                            ]}
                          >
                            <Avatar
                              url={m.profile?.avatarUrl || undefined}
                              name={name}
                              size={32}
                            />
                            <View style={styles.eventMemberInfo}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={styles.eventMemberName} numberOfLines={1}>{name}</Text>
                                {isCurrentUser && (
                                  <View style={styles.youBadge}>
                                    <Text style={styles.youBadgeText}>You</Text>
                                  </View>
                                )}
                                {m.role === 'admin' && (
                                  <View style={styles.adminBadge}>
                                    <Text style={styles.adminBadgeText}>Admin</Text>
                                  </View>
                                )}
                              </View>
                              {handle ? <Text style={styles.eventMemberHandle} numberOfLines={1}>{handle}</Text> : null}
                            </View>
                            <View style={[styles.checkboxWrap, isSelected && styles.checkboxWrapActive]}>
                              {isSelected ? <Check size={12} color="#FFFFFF" strokeWidth={3} /> : null}
                            </View>
                          </TouchableOpacity>
                        );
                      })
                  )}
                </ScrollView>
              </View>
            </ScrollView>

            {/* Submit & Cancel */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => { setShowEventModal(false); setEditingEvent(null); }}
                style={[styles.confirmAttachBtn, { flex: 1, backgroundColor: '#F1F5F9' }]}
              >
                <Text style={[styles.confirmAttachBtnText, { color: '#475569' }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={editingEvent ? handleUpdateEvent : handleCreateEvent}
                disabled={isSubmittingEvent}
                style={[styles.confirmAttachBtn, { flex: 2 }]}
              >
                {isSubmittingEvent ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmAttachBtnText}>
                    {editingEvent ? 'Save Changes' : 'Schedule Event'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Confirm Delete Event */}
      <Modal
        visible={!!eventToDelete}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeletingEvent && setEventToDelete(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 380, padding: 20 }]}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={styles.deleteEventModalIconCircle}>
                <Trash2 size={26} color="#DC2626" />
              </View>
              <Text style={styles.deleteEventModalTitle}>Delete Event</Text>
              <Text style={styles.deleteEventModalDesc}>
                Are you sure you want to delete &quot;{eventToDelete?.title}&quot;? This cannot be undone.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <TouchableOpacity
                disabled={isDeletingEvent}
                onPress={() => setEventToDelete(null)}
                style={styles.deleteEventModalCancelBtn}
              >
                <Text style={styles.deleteEventModalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={isDeletingEvent}
                onPress={confirmDeleteEvent}
                style={styles.deleteEventModalConfirmBtn}
              >
                {isDeletingEvent ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteEventModalConfirmText}>Delete Event</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Invite Researcher */}
      <Modal visible={showInviteModal} transparent animationType="fade" onRequestClose={() => setShowInviteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Researcher to Pod</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Inner Circles are capped at 25 members for confidential E2EE collaboration.
            </Text>
            <TextInput
              value={searchUserQuery}
              onChangeText={handleSearchUsers}
              placeholder="Search by name or username..."
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginBottom: 10 }]}
            />
            {isSearchingUsers ? (
              <ActivityIndicator size="small" color="#164E3F" style={{ marginVertical: 10 }} />
            ) : (
              searchResults.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  onPress={() => handleInvite(user.id)}
                  style={styles.searchUserRow}
                >
                  <Avatar uri={user.avatarUrl} name={user.fullName || user.handle} size="sm" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.searchUserName}>{user.fullName || `@${user.handle}`}</Text>
                    <Text style={styles.searchUserSub}>{user.academicTitle || user.institution || 'Researcher'}</Text>
                  </View>
                  <Text style={styles.invitePill}>Add</Text>
                </TouchableOpacity>
              ))
            )}
            {inviteStatus && (
              <Text style={{ fontSize: 12, color: '#164E3F', marginTop: 8, fontWeight: '600' }}>
                {inviteStatus}
              </Text>
            )}
          </View>
        </View>
      </Modal>

      {/* Group Info Modal */}
      <WorkspaceInfoModal
        visible={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        workspace={workspace}
      />

      {/* Step 4: Academic Lab Record Export Modal */}
      <WorkspaceExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        workspace={workspace}
        messages={messages}
        members={members}
      />

      {/* Full-Screen Image Viewer Modal */}
      <ImageViewerModal
        visible={viewerVisible}
        images={viewerImages}
        initialIndex={0}
        onClose={() => setViewerVisible(false)}
        authorName={workspace.name || 'Shared photo'}
      />

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Chat Media, Papers, Audio & Polls Gallery (Screenshot 3) */}
      {/* ------------------------------------------------------------- */}
      <ChatMediaGalleryModal
        visible={showGalleryModal}
        onClose={() => setShowGalleryModal(false)}
        messages={messages}
        chatTitle={workspace.name || 'Inner Circle Media'}
      />

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Attach to Message Bottom Sheet (Screenshot 2)          */}
      {/* ------------------------------------------------------------- */}
      {/* ------------------------------------------------------------- */}
      {/* POPOVER: Attach to Message (Floating above paperclip)          */}
      {/* ------------------------------------------------------------- */}
      <Popover
        visible={showAttachMenu}
        onClose={() => setShowAttachMenu(false)}
        anchorRef={attachBtnRef}
        position="top"
        align="end"
        estimatedWidth={240}
        estimatedHeight={200}
      >
        <PopoverItem
          icon={<FileUp size={16} color="#DC2626" />}
          label="PDF / Research Paper"
          subtitle="Preprints, datasets & DOIs"
          onPress={() => {
            setShowAttachMenu(false);
            setShowDocumentPickerModal(true);
          }}
        />
        <PopoverDivider />
        <PopoverItem
          icon={<User size={16} color="#164E3F" />}
          label="Researcher Profile"
          subtitle="Share contact card & ORCID"
          onPress={() => {
            setShowAttachMenu(false);
            setShowProfilePickerModal(true);
          }}
        />
        <PopoverDivider />
        <PopoverItem
          icon={<Vote size={16} color="#0D9488" />}
          label="Create Poll / Vote"
          subtitle="Collaborative inquiry"
          onPress={() => {
            setShowAttachMenu(false);
            setShowPollModal(true);
          }}
        />
        <PopoverDivider />
        <PopoverItem
          icon={<ImageIcon size={16} color="#DB2777" />}
          label="Photo / Figure"
          subtitle="Figures & lab plots"
          onPress={() => {
            setShowAttachMenu(false);
            handlePickImage();
          }}
        />
      </Popover>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: 3-Dots More Options Bottom Sheet (Screenshot 4)        */}
      {/* ------------------------------------------------------------- */}
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
            <Text style={styles.optionsSheetTitle}>{workspace.name || 'Inner Circle Pod'}</Text>

            {/* 1. Pin Conversation */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleTogglePin}
              style={styles.optionsItemRow}
            >
              <Pin size={20} color="#164E3F" />
              <Text style={[styles.optionsItemText, { color: '#0F172A' }]}>
                {isPinned ? 'Unpin Conversation' : 'Pin Conversation'}
              </Text>
            </TouchableOpacity>

            {/* 2. Archive Chat */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleToggleArchive}
              style={styles.optionsItemRow}
            >
              <Archive size={20} color="#164E3F" />
              <Text style={[styles.optionsItemText, { color: '#0F172A' }]}>
                {isArchived ? 'Unarchive Chat' : 'Archive Chat'}
              </Text>
            </TouchableOpacity>

            {/* 3. Mute Notifications */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowOptionsMenu(false);
                setShowMuteModal(true);
              }}
              style={styles.optionsItemRow}
            >
              <BellOff size={20} color="#164E3F" />
              <Text style={[styles.optionsItemText, { color: '#0F172A' }]}>
                {isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
              </Text>
            </TouchableOpacity>

            {/* 4. View Media, Papers & Links */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowOptionsMenu(false);
                setShowGalleryModal(true);
              }}
              style={styles.optionsItemRow}
            >
              <FolderOpen size={20} color="#164E3F" />
              <Text style={[styles.optionsItemText, { color: '#0F172A' }]}>
                View Media, Papers & Links
              </Text>
            </TouchableOpacity>

            <View style={styles.optionsDivider} />

            {/* 5. Clear Chat History */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowOptionsMenu(false);
                setShowClearHistoryModal(true);
              }}
              style={styles.optionsItemRow}
            >
              <Trash2 size={20} color="#D97706" />
              <Text style={[styles.optionsItemText, { color: '#D97706' }]}>
                Clear Chat History
              </Text>
            </TouchableOpacity>

            {/* 6. Leave Pod / Delete Conversation */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowOptionsMenu(false);
                setShowDeleteChatModal(true);
              }}
              style={styles.optionsItemRow}
            >
              <Trash size={20} color="#DC2626" />
              <Text style={[styles.optionsItemText, { color: '#DC2626' }]}>
                Leave Pod / Delete
              </Text>
            </TouchableOpacity>

            <View style={styles.optionsDivider} />

            {/* 7. Report Pod */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowOptionsMenu(false);
                setShowReportModal(true);
              }}
              style={styles.optionsItemRow}
            >
              <Flag size={20} color="#64748B" />
              <Text style={[styles.optionsItemText, { color: '#64748B' }]}>
                Report Pod
              </Text>
            </TouchableOpacity>

            {/* 8. Mute Pod Members */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowOptionsMenu(false);
                if (Platform.OS === 'web') window.alert('Mute notifications for all pod members enabled.');
                else Alert.alert('Members Muted', 'Notifications from this pod have been silenced.');
              }}
              style={styles.optionsItemRow}
            >
              <Ban size={20} color="#DC2626" />
              <Text style={[styles.optionsItemText, { color: '#DC2626' }]}>
                Mute Pod Members
              </Text>
            </TouchableOpacity>

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

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Mute Notifications Duration Picker                     */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={showMuteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMuteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <BellOff size={18} color="#164E3F" />
                <Text style={styles.modalTitle}>Mute Notifications</Text>
              </View>
              <TouchableOpacity onPress={() => setShowMuteModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Choose how long you want to mute notifications from this pod.
            </Text>

            <View style={{ gap: 8, marginTop: 4 }}>
              {isMuted ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleSelectMuteDuration('unmute')}
                  style={styles.muteOptionCard}
                >
                  <Text style={styles.muteOptionTitle}>Unmute Pod</Text>
                  <Text style={styles.muteOptionDesc}>Resume receiving push notifications</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleSelectMuteDuration('8h')}
                    style={styles.muteOptionCard}
                  >
                    <Text style={styles.muteOptionTitle}>For 8 Hours</Text>
                    <Text style={styles.muteOptionDesc}>Mute temporarily during work sessions</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleSelectMuteDuration('1w')}
                    style={styles.muteOptionCard}
                  >
                    <Text style={styles.muteOptionTitle}>For 1 Week</Text>
                    <Text style={styles.muteOptionDesc}>Mute for the upcoming sprint or break</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleSelectMuteDuration('always')}
                    style={styles.muteOptionCard}
                  >
                    <Text style={styles.muteOptionTitle}>Always</Text>
                    <Text style={styles.muteOptionDesc}>Until you manually unmute</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Clear Chat History Confirmation                        */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={showClearHistoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Trash2 size={18} color="#D97706" />
                <Text style={styles.modalTitle}>Clear Chat History?</Text>
              </View>
              <TouchableOpacity onPress={() => setShowClearHistoryModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              This will clear all messages from your local pod discussion view. Shared DOIs and media remain stored in the lab vault.
            </Text>

            <View style={styles.confirmModalActionsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowClearHistoryModal(false)}
                style={styles.confirmModalCancelBtn}
              >
                <Text style={styles.confirmModalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isProcessingChatAction}
                onPress={handleClearChatHistory}
                style={[styles.confirmModalDestructiveBtn, { backgroundColor: '#D97706' }]}
              >
                {isProcessingChatAction ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmModalDestructiveText}>Clear History</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Delete / Leave Pod Confirmation                       */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={showDeleteChatModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteChatModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Trash size={18} color="#DC2626" />
                <Text style={styles.modalTitle}>
                  {isOwner ? 'Delete Research Pod?' : 'Leave Research Pod?'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowDeleteChatModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {isOwner
                ? 'Are you sure you want to permanently delete this research pod? All messages, documents, and discussions will be removed for all members.'
                : 'Are you sure you want to remove this pod from your active workspace? You can rejoin later if invited.'}
            </Text>

            <View style={styles.confirmModalActionsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowDeleteChatModal(false)}
                style={styles.confirmModalCancelBtn}
              >
                <Text style={styles.confirmModalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isProcessingChatAction}
                onPress={handleDeleteConversationLocally}
                style={styles.confirmModalDestructiveBtn}
              >
                {isProcessingChatAction ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmModalDestructiveText}>
                    {isOwner ? 'Delete Pod' : 'Leave Pod'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Report Pod Modal                                       */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Flag size={18} color="#DC2626" />
                <Text style={styles.modalTitle}>Report Research Pod</Text>
              </View>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Help keep BooffIn safe and academically rigorous. Why are you reporting this pod?
            </Text>

            {(['spam', 'harassment', 'copyright', 'misinformation', 'other'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                activeOpacity={0.7}
                onPress={() => setReportReason(r)}
                style={[
                  styles.reasonOption,
                  reportReason === r && styles.reasonOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.reasonOptionText,
                    reportReason === r && styles.reasonOptionTextSelected,
                  ]}
                >
                  {r === 'spam'
                    ? 'Spam or Commercial Promotion'
                    : r === 'harassment'
                    ? 'Academic Harassment or Inappropriate Behavior'
                    : r === 'copyright'
                    ? 'Plagiarism or Intellectual Property Violation'
                    : r === 'misinformation'
                    ? 'Fabricated Data or Misleading Scientific Claims'
                    : 'Other Issue'}
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

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Academic Paper & Manuscript Search (DOI, URL, Title, Keywords) */}
      {/* ------------------------------------------------------------- */}
      <PaperSearchModal
        visible={showDocumentPickerModal}
        onClose={() => setShowDocumentPickerModal(false)}
        onSelectPaper={handleSelectPaperToShare}
        title="Search & Share Manuscript / Paper"
        subtitle="Search preprints and papers by DOI, URL, title, keywords, or author across global scientific registries."
      />

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  chatAreaWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    maxWidth: '100%',
  },
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 6,
    marginRight: 6,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerIconBtn: {
    padding: 6,
  },
  chatSearchContainer: {
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chatSearchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
  },
  chatSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    paddingBottom: 2,
  },
  chatFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chatFilterPillActive: {
    backgroundColor: '#164E3F',
    borderColor: '#164E3F',
  },
  chatFilterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  chatFilterPillTextActive: {
    color: '#FFFFFF',
  },
  searchMatchCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#164E3F',
    marginTop: 6,
  },
  subFilterStripContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 8,
  },
  subFilterStrip: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  filterPillActive: {
    backgroundColor: '#164E3F',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dateCapsuleContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  dateCapsule: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateCapsuleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  academicThreadPost: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    marginBottom: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#164E3F',
  },
  postBodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#0F172A',
    marginBottom: 10,
  },
  doiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  doiIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#164E3F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doiIconText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  doiPillText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  hashtagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  hashtagChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hashtagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  replyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  moduleCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  moduleCardHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  moduleCardBody: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  piBookmarkFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  piBookmarkText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#164E3F',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    maxWidth: Platform.OS === 'web' ? '82%' : '84%',
    alignItems: 'flex-end',
  },
  myMessageRow: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  bubbleWrapper: {
    maxWidth: '100%',
    flexShrink: 1,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    maxWidth: '100%',
    flexShrink: 1,
    overflow: 'hidden',
  },
  bubbleWithMedia: {
    minWidth: Platform.OS === 'web' ? 240 : 220,
    maxWidth: '100%',
  },
  myBubble: {
    backgroundColor: '#164E3F',
    borderBottomRightRadius: 3,
  },
  otherBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 3,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#164E3F',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#111827',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimestamp: {
    color: '#A7F3D0',
  },
  otherTimestamp: {
    color: '#94A3B8',
  },
  reviewBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  reviewTextContainer: {
    flex: 1,
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  reviewSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  reviewJoinButton: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewJoinButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomDockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  inputCapsule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 8,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...(Platform.OS === 'web'
      ? ({
          transition: 'border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease',
        } as any)
      : {}),
  },
  inputCapsuleFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#164E3F',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 0 0 3px rgba(22, 78, 63, 0.12)',
        } as any)
      : {}),
  },
  mediaIconBtn: {
    padding: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingHorizontal: 8,
    paddingTop: Platform.OS === 'ios' ? 8 : (Platform.OS === 'web' ? 8 : 6),
    paddingBottom: Platform.OS === 'ios' ? 8 : (Platform.OS === 'web' ? 8 : 6),
    textAlignVertical: 'center',
    borderWidth: 0,
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
        } as any)
      : {}),
  },
  detachedSendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#164E3F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detachedSendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  tabActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tabActionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  vaultSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#164E3F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    flexShrink: 0,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  eventCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  eventDate: {
    fontSize: 11,
    color: '#64748B',
  },
  eventDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  // Collapsible Calendar Styles
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  calendarMonthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  calendarMonthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  calendarNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  todayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  todayBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarWeekHeaderCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarWeekHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  calendarGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 4,
  },
  calendarDayCellWrap: {
    width: '14.285%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  calendarDayCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  calendarDayCellToday: {
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  calendarDayCellSelected: {
    backgroundColor: '#164E3F',
  },
  calendarDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  calendarDayTextToday: {
    color: '#059669',
    fontWeight: '800',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  calendarDotsRow: {
    position: 'absolute',
    bottom: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  calendarEventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
  },
  calendarEventDotSelected: {
    backgroundColor: '#A7F3D0',
  },
  calendarCollapsedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  calendarCollapsedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  calendarTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexShrink: 0,
  },
  calendarTogglePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  agendaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  agendaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  agendaFilterPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  agendaFilterPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  agendaFilterPillActive: {
    backgroundColor: '#164E3F',
  },
  agendaFilterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  agendaFilterPillTextActive: {
    color: '#FFFFFF',
  },
  eventCardEnhanced: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  eventTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    marginBottom: 6,
  },
  eventTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
  },
  eventTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    marginBottom: 6,
  },
  eventTimeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  eventAttendeesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  eventAttendeesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  eventAttendeesTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  attendeeChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  attendeeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  attendeeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  emptyDayBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  emptyDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 8,
    marginBottom: 10,
  },
  // Modal Specific Styles
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  timePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  timePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  clockTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  clockTogglePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#164E3F',
  },
  selectedTimeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  clockIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTimeValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  selectedTimeSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  clockBadgePill: {
    backgroundColor: '#164E3F',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  clockBadgePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  eventActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventEditBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  eventDeleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  eventViewManagerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  eventViewManagerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  deleteEventModalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  deleteEventModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  deleteEventModalDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  deleteEventModalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deleteEventModalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  deleteEventModalConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteEventModalConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timePillActive: {
    backgroundColor: '#164E3F',
    borderColor: '#164E3F',
  },
  timePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  timePillTextActive: {
    color: '#FFFFFF',
  },
  typePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typePillActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  typePillTextActive: {
    color: '#FFFFFF',
  },
  eventModalSection: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  eventModalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  eventModalSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  eventModalSelectedBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  eventModalSectionSub: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
  },
  eventModalMemberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  eventModalSearchInput: {
    flex: 1,
    height: 34,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 12,
    color: '#0F172A',
  },
  selectAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
  },
  selectAllBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  eventModalMemberList: {
    maxHeight: 160,
  },
  eventMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  eventMemberRowSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  eventMemberInfo: {
    flex: 1,
    marginLeft: 8,
  },
  eventMemberName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  eventMemberHandle: {
    fontSize: 10,
    color: '#64748B',
  },
  youBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  adminBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  adminBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#92400E',
  },
  checkboxWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  checkboxWrapActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  vaultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  vaultCountBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  vaultCountBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  vaultEmptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  vaultItemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  vaultCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  vaultSenderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  vaultSenderAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultSenderAvatarInitials: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  vaultSenderName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  vaultSenderHandle: {
    fontSize: 12,
    color: '#64748B',
  },
  vaultItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  vaultItemDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  vaultTypeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vaultTypeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  vaultDeleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  vaultMessageBody: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 10,
  },
  vaultMessageText: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
  },
  vaultDoiSnippet: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  vaultDoiSnippetLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
  },
  vaultDoiSnippetTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  vaultDoiSnippetCode: {
    fontSize: 11,
    color: '#059669',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  vaultCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  vaultCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },
  vaultOpenDiscussionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  vaultOpenDiscussionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#164E3F',
  },
  vaultTapHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  vaultTapHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  highlightedMessageBubble: {
    borderWidth: 2,
    borderColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  highlightedMessageRow: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 12,
  },
  vaultCopyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  vaultCopyBtnTextCopied: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  vaultEncryptedLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  vaultToastBanner: {
    position: 'absolute',
    top: 4,
    alignSelf: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  vaultToastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 14,
  },
  doiInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
  },
  doiLookupBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#164E3F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmAttachBtn: {
    backgroundColor: '#164E3F',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  confirmAttachBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  searchUserSub: {
    fontSize: 11,
    color: '#64748B',
  },
  invitePill: {
    backgroundColor: '#164E3F',
    color: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 11,
    fontWeight: '700',
  },
  attachedDoiPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#A7F3D0',
  },
  attachedDoiTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#164E3F',
  },
  attachedDoiSub: {
    fontSize: 10,
    color: '#047857',
  },
  imageMsgContainer: {
    width: 230,
    height: 175,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0F172A12',
    marginVertical: 4,
    position: 'relative',
  },
  imageMsg: {
    width: '100%',
    height: '100%',
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  imageOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  imagePlaceholderBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  imagePlaceholderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconBtnActive: {
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
  },
  inPodSearchBarContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  searchBarInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  searchFilterChipsRow: {
    gap: 6,
  },
  searchFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  searchFilterChipActive: {
    backgroundColor: '#164E3F',
  },
  searchFilterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  searchFilterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pinnedBannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },
  pinnedIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedContentWrap: {
    flex: 1,
  },
  pinnedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinnedBadgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#164E3F',
  },
  pinnedAuthorLabel: {
    fontSize: 11,
    color: '#15803D',
    marginLeft: 3,
  },
  pinnedSnippetText: {
    fontSize: 12,
    color: '#334155',
    marginTop: 1,
  },
  pinnedCloseBtn: {
    padding: 4,
  },
  emptyMessagesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyMessagesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyMessagesSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  bubblePinTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 3,
    alignSelf: 'flex-start',
  },
  bubblePinTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#164E3F',
  },
  quotedReplyBox: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 6,
    marginBottom: 6,
    overflow: 'hidden',
  },
  quotedReplyBoxMe: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  quotedReplyBoxOther: {
    backgroundColor: '#E2E8F0',
  },
  quotedReplyAccent: {
    width: 3,
    borderRadius: 2,
    marginRight: 6,
  },
  quotedAccentMe: {
    backgroundColor: '#A7F3D0',
  },
  quotedAccentOther: {
    backgroundColor: '#164E3F',
  },
  quotedReplySender: {
    fontSize: 11,
    fontWeight: '700',
  },
  quotedSenderMe: {
    color: '#A7F3D0',
  },
  quotedSenderOther: {
    color: '#164E3F',
  },
  quotedReplySnippet: {
    fontSize: 11,
  },
  quotedSnippetMe: {
    color: '#E2E8F0',
  },
  quotedSnippetOther: {
    color: '#475569',
  },
  deletedMsgWrap: {
    paddingVertical: 2,
  },
  deletedMsgText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#94A3B8',
  },
  messageFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 3,
  },
  editedIndicator: {
    fontSize: 9,
    fontStyle: 'italic',
    marginRight: 4,
  },
  myEditedIndicator: {
    color: '#A7F3D0',
  },
  otherEditedIndicator: {
    color: '#94A3B8',
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  reactionBadgeMeActive: {
    backgroundColor: '#064E3B',
    borderColor: '#059669',
  },
  reactionBadgeOtherActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  reactionEmojiText: {
    fontSize: 12,
  },
  reactionCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  reactionCountMeActive: {
    color: '#A7F3D0',
  },
  reactionCountOtherActive: {
    color: '#164E3F',
  },
  mentionHighlight: {
    fontWeight: '700',
  },
  mentionHighlightMe: {
    color: '#A7F3D0',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  mentionHighlightOther: {
    color: '#164E3F',
    backgroundColor: '#DCFCE7',
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  mentionHighlightSpecial: {
    color: '#D97706',
    backgroundColor: '#FEF3C7',
  },
  mentionPopupContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 6,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mentionPopupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  mentionPopupHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#164E3F',
    textTransform: 'uppercase',
  },
  mentionSuggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  mentionSpecialIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentionSuggestionName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  mentionSuggestionHandle: {
    fontSize: 11,
    color: '#64748B',
  },
  replyingToDock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
  },
  replyingToAccent: {
    width: 3,
    height: '100%',
    backgroundColor: '#164E3F',
    borderRadius: 2,
  },
  replyingToTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#164E3F',
  },
  replyingToSnippet: {
    fontSize: 11,
    color: '#64748B',
  },
  replyingToCloseBtn: {
    padding: 4,
  },
  /* Hovering Message Popover Menu */
  messagePopoverCard: {
    paddingVertical: 4,
    minWidth: 230,
    maxWidth: 270,
  },
  popoverEmojiReactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    marginHorizontal: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  popoverEmojiReactionBtn: {
    padding: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popoverEmojiReactionText: {
    fontSize: 20,
  },
  /* Delete Confirmation Modal */
  deleteModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  deleteModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  deleteModalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  deleteModalOptions: {
    gap: 10,
    marginBottom: 16,
  },
  deleteOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  deleteForEveryoneBtn: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  deleteOptionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  deleteOptionDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  deleteModalCancelBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  actionMenuCard: {
    width: '90%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  quickReactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
  },
  quickEmojiBtn: {
    padding: 6,
  },
  quickEmojiText: {
    fontSize: 22,
  },
  actionMenuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  actionMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 12,
    borderRadius: 10,
  },
  actionMenuRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  cancelModalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelModalBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  forwardWsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  forwardWsName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  forwardWsType: {
    fontSize: 11,
    color: '#64748B',
  },
  announcementModeDockContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  announcementModeDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  announcementModeDockText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
  attachMenuCard: {
    width: '92%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  attachMenuHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
  attachMenuOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  attachOptionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  attachOptionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  attachMenuCancelBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  attachMenuCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  pollMsgContainer: {
    width: 250,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 4,
  },
  pollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  pollBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#164E3F',
    letterSpacing: 0.6,
  },
  pollQuestionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  pollOptionsList: {
    gap: 6,
  },
  pollOptionBtn: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    overflow: 'hidden',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  pollOptionBtnSelected: {
    borderColor: '#164E3F',
    backgroundColor: '#F0FDF4',
  },
  pollProgressFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#D1FAE5',
    opacity: 0.4,
  },
  pollOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  pollOptionRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 42,
  },
  pollOptionPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  pollOptionPercentSelected: {
    color: '#164E3F',
    fontWeight: '800',
  },
  pollProgressFillSelected: {
    backgroundColor: '#A7F3D0',
    opacity: 0.6,
  },
  pollFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  pollTotalVotesText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  pollVotedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#164E3F',
  },
  pollHintText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  pollRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollRadioSelected: {
    borderColor: '#164E3F',
  },
  pollRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#164E3F',
  },
  pollOptionText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  pollOptionTextSelected: {
    fontWeight: '700',
    color: '#164E3F',
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    marginBottom: 12,
  },
  addOptionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#164E3F',
  },
  sampleDocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sampleDocIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleDocName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  sampleDocSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  ephemeralBannerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingVertical: 5,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
  },
  ephemeralBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#164E3F',
  },
  ephemeralBannerSub: {
    fontSize: 11,
    color: '#059669',
  },
  typingIndicatorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: 'rgba(241, 245, 249, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  typingDotsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#164E3F',
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.7,
  },
  typingDot3: {
    opacity: 1,
  },
  typingIndicatorText: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
  },
  dateSeparatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
    paddingHorizontal: 16,
    width: '100%',
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dateSeparatorPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  dateSeparatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'capitalize',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  /* Options Sheet & Modals matching DM */
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
  attachIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  attachItemSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  optionsDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 6,
  },
  muteOptionCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  muteOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  muteOptionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  confirmModalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  confirmModalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  confirmModalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  confirmModalDestructiveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  confirmModalDestructiveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
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
  docItemOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  docItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  docItemMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  detachedMicBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#164E3F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forwardedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  forwardedBadgeText: {
    fontSize: 11,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  forwardedBadgeTextMy: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  forwardedBadgeTextOther: {
    color: '#64748B',
  },
  loadingOlderContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  loadingOlderText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  scrollToBottomBtn: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 99,
  },
  unreadBelowBadge: {
    position: 'absolute',
    top: -6,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  unreadBelowBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

