import React from 'react';
import { View, StyleSheet, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, radii } from '../../theme';
import { Header } from '../layout/Header';
import { Typography } from '../core/Typography';

interface SettingsLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  isSaving?: boolean;
  isLoading?: boolean;
  rightAction?: React.ReactNode;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  title,
  subtitle,
  children,
  showBack = true,
  onBack,
  isSaving = false,
  isLoading = false,
  rightAction,
}) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title={title}
        showBack={showBack}
        onBack={handleBack}
        rightElement={
          rightAction || (
            isSaving ? (
              <View style={styles.savingBadge}>
                <ActivityIndicator size="small" color={colors.textSecondary} />
                <Typography variant="micro" color={colors.textSecondary} style={{ marginLeft: 6 }}>
                  Saving...
                </Typography>
              </View>
            ) : null
          )
        }
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.black} />
          <Typography variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
            Loading preferences...
          </Typography>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.innerWrapper}>
            {subtitle && (
              <Typography variant="body" color={colors.textSecondary} style={styles.pageSubtitle}>
                {subtitle}
              </Typography>
            )}
            {children}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    alignItems: 'center',
  },
  innerWrapper: {
    width: '100%',
    maxWidth: 640,
  },
  pageSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  savingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },
});
