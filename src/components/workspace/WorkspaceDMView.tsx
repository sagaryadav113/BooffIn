import React, { useState, useEffect, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
  Animated,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Send,
  FileText,
  CheckCircle2,
  Check,
  CheckCheck,
  MoreVertical,
  Camera,
  Paperclip,
  Search,
  X,
  Sparkles,
  BarChart2,
  Image as ImageIcon,
  Flag,
  Ban,
  UserMinus,
  Plus,
  Vote,
  Maximize2,
  Copy,
  Reply,
  Pencil,
  Trash2,
  CornerUpRight,
  Smile,
  ShieldAlert,
  Mic,
  FolderOpen,
  Phone,
  Video,
  User,
  Users,
  FileUp,
  PhoneCall,
  PhoneMissed,
  Pin,
  PinOff,
  Archive,
  Bell,
  BellOff,
  Trash,
  AlertTriangle,
  Lock,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
import {
  Workspace,
  WorkspaceMessage,
  DoiMetadata,
  WorkspacePollData,
  WorkspacePostMetadata,
  WorkspaceProfileMetadata,
  WorkspaceInviteMetadata,
  WorkspaceDocumentMetadata,
  WorkspaceCallMetadata,
} from '../../types/workspace';
import { WorkspaceDoiCard } from './WorkspaceDoiCard';
import { WorkspaceInfoModal } from './WorkspaceInfoModal';
import { ImageViewerModal } from '../modals/ImageViewerModal';
import { VoiceNotePlayer } from '../chat/VoiceNotePlayer';
import { VoiceNoteRecorder } from '../chat/VoiceNoteRecorder';
import { ChatMediaGalleryModal } from '../chat/ChatMediaGalleryModal';
import { PaperSearchModal } from '../chat/PaperSearchModal';
import { Paper } from '../../types';
import { ChatPostCard } from '../chat/ChatPostCard';
import { ChatProfileCard } from '../chat/ChatProfileCard';
import { ChatWorkspaceInviteCard } from '../chat/ChatWorkspaceInviteCard';
import { ChatDocumentCard } from '../chat/ChatDocumentCard';
import { ChatCallModal } from '../chat/ChatCallModal';
import { IncomingCallModal } from '../chat/IncomingCallModal';
import { webrtcSignaling, IncomingCallPayload } from '../../services/webrtcSignalingService';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { usePresenceStore } from '../../store/usePresenceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { resolvePaper } from '../../api/paperResolver';
import { supabase } from '../../api/client';
import { fetchUserProfile } from '../../api/authService';
import { uploadPostImage, uploadVoiceNoteAudio } from '../../api/storageService';
import { blockUser, reportContent } from '../../api/moderationService';
import { unfollowUser } from '../../api/socialService';
import { searchBooffInUsers } from '../../api/search/providers/userSearchProvider';
import { E2EESafetyNumberModal } from '../chat/E2EESafetyNumberModal';
import { E2EEStatusBanner } from '../chat/E2EEStatusBanner';
import { deriveSharedSessionKey, encryptTextMessage, decryptTextMessage } from '../../utils/e2eeCrypto';

const QUICK_EMOJIS = ['❤️', '👍', '🔬', '🔥', '👏', '💡', '🎉'];
type ChatFilterType = 'all' | 'media' | 'papers' | 'audio' | 'polls' | 'docs';

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

const AnimatedTypingIndicator: React.FC<{ name: string }> = ({ name }) => {
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
        <Text style={{ fontWeight: '700' }}>{name}</Text> is typing...
      </Text>
    </View>
  );
};

interface WorkspaceDMViewProps {
  workspace: Workspace;
}

export const WorkspaceDMView: React.FC<WorkspaceDMViewProps> = ({ workspace }) => {
  const currentUser = useAuthStore((s) => s.user);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const messages = useWorkspaceStore((s) => s.messages);
  const isMessagesLoading = useWorkspaceStore((s) => s.isMessagesLoading);
  const isSending = useWorkspaceStore((s) => s.isSending);
  const loadMessages = useWorkspaceStore((s) => s.loadMessages);
  const sendMessage = useWorkspaceStore((s) => s.sendMessage);
  const subscribeToWorkspaceMessages = useWorkspaceStore((s) => s.subscribeToWorkspaceMessages);
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

  // All workspaces for Forwarding and Workspace Invites
  const dms = useWorkspaceStore((s) => s.dms);
  const communities = useWorkspaceStore((s) => s.communities);
  const innerCircles = useWorkspaceStore((s) => s.innerCircles);

  const currentDm = dms.find((d) => d.id === workspace.id) || workspace;
  const isPinned = Boolean(currentDm.is_pinned);
  const isMuted = Boolean(currentDm.is_muted);
  const isArchived = Boolean(currentDm.is_archived);

  // Real-time typing & presence selectors
  const sendTypingIndicator = useWorkspaceStore((s) => s.sendTypingIndicator);
  const typingInThisRoom = useWorkspaceStore((s) => s.typingUsers[workspace.id]);
  const storeOtherLastRead = useWorkspaceStore((s) => s.otherLastReadMap[workspace.id]);
  const onlineUserIds = usePresenceStore((s) => s.onlineUserIds);

  const [localPartner, setLocalPartner] = useState<any>(workspace.other_user || null);
  const [inputText, setInputText] = useState('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const partner = localPartner || workspace.other_user;
  const partnerId = partner?.id || workspace.other_user?.id;
  const isPartnerOnline = Boolean(partnerId && onlineUserIds[partnerId]);
  const isPartnerTyping = Boolean(typingInThisRoom && Object.keys(typingInThisRoom).length > 0);
  const typingPartnerName = isPartnerTyping
    ? Object.values(typingInThisRoom)[0]?.username || partner?.fullName || 'Researcher'
    : null;

  const handleUserTyping = (text: string) => {
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

  // Voice Note Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  // 1:1 Live Calling State (Phase 3 & 4: Zero-Storage P2P WebRTC)
  const [activeCallModal, setActiveCallModal] = useState<{
    visible: boolean;
    type: 'audio' | 'video';
    roomId?: string;
    isIncoming?: boolean;
  }>({
    visible: false,
    type: 'audio',
  });
  const [incomingCall, setIncomingCall] = useState<IncomingCallPayload | null>(null);

  // Chat Media Gallery Modal State
  const [showGalleryModal, setShowGalleryModal] = useState(false);

  // Search & Filter State
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [activeChatFilter, setActiveChatFilter] = useState<ChatFilterType>('all');

  // Replying To State
  const [replyingTo, setReplyingTo] = useState<WorkspaceMessage | null>(null);

  // Long-Press Message Context Menu State
  const [selectedMessage, setSelectedMessage] = useState<WorkspaceMessage | null>(null);
  const [showMessageActionMenu, setShowMessageActionMenu] = useState(false);

  // Edit Message Modal State
  const [editingMessage, setEditingMessage] = useState<WorkspaceMessage | null>(null);
  const [editInputText, setEditInputText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Forward Message Modal State
  const [forwardingMessage, setForwardingMessage] = useState<WorkspaceMessage | null>(null);
  const [forwardSearch, setForwardSearch] = useState('');
  const [forwardingTargetId, setForwardingTargetId] = useState<string | null>(null);

  // Share Profile Picker Modal State (Phase 3)
  const [showProfilePickerModal, setShowProfilePickerModal] = useState(false);
  const [userSearchText, setUserSearchText] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Share Workspace Invite Picker Modal State (Phase 3)
  const [showInvitePickerModal, setShowInvitePickerModal] = useState(false);

  // Share Post Modal State (Phase 3)
  const [showPostPickerModal, setShowPostPickerModal] = useState(false);
  const [postTitleInput, setPostTitleInput] = useState('');
  const [postSnippetInput, setPostSnippetInput] = useState('');

  // Options Sheet & Chat Management State (Phase 4)
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [showDeleteChatModal, setShowDeleteChatModal] = useState(false);
  const [isProcessingChatAction, setIsProcessingChatAction] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Inappropriate behavior or spam');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Full-screen Image Viewer Modal State
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerVisible, setViewerVisible] = useState(false);

  // Attachments Menu State
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // DOI State
  const [showDoiModal, setShowDoiModal] = useState(false);
  const [doiQuery, setDoiQuery] = useState('');
  const [isResolvingDoi, setIsResolvingDoi] = useState(false);
  const [resolvedDoi, setResolvedDoi] = useState<DoiMetadata | null>(null);
  const [attachedDoi, setAttachedDoi] = useState<DoiMetadata | null>(null);

  // Poll Creator State
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);

  // Local poll voting state for optimistic interactions
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
        setLocalPollVotes((prev) => ({ ...detected, ...prev }));
      }
    })();
  }, [messages, currentUser?.id]);

  // E2EE Zero-Knowledge Encryption State
  const [showSafetyNumberModal, setShowSafetyNumberModal] = useState<boolean>(false);
  const [decryptedTextMap, setDecryptedTextMap] = useState<Record<string, string>>({});

  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);
  const isAtBottomRef = useRef(true);
  const hasInitialScrolledRef = useRef(false);

  useEffect(() => {
    hasInitialScrolledRef.current = false;
    loadMessages(workspace.id);
    const unsubscribe = subscribeToWorkspaceMessages(workspace.id);
    return () => {
      unsubscribe();
    };
  }, [workspace.id]);

  // Initial scroll to latest message when messages load
  useEffect(() => {
    if (messages.length > 0 && !hasInitialScrolledRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
        hasInitialScrolledRef.current = true;
      }, 50);
    }
  }, [messages.length, isMessagesLoading]);

  // Auto-scroll when new messages arrive if user is at the bottom
  useEffect(() => {
    if (messages.length > 0 && hasInitialScrolledRef.current && isAtBottomRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [messages.length]);

  // E2EE Auto-Decryption Effect for incoming encrypted ciphertexts
  useEffect(() => {
    async function decryptEncryptedMessages() {
      const peerId = localPartner?.id || workspace.other_user?.id;
      if (!currentUser?.id || !peerId) return;
      try {
        const sessionKey = await deriveSharedSessionKey(currentUser.id, peerId, workspace.id);
        const updates: Record<string, string> = {};
        for (const m of messages) {
          if (m.e2ee_ciphertext && m.e2ee_nonce && !decryptedTextMap[m.id]) {
            try {
              const dec = await decryptTextMessage(m.e2ee_ciphertext, m.e2ee_nonce, sessionKey);
              if (dec) updates[m.id] = dec;
            } catch {}
          }
        }
        if (Object.keys(updates).length > 0) {
          setDecryptedTextMap((prev) => ({ ...prev, ...updates }));
        }
      } catch {}
    }
    decryptEncryptedMessages();
  }, [messages, currentUser?.id, localPartner?.id, workspace.other_user?.id, workspace.id]);

  useEffect(() => {
    if (workspace.other_user) {
      setLocalPartner(workspace.other_user);
      return;
    }

    async function resolvePartner() {
      let otherId =
        workspace.dm_participant_a === currentUser?.id
          ? workspace.dm_participant_b
          : workspace.dm_participant_a;

      if (!otherId && currentUser?.id) {
        const { data: mem } = await supabase
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', workspace.id)
          .neq('user_id', currentUser.id)
          .maybeSingle();
        if (mem) otherId = mem.user_id;
      }

      if (otherId) {
        const p = await fetchUserProfile(otherId);
        if (p) {
          setLocalPartner({
            id: p.id,
            fullName: p.fullName || p.handle || 'Researcher',
            handle: p.handle,
            avatarUrl: p.avatarUrl || null,
            academicTitle: p.academicTitle,
            institution: p.institution,
            orcidVerified: p.orcidVerified,
          });
        }
      }
    }

    resolvePartner();
  }, [workspace.id, workspace.other_user, workspace.dm_participant_a, workspace.dm_participant_b, currentUser?.id]);

  // Realtime read receipts tracking for 1:1 DM
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(workspace.other_last_read_at || null);

  useEffect(() => {
    const otherId = localPartner?.id || workspace.other_user?.id || (workspace.dm_participant_a === currentUser?.id ? workspace.dm_participant_b : workspace.dm_participant_a);
    if (!otherId) return;

    const fetchOtherRead = async () => {
      try {
        const { data } = await supabase
          .from('workspace_members')
          .select('last_read_at')
          .eq('workspace_id', workspace.id)
          .eq('user_id', otherId)
          .maybeSingle();
        if (data?.last_read_at) {
          setOtherLastReadAt(data.last_read_at);
        }
      } catch {}
    };

    fetchOtherRead();

    const subChannel = supabase
      .channel(`dm_read_receipts:${workspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_members',
          filter: `workspace_id=eq.${workspace.id}`,
        },
        (payload: any) => {
          if (payload.new && payload.new.user_id === otherId && payload.new.last_read_at) {
            setOtherLastReadAt(payload.new.last_read_at);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subChannel);
    };
  }, [workspace.id, localPartner?.id, workspace.other_user?.id, currentUser?.id]);

  // Step 4: Listen for incoming ephemeral P2P calls (Zero-storage broadcast, gated by FEATURE_FLAGS)
  useEffect(() => {
    if (!FEATURE_FLAGS.ENABLE_VOICE_VIDEO_CALLS || !currentUser?.id) return;
    const unsubscribe = webrtcSignaling.listenForIncomingCalls(
      currentUser.id,
      (call) => {
        setIncomingCall(call);
      },
      (cancelledRoomId) => {
        setIncomingCall((curr) => (curr?.roomId === cancelledRoomId ? null : curr));
      }
    );
    return () => {
      unsubscribe();
    };
  }, [currentUser?.id]);

  const effectiveOtherLastReadAt = storeOtherLastRead || otherLastReadAt || workspace.other_last_read_at;

  // Filtered messages based on in-chat search & filter pills
  const displayedMessages = useMemo(() => {
    return messages.filter((m) => {
      // 1. Text Search query
      if (chatSearchQuery.trim()) {
        const q = chatSearchQuery.toLowerCase();
        const contentMatch = m.content?.toLowerCase().includes(q);
        const doiMatch = m.doi_metadata?.title?.toLowerCase().includes(q);
        const postMatch = m.post_metadata?.title?.toLowerCase().includes(q);
        const docMatch = m.document_metadata?.name?.toLowerCase().includes(q);
        const senderMatch = m.sender?.fullName?.toLowerCase().includes(q);
        if (!contentMatch && !doiMatch && !postMatch && !docMatch && !senderMatch) return false;
      }

      // 2. Tab Filter
      if (activeChatFilter === 'media') {
        const hasImg =
          m.message_type === 'image' ||
          Boolean(m.media_urls && m.media_urls.length > 0) ||
          m.content === '📷 Shared photo';
        return hasImg && !m.is_deleted;
      }
      if (activeChatFilter === 'papers') {
        return Boolean(m.doi_metadata) && !m.is_deleted;
      }
      if (activeChatFilter === 'audio') {
        return (
          (m.message_type === 'audio' ||
            m.message_type === 'voice_note' ||
            Boolean(m.audio_metadata) ||
            m.content.startsWith('🎙️ Voice Note')) &&
          !m.is_deleted
        );
      }
      if (activeChatFilter === 'polls') {
        return (
          (m.message_type === 'poll' || m.content.startsWith('📊 Poll:')) &&
          !m.is_deleted
        );
      }
      if (activeChatFilter === 'docs') {
        return (
          (m.message_type === 'document' || Boolean(m.document_metadata)) &&
          !m.is_deleted
        );
      }

      return true;
    });
  }, [messages, chatSearchQuery, activeChatFilter]);

  // --- Handlers: Reactions ---
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await toggleReaction(messageId, emoji);
  };

  const handleLongPressMessage = (message: WorkspaceMessage) => {
    if (message.is_deleted) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setSelectedMessage(message);
    setShowMessageActionMenu(true);
  };

  // --- Handlers: Message Actions ---
  const handleSelectReactionFromMenu = async (emoji: string) => {
    if (!selectedMessage) return;
    const msgId = selectedMessage.id;
    setShowMessageActionMenu(false);
    setSelectedMessage(null);
    await handleToggleReaction(msgId, emoji);
  };

  const handleReplyAction = () => {
    if (!selectedMessage) return;
    setReplyingTo(selectedMessage);
    setShowMessageActionMenu(false);
    setSelectedMessage(null);
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 150);
  };

  const handleCopyAction = async () => {
    if (!selectedMessage) return;
    const textToCopy = selectedMessage.content || '';
    setShowMessageActionMenu(false);
    setSelectedMessage(null);
    if (textToCopy) {
      await Clipboard.setStringAsync(textToCopy);
      if (Platform.OS === 'web') {
        window.alert('Message copied to clipboard');
      } else {
        Alert.alert('Copied', 'Message copied to clipboard');
      }
    }
  };

  const handleEditAction = () => {
    if (!selectedMessage) return;
    setEditingMessage(selectedMessage);
    setEditInputText(selectedMessage.content);
    setShowMessageActionMenu(false);
    setSelectedMessage(null);
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editInputText.trim()) return;
    setIsSavingEdit(true);
    try {
      await editMessage(editingMessage.id, editInputText.trim());
      setEditingMessage(null);
      setEditInputText('');
    } catch (err) {
      console.warn('Edit error:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteAction = () => {
    if (!selectedMessage) return;
    const msg = selectedMessage;
    setShowMessageActionMenu(false);
    setSelectedMessage(null);

    const isMyMsg = msg.sender_id === currentUser?.id;

    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm(
        isMyMsg
          ? 'Delete this message for everyone?'
          : 'Delete this message for yourself?'
      );
      if (confirmDelete) {
        deleteMessage(msg.id, isMyMsg);
      }
    } else {
      if (isMyMsg) {
        Alert.alert(
          'Delete Message',
          'Choose how you want to delete this message:',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete for Me',
              onPress: () => deleteMessage(msg.id, false),
            },
            {
              text: 'Delete for Everyone',
              style: 'destructive',
              onPress: () => deleteMessage(msg.id, true),
            },
          ]
        );
      } else {
        Alert.alert(
          'Delete Message',
          'Delete this message from your chat history?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete for Me',
              style: 'destructive',
              onPress: () => deleteMessage(msg.id, false),
            },
          ]
        );
      }
    }
  };

  const handleForwardAction = () => {
    if (!selectedMessage) return;
    setForwardingMessage(selectedMessage);
    setForwardSearch('');
    setShowMessageActionMenu(false);
    setSelectedMessage(null);
  };

  const handleExecuteForward = async (targetWs: Workspace) => {
    if (!forwardingMessage) return;
    setForwardingTargetId(targetWs.id);
    try {
      const res = await forwardMessage(targetWs.id, forwardingMessage);
      if (res.success) {
        setForwardingMessage(null);
        if (Platform.OS === 'web') {
          window.alert(`Message forwarded to ${targetWs.name || 'Chat'}`);
        } else {
          Alert.alert('Forwarded', `Message forwarded to ${targetWs.name || 'Chat'}`);
        }
      } else {
        if (Platform.OS === 'web') {
          window.alert(res.error || 'Failed to forward message');
        } else {
          Alert.alert('Forward Error', res.error || 'Failed to forward message');
        }
      }
    } catch (err: any) {
      console.warn('Forward error:', err);
    } finally {
      setForwardingTargetId(null);
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

    // Upload audio blob to storage if authenticated so receiver can play it anywhere
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
    });

    if (res.success) {
      setReplyingTo(null);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // Live 1:1 Call Handlers (Phase 3 & 4)
  const handleStartCall = (type: 'audio' | 'video') => {
    const roomId = `room_${workspace.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setActiveCallModal({
      visible: true,
      type,
      roomId,
      isIncoming: false,
    });
  };

  const handleEndCall = async (durationSeconds: number) => {
    const callType = activeCallModal.type;
    setActiveCallModal({ visible: false, type: 'audio' });

    const callMetadata: WorkspaceCallMetadata = {
      call_id: `call_${Date.now()}`,
      call_type: callType,
      duration_seconds: durationSeconds,
      status: durationSeconds > 0 ? 'completed' : 'missed',
    };

    const statusText =
      durationSeconds > 0
        ? `📞 ${callType === 'video' ? 'Video' : 'Voice'} Call ended (${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s)`
        : `📞 Missed ${callType === 'video' ? 'Video' : 'Voice'} Call`;

    await sendMessage({
      workspace_id: workspace.id,
      content: statusText,
      message_type: 'call_log',
      call_metadata: callMetadata,
    });

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Phase 3: Research Paper / Manuscript Search & Share Handler
  const handleSelectPaperToShare = async (paper: Paper) => {
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
    });

    setReplyingTo(null);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Phase 3: Share Researcher Profile Handler
  const handleSearchUsersForProfile = async (query: string) => {
    setUserSearchText(query);
    const clean = query.trim().replace(/^@/, '');
    if (!clean || clean.length < 2) {
      setUserSearchResults([]);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const results = await searchBooffInUsers(clean, 5);
      setUserSearchResults(results);
    } catch {
      setUserSearchResults([]);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleShareProfile = async (userProfile: any) => {
    setShowProfilePickerModal(false);
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
    });

    setReplyingTo(null);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Phase 3: Share BooffIn Post Handler
  const handleSharePost = async () => {
    const title = postTitleInput.trim();
    if (!title) return;

    setShowPostPickerModal(false);
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
    });

    setReplyingTo(null);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Phase 3: Share Workspace / Pod Invite Handler
  const handleShareWorkspaceInvite = async (targetWs: Workspace) => {
    setShowInvitePickerModal(false);
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
    });

    setReplyingTo(null);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Image Picker & Upload
  const handlePickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        if (Platform.OS === 'web') {
          window.alert('Please allow photo permissions.');
        } else {
          Alert.alert('Permission Denied', 'Please grant photo library access to upload photos.');
        }
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      setIsUploadingMedia(true);
      setShowAttachMenu(false);

      if (currentUser?.id) {
        const uploadRes = await uploadPostImage(currentUser.id, asset);
        if (uploadRes.success && uploadRes.url) {
          await sendMessage({
            workspace_id: workspace.id,
            content: '📷 Shared photo',
            message_type: 'image',
            media_urls: [uploadRes.url],
            reply_to_id: replyingTo?.id || null,
          });
          setReplyingTo(null);
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        } else {
          if (Platform.OS === 'web') {
            window.alert(uploadRes.error || 'Failed to upload photo.');
          } else {
            Alert.alert('Upload Failed', uploadRes.error || 'Failed to upload photo.');
          }
        }
      }
    } catch (err: any) {
      console.warn('Pick image error:', err);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // Poll Creation Handler
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
      const res = await sendMessage({
        workspace_id: workspace.id,
        content: `📊 Poll: ${q}\n${validOpts.map((opt) => `• ${opt}`).join('\n')}`,
        message_type: 'poll',
        doi_metadata: null,
        reply_to_id: replyingTo?.id || null,
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

  // Handle Voting in Poll with real-time reaction sync & percentage calculation
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

  // Moderation Handlers: Unfollow
  const handleUnfollow = async () => {
    if (!partner?.id || !currentUser?.id) {
      setShowOptionsMenu(false);
      return;
    }
    try {
      const res = await unfollowUser(partner.id, currentUser.id);
      setShowOptionsMenu(false);
      if (res.success) {
        if (Platform.OS === 'web') {
          window.alert(`Unfollowed ${partner.fullName || 'user'}.`);
        } else {
          Alert.alert('Unfollowed', `You have unfollowed ${partner.fullName || 'user'}.`);
        }
      }
    } catch (err) {
      console.warn('Unfollow error:', err);
      setShowOptionsMenu(false);
    }
  };

  // Moderation Handlers: Block
  const handleBlock = async () => {
    if (!partner?.id) {
      setShowOptionsMenu(false);
      return;
    }

    const confirmBlock = async () => {
      try {
        const res = await blockUser(partner.id);
        setShowOptionsMenu(false);
        if (res.success) {
          if (Platform.OS === 'web') {
            window.alert(`${partner.fullName || 'User'} has been blocked.`);
          } else {
            Alert.alert('Blocked', `${partner.fullName || 'User'} has been blocked.`);
          }
          router.replace('/workspace' as any);
        }
      } catch (err) {
        setShowOptionsMenu(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to block ${partner.fullName || 'this user'}?`)) {
        confirmBlock();
      }
    } else {
      Alert.alert('Block User', `Are you sure you want to block ${partner.fullName || 'this user'}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: confirmBlock },
      ]);
    }
  };

  // Moderation Handlers: Submit Report
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
          window.alert('Thank you. Your report has been submitted to moderation.');
        } else {
          Alert.alert('Report Submitted', 'Your report has been received and will be reviewed by our team.');
        }
      }
    } catch (err) {
      setIsSubmittingReport(false);
      setShowReportModal(false);
    }
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed && !attachedDoi) return;

    const replyId = replyingTo?.id || null;

    let e2eeCipher: string | null = null;
    let e2eeNonce: string | null = null;

    // Encrypt message with zero-knowledge shared session key
    if (currentUser?.id && partner?.id && trimmed && !attachedDoi) {
      try {
        const sessionKey = await deriveSharedSessionKey(currentUser.id, partner.id, workspace.id);
        const enc = await encryptTextMessage(trimmed, sessionKey);
        e2eeCipher = enc.ciphertext;
        e2eeNonce = enc.nonce;
      } catch (err) {
        console.warn('E2EE encryption warning:', err);
      }
    }

    const res = await sendMessage({
      workspace_id: workspace.id,
      content: trimmed || (attachedDoi ? `Shared paper: ${attachedDoi.title}` : ''),
      message_type: attachedDoi ? 'paper_doi' : (e2eeCipher ? 'e2ee_cipher' : 'text'),
      doi_metadata: attachedDoi,
      e2ee_ciphertext: e2eeCipher,
      e2ee_nonce: e2eeNonce,
      reply_to_id: replyId,
    });

    if (res.success) {
      sendTypingIndicator(workspace.id, false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setInputText('');
      setAttachedDoi(null);
      setReplyingTo(null);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } else {
      const err = res.error || 'Failed to send message';
      if (Platform.OS === 'web') {
        window.alert(err);
      }
    }
  };

  const handleResolveDoi = async () => {
    if (!doiQuery.trim()) return;
    setIsResolvingDoi(true);
    setResolvedDoi(null);
    try {
      const paper = await resolvePaper(doiQuery.trim());
      if (paper) {
        setResolvedDoi({
          doi: paper.doi || doiQuery.trim(),
          title: paper.title,
          authors: (paper.authors || []).map((a) => ({ name: a.name, orcid: a.orcid })),
          publicationYear: paper.publicationYear,
          journal: paper.journal,
          url: paper.openAccessUrl || paper.canonicalUrl,
          citationCount: paper.citationCount,
        });
      }
    } catch {
      // Ignored
    } finally {
      setIsResolvingDoi(false);
    }
  };

  const handleAttachResolvedDoi = () => {
    if (resolvedDoi) {
      setAttachedDoi(resolvedDoi);
      setShowDoiModal(false);
      setShowAttachMenu(false);
      setDoiQuery('');
      setResolvedDoi(null);
    }
  };

  // Phase 4: Chat Management Handlers
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
      // If we just archived it, navigate back to list
      router.back();
    }
  };

  const handleOpenMuteSelector = () => {
    setShowOptionsMenu(false);
    setShowMuteModal(true);
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
    await deleteWorkspaceLocally(workspace.id);
    setIsProcessingChatAction(false);
    setShowDeleteChatModal(false);
    router.replace('/workspace');
  };

  // Render Single Message Item
  const renderMessageItem = ({ item, index }: { item: WorkspaceMessage; index: number }) => {
    const isMe = item.sender_id === currentUser?.id;
    const isDeleted = Boolean(item.is_deleted);

    const extractImageUrl = (m: WorkspaceMessage) => {
      // Exclude audio notes, voice notes, documents, polls, call logs
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
      if (typeof m.content === 'string' && (m.message_type === 'image' || m.content === '📷 Shared photo')) {
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
        name: item.content?.replace(/^🤝\s*(?:Pod Invite:\s*)?/, '').trim() || 'Quantum AI Inner Circle',
        description: 'Collaborative private research pod on BoffIn',
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

    const hasDoi = Boolean(resolvedDoiMeta);
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
      const lines = item.content.split('\n').filter(Boolean);
      pollQuestionText = lines[0].replace('📊 Poll:', '').trim();
      pollOptionItems = lines.slice(1).map((line, idx) => ({
        id: `opt_${idx}`,
        text: line.replace(/^[•\-\d\.]+\s*/, '').trim(),
      }));
      if (pollOptionItems.length === 0) {
        pollOptionItems = [
          { id: 'opt_0', text: 'Agree / Support' },
          { id: 'opt_1', text: 'Needs Revision' },
        ];
      }
    }

    const mySelectedVote = localPollVotes[item.id];

    // Reactions calculations (excluding poll votes)
    const reactionsMap = item.reactions || {};
    const reactionEntries = Object.entries(reactionsMap).filter(
      ([k, userIds]) => !k.startsWith('vote:') && !k.startsWith('poll:') && Array.isArray(userIds) && userIds.length > 0
    );

    const isFirstOfDateGroup =
      index === 0 ||
      getDateLabel(item.created_at) !== getDateLabel(displayedMessages[index - 1]?.created_at);

    const hasMediaContent = isAudio || hasDoi || isPost || isProfile || isWorkspaceInvite || isDocument || isPoll;

    return (
      <View key={item.id} style={{ width: '100%' }}>
        {isFirstOfDateGroup && (
          <View style={styles.dateSeparatorRow}>
            <View style={styles.dateSeparatorLine} />
            <View style={styles.dateSeparatorPill}>
              <Text style={styles.dateSeparatorText}>{getDateLabel(item.created_at)}</Text>
            </View>
            <View style={styles.dateSeparatorLine} />
          </View>
        )}

        <View
          style={[
            styles.messageRow,
            isMe ? styles.myMessageRow : styles.otherMessageRow,
          ]}
        >
        {!isMe && (
          <Avatar
            uri={item.sender?.avatarUrl || partner?.avatarUrl || undefined}
            name={item.sender?.fullName || partner?.fullName || 'Researcher'}
            size="sm"
            style={{ marginRight: 8, alignSelf: 'flex-end', marginBottom: 4 }}
          />
        )}

        <View style={[styles.bubbleWrapper, hasMediaContent && styles.bubbleWithMedia]}>
          <TouchableOpacity
            activeOpacity={0.92}
            onLongPress={() => handleLongPressMessage(item)}
            delayLongPress={280}
            style={[
              styles.messageBubble,
              isDeleted
                ? styles.deletedBubble
                : hasDoi || isPost || isProfile || isWorkspaceInvite || isDocument
                ? styles.cardBubble
                : isPoll
                ? styles.pollBubble
                : isCallLog
                ? styles.callLogBubble
                : isAudio
                ? isMe
                  ? styles.myBubble
                  : styles.otherBubble
                : isMe
                ? styles.myBubble
                : styles.otherBubble,
              hasMediaContent && styles.bubbleWithMedia,
            ]}
          >
            {/* Quoted Reply Banner inside bubble */}
            {item.reply_to_message && !isDeleted && (
              <View
                style={[
                  styles.quotedBubbleBlock,
                  isMe ? styles.quotedBubbleBlockMy : styles.quotedBubbleBlockOther,
                ]}
              >
                <View
                  style={[
                    styles.quotedAccentBar,
                    isMe ? styles.quotedAccentBarMy : styles.quotedAccentBarOther,
                  ]}
                />
                <View style={styles.quotedContentWrap}>
                  <Text
                    style={[
                      styles.quotedSenderName,
                      isMe ? styles.quotedSenderNameMy : styles.quotedSenderNameOther,
                    ]}
                    numberOfLines={1}
                  >
                    {item.reply_to_message.sender_name || 'Researcher'}
                  </Text>
                  <Text
                    style={[
                      styles.quotedSnippetText,
                      isMe ? styles.quotedSnippetTextMy : styles.quotedSnippetTextOther,
                    ]}
                    numberOfLines={1}
                  >
                    {item.reply_to_message.content}
                  </Text>
                </View>
              </View>
            )}

            {/* Deleted Message Notice */}
            {isDeleted ? (
              <View style={styles.deletedContentRow}>
                <ShieldAlert size={14} color="#94A3B8" />
                <Text style={styles.deletedMessageText}>This message was deleted</Text>
              </View>
            ) : (
              <>
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

                {/* Shared BooffIn Post Card (Phase 3) */}
                {isPost && resolvedPostMeta && (
                  <ChatPostCard postMeta={resolvedPostMeta} isMe={isMe} />
                )}

                {/* Shared Researcher Profile Card (Phase 3) */}
                {isProfile && resolvedProfileMeta && (
                  <ChatProfileCard profileMeta={resolvedProfileMeta} isMe={isMe} />
                )}

                {/* Shared Workspace / Pod Invite Card (Phase 3) */}
                {isWorkspaceInvite && resolvedInviteMeta && (
                  <ChatWorkspaceInviteCard inviteMeta={resolvedInviteMeta} isMe={isMe} />
                )}

                {/* Shared Document / PDF Manuscript Card (Phase 3) */}
                {isDocument && resolvedDocMeta && (
                  <ChatDocumentCard docMeta={resolvedDocMeta} isMe={isMe} />
                )}

                {/* Call Log Badge (Phase 3) */}
                {isCallLog && (
                  <View style={styles.callLogRow}>
                    {resolvedCallMeta?.status === 'missed' ? (
                      <PhoneMissed size={16} color="#EF4444" />
                    ) : (
                      <PhoneCall size={16} color="#164E3F" />
                    )}
                    <Text style={styles.callLogText}>{item.content}</Text>
                  </View>
                )}

                {/* DOI Paper Attachment */}
                {resolvedDoiMeta && (
                  <WorkspaceDoiCard doiMeta={resolvedDoiMeta} />
                )}

                {/* Image Attachment with click to open full-screen lightbox */}
                {isImage && (
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

                {/* Interactive Poll / Voting */}
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
                        const optId = key.replace('vote:', '');
                        if (optionVotersMap[optId]) {
                          userIds.forEach((uid) => optionVotersMap[optId].add(uid));
                        }
                      }
                    });
                  }

                  // 2. Poll data if attached
                  if (resolvedPollData && Array.isArray(resolvedPollData.options)) {
                    resolvedPollData.options.forEach((opt: any) => {
                      if (optionVotersMap[opt.id] && Array.isArray(opt.votes)) {
                        opt.votes.forEach((uid: string) => optionVotersMap[opt.id].add(uid));
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

                {/* Text Content */}
                {(() => {
                  const isEncrypted = Boolean(item.e2ee_ciphertext);
                  const displayMessageText = isEncrypted
                    ? (decryptedTextMap[item.id] || item.content || '🔒 Encrypted message')
                    : item.content;

                  if (
                    displayMessageText &&
                    !hasDoi &&
                    !isPoll &&
                    !isAudio &&
                    !isPost &&
                    !isProfile &&
                    !isWorkspaceInvite &&
                    !isDocument &&
                    !isCallLog &&
                    (!isImage || (item.content !== '📷 Shared photo' && item.content !== msgImageUrl))
                  ) {
                    return (
                      <Text
                        style={[
                          styles.messageText,
                          isMe ? styles.myMessageText : styles.otherMessageText,
                        ]}
                      >
                        {displayMessageText}
                      </Text>
                    );
                  }
                  return null;
                })()}
              </>
            )}

            {/* Timestamp & status footer */}
            <View style={styles.msgFooter}>
              {Boolean(item.e2ee_ciphertext) && !isDeleted && (
                <Lock size={10} color={isMe ? '#A7F3D0' : '#166534'} style={{ marginRight: 4 }} />
              )}
              {item.is_edited && !isDeleted && (
                <Text
                  style={[
                    styles.editedLabel,
                    isMe ? styles.myEditedLabel : styles.otherEditedLabel,
                  ]}
                >
                  (edited) •{' '}
                </Text>
              )}
              <Text
                style={[
                  styles.timestamp,
                  isDeleted
                    ? styles.deletedTimestamp
                    : hasDoi || isPoll || isPost || isProfile || isWorkspaceInvite || isDocument || isCallLog
                    ? styles.doiTimestamp
                    : isMe
                    ? styles.myTimestamp
                    : styles.otherTimestamp,
                ]}
              >
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {isMe && !isDeleted && (
                effectiveOtherLastReadAt && new Date(effectiveOtherLastReadAt).getTime() >= new Date(item.created_at).getTime() ? (
                  <CheckCheck size={13} color="#34D399" style={{ marginLeft: 4 }} />
                ) : (
                  <CheckCheck size={13} color="#94A3B8" style={{ marginLeft: 4 }} />
                )
              )}
            </View>
          </TouchableOpacity>

          {/* In-Bubble Emoji Reaction Badges Row */}
          {reactionEntries.length > 0 && !isDeleted && (
            <View
              style={[
                styles.reactionsBadgeRow,
                isMe ? styles.myReactionsBadgeRow : styles.otherReactionsBadgeRow,
              ]}
            >
              {reactionEntries.map(([emoji, userIds]) => {
                const userReacted = currentUser?.id ? userIds.includes(currentUser.id) : false;
                return (
                  <TouchableOpacity
                    key={emoji}
                    activeOpacity={0.7}
                    onPress={() => handleToggleReaction(item.id, emoji)}
                    style={[
                      styles.reactionBadgePill,
                      userReacted && styles.reactionBadgePillActive,
                    ]}
                  >
                    <Text style={styles.reactionBadgeEmoji}>{emoji}</Text>
                    {userIds.length > 1 && (
                      <Text
                        style={[
                          styles.reactionBadgeCount,
                          userReacted && styles.reactionBadgeCountActive,
                        ]}
                      >
                        {userIds.length}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedMessage(item);
                  setShowMessageActionMenu(true);
                }}
                style={styles.addReactionBadgeBtn}
              >
                <Plus size={11} color="#64748B" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      </View>
    );
  };

  // Filtered list of forward targets
  const allForwardTargets: Workspace[] = [...dms, ...innerCircles, ...communities].filter(
    (w) => w.id !== workspace.id
  );
  const filteredForwardTargets = allForwardTargets.filter((w) =>
    (w.name || w.other_user?.fullName || 'Chat')
      .toLowerCase()
      .includes(forwardSearch.toLowerCase())
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={20} color="#164E3F" />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowInfoModal(true)}
          style={styles.headerProfile}
        >
          <View style={styles.avatarPresenceWrapper}>
            <Avatar
              uri={partner?.avatarUrl || undefined}
              name={partner?.fullName || workspace.name || 'Researcher'}
              size="sm"
            />
            {isPartnerOnline && <View style={styles.presenceDot} />}
          </View>

          <View style={styles.headerTitleCol}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {partner?.fullName || workspace.name || 'Researcher'}
              </Text>
              {isPinned && (
                <View style={styles.headerPinBadge}>
                  <Pin size={11} color="#164E3F" fill="#164E3F" />
                </View>
              )}
              {isMuted && (
                <View style={styles.headerMuteBadge}>
                  <BellOff size={11} color="#64748B" />
                </View>
              )}
            </View>
            <Text
              style={[
                styles.headerSubtext,
                isPartnerOnline && styles.headerSubtextActive,
              ]}
              numberOfLines={1}
            >
              {isPartnerOnline ? 'Active now' : partner?.academicTitle || 'Offline'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          {/* Audio Call Button (Future Feature - Gated by FEATURE_FLAGS) */}
          {FEATURE_FLAGS.ENABLE_VOICE_VIDEO_CALLS && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleStartCall('audio')}
              style={styles.headerActionBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Phone size={18} color="#164E3F" />
            </TouchableOpacity>
          )}

          {/* Video Call Button (Future Feature - Gated by FEATURE_FLAGS) */}
          {FEATURE_FLAGS.ENABLE_VOICE_VIDEO_CALLS && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleStartCall('video')}
              style={styles.headerActionBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Video size={19} color="#164E3F" />
            </TouchableOpacity>
          )}

          {/* Search Trigger */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowSearchBar(!showSearchBar)}
            style={styles.headerActionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Search size={18} color={showSearchBar ? '#164E3F' : '#64748B'} />
          </TouchableOpacity>

          {/* Media & Papers Gallery Trigger */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowGalleryModal(true)}
            style={styles.headerActionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <FolderOpen size={18} color="#64748B" />
          </TouchableOpacity>

          {/* 3-dot Options Menu */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowOptionsMenu(true)}
            style={styles.headerActionBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MoreVertical size={20} color="#164E3F" />
          </TouchableOpacity>
        </View>
      </View>

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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
            {(['all', 'media', 'papers', 'audio', 'polls', 'docs'] as ChatFilterType[]).map((filter) => {
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
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                >
                  <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {chatSearchQuery.trim() && (
            <Text style={styles.searchMatchCountText}>
              {displayedMessages.length} message{displayedMessages.length === 1 ? '' : 's'} found
            </Text>
          )}
        </View>
      )}

      {/* Messages List */}
      {isMessagesLoading && messages.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color="#164E3F" />
          <Text style={styles.loaderText}>Loading conversation...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={displayedMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onScroll={(e) => {
            const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
            const paddingToBottom = 150;
            const isClose = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
            isAtBottomRef.current = isClose;
          }}
          onContentSizeChange={() => {
            if (!hasInitialScrolledRef.current || isAtBottomRef.current) {
              flatListRef.current?.scrollToEnd({ animated: hasInitialScrolledRef.current });
              hasInitialScrolledRef.current = true;
            }
          }}
          onLayout={() => {
            if (!hasInitialScrolledRef.current || isAtBottomRef.current) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Avatar
                uri={partner?.avatarUrl || undefined}
                name={partner?.fullName || 'Researcher'}
                size="lg"
              />
              <Text style={styles.emptyTitle}>
                {chatSearchQuery.trim() || activeChatFilter !== 'all'
                  ? 'No matching messages'
                  : partner?.fullName || 'Researcher'}
              </Text>
              <Text style={styles.emptyBio}>
                {chatSearchQuery.trim() || activeChatFilter !== 'all'
                  ? 'Try searching with another keyword or clearing filters.'
                  : `${partner?.academicTitle || 'Academic Researcher'}${partner?.institution ? ` · ${partner.institution}` : ''}`}
              </Text>
              {!chatSearchQuery && activeChatFilter === 'all' && (
                <>
                  <View style={styles.mutualFollowBadge}>
                    <CheckCircle2 size={13} color="#164E3F" />
                    <Text style={styles.mutualFollowText}>Mutual Follow Verified</Text>
                  </View>
                  <Text style={styles.emptyPrompt}>
                    You can now message each other directly and collaborate on research papers.
                  </Text>

                  {/* Quick Starter Chips */}
                  <View style={styles.quickStartersRow}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setInputText('Hey! What are you working on today?')}
                      style={styles.quickStarterChip}
                    >
                      <Text style={styles.quickStarterChipText}>👋 Say Hello</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setInputText('Looks awesome! Still on for discussing that project later?')}
                      style={styles.quickStarterChip}
                    >
                      <Text style={styles.quickStarterChipText}>🔬 Project Review</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setShowDoiModal(true)}
                      style={styles.quickStarterChip}
                    >
                      <Text style={styles.quickStarterChipText}>📄 Share DOI Paper</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          }
        />
      )}

      {/* Uploading Indicator */}
      {isUploadingMedia && (
        <View style={styles.uploadingMediaBanner}>
          <ActivityIndicator size="small" color="#164E3F" />
          <Text style={styles.uploadingMediaText}>Uploading image...</Text>
        </View>
      )}

      {/* Realtime Partner Animated Typing Bubble Indicator */}
      {isPartnerTyping && typingPartnerName && (
        <AnimatedTypingIndicator name={typingPartnerName} />
      )}

      {/* Docked Quoted Reply Bar */}
      {replyingTo && (
        <View style={styles.replyingToDock}>
          <View style={styles.replyingAccentBar} />
          <View style={styles.replyingInfoWrap}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Reply size={12} color="#164E3F" />
              <Text style={styles.replyingToLabel}>
                Replying to{' '}
                <Text style={styles.replyingToSender}>
                  {replyingTo.sender?.fullName ||
                    (replyingTo.sender_id === currentUser?.id ? 'Yourself' : partner?.fullName) ||
                    'Researcher'}
                </Text>
              </Text>
            </View>
            <Text style={styles.replyingSnippetText} numberOfLines={1}>
              {replyingTo.content || (replyingTo.doi_metadata ? '📄 Shared paper' : '📷 Photo')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setReplyingTo(null)}
            style={styles.replyCancelBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={16} color="#64748B" />
          </TouchableOpacity>
        </View>
      )}

      {/* Attached DOI Banner Preview */}
      {attachedDoi && (
        <View style={styles.attachedDoiPreview}>
          <View style={{ flex: 1 }}>
            <View style={styles.attachedDoiBadge}>
              <FileText size={11} color="#164E3F" />
              <Text style={styles.attachedDoiBadgeText}>ATTACHED PAPER</Text>
            </View>
            <Text style={styles.attachedDoiTitle} numberOfLines={1}>
              {attachedDoi.title}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setAttachedDoi(null)} style={styles.removeAttachedBtn}>
            <X size={16} color="#64748B" />
          </TouchableOpacity>
        </View>
      )}

      {/* Live Voice Note Recorder Dock */}
      {isRecordingVoice ? (
        <VoiceNoteRecorder
          onSendVoiceNote={handleSendVoiceNote}
          onCancel={() => setIsRecordingVoice(false)}
        />
      ) : (
        /* Bottom Input Dock with Photo, Voice Note (Mic), Attachment Menu, and Send */
        <View style={styles.bottomDockContainer}>
          {/* Capsule Input */}
          <View style={styles.inputCapsule}>
            {/* 1. Camera icon: Direct Photo Upload */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handlePickImage}
              style={styles.mediaIconBtn}
            >
              <Camera size={19} color="#64748B" />
            </TouchableOpacity>

            <TextInput
              ref={textInputRef}
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
                handleUserTyping(text);
              }}
              placeholder={replyingTo ? 'Write a reply...' : 'Message...'}
              placeholderTextColor="#94A3B8"
              style={styles.textInput}
              multiline
              maxLength={2000}
            />

            {/* 2. Paperclip Attachment */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowAttachMenu(true)}
              style={styles.mediaIconBtn}
            >
              <Paperclip size={19} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Voice Note Mic Button or Detached Send Button */}
          {!inputText.trim() && !attachedDoi ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsRecordingVoice(true)}
              style={styles.detachedMicBtn}
            >
              <Mic size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isSending}
              onPress={handleSend}
              style={styles.detachedSendBtn}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Send size={16} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Incoming P2P Audio / Video Call Ringing Screen & Call Modal (Future Feature - Gated) */}
      {/* ------------------------------------------------------------- */}
      {FEATURE_FLAGS.ENABLE_VOICE_VIDEO_CALLS && (
        <>
          <IncomingCallModal
            incomingCall={incomingCall}
            onAccept={(call) => {
              setActiveCallModal({
                visible: true,
                type: call.callType,
                roomId: call.roomId,
                isIncoming: true,
              });
              setIncomingCall(null);
            }}
            onDecline={(call) => {
              if (currentUser?.id) {
                webrtcSignaling.sendSignal(call.roomId, 'call_rejected', {
                  senderId: currentUser.id,
                  reason: 'declined',
                }).catch(() => {});
              }
              setIncomingCall(null);
            }}
          />

          <ChatCallModal
            visible={activeCallModal.visible}
            callType={activeCallModal.type}
            partner={partner}
            currentUserId={currentUser?.id}
            currentUserProfile={currentUser ? {
              id: currentUser.id,
              fullName: currentUser.fullName || (currentUser as any).name || (currentUser as any).full_name || 'Researcher',
              avatarUrl: currentUser.avatarUrl || (currentUser as any).avatar_url,
              academicTitle: currentUser.academicTitle || (currentUser as any).academic_title || 'Academic Collaborator',
            } : null}
            roomId={activeCallModal.roomId}
            isIncoming={activeCallModal.isIncoming}
            onEndCall={handleEndCall}
          />
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Chat Media, Papers, Audio & Polls Gallery */}
      {/* ------------------------------------------------------------- */}
      <ChatMediaGalleryModal
        visible={showGalleryModal}
        onClose={() => setShowGalleryModal(false)}
        messages={messages}
        chatTitle={partner?.fullName || workspace.name || 'Chat Media'}
      />

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Share Researcher Profile Picker (Phase 3) */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={showProfilePickerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfilePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.forwardModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <User size={18} color="#164E3F" />
                <Text style={styles.modalTitle}>Share Researcher Profile</Text>
              </View>
              <TouchableOpacity onPress={() => setShowProfilePickerModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Search for a researcher on BooffIn to share their profile card in this chat.
            </Text>

            <View style={styles.forwardSearchRow}>
              <Search size={16} color="#94A3B8" />
              <TextInput
                value={userSearchText}
                onChangeText={handleSearchUsersForProfile}
                placeholder="Search by name, handle, or institution..."
                placeholderTextColor="#94A3B8"
                style={styles.forwardSearchInput}
                autoFocus
              />
            </View>

            {isSearchingUsers ? (
              <ActivityIndicator size="small" color="#164E3F" style={{ marginVertical: 16 }} />
            ) : (
              <ScrollView style={styles.forwardTargetsList} showsVerticalScrollIndicator={false}>
                {userSearchResults.length === 0 ? (
                  <Text style={styles.forwardEmptyText}>
                    {userSearchText.trim().length < 2 ? 'Type at least 2 letters to search' : 'No researchers found'}
                  </Text>
                ) : (
                  userSearchResults.map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      activeOpacity={0.7}
                      onPress={() => handleShareProfile(u)}
                      style={styles.forwardTargetItem}
                    >
                      <Avatar
                        uri={u.avatarUrl || u.avatar_url || undefined}
                        name={u.fullName || u.name || 'Researcher'}
                        size="sm"
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.forwardTargetTitle} numberOfLines={1}>
                          {u.fullName || u.name || 'Researcher'}
                        </Text>
                        <Text style={styles.forwardTargetType} numberOfLines={1}>
                          {u.academicTitle || u.institution || `@${u.handle || 'researcher'}`}
                        </Text>
                      </View>
                      <View style={styles.forwardSendBtn}>
                        <Text style={styles.forwardSendBtnText}>Share</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Share Workspace / Pod Invite Picker (Phase 3) */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={showInvitePickerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInvitePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.forwardModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Users size={18} color="#164E3F" />
                <Text style={styles.modalTitle}>Share Pod / Community Invite</Text>
              </View>
              <TouchableOpacity onPress={() => setShowInvitePickerModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Select one of your research pods or communities to share an invite card.
            </Text>

            <ScrollView style={styles.forwardTargetsList} showsVerticalScrollIndicator={false}>
              {[...innerCircles, ...communities].length === 0 ? (
                <Text style={styles.forwardEmptyText}>No active pods found</Text>
              ) : (
                [...innerCircles, ...communities].map((ws) => (
                  <TouchableOpacity
                    key={ws.id}
                    activeOpacity={0.7}
                    onPress={() => handleShareWorkspaceInvite(ws)}
                    style={styles.forwardTargetItem}
                  >
                    <Avatar uri={ws.avatar_url || undefined} name={ws.name} size="sm" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.forwardTargetTitle} numberOfLines={1}>
                        {ws.name}
                      </Text>
                      <Text style={styles.forwardTargetType}>
                        {ws.type === 'inner_circle' ? '🛡️ Inner Circle' : '🌐 Community'}
                      </Text>
                    </View>
                    <View style={styles.forwardSendBtn}>
                      <Text style={styles.forwardSendBtnText}>Send Invite</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Share BooffIn Post Picker (Phase 3) */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={showPostPickerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPostPickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pollModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} color="#164E3F" />
                <Text style={styles.modalTitle}>Share BooffIn Post</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPostPickerModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Enter post title and summary snippet to embed as an interactive card.
            </Text>

            <Text style={styles.pollInputLabel}>Post Title</Text>
            <TextInput
              value={postTitleInput}
              onChangeText={setPostTitleInput}
              placeholder="e.g. CRISPR base editing breakthroughs in mammalian cells..."
              placeholderTextColor="#94A3B8"
              style={styles.pollQuestionInput}
            />

            <Text style={[styles.pollInputLabel, { marginTop: 12 }]}>Summary Snippet (Optional)</Text>
            <TextInput
              value={postSnippetInput}
              onChangeText={setPostSnippetInput}
              placeholder="Brief summary of findings or insights..."
              placeholderTextColor="#94A3B8"
              style={styles.reportDetailsInput}
              multiline
            />

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={!postTitleInput.trim()}
              onPress={handleSharePost}
              style={[
                styles.createPollSubmitBtn,
                !postTitleInput.trim() && styles.createPollSubmitBtnDisabled,
              ]}
            >
              <Text style={styles.createPollSubmitBtnText}>Share Post in Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Attachment Menu (Updated with Phase 3 Sharing Options) */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={showAttachMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttachMenu(false)}
      >
        <TouchableOpacity
          style={styles.optionsOverlay}
          activeOpacity={1}
          onPress={() => setShowAttachMenu(false)}
        >
          <View style={styles.optionsSheet}>
            <View style={styles.optionsHandleBar} />
            <Text style={styles.optionsSheetTitle}>Attach to Message</Text>

            {/* 1. Attach PDF Manuscript / Document (Phase 3) */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowAttachMenu(false);
                setShowDoiModal(true);
              }}
              style={styles.optionsItemRow}
            >
              <View style={[styles.attachIconWrap, { backgroundColor: '#FEF2F2' }]}>
                <FileUp size={20} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attachItemTitle}>PDF Manuscript / Document</Text>
                <Text style={styles.attachItemSubtitle}>Search and share preprint PDFs, datasets, and papers</Text>
              </View>
            </TouchableOpacity>

            {/* 3. Share Researcher Profile (Phase 3) */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowAttachMenu(false);
                setShowProfilePickerModal(true);
              }}
              style={styles.optionsItemRow}
            >
              <View style={[styles.attachIconWrap, { backgroundColor: '#F0FDF4' }]}>
                <User size={20} color="#164E3F" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attachItemTitle}>Researcher Profile</Text>
                <Text style={styles.attachItemSubtitle}>Share a researcher contact card with ORCID badge</Text>
              </View>
            </TouchableOpacity>



            {/* 6. Create Poll / Voting */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowAttachMenu(false);
                setShowPollModal(true);
              }}
              style={styles.optionsItemRow}
            >
              <View style={[styles.attachIconWrap, { backgroundColor: '#ECFDF5' }]}>
                <Vote size={20} color="#164E3F" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attachItemTitle}>Create Poll / Voting</Text>
                <Text style={styles.attachItemSubtitle}>Ask collaborators to vote on questions or proposals</Text>
              </View>
            </TouchableOpacity>

            {/* 7. Photo / Gallery */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowAttachMenu(false);
                handlePickImage();
              }}
              style={styles.optionsItemRow}
            >
              <View style={[styles.attachIconWrap, { backgroundColor: '#FDF2F8' }]}>
                <ImageIcon size={20} color="#DB2777" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attachItemTitle}>Photo / Gallery</Text>
                <Text style={styles.attachItemSubtitle}>Share figures, data plots, and lab images</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowAttachMenu(false)}
              style={styles.optionsCancelBtn}
            >
              <Text style={styles.optionsCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Message Long-Press Context Menu & Emoji Reaction Bar */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={showMessageActionMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMessageActionMenu(false)}
      >
        <TouchableOpacity
          style={styles.actionMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowMessageActionMenu(false)}
        >
          <View style={styles.actionMenuCard}>
            {/* Top Quick Emoji Reactions Bar */}
            <View style={styles.emojiReactionsRow}>
              {QUICK_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  activeOpacity={0.7}
                  onPress={() => handleSelectReactionFromMenu(emoji)}
                  style={styles.emojiReactionBtn}
                >
                  <Text style={styles.emojiReactionText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.actionMenuDivider} />

            {/* Action Items */}
            {/* 1. Reply */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleReplyAction}
              style={styles.actionMenuRow}
            >
              <Reply size={18} color="#164E3F" />
              <Text style={styles.actionMenuRowText}>Reply</Text>
            </TouchableOpacity>

            {/* 2. Copy */}
            {selectedMessage?.content && !selectedMessage.is_deleted && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleCopyAction}
                style={styles.actionMenuRow}
              >
                <Copy size={18} color="#0F172A" />
                <Text style={styles.actionMenuRowText}>Copy Text</Text>
              </TouchableOpacity>
            )}

            {/* 3. Forward */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleForwardAction}
              style={styles.actionMenuRow}
            >
              <CornerUpRight size={18} color="#0F172A" />
              <Text style={styles.actionMenuRowText}>Forward</Text>
            </TouchableOpacity>

            {/* 4. Edit (Only for own text messages) */}
            {selectedMessage?.sender_id === currentUser?.id &&
              !selectedMessage?.is_deleted &&
              selectedMessage?.message_type === 'text' && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleEditAction}
                  style={styles.actionMenuRow}
                >
                  <Pencil size={18} color="#0F172A" />
                  <Text style={styles.actionMenuRowText}>Edit Message</Text>
                </TouchableOpacity>
              )}

            {/* 5. Delete */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDeleteAction}
              style={styles.actionMenuRow}
            >
              <Trash2 size={18} color="#DC2626" />
              <Text style={[styles.actionMenuRowText, { color: '#DC2626' }]}>
                {selectedMessage?.sender_id === currentUser?.id ? 'Delete Message' : 'Delete for Me'}
              </Text>
            </TouchableOpacity>

            {/* 6. Report (If other user's message) */}
            {selectedMessage?.sender_id !== currentUser?.id && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowMessageActionMenu(false);
                  setShowReportModal(true);
                }}
                style={styles.actionMenuRow}
              >
                <Flag size={18} color="#DC2626" />
                <Text style={[styles.actionMenuRowText, { color: '#DC2626' }]}>Report</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Edit Message */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={Boolean(editingMessage)}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingMessage(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Pencil size={18} color="#164E3F" />
                <Text style={styles.modalTitle}>Edit Message</Text>
              </View>
              <TouchableOpacity onPress={() => setEditingMessage(null)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TextInput
              value={editInputText}
              onChangeText={setEditInputText}
              placeholder="Edit your message..."
              placeholderTextColor="#94A3B8"
              style={styles.editTextInput}
              multiline
              autoFocus
            />

            <View style={styles.editModalButtonsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setEditingMessage(null)}
                style={styles.editCancelBtn}
              >
                <Text style={styles.editCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isSavingEdit || !editInputText.trim()}
                onPress={handleSaveEdit}
                style={[
                  styles.editSaveBtn,
                  !editInputText.trim() && styles.editSaveBtnDisabled,
                ]}
              >
                {isSavingEdit ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.editSaveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Forward Message Picker */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={Boolean(forwardingMessage)}
        transparent
        animationType="slide"
        onRequestClose={() => setForwardingMessage(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.forwardModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CornerUpRight size={18} color="#164E3F" />
                <Text style={styles.modalTitle}>Forward Message</Text>
              </View>
              <TouchableOpacity onPress={() => setForwardingMessage(null)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Message preview snippet */}
            <View style={styles.forwardPreviewSnippet}>
              <Text style={styles.forwardPreviewLabel}>FORWARDING CONTENT</Text>
              <Text style={styles.forwardPreviewText} numberOfLines={2}>
                {forwardingMessage?.content || (forwardingMessage?.doi_metadata ? '📄 Research Paper' : '📷 Photo')}
              </Text>
            </View>

            {/* Search destinations */}
            <View style={styles.forwardSearchRow}>
              <Search size={16} color="#94A3B8" />
              <TextInput
                value={forwardSearch}
                onChangeText={setForwardSearch}
                placeholder="Search chats, circles, communities..."
                placeholderTextColor="#94A3B8"
                style={styles.forwardSearchInput}
              />
            </View>

            {/* Destinations List */}
            <ScrollView style={styles.forwardTargetsList} showsVerticalScrollIndicator={false}>
              {filteredForwardTargets.length === 0 ? (
                <Text style={styles.forwardEmptyText}>No conversations found</Text>
              ) : (
                filteredForwardTargets.map((item) => {
                  const title = item.name || item.other_user?.fullName || 'Workspace';
                  const isPending = forwardingTargetId === item.id;
                  return (
                    <View key={item.id} style={styles.forwardTargetItem}>
                      <Avatar
                        uri={item.avatar_url || item.other_user?.avatarUrl || undefined}
                        name={title}
                        size="sm"
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.forwardTargetTitle} numberOfLines={1}>
                          {title}
                        </Text>
                        <Text style={styles.forwardTargetType}>
                          {item.type === 'dm'
                            ? 'Direct Message'
                            : item.type === 'inner_circle'
                            ? 'Inner Circle'
                            : 'Community'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        disabled={isPending}
                        onPress={() => handleExecuteForward(item)}
                        style={styles.forwardSendBtn}
                      >
                        {isPending ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.forwardSendBtnText}>Send</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Create Poll / Voting */}
      <Modal
        visible={showPollModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPollModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pollModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Vote size={20} color="#164E3F" />
                <Text style={styles.modalTitle}>Create Research Poll</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPollModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Ask a question and provide options for your research collaborators.
            </Text>

            <Text style={styles.pollInputLabel}>Poll Question</Text>
            <TextInput
              value={pollQuestion}
              onChangeText={setPollQuestion}
              placeholder="e.g. Which journal should we target for submission?"
              placeholderTextColor="#94A3B8"
              style={styles.pollQuestionInput}
            />

            <Text style={[styles.pollInputLabel, { marginTop: 12 }]}>Options</Text>
            {pollOptions.map((opt, idx) => (
              <View key={idx} style={styles.pollOptionRow}>
                <TextInput
                  value={opt}
                  onChangeText={(val) => {
                    const next = [...pollOptions];
                    next[idx] = val;
                    setPollOptions(next);
                  }}
                  placeholder={`Option ${idx + 1}`}
                  placeholderTextColor="#94A3B8"
                  style={styles.pollOptionInput}
                />
                {pollOptions.length > 2 && (
                  <TouchableOpacity
                    onPress={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                    style={styles.removeOptionBtn}
                  >
                    <X size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {pollOptions.length < 5 && (
              <TouchableOpacity
                onPress={() => setPollOptions([...pollOptions, ''])}
                style={styles.addOptionBtn}
              >
                <Plus size={16} color="#164E3F" />
                <Text style={styles.addOptionBtnText}>Add Option</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isCreatingPoll || !pollQuestion.trim()}
              onPress={handleCreatePoll}
              style={[styles.createPollSubmitBtn, !pollQuestion.trim() && styles.createPollSubmitBtnDisabled]}
            >
              {isCreatingPoll ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.createPollSubmitBtnText}>Send Poll</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Options Menu (Report, Block, Unfollow, Media Gallery) */}
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
              {partner?.fullName || 'Conversation Settings'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {/* 1. Pin / Unpin Conversation */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleTogglePin}
                style={styles.optionsItemRow}
              >
                {isPinned ? (
                  <PinOff size={20} color="#164E3F" />
                ) : (
                  <Pin size={20} color="#164E3F" fill="#164E3F" />
                )}
                <Text style={[styles.optionsItemText, { color: '#164E3F' }]}>
                  {isPinned ? 'Unpin Conversation' : 'Pin Conversation'}
                </Text>
              </TouchableOpacity>

              {/* 2. Archive / Unarchive Chat */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleToggleArchive}
                style={styles.optionsItemRow}
              >
                <Archive size={20} color="#164E3F" />
                <Text style={[styles.optionsItemText, { color: '#164E3F' }]}>
                  {isArchived ? 'Unarchive Chat' : 'Archive Chat'}
                </Text>
              </TouchableOpacity>

              {/* 3. Mute / Unmute Notifications */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleOpenMuteSelector}
                style={styles.optionsItemRow}
              >
                {isMuted ? (
                  <Bell size={20} color="#164E3F" />
                ) : (
                  <BellOff size={20} color="#164E3F" />
                )}
                <Text style={[styles.optionsItemText, { color: '#164E3F' }]}>
                  {isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
                </Text>
              </TouchableOpacity>

              {/* 4. Media & Files */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowOptionsMenu(false);
                  setShowGalleryModal(true);
                }}
                style={styles.optionsItemRow}
              >
                <FolderOpen size={20} color="#164E3F" />
                <Text style={[styles.optionsItemText, { color: '#164E3F' }]}>
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
                <Trash size={20} color="#D97706" />
                <Text style={[styles.optionsItemText, { color: '#D97706' }]}>
                  Clear Chat History
                </Text>
              </TouchableOpacity>

              {/* 6. Delete Conversation Locally */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowOptionsMenu(false);
                  setShowDeleteChatModal(true);
                }}
                style={styles.optionsItemRow}
              >
                <Trash2 size={20} color="#DC2626" />
                <Text style={[styles.optionsItemText, { color: '#DC2626' }]}>
                  Delete Conversation
                </Text>
              </TouchableOpacity>

              <View style={styles.optionsDivider} />

              {/* 7. Report */}
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
                  Report Researcher
                </Text>
              </TouchableOpacity>

              {/* 8. Block */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleBlock}
                style={styles.optionsItemRow}
              >
                <Ban size={20} color="#DC2626" />
                <Text style={[styles.optionsItemText, { color: '#DC2626' }]}>
                  Block User
                </Text>
              </TouchableOpacity>

              {/* 9. Unfollow */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleUnfollow}
                style={styles.optionsItemRow}
              >
                <UserMinus size={20} color="#64748B" />
                <Text style={[styles.optionsItemText, { color: '#64748B' }]}>
                  Unfollow
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Cancel */}
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

      {/* Modal: Mute Duration Picker (Phase 4) */}
      <Modal
        visible={showMuteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMuteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <BellOff size={18} color="#164E3F" />
                <Text style={styles.modalTitle}>
                  {isMuted ? 'Notification Settings' : 'Mute Notifications'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowMuteModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {isMuted
                ? 'This conversation is currently muted. Choose to unmute or change duration.'
                : 'Choose how long you want to mute notifications for this conversation:'}
            </Text>

            <View style={{ gap: 8, marginTop: 4 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleSelectMuteDuration('8h')}
                style={styles.muteOptionCard}
              >
                <Text style={styles.muteOptionTitle}>8 Hours</Text>
                <Text style={styles.muteOptionDesc}>Mute alerts until tomorrow morning</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleSelectMuteDuration('1w')}
                style={styles.muteOptionCard}
              >
                <Text style={styles.muteOptionTitle}>1 Week</Text>
                <Text style={styles.muteOptionDesc}>Pause alerts for 7 days</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleSelectMuteDuration('always')}
                style={styles.muteOptionCard}
              >
                <Text style={styles.muteOptionTitle}>Always</Text>
                <Text style={styles.muteOptionDesc}>Keep muted until you manually unmute</Text>
              </TouchableOpacity>

              {isMuted && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleSelectMuteDuration('unmute')}
                  style={[styles.muteOptionCard, { borderColor: '#164E3F', backgroundColor: '#F0FDF4' }]}
                >
                  <Text style={[styles.muteOptionTitle, { color: '#164E3F' }]}>🔔 Unmute Notifications</Text>
                  <Text style={styles.muteOptionDesc}>Resume receiving all message alerts</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Clear History Confirmation (Phase 4) */}
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
                <Trash size={18} color="#D97706" />
                <Text style={styles.modalTitle}>Clear Chat History?</Text>
              </View>
              <TouchableOpacity onPress={() => setShowClearHistoryModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              This will remove all messages from your chat view. Other participants will still be able to see their copy of the conversation.
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

      {/* Modal: Delete Conversation Confirmation (Phase 4) */}
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
                <AlertTriangle size={18} color="#DC2626" />
                <Text style={styles.modalTitle}>Delete Conversation?</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDeleteChatModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Are you sure you want to delete this conversation? It will be removed from your Messages list.
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
                  <Text style={styles.confirmModalDestructiveText}>Delete Chat</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Report */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pollModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Flag size={18} color="#DC2626" />
                <Text style={styles.modalTitle}>Report Researcher</Text>
              </View>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Please select the reason for reporting this user.
            </Text>

            {['Spam or academic fraud', 'Harassment or inappropriate behavior', 'Impersonation of researcher'].map((reason) => (
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
              placeholder="Additional comments (optional)..."
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

      {/* Research Paper & Manuscript Search Modal (DOI, URL, Keyword, Title, Author) */}
      <PaperSearchModal
        visible={showDoiModal}
        onClose={() => setShowDoiModal(false)}
        onSelectPaper={handleSelectPaperToShare}
        title="Search & Share Research Paper"
        subtitle="Search papers by DOI, URL, title, keywords, or author across global scientific registries."
      />

      {/* DM Info Modal */}
      <WorkspaceInfoModal
        visible={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        workspace={workspace}
      />

      {/* Full-Screen Image Viewer Modal */}
      <ImageViewerModal
        visible={viewerVisible}
        images={viewerImages}
        initialIndex={0}
        onClose={() => setViewerVisible(false)}
        authorName={partner?.fullName || 'Shared photo'}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarPresenceWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  presenceDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#15803D',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerSubtextActive: {
    color: '#15803D',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerActionBtn: {
    padding: 6,
  },
  /* In-Chat Search Bar */
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
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#164E3F',
    borderColor: '#164E3F',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  searchMatchCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#164E3F',
    marginTop: 6,
  },
  dateCapsuleContainer: {
    alignItems: 'center',
    marginVertical: 10,
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
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loaderText: {
    fontSize: 13,
    color: '#64748B',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    maxWidth: Platform.OS === 'web' ? '82%' : '84%',
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
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    maxWidth: '100%',
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
  deletedBubble: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cardBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 6,
    width: '100%',
  },
  callLogBubble: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  callLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  callLogText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  deletedContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deletedMessageText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#94A3B8',
  },
  deletedTimestamp: {
    fontSize: 10,
    color: '#CBD5E1',
  },
  doiBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 6,
    width: '100%',
  },
  pollBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    minWidth: 260,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  /* In-Bubble Quoted Reply */
  quotedBubbleBlock: {
    flexDirection: 'row',
    padding: 6,
    borderRadius: 8,
    marginBottom: 6,
  },
  quotedBubbleBlockMy: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  quotedBubbleBlockOther: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  quotedAccentBar: {
    width: 3,
    borderRadius: 2,
    marginRight: 8,
  },
  quotedAccentBarMy: {
    backgroundColor: '#34D399',
  },
  quotedAccentBarOther: {
    backgroundColor: '#164E3F',
  },
  quotedContentWrap: {
    flex: 1,
  },
  quotedSenderName: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  quotedSenderNameMy: {
    color: '#A7F3D0',
  },
  quotedSenderNameOther: {
    color: '#164E3F',
  },
  quotedSnippetText: {
    fontSize: 12,
  },
  quotedSnippetTextMy: {
    color: '#E2E8F0',
  },
  quotedSnippetTextOther: {
    color: '#475569',
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
  pollMsgContainer: {
    gap: 8,
  },
  pollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pollBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#164E3F',
    letterSpacing: 0.5,
  },
  pollQuestionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 19,
  },
  pollOptionsList: {
    gap: 6,
    marginTop: 4,
  },
  pollOptionBtn: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#DCFCE7',
    opacity: 0.6,
  },
  pollOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  pollOptionRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 10,
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
    fontWeight: '500',
    color: '#334155',
  },
  pollOptionTextSelected: {
    fontWeight: '700',
    color: '#164E3F',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  otherMessageText: {
    color: '#111827',
  },
  msgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  editedLabel: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  myEditedLabel: {
    color: '#A7F3D0',
  },
  otherEditedLabel: {
    color: '#94A3B8',
  },
  timestamp: {
    fontSize: 10,
  },
  myTimestamp: {
    color: '#D1FAE5',
  },
  otherTimestamp: {
    color: '#6B7280',
  },
  doiTimestamp: {
    fontSize: 10,
    color: '#94A3B8',
    paddingHorizontal: 6,
  },
  /* Reactions Badges */
  reactionsBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
    alignItems: 'center',
  },
  myReactionsBadgeRow: {
    justifyContent: 'flex-end',
  },
  otherReactionsBadgeRow: {
    justifyContent: 'flex-start',
  },
  reactionBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
  },
  reactionBadgePillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  reactionBadgeEmoji: {
    fontSize: 12,
  },
  reactionBadgeCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  reactionBadgeCountActive: {
    color: '#164E3F',
  },
  addReactionBadgeBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Docked Reply Bar */
  replyingToDock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  replyingAccentBar: {
    width: 3,
    height: '100%',
    minHeight: 28,
    borderRadius: 2,
    backgroundColor: '#164E3F',
    marginRight: 10,
  },
  replyingInfoWrap: {
    flex: 1,
  },
  replyingToLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  replyingToSender: {
    fontWeight: '700',
    color: '#164E3F',
  },
  replyingSnippetText: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
  },
  replyCancelBtn: {
    padding: 6,
  },
  uploadingMediaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#BBF7D0',
  },
  uploadingMediaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#164E3F',
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
  attachedDoiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attachedDoiBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#164E3F',
  },
  attachedDoiTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#164E3F',
    marginTop: 2,
  },
  removeAttachedBtn: {
    padding: 4,
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
    height: 44,
  },
  mediaIconBtn: {
    padding: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingHorizontal: 6,
  },
  detachedMicBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#164E3F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detachedSendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#164E3F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptyBio: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  mutualFollowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 10,
  },
  mutualFollowText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#164E3F',
  },
  emptyPrompt: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  quickStartersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  quickStarterChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  quickStarterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  /* Action Menu Overlay & Card */
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  actionMenuCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  emojiReactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emojiReactionBtn: {
    padding: 6,
    borderRadius: 20,
  },
  emojiReactionText: {
    fontSize: 24,
  },
  actionMenuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  actionMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  actionMenuRowText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  /* Edit Modal */
  editModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  editTextInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 80,
    textAlignVertical: 'top',
    marginVertical: 14,
  },
  editModalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  editCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  editCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  editSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#164E3F',
  },
  editSaveBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  editSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  /* Forward Modal */
  forwardModalCard: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  forwardPreviewSnippet: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 3,
    borderLeftColor: '#164E3F',
    borderRadius: 6,
    padding: 8,
    marginVertical: 10,
  },
  forwardPreviewLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#164E3F',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  forwardPreviewText: {
    fontSize: 12,
    color: '#334155',
  },
  forwardSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 10,
  },
  forwardSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  forwardTargetsList: {
    maxHeight: 260,
  },
  forwardEmptyText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginVertical: 20,
  },
  forwardTargetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  forwardTargetTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  forwardTargetType: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  forwardSendBtn: {
    backgroundColor: '#164E3F',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  forwardSendBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  /* Options Sheet & Modals */
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  pollModalCard: {
    width: '100%',
    maxWidth: 440,
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
    marginBottom: 16,
    lineHeight: 18,
  },
  pollInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  pollQuestionInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  pollOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pollOptionInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  removeOptionBtn: {
    padding: 6,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 16,
  },
  addOptionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#164E3F',
  },
  createPollSubmitBtn: {
    backgroundColor: '#164E3F',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  createPollSubmitBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  createPollSubmitBtnText: {
    fontSize: 14,
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
  doiSearchRow: {
    flexDirection: 'row',
    gap: 8,
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
  doiLookupBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  confirmAttachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#164E3F',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  confirmAttachBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  /* Phase 4 Header & Modal Styles */
  headerTitleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerPinBadge: {
    backgroundColor: '#ECFDF5',
    padding: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    transform: [{ rotate: '45deg' }],
  },
  headerMuteBadge: {
    backgroundColor: '#F1F5F9',
    padding: 3,
    borderRadius: 6,
  },
  headerSubtext: {
    fontSize: 11,
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
});
