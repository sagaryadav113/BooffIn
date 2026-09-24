import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { colors, radii, spacing } from '../../theme';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { Header } from '../../components/layout/Header';
import { Typography } from '../../components/core/Typography';
import { Button } from '../../components/core/Button';
import { Icon } from '../../components/core/Icon';

import { useAuthStore } from '../../store/useAuthStore';

const initialTopics = [
  'Neuroscience',
  'Genetics & Genomics',
  'AI in Science',
  'Cancer Biology',
  'Immunology',
  'Developmental Biology',
  'Structural Biology',
  'Bioinformatics',
];

export default function OnboardingScreen() {
  const { updateProfile } = useAuthStore();
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['Neuroscience', 'AI in Science']);

  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const handleComplete = () => {
    if (selectedTopics.length > 0) {
      updateProfile({ researchInterests: selectedTopics });
    }
    router.replace('/(tabs)');
  };

  return (
    <ScreenContainer scrollable>
      <Header showBack onBack={() => router.replace('/(auth)/welcome')} />

      <View style={styles.content}>
        <View style={styles.badge}>
          <Icon name="Brain" size="xs" color={colors.black} />
          <Typography variant="micro" color={colors.black} style={{ fontWeight: '700' }}>
            STEP 1 OF 2
          </Typography>
        </View>

        <Typography variant="h1" style={styles.title}>
          Select your research disciplines
        </Typography>

        <Typography variant="body" color={colors.textSecondary} style={styles.subtitle}>
          BooffIn tailors your feed with recent preprints, published papers, and active discussions in your areas of interest.
        </Typography>

        <View style={styles.topicsGrid}>
          {initialTopics.map((topic) => {
            const isSelected = selectedTopics.includes(topic);
            return (
              <TouchableOpacity
                key={topic}
                activeOpacity={0.8}
                onPress={() => toggleTopic(topic)}
                style={[
                  styles.topicChip,
                  isSelected ? styles.topicChipActive : styles.topicChipInactive,
                ]}
              >
                <Typography
                  variant="captionBold"
                  color={isSelected ? colors.white : colors.textPrimary}
                >
                  {topic}
                </Typography>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.bottomSection}>
          <Button
            title="Continue to BooffIn"
            variant="primary"
            size="lg"
            onPress={handleComplete}
            style={styles.continueButton}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    marginBottom: spacing.sm,
  },
  subtitle: {
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xxxl,
  },
  topicChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  topicChipActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  topicChipInactive: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.borderLight,
  },
  bottomSection: {
    marginTop: 'auto',
    paddingTop: spacing.xl,
  },
  continueButton: {
    width: '100%',
  },
});
