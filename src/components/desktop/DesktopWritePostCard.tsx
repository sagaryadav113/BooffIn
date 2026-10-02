import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { FileText, MessageSquare, Image as ImageIcon, Sparkles } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
import { useAuthStore } from '../../store/useAuthStore';

export const DesktopWritePostCard: React.FC = () => {
  const currentUser = useAuthStore((s) => s.user);

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
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/create')}
          style={styles.actionPill}
        >
          <FileText size={16} color="#064E3B" strokeWidth={2.2} />
          <Text style={styles.actionPillText}>Share Paper</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/create')}
          style={styles.actionPill}
        >
          <MessageSquare size={16} color="#2563EB" strokeWidth={2.2} />
          <Text style={styles.actionPillText}>Discussion</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/create')}
          style={styles.actionPill}
        >
          <ImageIcon size={16} color="#D97706" strokeWidth={2.2} />
          <Text style={styles.actionPillText}>Figure / Media</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/create')}
          style={styles.actionPill}
        >
          <Sparkles size={16} color="#9333EA" strokeWidth={2.2} />
          <Text style={styles.actionPillText}>Propose Collab</Text>
        </TouchableOpacity>
      </View>
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
