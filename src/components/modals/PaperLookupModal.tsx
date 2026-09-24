import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Search, X, Link2, CheckCircle2 } from 'lucide-react-native';
import { Paper } from '../../types';
import { colors, radii, spacing, typography } from '../../theme';
import { usePaperStore } from '../../store/usePaperStore';
import { resolvePaper } from '../../api/paperResolver';
import { Badge } from '../core/Badge';

interface PaperLookupModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPaper: (paper: Paper) => void;
}

export const PaperLookupModal: React.FC<PaperLookupModalProps> = ({
  visible,
  onClose,
  onSelectPaper,
}) => {
  const [query, setQuery] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const searchPapers = usePaperStore((s) => s.searchPapers);
  const addPaper = usePaperStore((s) => s.addPaper);

  const localResults = searchPapers(query);

  const handleResolveExternal = async () => {
    if (!query.trim()) return;
    setResolving(true);
    setResolveError('');

    try {
      const resolved = await resolvePaper(query);
      if (resolved) {
        addPaper(resolved);
        onSelectPaper(resolved);
        onClose();
      } else {
        setResolveError('Could not find paper by DOI or URL. Please verify the link.');
      }
    } catch {
      setResolveError('Failed to fetch metadata. Please try again.');
    } finally {
      setResolving(false);
    }
  };

  const isDoiOrUrl =
    query.includes('10.') ||
    query.includes('http://') ||
    query.includes('https://') ||
    query.includes('doi.org');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Attach Research Paper</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Search / DOI Input */}
        <View style={styles.searchBox}>
          <Search size={18} color={colors.textSecondary} style={{ marginRight: spacing.sm }} />
          <TextInput
            style={styles.input}
            placeholder="Search papers or paste DOI / URL..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setResolveError('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* External Resolver Trigger */}
        {isDoiOrUrl && (
          <TouchableOpacity
            onPress={handleResolveExternal}
            disabled={resolving}
            style={styles.resolveButton}
          >
            <Link2 size={16} color={colors.white} />
            <Text style={styles.resolveButtonText}>
              {resolving ? 'Retrieving Metadata from Crossref & OpenAlex...' : 'Fetch Paper from DOI / Link'}
            </Text>
            {resolving && <ActivityIndicator size="small" color={colors.white} style={{ marginLeft: spacing.xs }} />}
          </TouchableOpacity>
        )}

        {resolveError ? <Text style={styles.errorText}>{resolveError}</Text> : null}

        {/* Local Results List */}
        <FlatList
          data={localResults}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                onSelectPaper(item);
                onClose();
              }}
              style={styles.paperItem}
            >
              <View style={{ flex: 1 }}>
                <Text numberOfLines={2} style={styles.paperTitle}>
                  {item.title}
                </Text>
                <View style={styles.paperMetaRow}>
                  <Badge label={item.journal} />
                  <Text style={styles.paperYear}>({item.publicationYear})</Text>
                  <Text style={styles.paperAuthors} numberOfLines={1}>
                    · {item.authors.map((a) => a.name).join(', ')}
                  </Text>
                </View>
              </View>
              <CheckCircle2 size={18} color={colors.textMuted} style={{ marginLeft: spacing.sm }} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {query ? 'No matching local papers found.' : 'Search for a paper or paste a DOI above.'}
              </Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    padding: 0,
  },
  resolveButton: {
    backgroundColor: colors.black,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  resolveButtonText: {
    ...typography.captionBold,
    color: colors.white,
  },
  errorText: {
    ...typography.caption,
    color: colors.accentRed,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  listContent: {
    padding: spacing.lg,
  },
  paperItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  paperTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  paperMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  paperYear: {
    ...typography.micro,
    color: colors.textSecondary,
  },
  paperAuthors: {
    ...typography.micro,
    color: colors.textMuted,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
