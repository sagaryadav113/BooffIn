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
  ActivityIndicator,
  Modal,
  Platform,
  Linking,
  Alert,
  Animated,
} from 'react-native';
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
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { colors, radii, spacing, typography } from '../../theme';
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
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { usePresenceStore } from '../../store/usePresenceStore';
import { resolvePaper } from '../../api/paperResolver';
import { uploadPostImage, uploadVoiceNoteAudio } from '../../api/storageService';
import { searchBooffInUsers } from '../../api/search/providers/userSearchProvider';
import { E2EEStatusBanner } from '../chat/E2EEStatusBanner';
import { derivePodSessionKey, encryptTextMessage, decryptTextMessage } from '../../utils/e2eeCrypto';

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

export type InnerCircleTab = 'discussions' | 'calendar' | 'jobs' | 'bookmarked';

interface WorkspaceInnerCircleViewProps {
  workspace: Workspace;
}

export const WorkspaceInnerCircleView: React.FC<WorkspaceInnerCircleViewProps> = ({ workspace }) => {
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<InnerCircleTab>('discussions');

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
  const createEvent = useWorkspaceStore((s) => s.createEvent);
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

  const isPinned = Boolean(workspace.settings?.is_pinned);
  const isArchived = Boolean(workspace.settings?.is_archived);
  const isMuted = Boolean(workspace.settings?.is_muted);

  const isAtBottomRef = useRef(true);
  const hasInitialScrolledRef = useRef(false);

  // Initial Room Loader & Realtime Subscription
  useEffect(() => {
    hasInitialScrolledRef.current = false;
    loadMessages(workspace.id);
    loadMembers(workspace.id);
    loadEvents(workspace.id);
    loadOpportunities(workspace.id);
    loadSavedItems(workspace.id);
    markAsRead(workspace.id);
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

  // Auto-scroll when new messages arrive if user is near bottom
  useEffect(() => {
    if (messages.length > 0 && hasInitialScrolledRef.current && isAtBottomRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [messages.length]);

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
  const isOwner = workspace.owner_id === currentUser?.id;
  const myMembership = members.find((m) => m.user_id === currentUser?.id);
  const myRole = isOwner ? 'owner' : (myMembership?.role || 'member');
  const isAdminOrOwner = isOwner || myRole === 'owner' || myRole === 'admin';
  const isModOrAbove = isAdminOrOwner || myRole === 'moderator';

  const canPost = !workspace.settings?.only_admins_post || isAdminOrOwner;
  const canInvite = !workspace.settings?.only_admins_invite || isAdminOrOwner;
  const canPin = !workspace.settings?.only_admins_pin || isAdminOrOwner;

  // Discussions State
  const [inputText, setInputText] = useState('');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSomeoneTyping = Boolean(typingInThisRoom && Object.keys(typingInThisRoom).length > 0);
  const typingUserNames = isSomeoneTyping
    ? Object.values(typingInThisRoom).map((u) => u.username).join(', ')
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
  const [showDoiModal, setShowDoiModal] = useState(false);
  const [doiQuery, setDoiQuery] = useState('');
  const [isResolvingDoi, setIsResolvingDoi] = useState(false);
  const [resolvedDoi, setResolvedDoi] = useState<DoiMetadata | null>(null);
  const [attachedDoi, setAttachedDoi] = useState<DoiMetadata | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Replying To State (Group Chat)
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

  useEffect(() => {
    async function decryptPodMessages() {
      if (!workspace.id) return;
      try {
        const podKey = await derivePodSessionKey(workspace.id);
        const updates: Record<string, string> = {};
        for (const m of messages) {
          if (m.e2ee_ciphertext && m.e2ee_nonce && !decryptedTextMap[m.id]) {
            try {
              const dec = await decryptTextMessage(m.e2ee_ciphertext, m.e2ee_nonce, podKey);
              if (dec) updates[m.id] = dec;
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

  // Filtered & Searched Messages (with Step 4 Ephemeral Filtering)
  const displayedMessages = useMemo(() => {
    let list = messages;

    // Ephemeral message filtering if enabled by pod admin
    const timer = workspace.settings?.ephemeral_timer;
    if (timer && timer !== 'off') {
      const now = Date.now();
      let maxAgeMs = 24 * 60 * 60 * 1000;
      if (timer === '7d') maxAgeMs = 7 * 24 * 60 * 60 * 1000;
      else if (timer === '30d') maxAgeMs = 30 * 24 * 60 * 60 * 1000;

      list = list.filter((m) => {
        const msgTime = new Date(m.created_at).getTime();
        return now - msgTime < maxAgeMs;
      });
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
  }, [messages, activeChatFilter, chatSearchQuery, workspace.settings?.ephemeral_timer]);

  // Pinned Message
  const pinnedMessage = useMemo(() => {
    if (localPinnedMessageId) {
      return messages.find((m) => m.id === localPinnedMessageId) || null;
    }
    return messages.find((m) => m.is_pinned) || null;
  }, [messages, localPinnedMessageId]);

  // Modals
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);

  const [showJobModal, setShowJobModal] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [jobAssignee, setJobAssignee] = useState('');

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
        setLocalPollVotes((prev) => ({ ...detected, ...prev }));
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
    await deleteWorkspaceLocally(workspace.id);
    setIsProcessingChatAction(false);
    setShowDeleteChatModal(false);
    router.replace('/workspace');
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

  // Step 3: Share Document / PDF Manuscript Handler
  const handleAttachDocument = async (doc: { name: string; sizeBytes: number; pageCount: number; fileUrl: string }) => {
    setShowDocumentPickerModal(false);
    setShowAttachMenu(false);
    const docMeta: WorkspaceDocumentMetadata = {
      name: doc.name,
      sizeBytes: doc.sizeBytes,
      fileUrl: doc.fileUrl,
      mimeType: 'application/pdf',
      pageCount: doc.pageCount,
    };

    await sendMessage({
      workspace_id: workspace.id,
      content: `📄 Manuscript: ${doc.name}`,
      message_type: 'document',
      document_metadata: docMeta,
      reply_to_id: replyingTo?.id || null,
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
          });
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

    const replyId = replyingTo?.id || null;

    let e2eeCipher: string | null = null;
    let e2eeNonce: string | null = null;

    if (workspace.id && trimmed && !attachedDoi) {
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
      setShowMentionPopup(false);
      setMentionQuery(null);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // Long-Press Message
  const handleLongPressMessage = (msg: WorkspaceMessage) => {
    if (msg.is_deleted) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setSelectedMessage(msg);
    setShowMessageActionMenu(true);
  };

  // Toggle Emoji Reaction
  const handleToggleReaction = async (msgId: string, emoji: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setShowMessageActionMenu(false);
    await toggleReaction(msgId, emoji);
  };

  // Copy Message Text
  const handleCopyMessage = async () => {
    if (!selectedMessage) return;
    setShowMessageActionMenu(false);
    await Clipboard.setStringAsync(selectedMessage.content || '');
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
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
  const handleStartEdit = () => {
    if (!selectedMessage) return;
    setEditingMessage(selectedMessage);
    setEditInputText(selectedMessage.content || '');
    setShowMessageActionMenu(false);
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editInputText.trim()) return;
    setIsSavingEdit(true);
    await editMessage(editingMessage.id, editInputText.trim());
    setIsSavingEdit(false);
    setEditingMessage(null);
    setEditInputText('');
  };

  // Delete Message Handlers
  const handleDeleteMessage = async (deleteForEveryone = true) => {
    if (!selectedMessage) return;
    const msgId = selectedMessage.id;
    setShowMessageActionMenu(false);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
    await deleteMessage(msgId, deleteForEveryone);
  };

  // Bookmark Message
  const handleBookmarkMessage = async () => {
    if (!selectedMessage) return;
    setShowMessageActionMenu(false);
    await saveItem({
      workspaceId: workspace.id,
      itemType: 'message',
      itemId: selectedMessage.id,
      note: selectedMessage.content?.slice(0, 80),
    });
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
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
    await forwardMessage(targetId, forwardingMessage);
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
    if (!eventTitle.trim()) return;
    await createEvent({
      workspaceId: workspace.id,
      title: eventTitle.trim(),
      description: eventDesc.trim() || undefined,
      eventType: 'lab_meeting',
      startTime: `${eventDate}T14:00:00Z`,
    });
    setShowEventModal(false);
    setEventTitle('');
    setEventDesc('');
  };

  const handleCreateJob = async () => {
    if (!jobTitle.trim()) return;
    await createOpportunity({
      workspaceId: workspace.id,
      title: jobTitle.trim(),
      roleType: 'research_assistant',
      description: jobDesc.trim() || `Job Designation: '${jobTitle.trim()}' assigned to ${jobAssignee || '@Alex P.'} for the next phase of the project`,
    });
    setShowJobModal(false);
    setJobTitle('');
    setJobDesc('');
    setJobAssignee('');
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
      <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
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
    <View style={styles.container}>
      {/* 1. Header Bar matching BooffIn academic aesthetic */}
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
          style={styles.headerCenter}
        >
          <Avatar
            uri={workspace.avatar_url || undefined}
            name={workspace.name || "BooffIn's inner circle"}
            size="sm"
          />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {workspace.name || "BooffIn's inner circle"}
              </Text>
              <Shield size={13} color="#164E3F" />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {onlineCount > 0 && <View style={styles.onlineDot} />}
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
                {onlineCount > 0 ? ` • ${onlineCount} online` : ''} • Confidential Pod
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
            <Search size={19} color={showSearchBar ? '#164E3F' : '#64748B'} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowGalleryModal(true)}
            style={styles.headerIconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <FolderOpen size={19} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowOptionsMenu(true)}
            style={styles.headerIconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MoreVertical size={20} color="#164E3F" />
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
      <View style={styles.subFilterStripContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subFilterStrip}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('discussions')}
            style={[styles.filterPill, activeTab === 'discussions' && styles.filterPillActive]}
          >
            <Text style={[styles.filterPillText, activeTab === 'discussions' && styles.filterPillTextActive]}>
              Discussions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('calendar')}
            style={[styles.filterPill, activeTab === 'calendar' && styles.filterPillActive]}
          >
            <Text style={[styles.filterPillText, activeTab === 'calendar' && styles.filterPillTextActive]}>
              Calendar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('jobs')}
            style={[styles.filterPill, activeTab === 'jobs' && styles.filterPillActive]}
          >
            <Text style={[styles.filterPillText, activeTab === 'jobs' && styles.filterPillTextActive]}>
              Jobs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('bookmarked')}
            style={[styles.filterPill, activeTab === 'bookmarked' && styles.filterPillActive]}
          >
            <Text style={[styles.filterPillText, activeTab === 'bookmarked' && styles.filterPillTextActive]}>
              Bookmarked
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 3. Main Discussions Feed */}
      {activeTab === 'discussions' && (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
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
              <View style={styles.emptyMessagesContainer}>
                <View style={styles.emptyIconCircle}>
                  <MessageSquare size={32} color="#164E3F" />
                </View>
                <Text style={styles.emptyMessagesTitle}>
                  {chatSearchQuery.trim() ? 'No matching discussions' : 'Welcome to the Research Pod'}
                </Text>
                <Text style={styles.emptyMessagesSub}>
                  {chatSearchQuery.trim()
                    ? `No messages matched "${chatSearchQuery}". Try clearing filters.`
                    : 'Share preprints, discuss methodology, assign tasks, and tag collaborators.'}
                </Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const isMe = item.sender_id === currentUser?.id;
              const isPinnedThis = item.is_pinned || item.id === localPinnedMessageId;
              const isDeleted = Boolean(item.is_deleted);
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
                const lines = item.content.split('\n').filter(Boolean);
                pollQuestionText = lines[0].replace('📊 Poll:', '').trim();
                pollOptionItems = lines.slice(1).map((line: string, idx: number) => ({
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

              // Reactions summary (excluding poll vote tags)
              const reactionsMap: Record<string, string[]> = (item.reactions as Record<string, string[]>) || {};
              const reactionEntries = Object.entries(reactionsMap).filter(
                ([k, uids]) => !k.startsWith('vote:') && !k.startsWith('poll:') && Array.isArray(uids) && uids.length > 0
              );

              // Quoted reply lookup
              const replyParent = item.reply_to_id
                ? messages.find((m) => m.id === item.reply_to_id) || item.reply_to_message
                : item.reply_to_message;

                  const hasMediaContent = isAudio || isDocument || Boolean(resolvedDoiMeta) || isPost || isProfile || isWorkspaceInvite || isPoll;

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
                          onLongPress={() => handleLongPressMessage(item)}
                          style={[
                            styles.messageBubble,
                            isMe ? styles.myBubble : styles.otherBubble,
                            hasMediaContent && styles.bubbleWithMedia,
                          ]}
                        >
                    {/* Pinned Tag */}
                    {isPinnedThis && (
                      <View style={styles.bubblePinTag}>
                        <Pin size={10} color={isMe ? '#A7F3D0' : '#164E3F'} fill={isMe ? '#A7F3D0' : '#164E3F'} />
                        <Text style={[styles.bubblePinTagText, isMe && { color: '#A7F3D0' }]}>Pinned</Text>
                      </View>
                    )}

                    {!isMe && (
                      <Text style={styles.senderName}>{item.sender?.fullName || 'Researcher'}</Text>
                    )}

                    {/* Quoted Reply Box */}
                    {replyParent && (
                      <View style={[styles.quotedReplyBox, isMe ? styles.quotedReplyBoxMe : styles.quotedReplyBoxOther]}>
                        <View style={[styles.quotedReplyAccent, isMe ? styles.quotedAccentMe : styles.quotedAccentOther]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.quotedReplySender, isMe ? styles.quotedSenderMe : styles.quotedSenderOther]} numberOfLines={1}>
                            {replyParent.sender?.fullName || (replyParent as any).sender_name || 'Researcher'}
                          </Text>
                          <Text style={[styles.quotedReplySnippet, isMe ? styles.quotedSnippetMe : styles.quotedSnippetOther]} numberOfLines={2}>
                            {replyParent.content || 'Shared attachment'}
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

                    {/* Deleted or Regular Message Content */}
                    {isDeleted ? (
                      <View style={styles.deletedMsgWrap}>
                        <Text style={[styles.deletedMsgText, isMe && { color: '#D1FAE5' }]}>
                          🚫 This message was deleted
                        </Text>
                      </View>
                    ) : (() => {
                      const isEncrypted = Boolean(item.e2ee_ciphertext);
                      const displayContent = isEncrypted
                        ? (decryptedTextMap[item.id] || item.content || '🔒 Encrypted message')
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
                      {Boolean(item.e2ee_ciphertext) && !item.is_deleted && (
                        <Lock size={10} color={isMe ? '#A7F3D0' : '#166534'} style={{ marginRight: 4 }} />
                      )}
                      {item.is_edited && !item.is_deleted && (
                        <Text style={[styles.editedIndicator, isMe ? styles.myEditedIndicator : styles.otherEditedIndicator]}>
                          (edited)
                        </Text>
                      )}
                      <Text style={[styles.timestamp, isMe ? styles.myTimestamp : styles.otherTimestamp]}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {isMe && (
                        <CheckCheck size={12} color="#A7F3D0" style={{ marginLeft: 3 }} />
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

          {/* Bottom Capsule Input Dock / Voice Note Recorder / Announcement Mode Dock */}
          {canPost ? (
            isRecordingVoice ? (
              <VoiceNoteRecorder
                onSendVoiceNote={handleSendVoiceNote}
                onCancel={() => setIsRecordingVoice(false)}
              />
            ) : (
              <View style={styles.bottomDockContainer}>
                <View style={styles.inputCapsule}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handlePickImage}
                    style={styles.mediaIconBtn}
                    disabled={isUploadingMedia}
                  >
                    {isUploadingMedia ? (
                      <ActivityIndicator size="small" color="#164E3F" />
                    ) : (
                      <Camera size={19} color="#64748B" />
                    )}
                  </TouchableOpacity>

                  <TextInput
                    value={inputText}
                    onChangeText={handleInputChange}
                    placeholder={replyingTo ? 'Write a reply...' : 'Message...'}
                    placeholderTextColor="#94A3B8"
                    style={styles.textInput}
                    multiline
                    maxLength={2000}
                  />

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowAttachMenu(true)}
                    style={styles.mediaIconBtn}
                  >
                    <Paperclip size={19} color="#64748B" />
                  </TouchableOpacity>
                </View>

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
                    onPress={handleSendMessage}
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
            )
          ) : (
            <View style={styles.announcementModeDockContainer}>
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

      {/* Action Menu Modal (Long-Press on Message) */}
      <Modal
        visible={showMessageActionMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMessageActionMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMessageActionMenu(false)}
        >
          <View style={styles.actionMenuCard}>
            {/* Quick Floating Reaction Bar */}
            <View style={styles.quickReactionsRow}>
              {['👍', '❤️', '🔬', '👏', '💡', '🔥', '🎉'].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  activeOpacity={0.7}
                  onPress={() => selectedMessage && handleToggleReaction(selectedMessage.id, emoji)}
                  style={styles.quickEmojiBtn}
                >
                  <Text style={styles.quickEmojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.actionMenuDivider} />

            {/* Menu Options */}
            <TouchableOpacity onPress={handleStartReply} style={styles.actionMenuRow}>
              <Reply size={18} color="#0F172A" />
              <Text style={styles.actionMenuRowText}>Reply</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCopyMessage} style={styles.actionMenuRow}>
              <Copy size={18} color="#0F172A" />
              <Text style={styles.actionMenuRowText}>Copy Text</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleTogglePinMessage} style={styles.actionMenuRow}>
              <Pin size={18} color="#0F172A" />
              <Text style={styles.actionMenuRowText}>
                {selectedMessage && (selectedMessage.is_pinned || selectedMessage.id === localPinnedMessageId)
                  ? 'Unpin from Pod'
                  : 'Pin to Pod Banner'}
              </Text>
            </TouchableOpacity>

            {selectedMessage?.sender_id === currentUser?.id && (
              <TouchableOpacity onPress={handleStartEdit} style={styles.actionMenuRow}>
                <Pencil size={18} color="#0F172A" />
                <Text style={styles.actionMenuRowText}>Edit Message</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={handleStartForward} style={styles.actionMenuRow}>
              <CornerUpRight size={18} color="#0F172A" />
              <Text style={styles.actionMenuRowText}>Forward</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleBookmarkMessage} style={styles.actionMenuRow}>
              <Bookmark size={18} color="#0F172A" />
              <Text style={styles.actionMenuRowText}>Save to Vault / Bookmark</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleDeleteMessage(selectedMessage?.sender_id === currentUser?.id)}
              style={styles.actionMenuRow}
            >
              <Trash2 size={18} color="#EF4444" />
              <Text style={[styles.actionMenuRowText, { color: '#EF4444' }]}>Delete Message</Text>
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

      {/* TAB 2: Calendar */}
      {activeTab === 'calendar' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.tabActionBar}>
            <Text style={styles.tabActionTitle}>Lab Calendar & Milestones</Text>
            <TouchableOpacity onPress={() => setShowEventModal(true)} style={styles.addBtn}>
              <Plus size={13} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Schedule Event</Text>
            </TouchableOpacity>
          </View>

          {events.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Calendar size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No scheduled events</Text>
              <Text style={styles.emptySub}>Schedule group meetings, project reviews, or milestones.</Text>
            </View>
          ) : (
            events.map((ev) => (
              <View key={ev.id} style={styles.eventCard}>
                <View style={styles.eventCardHeader}>
                  <Text style={styles.eventTitle}>{ev.title}</Text>
                  <Text style={styles.eventDate}>
                    {new Date(ev.start_time).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                {ev.description && <Text style={styles.eventDesc}>{ev.description}</Text>}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* TAB 3: Jobs */}
      {activeTab === 'jobs' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.tabActionBar}>
            <Text style={styles.tabActionTitle}>Jobs & Task Assignments</Text>
            <TouchableOpacity onPress={() => setShowJobModal(true)} style={styles.addBtn}>
              <Plus size={13} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Assign Task</Text>
            </TouchableOpacity>
          </View>

          {opportunities.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Briefcase size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No open tasks</Text>
              <Text style={styles.emptySub}>Assign project tasks, review calls, or research roles.</Text>
            </View>
          ) : (
            opportunities.map((opp) => (
              <View key={opp.id} style={styles.jobCard}>
                <Text style={styles.jobTitle}>{opp.title}</Text>
                <Text style={styles.jobDesc}>{opp.description}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* TAB 4: Bookmarked */}
      {activeTab === 'bookmarked' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.tabActionTitle}>Saved Vault & Bookmarks</Text>
          <Text style={styles.vaultSubtitle}>Confidential items saved by your pod members.</Text>

          {savedItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Bookmark size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No bookmarked items</Text>
              <Text style={styles.emptySub}>Save important paper DOIs or discussions to access them anytime.</Text>
            </View>
          ) : (
            savedItems.map((item) => (
              <View key={item.id} style={styles.vaultItemCard}>
                <Text style={styles.vaultItemTitle}>{item.note || 'Saved Pod Reference'}</Text>
                <Text style={styles.vaultItemDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
            ))
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

      {/* Modal: Schedule Event */}
      <Modal visible={showEventModal} transparent animationType="fade" onRequestClose={() => setShowEventModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Lab Event</Text>
              <TouchableOpacity onPress={() => setShowEventModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <TextInput
              value={eventTitle}
              onChangeText={setEventTitle}
              placeholder="Event Title (e.g. Project Review)"
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginBottom: 10 }]}
            />
            <TextInput
              value={eventDesc}
              onChangeText={setEventDesc}
              placeholder="Tag members or specify agenda..."
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginBottom: 14 }]}
            />
            <TouchableOpacity onPress={handleCreateEvent} style={styles.confirmAttachBtn}>
              <Text style={styles.confirmAttachBtnText}>Schedule Event</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Assign Task / Job */}
      <Modal visible={showJobModal} transparent animationType="fade" onRequestClose={() => setShowJobModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Task / Role</Text>
              <TouchableOpacity onPress={() => setShowJobModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <TextInput
              value={jobTitle}
              onChangeText={setJobTitle}
              placeholder="Job Title (e.g. Lead Researcher)"
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginBottom: 10 }]}
            />
            <TextInput
              value={jobAssignee}
              onChangeText={setJobAssignee}
              placeholder="Assignee (e.g. @Alex P.)"
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginBottom: 10 }]}
            />
            <TextInput
              value={jobDesc}
              onChangeText={setJobDesc}
              placeholder="Task details and scope..."
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginBottom: 14 }]}
            />
            <TouchableOpacity onPress={handleCreateJob} style={styles.confirmAttachBtn}>
              <Text style={styles.confirmAttachBtnText}>Assign to Pod</Text>
            </TouchableOpacity>
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

            {/* 1. Research Paper (DOI) */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowAttachMenu(false);
                setShowDoiModal(true);
              }}
              style={styles.optionsItemRow}
            >
              <View style={[styles.attachIconWrap, { backgroundColor: '#EFF6FF' }]}>
                <FileText size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attachItemTitle}>Research Paper (DOI)</Text>
                <Text style={styles.attachItemSubtitle}>Resolve citation, authors, and canonical paper preview</Text>
              </View>
            </TouchableOpacity>

            {/* 2. PDF Manuscript / Document */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowAttachMenu(false);
                setShowDocumentPickerModal(true);
              }}
              style={styles.optionsItemRow}
            >
              <View style={[styles.attachIconWrap, { backgroundColor: '#FEF2F2' }]}>
                <FileUp size={20} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attachItemTitle}>PDF Manuscript / Document</Text>
                <Text style={styles.attachItemSubtitle}>Share preprint PDFs, datasets, and protocols</Text>
              </View>
            </TouchableOpacity>

            {/* 3. Researcher Profile */}
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

            {/* 4. Create Poll / Voting */}
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

            {/* 5. Photo / Gallery */}
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
                <Text style={styles.modalTitle}>Leave Research Pod?</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDeleteChatModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Are you sure you want to remove this pod from your active workspace? You can rejoin later if invited.
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
                  <Text style={styles.confirmModalDestructiveText}>Leave Pod</Text>
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
      {/* MODAL: Select Document / Manuscript PDF (Step 3)              */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={showDocumentPickerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDocumentPickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FileUp size={20} color="#DC2626" />
                <Text style={styles.modalTitle}>Attach Manuscript / PDF</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDocumentPickerModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Select a preprint manuscript or protocol document to share with the pod.
            </Text>

            <ScrollView style={{ maxHeight: 280, marginTop: 4 }}>
              {SAMPLE_POD_MANUSCRIPTS.map((doc, i) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.7}
                  onPress={() => handleAttachDocument(doc)}
                  style={[styles.docItemOption, { marginBottom: 10 }]}
                >
                  <View style={[styles.attachIconWrap, { backgroundColor: '#FEF2F2', marginRight: 12 }]}>
                    <FileUp size={18} color="#DC2626" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docItemName} numberOfLines={1}>
                      {doc.name}
                    </Text>
                    <Text style={styles.docItemMeta}>
                      {(doc.sizeBytes / 1024 / 1024).toFixed(1)} MB • {doc.pageCount} pages • PDF
                    </Text>
                  </View>
                  <Send size={15} color="#164E3F" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
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
    paddingHorizontal: 12,
    height: 44,
  },
  mediaIconBtn: {
    padding: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingHorizontal: 8,
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
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  jobDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  vaultItemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  vaultItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  vaultItemDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
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
});

