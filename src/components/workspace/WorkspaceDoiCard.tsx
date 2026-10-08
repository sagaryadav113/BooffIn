import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { router } from 'expo-router';
import { FileText, ExternalLink, Bookmark, Check } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { DoiMetadata } from '../../types/workspace';

interface WorkspaceDoiCardProps {
  doiMeta: DoiMetadata;
  onSave?: () => void;
  isSaved?: boolean;
}

export const WorkspaceDoiCard: React.FC<WorkspaceDoiCardProps> = ({
  doiMeta,
  onSave,
  isSaved = false,
}) => {
  const handleOpenPaper = () => {
    if (doiMeta.doi) {
      router.push(`/paper/${encodeURIComponent(doiMeta.doi)}`);
    } else if (doiMeta.url) {
      Linking.openURL(doiMeta.url);
    }
  };

  const authorsText = (doiMeta.authors || [])
    .map((a) => (typeof a === 'string' ? a : a.name))
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');

  const hasMoreAuthors = (doiMeta.authors || []).length > 3;

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <FileText size={13} color="#064E3B" />
          <Text style={styles.badgeText}>DOI RESEARCH PAPER</Text>
        </View>
        {doiMeta.citationCount !== undefined && doiMeta.citationCount > 0 && (
          <View style={styles.citationBadge}>
            <Text style={styles.citationText}>{doiMeta.citationCount} Citations</Text>
          </View>
        )}
      </View>

      {/* Paper Title */}
      <TouchableOpacity activeOpacity={0.8} onPress={handleOpenPaper}>
        <Text style={styles.title} numberOfLines={2}>
          {doiMeta.title}
        </Text>
      </TouchableOpacity>

      {/* Authors & Journal */}
      {(authorsText || doiMeta.journal || doiMeta.publicationYear) && (
        <Text style={styles.meta} numberOfLines={1}>
          {[
            authorsText ? `${authorsText}${hasMoreAuthors ? ' et al.' : ''}` : '',
            doiMeta.journal,
            doiMeta.publicationYear,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      )}

      {/* DOI identifier tag */}
      {doiMeta.doi && (
        <Text style={styles.doiTag} numberOfLines={1}>
          https://doi.org/{doiMeta.doi}
        </Text>
      )}

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleOpenPaper}
          style={styles.openButton}
        >
          <Text style={styles.openButtonText}>Read Paper</Text>
          <ExternalLink size={13} color="#FFFFFF" />
        </TouchableOpacity>

        {onSave && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onSave}
            style={[styles.saveButton, isSaved && styles.saveButtonActive]}
          >
            {isSaved ? (
              <Check size={14} color="#064E3B" />
            ) : (
              <Bookmark size={14} color="#475569" />
            )}
            <Text style={[styles.saveButtonText, isSaved && styles.saveButtonTextActive]}>
              {isSaved ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexShrink: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#064E3B',
    letterSpacing: 0.4,
  },
  citationBadge: {
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  citationText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#475569',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 18,
    marginBottom: 4,
    flexShrink: 1,
  },
  meta: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
    flexShrink: 1,
  },
  doiTag: {
    fontSize: 10,
    color: '#2563EB',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 8,
    flexShrink: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#064E3B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  openButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  saveButtonActive: {
    borderColor: '#064E3B',
    backgroundColor: '#ECFDF5',
  },
  saveButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
  },
  saveButtonTextActive: {
    color: '#064E3B',
    fontWeight: '600',
  },
});
