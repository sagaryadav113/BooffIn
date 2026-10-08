import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { colors } from '../../theme';
import { AppHeader } from '../../components/layout/AppHeader';
import { WorkspaceDMView } from '../../components/workspace/WorkspaceDMView';
import { WorkspaceCommunityView } from '../../components/workspace/WorkspaceCommunityView';
import { WorkspaceInnerCircleView } from '../../components/workspace/WorkspaceInnerCircleView';
import { workspaceService } from '../../api/workspaceService';
import { useAuthStore } from '../../store/useAuthStore';
import { Workspace } from '../../types/workspace';

export default function DynamicWorkspaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.user);

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      const res = await workspaceService.getWorkspaceById(id, currentUser?.id);
      if (res.error || !res.workspace) {
        setError(res.error || 'Workspace not found');
      } else {
        setWorkspace(res.workspace);
      }
      setIsLoading(false);
    }

    load();
  }, [id, currentUser?.id]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <AppHeader showBack title="Workspace" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color="#064E3B" />
          <Text style={styles.loadingText}>Opening workspace room...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !workspace) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <AppHeader showBack title="Workspace" />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error || 'Unable to load workspace'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {workspace.type === 'dm' && <WorkspaceDMView workspace={workspace} />}
      {workspace.type === 'community' && <WorkspaceCommunityView workspace={workspace} />}
      {workspace.type === 'inner_circle' && <WorkspaceInnerCircleView workspace={workspace} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
});
