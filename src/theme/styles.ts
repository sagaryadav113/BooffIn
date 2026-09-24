import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { spacing } from './spacing';
import { radii } from './radii';
import { shadows } from './shadows';

export const commonStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.subtle,
  },
  cardSubtle: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    width: '100%',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
