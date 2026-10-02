import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import {
  Brain,
  Dna,
  FlaskConical,
  Cpu,
  Microscope,
  Pill,
  TrendingUp,
  Users,
  ArrowRight,
  Plus,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';

interface DesktopExploreRightSidebarProps {
  onSelectField?: (field: string) => void;
}

export const DesktopExploreRightSidebar: React.FC<DesktopExploreRightSidebarProps> = ({
  onSelectField,
}) => {
  const fields = [
    { name: 'Biomedical Engineering', icon: Microscope, color: '#064E3B' },
    { name: 'Neuroscience', icon: Brain, color: '#2563EB' },
    { name: 'Cancer Biology', icon: FlaskConical, color: '#D97706' },
    { name: 'AI & Biology', icon: Cpu, color: '#7C3AED' },
    { name: 'Genomics', icon: Dna, color: '#059669' },
    { name: 'Drug Discovery', icon: Pill, color: '#DC2626' },
  ];

  return (
    <aside style={{ width: 320, minWidth: 320 }}>
      <View style={styles.container}>
        {/* 1. Research Fields Grid */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Research Fields</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/topic')}
              style={styles.seeAllRow}
            >
              <Text style={styles.seeAllText}>See all</Text>
              <ArrowRight size={12} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.fieldsGrid}>
            {fields.map((f) => {
              const IconComp = f.icon;
              return (
                <TouchableOpacity
                  key={f.name}
                  activeOpacity={0.8}
                  onPress={() => (onSelectField ? onSelectField(f.name) : router.push(`/topic`))}
                  style={styles.fieldTile}
                >
                  <View style={[styles.fieldIconWrap, { backgroundColor: `${f.color}15` }]}>
                    <IconComp size={18} color={f.color} strokeWidth={2.2} />
                  </View>
                  <Text style={styles.fieldTileName} numberOfLines={2}>
                    {f.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 2. Trending Topics */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.headerLeft}>
              <TrendingUp size={16} color="#D97706" />
              <Text style={styles.cardTitle}>Trending Topics</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/topic')}
              style={styles.seeAllRow}
            >
              <Text style={styles.seeAllText}>See all</Text>
              <ArrowRight size={12} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.trendingList}>
            {[
              { name: 'Synaptic plasticity', count: '12.4K posts', rank: 1 },
              { name: 'CRISPR screening', count: '9.8K posts', rank: 2 },
              { name: 'Protein language models', count: '8.1K posts', rank: 3 },
              { name: 'Brain-computer interfaces', count: '7.3K posts', rank: 4 },
              { name: 'Spatial transcriptomics', count: '6.7K posts', rank: 5 },
            ].map((topic) => (
              <TouchableOpacity
                key={topic.name}
                activeOpacity={0.7}
                onPress={() => router.push(`/search?q=${encodeURIComponent(topic.name)}`)}
                style={styles.topicRow}
              >
                <Text style={styles.topicRank}>{topic.rank}</Text>
                <View style={styles.topicMeta}>
                  <Text style={styles.topicName} numberOfLines={1}>
                    {topic.name}
                  </Text>
                  <Text style={styles.topicCount}>{topic.count}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 3. Suggested Researchers */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Suggested Researchers</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/search?tab=researchers')}
              style={styles.seeAllRow}
            >
              <Text style={styles.seeAllText}>See all</Text>
              <ArrowRight size={12} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.researchersList}>
            {[
              {
                name: 'Dr. Arjun Mehta',
                sub: 'Computational Biology · NCBS',
                count: '12K followers',
              },
              {
                name: 'Dr. Elena Park',
                sub: 'Neuroimmunology · Stanford',
                count: '8.4K followers',
              },
              {
                name: 'Dr. Sofia Almeida',
                sub: 'AI for Drug Discovery · Oxford',
                count: '6.1K followers',
              },
            ].map((res) => (
              <View key={res.name} style={styles.scholarRow}>
                <Avatar name={res.name} size="sm" />
                <View style={styles.scholarMeta}>
                  <Text style={styles.scholarName} numberOfLines={1}>
                    {res.name}
                  </Text>
                  <Text style={styles.scholarSub} numberOfLines={1}>
                    {res.sub}
                  </Text>
                </View>
                <TouchableOpacity activeOpacity={0.8} style={styles.followPill}>
                  <Text style={styles.followPillText}>Follow</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </View>
    </aside>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingHorizontal: 12,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  fieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fieldTile: {
    width: '48%' as any,
    backgroundColor: '#F8FAFC',
    borderRadius: radii.lg,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  fieldIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  fieldTileName: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  trendingList: {
    gap: 10,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topicRank: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    width: 14,
  },
  topicMeta: {
    flex: 1,
  },
  topicName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  topicCount: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  researchersList: {
    gap: 12,
  },
  scholarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scholarMeta: {
    flex: 1,
  },
  scholarName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  scholarSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  followPill: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  followPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
});
