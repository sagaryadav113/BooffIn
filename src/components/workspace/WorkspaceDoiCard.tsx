import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { FileText, ExternalLink, Bookmark, Check, Copy, Quote } from 'lucide-react-native';
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
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [copiedDoi, setCopiedDoi] = useState(false);

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

  const handleCopyCitation = async () => {
    const authors = authorsText ? `${authorsText}${hasMoreAuthors ? ' et al.' : ''}` : 'Unknown Authors';
    const year = doiMeta.publicationYear ? ` (${doiMeta.publicationYear}).` : '';
    const journal = doiMeta.journal ? ` ${doiMeta.journal}.` : '';
    const doi = doiMeta.doi ? ` https://doi.org/${doiMeta.doi}` : '';
    const apa = `${authors}${year} ${doiMeta.title}.${journal}${doi}`;

    await Clipboard.setStringAsync(apa);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  const handleCopyDoi = async () => {
    if (!doiMeta.doi) return;
    await Clipboard.setStringAsync(`https://doi.org/${doiMeta.doi}`);
    setCopiedDoi(true);
    setTimeout(() => setCopiedDoi(false), 2000);
  };

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <FileText size={12} color="#064E3B" />
          <Text style={styles.badgeText}>DOI RESEARCH PAPER</Text>
        </View>

        <View style={styles.headerRightBadges}>
          {doiMeta.citationCount !== undefined && doiMeta.citationCount > 0 && (
            <View style={styles.citationBadge}>
              <Text style={styles.citationText}>{doiMeta.citationCount} Citations</Text>
            </View>
          )}
        </View>
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

      {/* Interactive DOI identifier tag with copy */}
      {doiMeta.doi && (
        <TouchableOpacity activeOpacity={0.7} onPress={handleCopyDoi} style={styles.doiTagRow}>
          <Text style={styles.doiTag} numberOfLines={1}>
            doi.org/{doiMeta.doi}
          </Text>
          {copiedDoi ? (
            <Check size={11} color="#064E3B" style={{ marginLeft: 4 }} />
          ) : (
            <Copy size={11} color="#94A3B8" style={{ marginLeft: 4 }} />
          )}
        </TouchableOpacity>
      )}

      {/* Actions Toolbar */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleOpenPaper}
          style={styles.openButton}
        >
          <Text style={styles.openButtonText}>Read Paper</Text>
          <ExternalLink size={12} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleCopyCitation}
          style={[styles.actionBtn, copiedCitation && styles.actionBtnActive]}
        >
          {copiedCitation ? (
            <Check size={13} color="#064E3B" />
          ) : (
            <Quote size={13} color="#475569" />
          )}
          <Text style={[styles.actionBtnText, copiedCitation && styles.actionBtnTextActive]}>
            {copiedCitation ? 'Citation Copied' : 'Cite (APA)'}
          </Text>
        </TouchableOpacity>

        {onSave && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onSave}
            style={[styles.actionBtn, isSaved && styles.actionBtnActive]}
          >
            {isSaved ? (
              <Check size={13} color="#064E3B" />
            ) : (
              <Bookmark size={13} color="#475569" />
            )}
            <Text style={[styles.actionBtnText, isSaved && styles.actionBtnTextActive]}>
              {isSaved ? 'In Vault' : 'Save'}
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
  headerRightBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  doiTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  doiTag: {
    fontSize: 10,
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '500',
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
  actionBtn: {
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
  actionBtnActive: {
    borderColor: '#064E3B',
    backgroundColor: '#ECFDF5',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
  },
  actionBtnTextActive: {
    color: '#064E3B',
    fontWeight: '600',
  },
});
