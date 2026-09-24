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

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  style,
}) => {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
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
        <View style={[styles.dialog, style]}>
          {(title || subtitle) && (
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                {title && (
                  <Typography variant="h3" color={colors.textPrimary}>
                    {title}
                  </Typography>
                )}
                {subtitle && (
                  <Typography
                    variant="caption"
                    color={colors.textSecondary}
                    style={styles.subtitle}
                  >
                    {subtitle}
                  </Typography>
                )}
              </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    padding: spacing.xl,
    ...shadows.floating,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  closeButton: {
    padding: spacing.xs,
  },
  body: {
    width: '100%',
  },
});
