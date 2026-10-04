// ============================================================================
// BOOFFIN ADMIN PORTAL — MODERATION QUEUE VIEW (STAGE 2)
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { adminModerationService } from '../services/adminModerationService';

export const AdminModerationView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const res = await adminModerationService.listFlaggedPosts({ limit: 25 });
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
      setActionSuccessMessage(`Post ${postId.slice(0, 8)}... successfully removed from platform.`);
      loadPosts();
    }
  };

  const columns: ColumnDef<any>[] = [
    { key: 'author', header: 'Author', width: 150, render: (p) => (
      <Text style={styles.boldText}>@{p.profiles?.username || 'user'}</Text>
    )},
    { key: 'content', header: 'Post Content', width: 280, render: (p) => (
      <Text style={styles.cellText} numberOfLines={2}>{p.content || '[No Text]'}</Text>
    )},
    { key: 'created_at', header: 'Posted At', width: 130, render: (p) => (
      <Text style={styles.cellMuted}>{new Date(p.created_at).toLocaleDateString()}</Text>
    )},
    { key: 'actions', header: 'Actions', width: 130, render: (p) => (
      <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(p.id)}>
        <Text style={styles.removeBtnText}>Remove Post</Text>
      </TouchableOpacity>
    )},
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle}>Content Moderation Queue</Text>
        <Text style={styles.headerSubtitle}>Authoritative data from public.posts table</Text>
      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {actionSuccessMessage ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{actionSuccessMessage}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={ADMIN_COLORS.emeraldPrimary} />
        </View>
      ) : (
        <AdminDataTable columns={columns} data={posts} emptyMessage={errorMessage ? 'Data inaccessible due to authorization error.' : 'No content currently available in moderation queue.'} />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerInfo: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: ADMIN_COLORS.dangerBg,
    borderColor: ADMIN_COLORS.dangerBorder,
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: ADMIN_COLORS.danger,
    fontSize: 12,
  },
  successBox: {
    backgroundColor: ADMIN_COLORS.emeraldBg,
    borderColor: ADMIN_COLORS.emeraldBorder,
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  successText: {
    color: ADMIN_COLORS.emeraldLight,
    fontSize: 12,
    fontWeight: '600',
  },
  boldText: {
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
    fontSize: 13,
  },
  cellText: {
    color: ADMIN_COLORS.textSecondary,
    fontSize: 12,
  },
  cellMuted: {
    color: ADMIN_COLORS.textMuted,
    fontSize: 12,
  },
  removeBtn: {
    backgroundColor: ADMIN_COLORS.dangerBg,
    borderColor: ADMIN_COLORS.dangerBorder,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    alignItems: 'center',
  },
  removeBtnText: {
    color: ADMIN_COLORS.danger,
    fontSize: 11,
    fontWeight: '600',
  },
  loader: {
    padding: 40,
    alignItems: 'center',
  },
});
