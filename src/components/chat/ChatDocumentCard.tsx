import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { FileText, Download, ExternalLink } from 'lucide-react-native';
import { WorkspaceDocumentMetadata } from '../../types/workspace';

interface ChatDocumentCardProps {
  docMeta: WorkspaceDocumentMetadata;
  isMe?: boolean;
}

export const ChatDocumentCard: React.FC<ChatDocumentCardProps> = ({ docMeta, isMe = false }) => {
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleOpenDocument = () => {
    if (docMeta.fileUrl) {
      if (Platform.OS === 'web') {
        window.open(docMeta.fileUrl, '_blank');
      } else {
        Linking.openURL(docMeta.fileUrl);
      }
    }
  };

  const isPdf = docMeta.mimeType?.includes('pdf') || docMeta.name?.toLowerCase().endsWith('.pdf');

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handleOpenDocument}
      style={[
        styles.cardContainer,
        isMe ? styles.cardMy : styles.cardOther,
      ]}
    >
      <View style={styles.contentRow}>
        <View style={[styles.iconWrap, { backgroundColor: isPdf ? '#FEE2E2' : '#EFF6FF' }]}>
          <FileText size={22} color={isPdf ? '#DC2626' : '#2563EB'} />
        </View>

        <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
          <Text style={styles.docNameText} numberOfLines={2} ellipsizeMode="middle">
            {docMeta.name || 'Research Manuscript.pdf'}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.docSizeText}>
              {formatBytes(docMeta.sizeBytes || 1024 * 450)}
            </Text>
            {typeof docMeta.pageCount === 'number' && (
              <Text style={styles.docPageText}>• {docMeta.pageCount} pages</Text>
            )}
            <Text style={styles.docFormatBadge}>
              {isPdf ? 'PDF' : 'DOCX'}
            </Text>
          </View>
        </View>

        <View style={styles.downloadBtn}>
          <Download size={15} color="#164E3F" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    minWidth: 200,
    maxWidth: 290,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardMy: {
    borderColor: '#A7F3D0',
  },
  cardOther: {
    borderColor: '#E2E8F0',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  docNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  docSizeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  docPageText: {
    fontSize: 11,
    color: '#64748B',
  },
  docFormatBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#164E3F',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 2,
  },
  downloadBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    marginLeft: 6,
    flexShrink: 0,
  },
});
