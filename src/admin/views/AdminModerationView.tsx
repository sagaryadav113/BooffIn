// ============================================================================
// BOOFFIN ADMIN PORTAL — MODERATION QUEUE VIEW (LIGHT SAAS METIS STYLE)
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { adminModerationService } from '../services/adminModerationService';
import { ShieldAlert, Trash2, RefreshCw } from 'lucide-react-native';

export const AdminModerationView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
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

  const columns: ColumnDef<any>[] = [
    {
      key: 'author',
      header: 'Author / Researcher',
      width: 200,
      render: (p) => (
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
      ),
    },
    {
      key: 'content',
      header: 'Scientific Content / Discussion',
      width: 320,
      render: (p) => (
        <Text style={styles.cellText} numberOfLines={2}>
          {p.content || '[Publication Discussion]'}
        </Text>
      ),
    },
    {
      key: 'created_at',
      header: 'Posted Date',
      width: 140,
      render: (p) => (
        <Text style={styles.cellMuted}>
          {new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      ),
    },
    {
      key: 'actions',
      header: 'Moderation Action',
      width: 140,
      render: (p) => (
        <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(p.id)}>
          <Trash2 size={13} color="#991B1B" />
          <Text style={styles.removeBtnText}>Remove</Text>
        </TouchableOpacity>
      ),
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>Content Moderation Queue</Text>
          <Text style={styles.pageSubtitle}>Authoritative feeds from public.posts ({posts.length} loaded)</Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadPosts}>
          <RefreshCw size={14} color="#475569" />
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {actionSuccessMessage ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{actionSuccessMessage}</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Table Card */}
      <View style={styles.tableCard}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#059669" />
          </View>
        ) : (
          <AdminDataTable
            columns={columns}
            data={posts}
            emptyMessage="No posts found in platform database."
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  centerContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DEF7EC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BCF0DA',
  },
  authorAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#03543F',
  },
  boldText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  usernameText: {
    fontSize: 11,
    color: '#64748B',
  },
  cellText: {
    fontSize: 13,
    color: '#334155',
  },
  cellMuted: {
    fontSize: 12,
    color: '#64748B',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
  },
  successBox: {
    backgroundColor: '#DEF7EC',
    borderWidth: 1,
    borderColor: '#BCF0DA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  successText: {
    fontSize: 12,
    color: '#03543F',
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '500',
  },
});
