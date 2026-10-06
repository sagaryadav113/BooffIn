// ============================================================================
// BOOFFIN ADMIN PORTAL — MODERATION QUEUE VIEW
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity,
  TextInput,
  useWindowDimensions 
} from 'react-native';
import { ADMIN_COLORS, ADMIN_RADII } from '../lib/constants';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { AdminBadge } from '../components/AdminBadge';
import { adminModerationService } from '../services/adminModerationService';
import { ShieldAlert, Trash2, RefreshCw, Search, X, CheckCircle2, AlertTriangle } from 'lucide-react-native';

export const AdminModerationView: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const res = await adminModerationService.listFlaggedPosts({ limit: 50 });
    if (res.error) {
      setErrorMessage(`Authorization / Query Error: ${res.error.message}`);
      setPosts([]);
    } else {
      setPosts(res.posts);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleRemove = async (postId: string) => {
    setActionSuccessMessage(null);
    setErrorMessage(null);

    const res = await adminModerationService.removePost(postId);
    if (res.error) {
      setErrorMessage(`Failed to remove post: ${res.error.message}`);
    } else {
      setActionSuccessMessage(`Post successfully removed and compliance audit log recorded.`);
      loadPosts();
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.author_name || '').toLowerCase().includes(q) ||
      (p.author_username || '').toLowerCase().includes(q) ||
      (p.content || '').toLowerCase().includes(q)
    );
  });

  const columns: ColumnDef<any>[] = [
    {
      key: 'author',
      header: 'RESEARCHER / AUTHOR',
      width: 200,
      render: (p) => (
        <View style={styles.authorCell}>
          <View style={styles.authorAvatar}>
            <Text style={styles.authorAvatarText}>
              {(p.author_name || 'U').substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.boldText} numberOfLines={1}>{p.author_name}</Text>
            <Text style={styles.usernameText} numberOfLines={1}>@{p.author_username}</Text>
          </View>
        </View>
      ),
    },
    {
      key: 'content',
      header: 'SCIENTIFIC DISCUSSION CONTENT',
      width: 340,
      render: (p) => (
        <Text style={styles.cellText} numberOfLines={2}>
          {p.content || '[Publication Discussion]'}
        </Text>
      ),
    },
    {
      key: 'created_at',
      header: 'POSTED DATE',
      width: 130,
      render: (p) => (
        <Text style={styles.cellMuted}>
          {new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      ),
    },
    {
      key: 'actions',
      header: 'MODERATION ACTION',
      width: 140,
      align: 'right',
      render: (p) => (
        <TouchableOpacity style={styles.actionDangerBtn} onPress={() => handleRemove(p.id)}>
          <Trash2 size={11} color={ADMIN_COLORS.statusDangerText} />
          <Text style={styles.actionDangerBtnText}>Remove</Text>
        </TouchableOpacity>
      ),
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerSection}>
        <View>
          <Text style={styles.pageTitle}>Flagged Content Moderation</Text>
          <Text style={styles.pageSubtitle}>
            Live platform stream from public.posts ({posts.length} entries scanned)
          </Text>
        </View>
      </View>

      {actionSuccessMessage && (
        <View style={styles.successBox}>
          <CheckCircle2 size={15} color={ADMIN_COLORS.statusSuccessText} />
          <Text style={styles.successText}>{actionSuccessMessage}</Text>
        </View>
      )}

      {errorMessage && (
        <View style={styles.errorBox}>
          <AlertTriangle size={15} color={ADMIN_COLORS.statusDangerText} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Toolbar */}
      <View style={styles.toolbarCard}>
        <View style={styles.searchInputGroup}>
          <Search size={14} color={ADMIN_COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Filter discussion posts by author or keywords..."
            placeholderTextColor={ADMIN_COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={13} color={ADMIN_COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.refreshIconBtn} onPress={loadPosts}>
          <RefreshCw size={13} color={ADMIN_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={ADMIN_COLORS.emeraldPrimary} />
          <Text style={styles.loadingText}>Loading moderation queue...</Text>
        </View>
      ) : isMobile ? (
        <View style={styles.mobileListContainer}>
          {filteredPosts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Moderation Feed Clean</Text>
              <Text style={styles.emptySub}>No flagged discussions requiring admin review.</Text>
            </View>
          ) : (
            filteredPosts.map((p) => (
              <View key={p.id} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <View style={styles.authorCell}>
                    <View style={styles.authorAvatar}>
                      <Text style={styles.authorAvatarText}>
                        {(p.author_name || 'U').substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.boldText}>{p.author_name}</Text>
                      <Text style={styles.usernameText}>@{p.author_username}</Text>
                    </View>
                  </View>
                  <Text style={styles.cellMuted}>
                    {new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Text>
                </View>

                <Text style={styles.cellText} numberOfLines={3}>
                  {p.content || '[Publication Discussion]'}
                </Text>

                <View style={styles.recordFooter}>
                  <Text style={styles.cellMuted}>ID #{p.id?.slice?.(0, 8) || 'N/A'}</Text>
                  <TouchableOpacity style={styles.actionDangerBtn} onPress={() => handleRemove(p.id)}>
                    <Trash2 size={11} color={ADMIN_COLORS.statusDangerText} />
                    <Text style={styles.actionDangerBtnText}>Remove Post</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      ) : (
        <View style={styles.tableWrapper}>
          <AdminDataTable
            columns={columns}
            data={filteredPosts}
            emptyMessage="No flagged posts found in platform database."
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ADMIN_COLORS.bgCanvas,
  },
  headerSection: {
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: 13,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 2,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ADMIN_COLORS.statusSuccessBg,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.statusSuccessBorder,
    borderRadius: ADMIN_RADII.card,
    padding: 10,
    marginBottom: 14,
  },
  successText: {
    fontSize: 12,
    color: ADMIN_COLORS.statusSuccessText,
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ADMIN_COLORS.statusDangerBg,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.statusDangerBorder,
    borderRadius: ADMIN_RADII.card,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: ADMIN_COLORS.statusDangerText,
    fontWeight: '500',
  },
  toolbarCard: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.card,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  searchInputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ADMIN_COLORS.bgCanvas,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.input,
    paddingHorizontal: 10,
    height: 34,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: ADMIN_COLORS.textPrimary,
    padding: 0,
  },
  refreshIconBtn: {
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    backgroundColor: ADMIN_COLORS.bgSurface,
    padding: 7,
    borderRadius: ADMIN_RADII.button,
  },
  loadingCard: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.card,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: ADMIN_COLORS.textSecondary,
  },
  tableWrapper: {
    marginBottom: 24,
  },
  authorCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: ADMIN_COLORS.bgActive,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.emeraldBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: ADMIN_COLORS.emeraldPrimary,
  },
  boldText: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  usernameText: {
    fontSize: 11,
    color: ADMIN_COLORS.textMuted,
  },
  cellText: {
    fontSize: 12,
    color: ADMIN_COLORS.textPrimary,
    lineHeight: 17,
  },
  cellMuted: {
    fontSize: 11,
    color: ADMIN_COLORS.textMuted,
  },
  actionDangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ADMIN_COLORS.statusDangerBg,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.statusDangerBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ADMIN_RADII.button,
  },
  actionDangerBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: ADMIN_COLORS.statusDangerText,
  },
  mobileListContainer: {
    gap: 10,
    marginBottom: 24,
  },
  recordCard: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.card,
    padding: 12,
    gap: 8,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLORS.borderSubtle,
    paddingTop: 8,
  },
  emptyCard: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.card,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 4,
  },
});
