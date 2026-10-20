import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import {
  X,
  Search,
  Image as ImageIcon,
  FileText,
  Mic,
  BarChart2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react-native';
import { WorkspaceMessage, DoiMetadata } from '../../types/workspace';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { WorkspaceDoiCard } from '../workspace/WorkspaceDoiCard';
import { ImageViewerModal } from '../modals/ImageViewerModal';
import { useColors, useIsDark } from '../../theme';

interface ChatMediaGalleryModalProps {
  visible: boolean;
  onClose: () => void;
  messages: WorkspaceMessage[];
  chatTitle?: string;
}

type GalleryTab = 'media' | 'papers' | 'audio' | 'polls';

export const ChatMediaGalleryModal: React.FC<ChatMediaGalleryModalProps> = ({
  visible,
  onClose,
  messages,
  chatTitle = 'Shared Media',
}) => {
  const colors = useColors();
  const isDark = useIsDark();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [activeTab, setActiveTab] = useState<GalleryTab>('media');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);

  // Extract all media items
  const mediaItems = useMemo(() => {
    const list: Array<{ id: string; url: string; created_at: string; sender_name?: string }> = [];
    messages.forEach((m) => {
      if (m.is_deleted) return;
      const url =
        (m.media_urls && m.media_urls.length > 0 ? m.media_urls[0] : null) ||
        (Array.isArray(m.attachments) && m.attachments[0]?.url ? m.attachments[0].url : null) ||
        (typeof m.content === 'string' && (m.content.startsWith('http') || m.content.includes('/profile-media/')) ? m.content : null);

      if (url && (m.message_type === 'image' || m.content === '📷 Shared photo' || url.match(/\.(jpg|jpeg|png|webp|gif)/i))) {
        list.push({
          id: m.id,
          url,
          created_at: m.created_at,
          sender_name: m.sender?.fullName,
        });
      }
    });
    return list;
  }, [messages]);

  // Extract all DOI papers
  const paperItems = useMemo(() => {
    return messages
      .filter((m) => !m.is_deleted && m.doi_metadata)
      .map((m) => ({
        id: m.id,
        doiMeta: m.doi_metadata!,
        created_at: m.created_at,
        sender_name: m.sender?.fullName,
      }));
  }, [messages]);

  // Extract all Voice Notes
  const audioItems = useMemo(() => {
    return messages.filter(
      (m) =>
        !m.is_deleted &&
        (m.message_type === 'audio' ||
          m.message_type === 'voice_note' ||
          Boolean(m.audio_metadata) ||
          m.content.startsWith('🎙️ Voice Note'))
    );
  }, [messages]);

  // Extract all Polls
  const pollItems = useMemo(() => {
    return messages.filter(
      (m) => !m.is_deleted && (m.message_type === 'poll' || m.content.startsWith('📊 Poll:'))
    );
  }, [messages]);

  const openLightbox = (url: string) => {
    const allUrls = mediaItems.map((item) => item.url);
    const idx = allUrls.indexOf(url);
    setViewerImages(allUrls);
    setViewerIndex(Math.max(0, idx));
    setViewerVisible(true);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Media, Links & Papers</Text>
              <Text style={styles.headerSubTitle}>{chatTitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>

          {/* Segmented Filter Tabs */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveTab('media')}
              style={[styles.tabBtn, activeTab === 'media' && styles.tabBtnActive]}
            >
              <ImageIcon size={15} color={activeTab === 'media' ? (isDark ? '#34D399' : '#164E3F') : (isDark ? '#94A3B8' : '#64748B')} />
              <Text style={[styles.tabBtnText, activeTab === 'media' && styles.tabBtnTextActive]}>
                Photos ({mediaItems.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveTab('papers')}
              style={[styles.tabBtn, activeTab === 'papers' && styles.tabBtnActive]}
            >
              <FileText size={15} color={activeTab === 'papers' ? (isDark ? '#34D399' : '#164E3F') : (isDark ? '#94A3B8' : '#64748B')} />
              <Text style={[styles.tabBtnText, activeTab === 'papers' && styles.tabBtnTextActive]}>
                Papers ({paperItems.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveTab('audio')}
              style={[styles.tabBtn, activeTab === 'audio' && styles.tabBtnActive]}
            >
              <Mic size={15} color={activeTab === 'audio' ? (isDark ? '#34D399' : '#164E3F') : (isDark ? '#94A3B8' : '#64748B')} />
              <Text style={[styles.tabBtnText, activeTab === 'audio' && styles.tabBtnTextActive]}>
                Audio ({audioItems.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActiveTab('polls')}
              style={[styles.tabBtn, activeTab === 'polls' && styles.tabBtnActive]}
            >
              <BarChart2 size={15} color={activeTab === 'polls' ? (isDark ? '#34D399' : '#164E3F') : (isDark ? '#94A3B8' : '#64748B')} />
              <Text style={[styles.tabBtnText, activeTab === 'polls' && styles.tabBtnTextActive]}>
                Polls ({pollItems.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            {/* 1. Photos Grid */}
            {activeTab === 'media' && (
              <View>
                {mediaItems.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <ImageIcon size={32} color={isDark ? '#475569' : '#CBD5E1'} />
                    <Text style={styles.emptyText}>No photos shared in this chat yet</Text>
                  </View>
                ) : (
                  <View style={styles.mediaGrid}>
                    {mediaItems.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.85}
                        onPress={() => openLightbox(item.url)}
                        style={styles.gridImageWrap}
                      >
                        <ExpoImage
                          source={{ uri: item.url }}
                          style={styles.gridImage}
                          contentFit="cover"
                          transition={200}
                          cachePolicy="disk"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* 2. Papers List */}
            {activeTab === 'papers' && (
              <View style={styles.papersList}>
                {paperItems.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <FileText size={32} color={isDark ? '#475569' : '#CBD5E1'} />
                    <Text style={styles.emptyText}>No DOI papers shared in this chat yet</Text>
                  </View>
                ) : (
                  paperItems.map((item) => (
                    <View key={item.id} style={styles.paperCardWrap}>
                      <WorkspaceDoiCard doiMeta={item.doiMeta} />
                      <Text style={styles.itemMetaDate}>
                        Shared by {item.sender_name || 'Researcher'} •{' '}
                        {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* 3. Audio / Voice Notes */}
            {activeTab === 'audio' && (
              <View style={styles.audioList}>
                {audioItems.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Mic size={32} color={isDark ? '#475569' : '#CBD5E1'} />
                    <Text style={styles.emptyText}>No voice notes shared in this chat yet</Text>
                  </View>
                ) : (
                  audioItems.map((item) => (
                    <View key={item.id} style={styles.audioCardWrap}>
                      <View style={styles.audioHeaderRow}>
                        <Text style={styles.audioSenderName}>
                          {item.sender?.fullName || 'Researcher'}
                        </Text>
                        <Text style={styles.itemMetaDate}>
                          {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <VoiceNotePlayer
                        audioUrl={item.media_urls?.[0]}
                        duration={item.audio_metadata?.duration || 18}
                        waveform={item.audio_metadata?.waveform}
                        isMe={false}
                      />
                    </View>
                  ))
                )}
              </View>
            )}

            {/* 4. Polls */}
            {activeTab === 'polls' && (
              <View style={styles.pollsList}>
                {pollItems.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <BarChart2 size={32} color={isDark ? '#475569' : '#CBD5E1'} />
                    <Text style={styles.emptyText}>No research polls in this chat yet</Text>
                  </View>
                ) : (
                  pollItems.map((item) => (
                    <View key={item.id} style={styles.pollCardWrap}>
                      <Text style={styles.pollTitleText}>{item.content}</Text>
                      <Text style={styles.itemMetaDate}>
                        Created by {item.sender?.fullName || 'Researcher'} •{' '}
                        {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Lightbox Modal */}
      <ImageViewerModal
        visible={viewerVisible}
        images={viewerImages}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
        authorName={chatTitle}
      />
    </Modal>
  );
};

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalCard: {
      width: '100%',
      maxWidth: 580,
      height: '84%',
      backgroundColor: isDark ? '#111622' : '#FFFFFF',
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? '#1F2636' : 'transparent',
      borderRadius: 20,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.35 : 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#1F2636' : '#F1F5F9',
      paddingBottom: 14,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: isDark ? '#F9FAFB' : '#0F172A',
    },
    headerSubTitle: {
      fontSize: 12,
      color: isDark ? '#94A3B8' : '#64748B',
      marginTop: 2,
    },
    closeBtn: {
      padding: 6,
    },
    tabsRow: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#161B26' : '#F1F5F9',
      borderRadius: 12,
      padding: 4,
      marginVertical: 12,
      gap: 4,
    },
    tabBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 8,
      borderRadius: 8,
    },
    tabBtnActive: {
      backgroundColor: isDark ? '#1F2636' : '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 2,
      elevation: 1,
    },
    tabBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    tabBtnTextActive: {
      color: isDark ? '#34D399' : '#164E3F',
      fontWeight: '700',
    },
    contentScroll: {
      flex: 1,
    },
    emptyWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 50,
      gap: 8,
    },
    emptyText: {
      fontSize: 13,
      color: isDark ? '#94A3B8' : '#94A3B8',
    },
    mediaGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingVertical: 6,
    },
    gridImageWrap: {
      width: '31.5%',
      aspectRatio: 1,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: isDark ? '#161B26' : '#F1F5F9',
    },
    gridImage: {
      width: '100%',
      height: '100%',
    },
    papersList: {
      gap: 12,
      paddingVertical: 6,
    },
    paperCardWrap: {
      borderWidth: 1,
      borderColor: isDark ? '#1F2636' : '#E2E8F0',
      borderRadius: 12,
      padding: 10,
      backgroundColor: isDark ? '#161B26' : '#F8FAFC',
    },
    itemMetaDate: {
      fontSize: 11,
      color: isDark ? '#94A3B8' : '#94A3B8',
      marginTop: 6,
    },
    audioList: {
      gap: 10,
      paddingVertical: 6,
    },
    audioCardWrap: {
      borderWidth: 1,
      borderColor: isDark ? '#1F2636' : '#E2E8F0',
      borderRadius: 14,
      padding: 12,
      backgroundColor: isDark ? '#161B26' : '#F8FAFC',
    },
    audioHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    audioSenderName: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#34D399' : '#164E3F',
    },
    pollsList: {
      gap: 10,
      paddingVertical: 6,
    },
    pollCardWrap: {
      borderWidth: 1,
      borderColor: isDark ? '#1F2636' : '#E2E8F0',
      borderRadius: 12,
      padding: 12,
      backgroundColor: isDark ? '#161B26' : '#F8FAFC',
    },
    pollTitleText: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#F9FAFB' : '#0F172A',
      lineHeight: 19,
    },
  });
