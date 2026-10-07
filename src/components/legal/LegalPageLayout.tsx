import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Typography } from '../core/Typography';
import { Icon } from '../core/Icon';
import { Button } from '../core/Button';
import { Divider } from '../core/Divider';
import { colors, spacing, radii } from '../../theme';
import { LegalDocument } from '../../constants/legalPolicies';

interface LegalPageLayoutProps {
  document: LegalDocument;
}

export function LegalPageLayout({ document }: LegalPageLayoutProps) {
  const router = useRouter();

  const handleEmailPress = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  return (
    <View style={styles.root}>
      {/* Top Navigation Bar */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/');
              }
            }}
            accessibilityLabel="Go back"
          >
            <Icon name="ArrowLeft" size="md" color={colors.textPrimary} />
            <Typography variant="bodyBold" color={colors.textPrimary} style={{ marginLeft: 8 }}>
              BooffIn
            </Typography>
          </TouchableOpacity>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.navLink}
              onPress={() => router.push('/privacy')}
            >
              <Typography
                variant="captionBold"
                color={document.id === 'privacy' ? colors.brandGreen : colors.textSecondary}
              >
                Privacy
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navLink}
              onPress={() => router.push('/terms')}
            >
              <Typography
                variant="captionBold"
                color={document.id === 'terms' ? colors.brandGreen : colors.textSecondary}
              >
                Terms
              </Typography>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.card}>
          {/* Header Badge */}
          <View style={styles.metaRow}>
            <View style={styles.badge}>
              <Typography variant="microBold" color={colors.brandGreen}>
                OFFICIAL POLICY v{document.version}
              </Typography>
            </View>
            <Typography variant="caption" color={colors.textMuted}>
              Effective: {document.effectiveDate}
            </Typography>
          </View>

          {/* Title & Summary */}
          <Typography variant="h1" color={colors.textPrimary} style={styles.title}>
            {document.title}
          </Typography>

          <Typography variant="body" color={colors.textSecondary} style={styles.summary}>
            {document.summary}
          </Typography>

          {/* Contact Bar */}
          <View style={styles.contactBox}>
            <View style={styles.contactItem}>
              <Typography variant="microBold" color={colors.textMuted}>
                CONTROLLER
              </Typography>
              <Typography variant="caption" color={colors.textPrimary}>
                {document.controller}
              </Typography>
            </View>
            <View style={styles.contactItem}>
              <Typography variant="microBold" color={colors.textMuted}>
                OFFICIAL INQUIRIES
              </Typography>
              <TouchableOpacity onPress={() => handleEmailPress(document.supportEmail)}>
                <Typography variant="captionBold" color={colors.accentBlue}>
                  {document.supportEmail}
                </Typography>
              </TouchableOpacity>
            </View>
            <View style={styles.contactItem}>
              <Typography variant="microBold" color={colors.textMuted}>
                PRIVACY & DPO
              </Typography>
              <TouchableOpacity onPress={() => handleEmailPress(document.privacyEmail)}>
                <Typography variant="captionBold" color={colors.accentBlue}>
                  {document.privacyEmail}
                </Typography>
              </TouchableOpacity>
            </View>
          </View>

          <Divider style={{ marginVertical: spacing.xl }} />

          {/* Policy Sections */}
          {document.sections.map((section, idx) => (
            <View key={idx} style={styles.section}>
              <Typography variant="h3" color={colors.textPrimary} style={styles.sectionTitle}>
                {section.title}
              </Typography>
              {section.content.map((paragraph, pIdx) => (
                <Typography
                  key={pIdx}
                  variant="body"
                  color={colors.textSecondary}
                  style={styles.paragraph}
                >
                  {paragraph}
                </Typography>
              ))}
            </View>
          ))}

          <Divider style={{ marginVertical: spacing.xl }} />

          {/* Footer Note */}
          <View style={styles.footer}>
            <Typography variant="caption" color={colors.textMuted} style={{ textAlign: 'center' }}>
              For general support or research partnership inquiries, please contact{' '}
              <Typography
                variant="captionBold"
                color={colors.accentBlue}
                onPress={() => handleEmailPress('support@letsbooffin.com')}
              >
                support@letsbooffin.com
              </Typography>
              {' '}or{' '}
              <Typography
                variant="captionBold"
                color={colors.accentBlue}
                onPress={() => handleEmailPress('admin@letsbooffin.com')}
              >
                admin@letsbooffin.com
              </Typography>
              .
            </Typography>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  headerContent: {
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  navLink: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Platform.OS === 'web' ? spacing.xxl : spacing.lg,
    maxWidth: 900,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  badge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  title: {
    marginBottom: spacing.md,
  },
  summary: {
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  contactBox: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  contactItem: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  paragraph: {
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  footer: {
    paddingVertical: spacing.md,
  },
});
