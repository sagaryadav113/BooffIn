import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  FileText,
  MessageSquare,
  Mic,
  Video,
  Settings,
  Shield,
  Plus,
  Send,
  Calendar,
  ExternalLink,
  AlertTriangle,
  X,
  Sparkles,
  Info,
  Play,
  Camera,
  Radio,
  Clock,
  Bookmark,
  Lock,
  Search,
  Check,
  CheckCheck,
  Smile,
  Reply,
  Copy,
  Pencil,
  Trash2,
  CornerUpRight,
  Pin,
  Paperclip,
  Image as ImageIcon,
  MoreVertical,
  BarChart2,
  User,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
import {
  Workspace,
  WorkspaceMessage,
  WorkspaceEvent,
  WorkspaceBlock,
  DoiMetadata,
  WorkspaceDocumentMetadata,
  WorkspacePostMetadata,
  WorkspaceProfileMetadata,
} from '../../types/workspace';
import { WorkspaceDoiCard } from './WorkspaceDoiCard';
import { WorkspaceInfoModal } from './WorkspaceInfoModal';
import { ImageViewerModal } from '../modals/ImageViewerModal';
import { VoiceNotePlayer } from '../chat/VoiceNotePlayer';
import { VoiceNoteRecorder } from '../chat/VoiceNoteRecorder';
import { ChatDocumentCard } from '../chat/ChatDocumentCard';
import { ChatPostCard } from '../chat/ChatPostCard';
import { ChatProfileCard } from '../chat/ChatProfileCard';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { usePresenceStore } from '../../store/usePresenceStore';
import { resolvePaper } from '../../api/paperResolver';
import { uploadPostImage, uploadVoiceNoteAudio } from '../../api/storageService';
import { searchBooffInUsers } from '../../api/search/providers/userSearchProvider';

const SAMPLE_COMMUNITY_DOCUMENTS = [
  {
    name: 'Open_Science_Protocol_Guidelines_2026.pdf',
    sizeBytes: 1024 * 720,
    pageCount: 12,
    fileUrl: 'https://arxiv.org/pdf/2103.00020.pdf',
  },
  {
    name: 'Microplastic_Cellular_Impact_MetaAnalysis.pdf',
    sizeBytes: 1024 * 1450,
    pageCount: 24,
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

const AnimatedTypingIndicator: React.FC<{ name: string; count: number }> = ({ name, count }) => {
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

export type CommunityTab = 'papers' | 'discussion' | 'podcasts' | 'live_sessions';

interface WorkspaceCommunityViewProps {
  workspace: Workspace;
}

export const WorkspaceCommunityView: React.FC<WorkspaceCommunityViewProps> = ({ workspace }) => {
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<CommunityTab>('discussion');

  const isCommunityDisabled = Boolean(
    workspace.is_disabled ||
    workspace.status === 'disabled' ||
    workspace.settings?.is_disabled
  );

  // Workspace Store Data & Actions
  const messages = useWorkspaceStore((s) => s.messages);
  const events = useWorkspaceStore((s) => s.events);
  const blocks = useWorkspaceStore((s) => s.blocks);
  const members = useWorkspaceStore((s) => s.members);
  const isMessagesLoading = useWorkspaceStore((s) => s.isMessagesLoading);
  const isSending = useWorkspaceStore((s) => s.isSending);

  const loadMessages = useWorkspaceStore((s) => s.loadMessages);
  const loadMembers = useWorkspaceStore((s) => s.loadMembers);
  const sendMessage = useWorkspaceStore((s) => s.sendMessage);
  const loadEvents = useWorkspaceStore((s) => s.loadEvents);
  const createEvent = useWorkspaceStore((s) => s.createEvent);
  const loadBlocks = useWorkspaceStore((s) => s.loadBlocks);
  const subscribeToWorkspaceMessages = useWorkspaceStore((s) => s.subscribeToWorkspaceMessages);
  const typingUsers = useWorkspaceStore((s) => s.typingUsers);
  const sendTypingIndicator = useWorkspaceStore((s) => s.sendTypingIndicator);
  const toggleReaction = useWorkspaceStore((s) => s.toggleReaction);
  const editMessage = useWorkspaceStore((s) => s.editMessage);
  const deleteMessage = useWorkspaceStore((s) => s.deleteMessage);
  const forwardMessage = useWorkspaceStore((s) => s.forwardMessage);

  // Workspaces for forwarding
  const dms = useWorkspaceStore((s) => s.dms);
  const communities = useWorkspaceStore((s) => s.communities);
  const innerCircles = useWorkspaceStore((s) => s.innerCircles);

  // Online presence
  const onlineUserIds = usePresenceStore((s) => s.onlineUserIds);
  const activeMembers = members || [];
  const realMemberCount = activeMembers.length > 0 ? activeMembers.length : (workspace.members_count || 1);
  const onlineCount = useMemo(() => {
    return activeMembers.filter((m) => m.user_id && onlineUserIds[m.user_id]).length;
  }, [activeMembers, onlineUserIds]);

  // Realtime Typing Calculation for this Community Room
  const typingInThisRoom = typingUsers[workspace.id] || {};
  const isSomeoneTyping = Object.keys(typingInThisRoom).length > 0;
  const typingUserNames = Object.values(typingInThisRoom)
    .map((t) => t.username)
    .join(', ');
  const typingTimeoutRef = useRef<any>(null);

  // In-chat search
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Chat input
  const [inputText, setInputText] = useState('');
  const [showDoiModal, setShowDoiModal] = useState(false);
  const [doiQuery, setDoiQuery] = useState('');
  const [isResolvingDoi, setIsResolvingDoi] = useState(false);
  const [resolvedDoi, setResolvedDoi] = useState<DoiMetadata | null>(null);
  const [attachedDoi, setAttachedDoi] = useState<DoiMetadata | null>(null);

  // Replying & Context Action Sheet
  const [replyingTo, setReplyingTo] = useState<WorkspaceMessage | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<WorkspaceMessage | null>(null);
  const [showMessageActionMenu, setShowMessageActionMenu] = useState(false);

  // Edit Message Modal
  const [editingMessage, setEditingMessage] = useState<WorkspaceMessage | null>(null);
  const [editInputText, setEditInputText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Forward Message Modal
  const [forwardingMessage, setForwardingMessage] = useState<WorkspaceMessage | null>(null);
  const [forwardSearch, setForwardSearch] = useState('');
  const [forwardingTargetId, setForwardingTargetId] = useState<string | null>(null);

  // Rich Attachment Menus
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showDocumentPickerModal, setShowDocumentPickerModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [localPollVotes, setLocalPollVotes] = useState<Record<string, string>>({});

  const [showPostPickerModal, setShowPostPickerModal] = useState(false);
  const [postTitleInput, setPostTitleInput] = useState('');
  const [postSnippetInput, setPostSnippetInput] = useState('');

  const [showProfilePickerModal, setShowProfilePickerModal] = useState(false);
  const [userSearchText, setUserSearchText] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearchingProfileUsers, setIsSearchingProfileUsers] = useState(false);

  // Voice Note Recording
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  // Image Viewer Modal
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);

  // Info modal & New Event modal
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventLink, setEventLink] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);

  const flatListRef = useRef<FlatList>(null);
  const isAtBottomRef = useRef(true);
  const hasInitialScrolledRef = useRef(false);

  useEffect(() => {
    hasInitialScrolledRef.current = false;
    loadMessages(workspace.id);
    loadMembers(workspace.id);
    loadEvents(workspace.id);
    loadBlocks(workspace.id);

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

  const handleTextChange = (text: string) => {
    setInputText(text);
    if (workspace.id) {
      sendTypingIndicator(workspace.id, text.trim().length > 0);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(workspace.id, false);
      }, 2500);
    }
  };

  const handleSendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed && !attachedDoi) return;
    if (workspace.id) {
      sendTypingIndicator(workspace.id, false);
    }

    const replyId = replyingTo?.id || null;

    const res = await sendMessage({
      workspace_id: workspace.id,
      content: trimmed || (attachedDoi ? `Shared research paper: ${attachedDoi.title}` : ''),
      message_type: attachedDoi ? 'paper_doi' : 'text',
      doi_metadata: attachedDoi || undefined,
      reply_to_id: replyId,
    });
    if (res.success) {
      setInputText('');
      setAttachedDoi(null);
      setReplyingTo(null);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleSharePaperDoi = async () => {
    if (!resolvedDoi) return;
    const res = await sendMessage({
      workspace_id: workspace.id,
      content: `Published Research Paper: ${resolvedDoi.title}`,
      message_type: 'paper_doi',
      doi_metadata: resolvedDoi,
      reply_to_id: replyingTo?.id || null,
    });
    if (res.success) {
      setShowDoiModal(false);
      setDoiQuery('');
      setResolvedDoi(null);
      setReplyingTo(null);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleResolveDoi = async () => {
    if (!doiQuery.trim()) return;
    setIsResolvingDoi(true);
    try {
      const res = await resolvePaper(doiQuery.trim());
      if (res) {
        setResolvedDoi({
          doi: res.doi || doiQuery.trim(),
          title: res.title,
          authors: (res.authors || []).map((a) => ({ name: a.name, orcid: a.orcid })),
          publicationYear: res.publicationYear,
          journal: res.journal,
          url: res.openAccessUrl || res.canonicalUrl,
          citationCount: res.citationCount,
        });
      }
    } catch {}
    setIsResolvingDoi(false);
  };

  // Image Upload Handler
  const handlePickImage = async () => {
    setShowAttachMenu(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uploadRes = await uploadPostImage(currentUser?.id || 'anonymous', asset);
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
          if (Platform.OS === 'web') window.alert(uploadRes.error || 'Failed to upload photo.');
          else Alert.alert('Upload Failed', uploadRes.error || 'Failed to upload photo.');
        }
      }
    } catch (err) {
      console.warn('Pick image error:', err);
    }
  };

  const handleTakePhoto = async () => {
    setShowAttachMenu(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        if (Platform.OS === 'web') window.alert('Camera permission required.');
        else Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uploadRes = await uploadPostImage(currentUser?.id || 'anonymous', asset);
        if (uploadRes.success && uploadRes.url) {
          await sendMessage({
            workspace_id: workspace.id,
            content: '📷 Captured photo',
            message_type: 'image',
            media_urls: [uploadRes.url],
            reply_to_id: replyingTo?.id || null,
          });
          setReplyingTo(null);
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        } else {
          if (Platform.OS === 'web') window.alert(uploadRes.error || 'Failed to upload photo.');
          else Alert.alert('Upload Failed', uploadRes.error || 'Failed to upload photo.');
        }
      }
    } catch (err) {
      console.warn('Take photo error:', err);
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

    try {
      await sendMessage({
        workspace_id: workspace.id,
        content: '🎙️ Voice Note',
        message_type: 'voice_note',
        media_urls: finalAudioUrl ? [finalAudioUrl] : [],
        reply_to_id: replyId,
      });
      setReplyingTo(null);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.warn('Upload voice note error:', err);
    }
  };

  // Poll Creation Handler
  const handleCreatePoll = async () => {
    const q = pollQuestion.trim();
    const validOpts = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!q || validOpts.length < 2) {
      if (Platform.OS === 'web') window.alert('Please enter a question and at least 2 options for the poll.');
      else Alert.alert('Incomplete Poll', 'Please enter a question and at least 2 options.');
      return;
    }

    setIsCreatingPoll(true);
    try {
      const res = await sendMessage({
        workspace_id: workspace.id,
        content: `📊 Poll: ${q}\n${validOpts.map((opt) => `• ${opt}`).join('\n')}`,
        message_type: 'poll',
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
    } catch (err) {
      console.warn('Create poll error:', err);
    } finally {
      setIsCreatingPoll(false);
    }
  };

  const handleVote = (messageId: string, optionId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setLocalPollVotes((prev) => ({
      ...prev,
      [messageId]: prev[messageId] === optionId ? '' : optionId,
    }));
  };

  // Document / PDF Manuscript Handler
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

  // Share BooffIn Post Handler
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
      snippet: postSnippetInput.trim() || 'Research findings, experiment data, and academic analysis shared on BooffIn.',
      upvotes: 28,
      tags: ['Community', 'Discussion', 'Research'],
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

  // Search & Share Profile Users
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

  const handleShareProfile = async (targetUser: any) => {
    setShowProfilePickerModal(false);
    setShowAttachMenu(false);
    setUserSearchText('');
    setUserSearchResults([]);

    const profileMeta: WorkspaceProfileMetadata = {
      id: targetUser.id,
      fullName: targetUser.fullName || targetUser.handle || 'Researcher',
      handle: targetUser.handle || 'user',
      avatarUrl: targetUser.avatarUrl || null,
      academicTitle: targetUser.academicTitle || 'Researcher',
      institution: targetUser.institution || 'BooffIn Academic Network',
    };

    await sendMessage({
      workspace_id: workspace.id,
      content: `👤 Researcher: @${profileMeta.handle}`,
      message_type: 'profile',
      profile_metadata: profileMeta,
      reply_to_id: replyingTo?.id || null,
    });

    setReplyingTo(null);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Message Action Sheet & Reactions
  const handleLongPressMessage = (msg: WorkspaceMessage) => {
    if (msg.is_deleted) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setSelectedMessage(msg);
    setShowMessageActionMenu(true);
  };

  const handleToggleReaction = async (msgId: string, emoji: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setShowMessageActionMenu(false);
    await toggleReaction(msgId, emoji);
  };

  const handleCopyMessage = async () => {
    if (!selectedMessage) return;
    setShowMessageActionMenu(false);
    await Clipboard.setStringAsync(selectedMessage.content || '');
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const handleStartReply = () => {
    if (!selectedMessage) return;
    setShowMessageActionMenu(false);
    setReplyingTo(selectedMessage);
  };

  const handleOpenEdit = () => {
    if (!selectedMessage) return;
    setShowMessageActionMenu(false);
    setEditingMessage(selectedMessage);
    setEditInputText(selectedMessage.content || '');
  };

  const handleSaveEdit = async () => {
    if (!editingMessage) return;
    const trimmed = editInputText.trim();
    if (!trimmed) return;
    setIsSavingEdit(true);
    await editMessage(editingMessage.id, trimmed);
    setIsSavingEdit(false);
    setEditingMessage(null);
    setEditInputText('');
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessage) return;
    setShowMessageActionMenu(false);
    await deleteMessage(selectedMessage.id);
  };

  const handleOpenForward = () => {
    if (!selectedMessage) return;
    setShowMessageActionMenu(false);
    setForwardingMessage(selectedMessage);
    setForwardSearch('');
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

  const handleCreateLiveSession = async () => {
    if (!eventTitle.trim()) return;
    await createEvent({
      workspaceId: workspace.id,
      title: eventTitle.trim(),
      eventType: 'live_session',
      meetingLink: eventLink.trim() || undefined,
      startTime: `${eventDate}T19:00:00Z`,
    });
    setShowEventModal(false);
    setEventTitle('');
    setEventLink('');
  };

  // Helper to extract image url from message
  const extractImageUrl = (m: WorkspaceMessage) => {
    if (m.media_urls && m.media_urls.length > 0 && typeof m.media_urls[0] === 'string' && m.media_urls[0].startsWith('http')) {
      return m.media_urls[0];
    }
    if (Array.isArray(m.attachments)) {
      for (const a of m.attachments) {
        if (typeof a === 'string' && a.startsWith('http')) return a;
        if (a?.url && typeof a.url === 'string' && a.url.startsWith('http')) return a.url;
        if (a?.uri && typeof a.uri === 'string' && a.uri.startsWith('http')) return a.uri;
        if (a?.imageUrl && typeof a.imageUrl === 'string' && a.imageUrl.startsWith('http')) return a.imageUrl;
        if (a?.image_url && typeof a.image_url === 'string' && a.image_url.startsWith('http')) return a.image_url;
      }
    }
    return null;
  };

  // Filter messages by search
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(
      (m) =>
        (m.content || '').toLowerCase().includes(q) ||
        (m.sender?.fullName || '').toLowerCase().includes(q) ||
        (m.doi_metadata?.title || '').toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  // Target workspaces for forward modal
  const forwardTargets = useMemo(() => {
    const list: Array<{ id: string; name: string; type: 'dm' | 'community' | 'inner_circle'; avatarUrl?: string | null }> = [];
    (dms || []).forEach((d) => {
      if (d.id !== workspace.id) {
        list.push({
          id: d.id,
          name: d.other_user?.fullName || d.name || 'Direct Chat',
          type: 'dm',
          avatarUrl: d.other_user?.avatarUrl || d.avatar_url,
        });
      }
    });
    (communities || []).forEach((c) => {
      if (c.id !== workspace.id && !c.is_disabled && c.status !== 'disabled') {
        list.push({
          id: c.id,
          name: c.name,
          type: 'community',
          avatarUrl: c.avatar_url,
        });
      }
    });
    (innerCircles || []).forEach((ic) => {
      if (ic.id !== workspace.id) {
        list.push({
          id: ic.id,
          name: ic.name,
          type: 'inner_circle',
          avatarUrl: ic.avatar_url,
        });
      }
    });

    if (!forwardSearch.trim()) return list;
    const q = forwardSearch.toLowerCase();
    return list.filter((item) => item.name.toLowerCase().includes(q));
  }, [dms, communities, innerCircles, workspace.id, forwardSearch]);

  const paperMessages = messages.filter((m) => m.message_type === 'paper_doi' && m.doi_metadata);

  return (
    <View style={styles.container}>
      {/* Community Header matching modern BooffIn academic aesthetic */}
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
          style={styles.headerTitleContainer}
        >
          <Avatar
            uri={workspace.avatar_url || undefined}
            name={workspace.name}
            size="sm"
          />
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {workspace.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {onlineCount > 0 && <View style={styles.onlineDot} />}
              <Text style={styles.headerTelemetry} numberOfLines={1}>
                {realMemberCount} {realMemberCount === 1 ? 'member' : 'members'}
                {onlineCount > 0 ? ` • ${onlineCount} online` : ''}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Right Actions: Search, Info & Settings */}
        <View style={styles.headerRightActions}>
          <TouchableOpacity
            onPress={() => setShowSearchBar((v) => !v)}
            style={[styles.headerIconBtn, showSearchBar && styles.headerIconBtnActive]}
          >
            <Search size={18} color={showSearchBar ? '#164E3F' : '#64748B'} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowInfoModal(true)}
            style={styles.headerIconBtn}
          >
            <Info size={19} color="#164E3F" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowInfoModal(true)}
            style={styles.headerIconBtn}
          >
            <Settings size={19} color="#164E3F" />
          </TouchableOpacity>
        </View>
      </View>

      {/* In-Chat Search Bar Toggle */}
      {showSearchBar && (
        <View style={styles.searchBarRow}>
          <Search size={16} color="#94A3B8" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search discussion..."
            placeholderTextColor="#94A3B8"
            style={styles.searchBarInput}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Disabled / Read-only Archive Notice Banner */}
      {isCommunityDisabled && (
        <View style={styles.disabledCommunityBanner}>
          <Info size={16} color="#0F172A" strokeWidth={2.2} />
          <View style={{ flex: 1 }}>
            <Text style={styles.disabledCommunityBannerTitle}>
              Community Archived (Read-Only)
            </Text>
            <Text style={styles.disabledCommunityBannerSub}>
              This community is disabled. All past chats, papers, materials, and profiles remain viewable for portfolio and reference purposes, but new messages cannot be sent.
            </Text>
          </View>
        </View>
      )}

      {/* Horizontally Scrolling Segment Pill Strip */}
      <View style={styles.segmentStripContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.segmentStrip}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('papers')}
            style={[styles.segmentPill, activeTab === 'papers' && styles.segmentPillActive]}
          >
            <Text style={[styles.segmentPillText, activeTab === 'papers' && styles.segmentPillTextActive]}>
              Papers ({paperMessages.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('discussion')}
            style={[styles.segmentPill, activeTab === 'discussion' && styles.segmentPillActive]}
          >
            <Text style={[styles.segmentPillText, activeTab === 'discussion' && styles.segmentPillTextActive]}>
              Discussion
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('podcasts')}
            style={[styles.segmentPill, activeTab === 'podcasts' && styles.segmentPillActive]}
          >
            <Text style={[styles.segmentPillText, activeTab === 'podcasts' && styles.segmentPillTextActive]}>
              Podcasts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('live_sessions')}
            style={[styles.segmentPill, activeTab === 'live_sessions' && styles.segmentPillActive]}
          >
            <Text style={[styles.segmentPillText, activeTab === 'live_sessions' && styles.segmentPillTextActive]}>
              Live Sessions
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Tab 1: Papers Feed */}
      {activeTab === 'papers' && (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={styles.tabActionBar}>
            <Text style={styles.tabActionTitle}>Community Papers</Text>
            {!isCommunityDisabled && (
              <TouchableOpacity
                onPress={() => setShowDoiModal(true)}
                style={styles.addDoiBtn}
              >
                <Plus size={13} color="#FFFFFF" />
                <Text style={styles.addDoiBtnText}>Share Paper</Text>
              </TouchableOpacity>
            )}
          </View>

          {paperMessages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FileText size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No research papers shared yet</Text>
              <Text style={styles.emptySub}>
                {isCommunityDisabled
                  ? 'No papers were shared in this community.'
                  : 'Share verified DOI papers and literature reviews with the community.'}
              </Text>
              {!isCommunityDisabled && (
                <TouchableOpacity
                  onPress={() => setShowDoiModal(true)}
                  style={styles.emptyShareBtn}
                >
                  <Plus size={14} color="#FFFFFF" />
                  <Text style={styles.emptyShareBtnText}>Share DOI Paper</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={paperMessages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <View style={{ marginBottom: 14 }}>
                  <WorkspaceDoiCard doiMeta={item.doi_metadata!} />
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* Tab 2: Discussion (Real Chat Feed with Rich Academic Cards) */}
      {activeTab === 'discussion' && (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <FlatList
            ref={flatListRef}
            data={filteredMessages}
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
              <View style={styles.emptyChatState}>
                <View style={styles.emptyChatIconCircle}>
                  <MessageSquare size={36} color="#64748B" strokeWidth={1.7} />
                </View>
                <Text style={styles.emptyChatTitle}>Welcome to {workspace.name}</Text>
                <Text style={styles.emptyChatSub}>
                  {isCommunityDisabled
                    ? 'No past discussion messages recorded in this community.'
                    : 'This is the start of community discussions. Share verified papers, research findings, and start conversations.'}
                </Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const isMe = item.sender_id === currentUser?.id;
              const isDeleted = Boolean(item.is_deleted);
              const isFirstOfDateGroup =
                index === 0 ||
                getDateLabel(item.created_at) !== getDateLabel(filteredMessages[index - 1]?.created_at);

              const msgImageUrl = extractImageUrl(item);
              const isVoiceNote = item.message_type === 'voice_note' || item.message_type === 'audio';

              // Reply preview data
              const replyTarget = item.reply_to || (item.reply_to_id ? messages.find((m) => m.id === item.reply_to_id) : null);

              // Reactions summary
              const reactionsMap: Record<string, { count: number; reactedByMe: boolean }> = {};
              if (item.reactions && typeof item.reactions === 'object') {
                Object.entries(item.reactions).forEach(([emoji, userIds]: [string, any]) => {
                  if (Array.isArray(userIds) && userIds.length > 0) {
                    reactionsMap[emoji] = {
                      count: userIds.length,
                      reactedByMe: userIds.includes(currentUser?.id),
                    };
                  }
                });
              }

              // Document metadata
              const docMeta = item.document_metadata;
              // Post metadata
              const postMeta = item.post_metadata;
              // Profile metadata
              const profMeta = item.profile_metadata;

              // Poll Parsing
              const isPoll = item.message_type === 'poll' || item.content?.startsWith('📊 Poll:');
              let pollQuestionText = '';
              let pollOptionsList: string[] = [];
              if (isPoll && item.content) {
                const lines = item.content.split('\n');
                pollQuestionText = lines[0]?.replace(/^📊\s*Poll:\s*/, '').trim();
                pollOptionsList = lines.slice(1).map((l: string) => l.replace(/^•\s*/, '').trim()).filter(Boolean);
              }

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
                        name={item.sender?.fullName || item.sender?.handle || 'Researcher'}
                        size="sm"
                        style={{ marginRight: 8, alignSelf: 'flex-end', marginBottom: 4 }}
                      />
                    )}

                    <TouchableOpacity
                      activeOpacity={0.9}
                      onLongPress={() => handleLongPressMessage(item)}
                      style={[
                        styles.messageBubble,
                        isMe ? styles.myBubble : styles.otherBubble,
                        isDeleted && styles.deletedBubble,
                      ]}
                    >
                      {/* Sender Name in Group Chat */}
                      {!isMe && !isDeleted && (
                        <Text style={styles.senderName}>
                          {item.sender?.fullName || item.sender?.handle || 'Researcher'}
                        </Text>
                      )}

                      {/* Replying-To Quote Preview */}
                      {replyTarget && !isDeleted && (
                        <View style={[styles.replyQuoteBubble, isMe ? styles.replyQuoteBubbleMe : styles.replyQuoteBubbleOther]}>
                          <Text style={styles.replyQuoteSender} numberOfLines={1}>
                            {replyTarget.sender_id === currentUser?.id ? 'You' : replyTarget.sender?.fullName || 'Researcher'}
                          </Text>
                          <Text style={styles.replyQuoteContent} numberOfLines={1}>
                            {replyTarget.content || 'Attachment'}
                          </Text>
                        </View>
                      )}

                      {/* Deleted Message State */}
                      {isDeleted ? (
                        <Text style={styles.deletedText}>🚫 This message was deleted</Text>
                      ) : (
                        <>
                          {/* Image Attachment */}
                          {msgImageUrl && (
                            <TouchableOpacity
                              activeOpacity={0.9}
                              onPress={() => setViewerImageUrl(msgImageUrl)}
                              style={styles.imageAttachmentContainer}
                            >
                              <ExpoImage
                                source={{ uri: msgImageUrl }}
                                style={styles.imageAttachment}
                                contentFit="cover"
                                transition={200}
                              />
                            </TouchableOpacity>
                          )}

                          {/* Voice Note Player */}
                          {isVoiceNote && (
                            <View style={{ marginVertical: 4 }}>
                              <VoiceNotePlayer
                                audioUrl={item.media_urls?.[0] || (item.attachments as any)?.[0]?.url || item.content}
                                isMe={isMe}
                              />
                            </View>
                          )}

                          {/* DOI Research Paper */}
                          {item.doi_metadata && (
                            <View style={{ marginVertical: 4 }}>
                              <WorkspaceDoiCard doiMeta={item.doi_metadata} />
                            </View>
                          )}

                          {/* Document Manuscript Card */}
                          {docMeta && (
                            <View style={{ marginVertical: 4 }}>
                              <ChatDocumentCard docMeta={docMeta} />
                            </View>
                          )}

                          {/* BooffIn Post Card */}
                          {postMeta && (
                            <View style={{ marginVertical: 4 }}>
                              <ChatPostCard postMeta={postMeta} />
                            </View>
                          )}

                          {/* Researcher Profile Card */}
                          {profMeta && (
                            <View style={{ marginVertical: 4 }}>
                              <ChatProfileCard profileMeta={profMeta} />
                            </View>
                          )}

                          {/* Interactive Poll Card */}
                          {isPoll && pollOptionsList.length > 0 && (
                            <View style={styles.pollCard}>
                              <View style={styles.pollHeader}>
                                <BarChart2 size={16} color="#164E3F" />
                                <Text style={styles.pollQuestionTitle}>{pollQuestionText}</Text>
                              </View>
                              <View style={styles.pollOptionsContainer}>
                                {pollOptionsList.map((opt, optIdx) => {
                                  const optionId = `opt_${optIdx}`;
                                  const isSelected = localPollVotes[item.id] === optionId;
                                  return (
                                    <TouchableOpacity
                                      key={optionId}
                                      activeOpacity={0.7}
                                      onPress={() => handleVote(item.id, optionId)}
                                      style={[styles.pollOptionBtn, isSelected && styles.pollOptionBtnSelected]}
                                    >
                                      <View style={[styles.pollRadio, isSelected && styles.pollRadioSelected]}>
                                        {isSelected && <View style={styles.pollRadioInner} />}
                                      </View>
                                      <Text style={[styles.pollOptionText, isSelected && styles.pollOptionTextSelected]}>
                                        {opt}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            </View>
                          )}

                          {/* Main Text Content */}
                          {item.content && !isVoiceNote && !isPoll && !item.doi_metadata && !docMeta && (
                            <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                              {item.content}
                            </Text>
                          )}

                          {/* Footer: Edited badge & Timestamp */}
                          <View style={styles.messageFooterRow}>
                            {item.is_edited && (
                              <Text style={[styles.editedBadge, isMe ? styles.myEditedBadge : styles.otherEditedBadge]}>
                                edited •{' '}
                              </Text>
                            )}
                            <Text style={[styles.timestamp, isMe ? styles.myTimestamp : styles.otherTimestamp]}>
                              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                            {isMe && (
                              <View style={{ marginLeft: 4 }}>
                                <CheckCheck size={13} color="#FFFFFF" strokeWidth={2.2} />
                              </View>
                            )}
                          </View>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Emoji Reactions Pills under message bubble */}
                  {Object.keys(reactionsMap).length > 0 && !isDeleted && (
                    <View style={[styles.reactionsRow, isMe ? styles.myReactionsRow : styles.otherReactionsRow]}>
                      {Object.entries(reactionsMap).map(([emoji, r]) => (
                        <TouchableOpacity
                          key={emoji}
                          activeOpacity={0.7}
                          onPress={() => handleToggleReaction(item.id, emoji)}
                          style={[styles.reactionPill, r.reactedByMe && styles.reactionPillActive]}
                        >
                          <Text style={styles.reactionEmoji}>{emoji}</Text>
                          {r.count > 1 && <Text style={styles.reactionCount}>{r.count}</Text>}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            }}
          />

          {/* Attached DOI Card in Draft Mode */}
          {attachedDoi && (
            <View style={styles.attachedDoiPreview}>
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

          {/* Realtime Community Typing Indicator */}
          {isSomeoneTyping && (
            <AnimatedTypingIndicator
              name={typingUserNames || 'Someone'}
              count={Object.keys(typingInThisRoom || {}).length}
            />
          )}

          {/* Bottom Input Dock */}
          {isCommunityDisabled ? (
            <View style={styles.disabledBottomDock}>
              <Lock size={16} color="#64748B" strokeWidth={2.2} />
              <Text style={styles.disabledBottomDockText}>
                This community is disabled and in read-only mode.
              </Text>
            </View>
          ) : (
            <View style={styles.bottomDockWrapper}>
              {/* Replying-To Banner */}
              {replyingTo && (
                <View style={styles.replyBanner}>
                  <View style={styles.replyBarIndicator} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.replyBannerTitle} numberOfLines={1}>
                      Replying to {replyingTo.sender_id === currentUser?.id ? 'yourself' : replyingTo.sender?.fullName || 'Researcher'}
                    </Text>
                    <Text style={styles.replyBannerSnippet} numberOfLines={1}>
                      {replyingTo.content || 'Attachment'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setReplyingTo(null)}
                    style={styles.replyCloseBtn}
                  >
                    <X size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Voice Note Recorder or Standard Input Bar */}
              {isRecordingVoice ? (
                <VoiceNoteRecorder
                  onSendVoiceNote={handleSendVoiceNote}
                  onCancel={() => setIsRecordingVoice(false)}
                />
              ) : (
                <View style={styles.bottomDockContainer}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowAttachMenu(true)}
                    style={styles.attachBtn}
                  >
                    <Plus size={20} color="#164E3F" strokeWidth={2.2} />
                  </TouchableOpacity>

                  <View style={styles.inputCapsule}>
                    <TextInput
                      value={inputText}
                      onChangeText={handleTextChange}
                      placeholder={`Message ${workspace.name}...`}
                      placeholderTextColor="#94A3B8"
                      style={styles.textInput}
                      multiline
                    />
                  </View>

                  {inputText.trim().length > 0 || attachedDoi ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleSendMessage}
                      disabled={isSending}
                      style={styles.sendBtn}
                    >
                      {isSending ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Send size={16} color="#FFFFFF" strokeWidth={2.2} />
                      )}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setIsRecordingVoice(true)}
                      style={styles.micBtn}
                    >
                      <Mic size={20} color="#164E3F" strokeWidth={2.2} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Tab 3: Podcasts */}
      {activeTab === 'podcasts' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.podcastHeaderCard}>
            <Mic size={28} color="#164E3F" />
            <Text style={styles.podcastHeaderTitle}>Community Podcasts & Audio Summaries</Text>
            <Text style={styles.podcastHeaderSub}>
              Listen to 15-minute paper walkthroughs and interactive Q&As.
            </Text>
          </View>

          {/* Podcast Episode Card */}
          <View style={styles.podcastCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Mic size={16} color="#164E3F" />
              <Text style={styles.podcastTitle}>Episode 14: Open Science in Cellular Biology</Text>
            </View>
            <Text style={styles.podcastDuration}>Duration: 24 mins • Recorded Oct 7</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                if (Platform.OS === 'web') window.alert('Playing Episode 14...');
              }}
              style={styles.playBtn}
            >
              <Play size={13} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.playBtnText}>Play Podcast</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Tab 4: Live Sessions */}
      {activeTab === 'live_sessions' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.tabActionBar}>
            <Text style={styles.tabActionTitle}>Live Research Sessions</Text>
            {!isCommunityDisabled && (
              <TouchableOpacity
                onPress={() => setShowEventModal(true)}
                style={styles.addDoiBtn}
              >
                <Plus size={13} color="#FFFFFF" />
                <Text style={styles.addDoiBtnText}>Schedule Session</Text>
              </TouchableOpacity>
            )}
          </View>

          {events.filter((e) => e.event_type === 'live_session').length === 0 ? (
            <View style={styles.emptyContainer}>
              <Video size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No upcoming live sessions</Text>
              <Text style={styles.emptySub}>
                {isCommunityDisabled
                  ? 'No live sessions scheduled for this community.'
                  : 'Schedule your next journal club, Q&A, or live experiment streaming.'}
              </Text>
            </View>
          ) : (
            events
              .filter((e) => e.event_type === 'live_session')
              .map((ev) => (
                <View key={ev.id} style={styles.liveSessionCard}>
                  <View style={styles.liveBadgeRow}>
                    <View style={styles.liveIndicatorRow}>
                      <View style={styles.redLiveDot} />
                      <Text style={styles.liveSessionLabel}>LIVE SESSION</Text>
                    </View>
                    <Text style={styles.liveSessionTime}>
                      {new Date(ev.start_time).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.liveSessionTopic}>{ev.title}</Text>
                  {ev.meeting_link && (
                    <TouchableOpacity
                      onPress={() => {
                        if (Platform.OS === 'web') window.open(ev.meeting_link!, '_blank');
                        else Linking.openURL(ev.meeting_link!);
                      }}
                      style={styles.joinMeetingBtn}
                    >
                      <Text style={styles.joinMeetingBtnText}>Join Live Meeting</Text>
                      <ExternalLink size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              ))
          )}
        </ScrollView>
      )}

      {/* Attachment Menu Modal */}
      <Modal
        visible={showAttachMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttachMenu(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowAttachMenu(false)}
          style={styles.modalOverlay}
        >
          <View style={styles.attachMenuCard}>
            <Text style={styles.attachMenuTitle}>Share to Community</Text>
            <View style={styles.attachGrid}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handlePickImage}
                style={styles.attachGridItem}
              >
                <View style={[styles.attachIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <ImageIcon size={22} color="#3B82F6" />
                </View>
                <Text style={styles.attachGridLabel}>Photos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleTakePhoto}
                style={styles.attachGridItem}
              >
                <View style={[styles.attachIconWrap, { backgroundColor: '#F0FDF4' }]}>
                  <Camera size={22} color="#16A34A" />
                </View>
                <Text style={styles.attachGridLabel}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowAttachMenu(false);
                  setShowDoiModal(true);
                }}
                style={styles.attachGridItem}
              >
                <View style={[styles.attachIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <FileText size={22} color="#D97706" />
                </View>
                <Text style={styles.attachGridLabel}>DOI Paper</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowAttachMenu(false);
                  setShowDocumentPickerModal(true);
                }}
                style={styles.attachGridItem}
              >
                <View style={[styles.attachIconWrap, { backgroundColor: '#F3E8FF' }]}>
                  <Paperclip size={22} color="#9333EA" />
                </View>
                <Text style={styles.attachGridLabel}>Manuscript</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowAttachMenu(false);
                  setShowPollModal(true);
                }}
                style={styles.attachGridItem}
              >
                <View style={[styles.attachIconWrap, { backgroundColor: '#ECFDF5' }]}>
                  <BarChart2 size={22} color="#059669" />
                </View>
                <Text style={styles.attachGridLabel}>Poll</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowAttachMenu(false);
                  setShowProfilePickerModal(true);
                }}
                style={styles.attachGridItem}
              >
                <View style={[styles.attachIconWrap, { backgroundColor: '#F1F5F9' }]}>
                  <User size={22} color="#475569" />
                </View>
                <Text style={styles.attachGridLabel}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowAttachMenu(false);
                  setShowPostPickerModal(true);
                }}
                style={styles.attachGridItem}
              >
                <View style={[styles.attachIconWrap, { backgroundColor: '#FEF2F2' }]}>
                  <Sparkles size={22} color="#DC2626" />
                </View>
                <Text style={styles.attachGridLabel}>Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Message Long-Press Action Sheet Modal */}
      <Modal
        visible={showMessageActionMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMessageActionMenu(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowMessageActionMenu(false)}
          style={styles.modalOverlay}
        >
          <View style={styles.actionSheetCard}>
            {/* Quick Emoji Reaction Strip */}
            <View style={styles.reactionStrip}>
              {['❤️', '👍', '💡', '🔥', '👏', '🔬'].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  activeOpacity={0.7}
                  onPress={() => selectedMessage && handleToggleReaction(selectedMessage.id, emoji)}
                  style={styles.reactionEmojiBtn}
                >
                  <Text style={styles.reactionEmojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.actionSheetDivider} />

            {/* Actions List */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleStartReply}
              style={styles.actionSheetRow}
            >
              <Reply size={18} color="#0F172A" />
              <Text style={styles.actionSheetText}>Reply</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleCopyMessage}
              style={styles.actionSheetRow}
            >
              <Copy size={18} color="#0F172A" />
              <Text style={styles.actionSheetText}>Copy Text</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleOpenForward}
              style={styles.actionSheetRow}
            >
              <CornerUpRight size={18} color="#0F172A" />
              <Text style={styles.actionSheetText}>Forward</Text>
            </TouchableOpacity>

            {selectedMessage?.sender_id === currentUser?.id && !selectedMessage?.is_deleted && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleOpenEdit}
                style={styles.actionSheetRow}
              >
                <Pencil size={18} color="#0F172A" />
                <Text style={styles.actionSheetText}>Edit Message</Text>
              </TouchableOpacity>
            )}

            {(selectedMessage?.sender_id === currentUser?.id || workspace.owner_id === currentUser?.id) && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleDeleteMessage}
                style={[styles.actionSheetRow, { borderBottomWidth: 0 }]}
              >
                <Trash2 size={18} color="#DC2626" />
                <Text style={[styles.actionSheetText, { color: '#DC2626' }]}>Delete Message</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Message Modal */}
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
              style={[styles.doiInput, { height: 80, textAlignVertical: 'top', marginVertical: 12 }]}
              multiline
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setEditingMessage(null)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={isSavingEdit || !editInputText.trim()}
                style={[styles.confirmAttachBtn, !editInputText.trim() && { opacity: 0.5 }]}
              >
                {isSavingEdit ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmAttachBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Forward Message Modal */}
      <Modal
        visible={Boolean(forwardingMessage)}
        transparent
        animationType="fade"
        onRequestClose={() => setForwardingMessage(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Forward Message</Text>
              <TouchableOpacity onPress={() => setForwardingMessage(null)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TextInput
              value={forwardSearch}
              onChangeText={setForwardSearch}
              placeholder="Search chat or workspace..."
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginVertical: 10 }]}
            />

            <ScrollView style={{ maxHeight: 300 }}>
              {forwardTargets.map((target) => (
                <TouchableOpacity
                  key={target.id}
                  activeOpacity={0.7}
                  disabled={forwardingTargetId === target.id}
                  onPress={() => handleSendForward(target.id)}
                  style={styles.forwardTargetRow}
                >
                  <Avatar uri={target.avatarUrl || undefined} name={target.name} size="sm" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.forwardTargetName} numberOfLines={1}>
                      {target.name}
                    </Text>
                    <Text style={styles.forwardTargetType}>
                      {target.type === 'dm' ? 'Direct Message' : target.type === 'community' ? 'Community' : 'Inner Circle'}
                    </Text>
                  </View>
                  {forwardingTargetId === target.id ? (
                    <ActivityIndicator size="small" color="#164E3F" />
                  ) : (
                    <CornerUpRight size={18} color="#164E3F" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
            <Text style={styles.modalSubtitle}>Enter paper DOI or URL to fetch and attach verified metadata.</Text>
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
                <TouchableOpacity onPress={handleSharePaperDoi} style={styles.confirmAttachBtn}>
                  <Text style={styles.confirmAttachBtnText}>Post Paper to Community</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Document / Manuscript Picker Modal */}
      <Modal
        visible={showDocumentPickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDocumentPickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Manuscript to Share</Text>
              <TouchableOpacity onPress={() => setShowDocumentPickerModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Select a verified lab manuscript or document to share with the community.</Text>

            <View style={{ gap: 10, marginVertical: 12 }}>
              {SAMPLE_COMMUNITY_DOCUMENTS.map((doc, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  onPress={() => handleAttachDocument(doc)}
                  style={styles.docItemOption}
                >
                  <FileText size={20} color="#164E3F" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text numberOfLines={1} style={styles.docItemName}>{doc.name}</Text>
                    <Text style={styles.docItemMeta}>{(doc.sizeBytes / 1024).toFixed(0)} KB • {doc.pageCount} pages</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Poll Creation Modal */}
      <Modal
        visible={showPollModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPollModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Community Poll</Text>
              <TouchableOpacity onPress={() => setShowPollModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TextInput
              value={pollQuestion}
              onChangeText={setPollQuestion}
              placeholder="Ask a question (e.g. Which preprint should we review?)"
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginVertical: 10 }]}
            />

            {pollOptions.map((opt, idx) => (
              <TextInput
                key={idx}
                value={opt}
                onChangeText={(t) => {
                  const updated = [...pollOptions];
                  updated[idx] = t;
                  setPollOptions(updated);
                }}
                placeholder={`Option ${idx + 1}`}
                placeholderTextColor="#94A3B8"
                style={[styles.doiInput, { marginBottom: 8 }]}
              />
            ))}

            {pollOptions.length < 5 && (
              <TouchableOpacity
                onPress={() => setPollOptions([...pollOptions, ''])}
                style={styles.addOptionBtn}
              >
                <Plus size={14} color="#164E3F" />
                <Text style={styles.addOptionText}>Add Option</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleCreatePoll}
              disabled={isCreatingPoll}
              style={[styles.confirmAttachBtn, { marginTop: 10 }]}
            >
              {isCreatingPoll ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmAttachBtnText}>Create Poll</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Profile Picker Modal */}
      <Modal
        visible={showProfilePickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfilePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share Researcher Profile</Text>
              <TouchableOpacity onPress={() => setShowProfilePickerModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <TextInput
              value={userSearchText}
              onChangeText={handleSearchProfileUsers}
              placeholder="Search researcher name or handle..."
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginVertical: 10 }]}
            />
            {isSearchingProfileUsers && <ActivityIndicator size="small" color="#164E3F" />}
            <ScrollView style={{ maxHeight: 250 }}>
              {userSearchResults.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  activeOpacity={0.7}
                  onPress={() => handleShareProfile(u)}
                  style={styles.forwardTargetRow}
                >
                  <Avatar uri={u.avatarUrl || undefined} name={u.fullName || u.handle} size="sm" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.forwardTargetName}>{u.fullName || u.handle}</Text>
                    <Text style={styles.forwardTargetType}>@{u.handle || 'user'} • {u.academicTitle || 'Researcher'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Post Picker Modal */}
      <Modal
        visible={showPostPickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPostPickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share BooffIn Post</Text>
              <TouchableOpacity onPress={() => setShowPostPickerModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <TextInput
              value={postTitleInput}
              onChangeText={setPostTitleInput}
              placeholder="Post Topic / Heading"
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginVertical: 10 }]}
            />
            <TextInput
              value={postSnippetInput}
              onChangeText={setPostSnippetInput}
              placeholder="Brief summary or highlight (optional)"
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { height: 60, textAlignVertical: 'top', marginBottom: 12 }]}
              multiline
            />
            <TouchableOpacity onPress={handleSharePost} style={styles.confirmAttachBtn}>
              <Text style={styles.confirmAttachBtnText}>Share Post</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Schedule Live Session */}
      <Modal visible={showEventModal} transparent animationType="fade" onRequestClose={() => setShowEventModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Live Research Session</Text>
              <TouchableOpacity onPress={() => setShowEventModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <TextInput
              value={eventTitle}
              onChangeText={setEventTitle}
              placeholder="Session Topic (e.g. CRISPR Gene Therapy Review)"
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginBottom: 10 }]}
            />
            <TextInput
              value={eventLink}
              onChangeText={setEventLink}
              placeholder="Meeting URL (Google Meet / Zoom / Jitsi)"
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginBottom: 14 }]}
            />
            <TouchableOpacity onPress={handleCreateLiveSession} style={styles.confirmAttachBtn}>
              <Text style={styles.confirmAttachBtnText}>Schedule Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Image Viewer Modal */}
      {viewerImageUrl && (
        <ImageViewerModal
          visible={Boolean(viewerImageUrl)}
          images={[viewerImageUrl]}
          onClose={() => setViewerImageUrl(null)}
        />
      )}

      {/* Community Info Modal */}
      <WorkspaceInfoModal
        visible={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        workspace={workspace}
      />
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
  },
  backButton: {
    padding: 6,
    marginRight: 6,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  headerTelemetry: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtnActive: {
    backgroundColor: '#F0FDF4',
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    padding: 0,
  },
  segmentStripContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 8,
  },
  segmentStrip: {
    paddingHorizontal: 16,
    gap: 8,
  },
  segmentPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  segmentPillActive: {
    backgroundColor: '#164E3F',
  },
  segmentPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },
  segmentPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabActionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  addDoiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#164E3F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  addDoiBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  emptyShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#164E3F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  emptyShareBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyChatState: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyChatIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyChatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyChatSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
    maxWidth: '84%',
  },
  myMessageRow: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '100%',
  },
  myBubble: {
    backgroundColor: '#164E3F',
    borderBottomRightRadius: 3,
  },
  otherBubble: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 3,
  },
  deletedBubble: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  deletedText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  senderName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#164E3F',
    marginBottom: 3,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#0F172A',
  },
  messageFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  editedBadge: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  myEditedBadge: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherEditedBadge: {
    color: '#94A3B8',
  },
  timestamp: {
    fontSize: 10,
  },
  myTimestamp: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  otherTimestamp: {
    color: '#94A3B8',
  },
  replyQuoteBubble: {
    padding: 6,
    borderRadius: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
  },
  replyQuoteBubbleMe: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderLeftColor: '#FFFFFF',
  },
  replyQuoteBubbleOther: {
    backgroundColor: '#FFFFFF',
    borderLeftColor: '#164E3F',
  },
  replyQuoteSender: {
    fontSize: 11,
    fontWeight: '700',
    color: '#164E3F',
  },
  replyQuoteContent: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  imageAttachmentContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  imageAttachment: {
    width: 220,
    height: 160,
    borderRadius: 12,
  },
  pollCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginVertical: 4,
    minWidth: 200,
  },
  pollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  pollQuestionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  pollOptionsContainer: {
    gap: 6,
  },
  pollOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  pollOptionBtnSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#164E3F',
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
    fontSize: 12.5,
    color: '#334155',
  },
  pollOptionTextSelected: {
    fontWeight: '700',
    color: '#164E3F',
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: -2,
    marginBottom: 4,
  },
  myReactionsRow: {
    justifyContent: 'flex-end',
    marginRight: 4,
  },
  otherReactionsRow: {
    justifyContent: 'flex-start',
    marginLeft: 36,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  reactionPillActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#164E3F',
  },
  reactionEmoji: {
    fontSize: 12,
  },
  reactionCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  attachedDoiPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
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
  },
  dateSeparatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'capitalize',
  },
  disabledCommunityBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  disabledCommunityBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  disabledCommunityBannerSub: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 15,
  },
  disabledBottomDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  disabledBottomDockText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  bottomDockWrapper: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  replyBarIndicator: {
    width: 3,
    height: 28,
    borderRadius: 2,
    backgroundColor: '#164E3F',
  },
  replyBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#164E3F',
  },
  replyBannerSnippet: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  replyCloseBtn: {
    padding: 4,
  },
  bottomDockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputCapsule: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    maxHeight: 100,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 14,
    color: '#0F172A',
    maxHeight: 90,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#164E3F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  podcastHeaderCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  podcastHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#164E3F',
    marginTop: 8,
  },
  podcastHeaderSub: {
    fontSize: 12.5,
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
  },
  podcastCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  podcastTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  podcastDuration: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 10,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#164E3F',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  playBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  liveSessionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  redLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  liveSessionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  liveSessionTime: {
    fontSize: 11.5,
    color: '#64748B',
  },
  liveSessionTopic: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  joinMeetingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#164E3F',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  joinMeetingBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 8,
  },
  doiInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
    flex: 1,
  },
  doiLookupBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#164E3F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmAttachBtn: {
    backgroundColor: '#164E3F',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    flex: 1,
  },
  confirmAttachBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    flex: 1,
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#475569',
  },
  attachMenuCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  attachMenuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
    textAlign: 'center',
  },
  attachGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-around',
  },
  attachGridItem: {
    alignItems: 'center',
    width: 70,
  },
  attachIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  attachGridLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  actionSheetCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  reactionStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6,
  },
  reactionEmojiBtn: {
    padding: 6,
  },
  reactionEmojiText: {
    fontSize: 24,
  },
  actionSheetDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  actionSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  actionSheetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  forwardTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  forwardTargetName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  forwardTargetType: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
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
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    marginBottom: 4,
  },
  addOptionText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#164E3F',
  },
});
