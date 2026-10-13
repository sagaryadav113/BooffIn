import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { FileText, MessageSquare, Image as ImageIcon, BookOpen } from 'lucide-react-native';
import { radii } from '../../theme';
import { Avatar } from '../core/Avatar';
import { useAuthStore } from '../../store/useAuthStore';
import { PaperLookupModal } from '../modals/PaperLookupModal';
import { ImageAttachmentModal } from '../modals/ImageAttachmentModal';
import { Paper } from '../../types';

export const DesktopWritePostCard: React.FC = () => {
  const currentUser = useAuthStore((s) => s.user);
  const [paperModalVisible, setPaperModalVisible] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  const handleSelectPaper = (paper: Paper) => {
    setPaperModalVisible(false);
    router.push({
      pathname: '/(tabs)/create',
      params: { paperData: JSON.stringify(paper) },
    });
  };

  const handleImagesSelected = (urls: string[]) => {
    setImageModalVisible(false);
    router.push({
      pathname: '/(tabs)/create',
      params: { initialImages: JSON.stringify(urls) },
    });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push('/(tabs)/create')}
        style={styles.topRow}
      >
        <Avatar
          uri={currentUser?.avatarUrl}
          name={currentUser?.fullName || currentUser?.handle || 'Researcher'}
          size="md"
        />
        <View style={styles.inputPlaceholder}>
          <Text style={styles.placeholderText}>
            Share your latest research, DOI preprint, or start a scientific discussion...
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.divider} />

      <View style={styles.actionsRow}>
        {/* 1. Share Paper - Directly opens Add Paper lookup without first opening post section */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setPaperModalVisible(true)}
          style={styles.actionPill}
        >
          <FileText size={16} color="#064E3B" strokeWidth={2.2} />
          <Text style={styles.actionPillText}>Share Paper</Text>
        </TouchableOpacity>

        {/* 2. Discussion - Opens standard post writing section */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => router.push('/(tabs)/create')}
          style={styles.actionPill}
        >
          <MessageSquare size={16} color="#2563EB" strokeWidth={2.2} />
          <Text style={styles.actionPillText}>Discussion</Text>
        </TouchableOpacity>

        {/* 3. Figure / Media - Directly opens file selection / camera options without first opening post section */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setImageModalVisible(true)}
          style={styles.actionPill}
        >
          <ImageIcon size={16} color="#D97706" strokeWidth={2.2} />
          <Text style={styles.actionPillText}>Figure / Media</Text>
        </TouchableOpacity>

        {/* 4. Article - Directly opens long-form research article composer */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/create',
              params: { type: 'article' },
            })
          }
          style={styles.actionPill}
        >
          <BookOpen size={16} color="#7C3AED" strokeWidth={2.2} />
          <Text style={styles.actionPillText}>Article</Text>
        </TouchableOpacity>
      </View>

      {/* Reference External Paper Modal */}
      <PaperLookupModal
        visible={paperModalVisible}
        onClose={() => setPaperModalVisible(false)}
        onSelectPaper={handleSelectPaper}
      />

      {/* Add Figure / Image Attachment Modal */}
      <ImageAttachmentModal
        visible={imageModalVisible}
        onClose={() => setImageModalVisible(false)}
        onImagesSelected={handleImagesSelected}
        userId={currentUser?.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputPlaceholder: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: radii.full,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  placeholderText: {
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: '#F8FAFC',
  },
  actionPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
});
