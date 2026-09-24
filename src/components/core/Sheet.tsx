import React from 'react';
import {
  Modal as RNModal,
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  ViewStyle,
} from 'react-native';
import { colors, radii, spacing, shadows } from '../../theme';
import { Typography } from './Typography';
import { Icon } from './Icon';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showHandle?: boolean;
  style?: ViewStyle;
}

export const Sheet: React.FC<SheetProps> = ({
  visible,
  onClose,
  title,
  children,
  showHandle = true,
  style,
}) => {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
        pointerEvents="box-none"
      >
        <View style={[styles.sheet, style]}>
          {showHandle && <View style={styles.dragHandle} />}

          {title && (
            <View style={styles.header}>
              <Typography variant="h4" color={colors.textPrimary}>
                {title}
              </Typography>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="X" size="sm" color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.body}>{children}</View>
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.backdrop,
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    maxHeight: '90%',
    ...shadows.floating,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.borderDark,
    alignSelf: 'center',
    marginVertical: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  closeButton: {
    padding: spacing.xs,
  },
  body: {
    paddingHorizontal: spacing.lg,
  },
});
