import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sparkles, Dna, Cpu, Brain, Activity, ShieldCheck, Telescope, Leaf } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';

interface TrendingTopicsGridProps {
  onSelectTopic: (topic: string) => void;
}

const CURATED_DISCIPLINES = [
  { name: 'Molecular Docking', field: 'Structural Biology', icon: Dna, bg: '#F0FDF4', color: '#16A34A' },
  { name: 'Quantum ML', field: 'Physics & Computing', icon: Cpu, bg: '#EFF6FF', color: '#2563EB' },
  { name: 'Neuroimaging', field: 'Neuroscience', icon: Brain, bg: '#FAF5FF', color: '#9333EA' },
  { name: 'AlphaFold 3', field: 'Bioinformatics', icon: Activity, bg: '#FFF1F2', color: '#E11D48' },
  { name: 'CRISPR-Cas9', field: 'Gene Editing', icon: ShieldCheck, bg: '#FDF4FF', color: '#C026D3' },
  { name: 'Astrophysics', field: 'Cosmology', icon: Telescope, bg: '#F8FAFC', color: '#475569' },
  { name: 'Immunotherapy', field: 'Oncology', icon: Leaf, bg: '#ECFDF5', color: '#059669' },
  { name: 'Generative Models', field: 'AI & Machine Learning', icon: Sparkles, bg: '#FFFBEB', color: '#D97706' },
];

export const TrendingTopicsGrid: React.FC<TrendingTopicsGridProps> = ({ onSelectTopic }) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Sparkles size={14} color={colors.accentGold} />
        <Text style={styles.headerTitle}>TRENDING TOPICS & DISCIPLINES</Text>
      </View>

      <View style={styles.grid}>
        {CURATED_DISCIPLINES.map((item) => {
          const IconComp = item.icon;
          return (
            <TouchableOpacity
              key={item.name}
              activeOpacity={0.75}
              onPress={() => onSelectTopic(item.name)}
              style={styles.card}
            >
              <View style={[styles.iconWrap, { backgroundColor: item.bg }]}>
                <IconComp size={16} color={item.color} />
              </View>
              <View style={styles.cardTexts}>
                <Text style={styles.topicName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.fieldName} numberOfLines={1}>
                  {item.field}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm + 2,
  },
  headerTitle: {
    ...typography.microBold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTexts: {
    flex: 1,
  },
  topicName: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 13,
  },
  fieldName: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
});
