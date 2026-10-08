import React, { useState, useEffect, useRef } from 'react';
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
  MoreHorizontal,
  Camera,
  Paperclip,
  Mic,
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
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
import { Workspace, WorkspaceMessage, DoiMetadata, WorkspacePollData, WorkspacePollOption } from '../../types/workspace';
import { WorkspaceDoiCard } from './WorkspaceDoiCard';
import { WorkspaceInfoModal } from './WorkspaceInfoModal';
import { ImageViewerModal } from '../modals/ImageViewerModal';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { resolvePaper } from '../../api/paperResolver';
import { supabase } from '../../api/client';
import { fetchUserProfile } from '../../api/authService';
import { uploadPostImage } from '../../api/storageService';
import { blockUser, reportContent } from '../../api/moderationService';
import { unfollowUser } from '../../api/socialService';

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

  const [localPartner, setLocalPartner] = useState<any>(workspace.other_user || null);
  const [inputText, setInputText] = useState('');
  
  // Options Sheet & Moderation State
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
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
  const [localPollVotes, setLocalPollVotes] = useState<Record<string, string>>({}); // messageId -> optionId

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages(workspace.id);
    const unsubscribe = subscribeToWorkspaceMessages(workspace.id);
    return () => {
      unsubscribe();
    };
  }, [workspace.id]);

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

  const partner = localPartner || workspace.other_user;

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
          });
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
      const pollData: WorkspacePollData = {
        question: q,
        options: validOpts.map((text, idx) => ({
          id: `opt_${Date.now()}_${idx}`,
          text,
          votes: [],
        })),
        totalVotes: 0,
      };

      const res = await sendMessage({
        workspace_id: workspace.id,
        content: `📊 Poll: ${q}\n${validOpts.map((opt) => `• ${opt}`).join('\n')}`,
        message_type: 'poll',
        doi_metadata: null,
      });

      if (res.success) {
        setShowPollModal(false);
        setShowAttachMenu(false);
        setPollQuestion('');
        setPollOptions(['', '']);
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

  // Handle Voting in Poll
  const handleVote = (messageId: string, optionId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setLocalPollVotes((prev) => ({
      ...prev,
      [messageId]: prev[messageId] === optionId ? '' : optionId,
    }));
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

    const res = await sendMessage({
      workspace_id: workspace.id,
      content: trimmed || (attachedDoi ? `Shared paper: ${attachedDoi.title}` : ''),
      message_type: attachedDoi ? 'paper_doi' : 'text',
      doi_metadata: attachedDoi,
    });

    if (res.success) {
      setInputText('');
      setAttachedDoi(null);
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

  const renderMessageItem = ({ item }: { item: WorkspaceMessage }) => {
    const isMe = item.sender_id === currentUser?.id;
    const hasDoi = Boolean(item.doi_metadata);
    const msgImageUrl =
      (item.media_urls && item.media_urls.length > 0 ? item.media_urls[0] : null) ||
      (Array.isArray(item.attachments) && item.attachments[0]?.url ? item.attachments[0].url : null) ||
      (typeof item.content === 'string' && (item.content.startsWith('http') || item.content.includes('/profile-media/')) ? item.content : null);

    const isImage = item.message_type === 'image' || Boolean(msgImageUrl) || item.content === '📷 Shared photo';
    const isPoll = item.message_type === 'poll' || item.content.startsWith('📊 Poll:');

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

    return (
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

        <View
          style={[
            styles.messageBubble,
            hasDoi
              ? styles.doiBubble
              : isPoll
              ? styles.pollBubble
              : isMe
              ? styles.myBubble
              : styles.otherBubble,
          ]}
        >
          {/* DOI Paper Attachment */}
          {item.doi_metadata && (
            <WorkspaceDoiCard doiMeta={item.doi_metadata} />
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
          {isPoll && (
            <View style={styles.pollMsgContainer}>
              <View style={styles.pollHeader}>
                <BarChart2 size={16} color="#164E3F" />
                <Text style={styles.pollBadgeText}>RESEARCH POLL</Text>
              </View>
              <Text style={styles.pollQuestionTitle}>{pollQuestionText || item.content}</Text>

              <View style={styles.pollOptionsList}>
                {pollOptionItems.map((opt) => {
                  const isSelected = mySelectedVote === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      activeOpacity={0.7}
                      onPress={() => handleVote(item.id, opt.id)}
                      style={[styles.pollOptionBtn, isSelected && styles.pollOptionBtnSelected]}
                    >
                      <View style={[styles.pollProgressFill, { width: isSelected ? '100%' : '0%' }]} />
                      <View style={styles.pollOptionContent}>
                        <View style={[styles.pollRadio, isSelected && styles.pollRadioSelected]}>
                          {isSelected && <View style={styles.pollRadioInner} />}
                        </View>
                        <Text style={[styles.pollOptionText, isSelected && styles.pollOptionTextSelected]}>
                          {opt.text}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Text Content */}
          {item.content && !hasDoi && !isPoll && (!isImage || (item.content !== '📷 Shared photo' && item.content !== msgImageUrl)) ? (
            <Text
              style={[
                styles.messageText,
                isMe ? styles.myMessageText : styles.otherMessageText,
              ]}
            >
              {item.content}
            </Text>
          ) : null}

          {/* Timestamp & double checkmarks */}
          <View style={styles.msgFooter}>
            <Text
              style={[
                styles.timestamp,
                hasDoi || isPoll
                  ? styles.doiTimestamp
                  : isMe
                  ? styles.myTimestamp
                  : styles.otherTimestamp,
              ]}
            >
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMe && (
              <CheckCheck size={14} color="#34D399" style={{ marginLeft: 4 }} />
            )}
          </View>
        </View>
      </View>
    );
  };

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
            <View style={styles.presenceDot} />
          </View>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {partner?.fullName || workspace.name || 'Researcher'}
          </Text>
        </TouchableOpacity>

        {/* 3-dot Options Menu (MoreVertical) containing Report, Block, and Unfollow per Snapshot 2 */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowOptionsMenu(true)}
          style={styles.moreButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MoreVertical size={20} color="#164E3F" />
        </TouchableOpacity>
      </View>

      {/* Date Capsule: Today */}
      <View style={styles.dateCapsuleContainer}>
        <View style={styles.dateCapsule}>
          <Text style={styles.dateCapsuleText}>Today</Text>
        </View>
      </View>

      {/* Messages List */}
      {isMessagesLoading && messages.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color="#164E3F" />
          <Text style={styles.loaderText}>Loading conversation...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Avatar
                uri={partner?.avatarUrl || undefined}
                name={partner?.fullName || 'Researcher'}
                size="lg"
              />
              <Text style={styles.emptyTitle}>
                {partner?.fullName || 'Researcher'}
              </Text>
              <Text style={styles.emptyBio}>
                {partner?.academicTitle || 'Academic Researcher'}
                {partner?.institution ? ` · ${partner.institution}` : ''}
              </Text>
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

      {/* Bottom Input Dock with Photo Upload, Attachment Menu (Voting/DOI), and Send */}
      <View style={styles.bottomDockContainer}>
        {/* Capsule Input */}
        <View style={styles.inputCapsule}>
          {/* 1. Camera icon: Direct Photo Upload per Snapshot 2 */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handlePickImage}
            style={styles.mediaIconBtn}
          >
            <Camera size={20} color="#64748B" />
          </TouchableOpacity>

          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message..."
            placeholderTextColor="#94A3B8"
            style={styles.textInput}
            multiline
            maxLength={2000}
          />

          {/* 2. Paperclip Attachment: Voting / Poll, DOI, Documents per Snapshot 2 */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowAttachMenu(true)}
            style={styles.mediaIconBtn}
          >
            <Paperclip size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Detached Circular Green Send Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={(!inputText.trim() && !attachedDoi) || isSending}
          onPress={handleSend}
          style={[
            styles.detachedSendBtn,
            (!inputText.trim() && !attachedDoi) && styles.detachedSendBtnDisabled,
          ]}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Send size={16} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Modal: Attachment Menu (Voting / Poll, DOI Paper, Photo Upload) */}
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

            {/* 1. Create Poll / Voting */}
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

            {/* 2. Attach Research Paper (DOI) */}
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

            {/* 3. Photo / Image */}
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

      {/* Modal: Options Menu (Report, Block, Unfollow per Snapshot 2) */}
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
              {partner?.fullName || 'Options'}
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
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleBlock}
              style={styles.optionsItemRow}
            >
              <Ban size={20} color="#DC2626" />
              <Text style={[styles.optionsItemText, { color: '#DC2626' }]}>Block</Text>
            </TouchableOpacity>

            {/* 3. Unfollow */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleUnfollow}
              style={styles.optionsItemRow}
            >
              <UserMinus size={20} color="#DC2626" />
              <Text style={[styles.optionsItemText, { color: '#DC2626' }]}>Unfollow</Text>
            </TouchableOpacity>

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
      {/* Modal: Attach Paper via DOI */}
      <Modal
        visible={showDoiModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDoiModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FileText size={18} color="#164E3F" />
                <Text style={styles.modalTitle}>Attach Research Paper</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDoiModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Enter a DOI (e.g. 10.1038/s41586-021-03819-2) or paste a verified paper link.
            </Text>

            <View style={styles.doiSearchRow}>
              <TextInput
                value={doiQuery}
                onChangeText={setDoiQuery}
                placeholder="Paste DOI (e.g. 10.1038/...)"
                placeholderTextColor="#94A3B8"
                style={styles.doiInput}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={handleResolveDoi}
                disabled={!doiQuery.trim() || isResolvingDoi}
                style={[styles.doiLookupBtn, !doiQuery.trim() && styles.doiLookupBtnDisabled]}
              >
                {isResolvingDoi ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Search size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            {resolvedDoi && (
              <View style={{ marginTop: spacing.md }}>
                <WorkspaceDoiCard doiMeta={resolvedDoi} />
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleAttachResolvedDoi}
                  style={styles.confirmAttachBtn}
                >
                  <Sparkles size={16} color="#FFFFFF" />
                  <Text style={styles.confirmAttachBtnText}>Attach to Message</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

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
    bottom: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  moreButton: {
    padding: 6,
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
    paddingBottom: 16,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
    maxWidth: Platform.OS === 'web' ? '70%' : '82%',
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
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
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
    flex: 1,
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
  doiMessageText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#0F172A',
    marginTop: 6,
    paddingHorizontal: 6,
  },
  msgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
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
});
