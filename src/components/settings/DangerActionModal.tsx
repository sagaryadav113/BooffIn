import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, TouchableWithoutFeedback } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import { Typography } from '../core/Typography';
import { Icon } from '../core/Icon';

interface DangerActionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  requiresTyping?: boolean;
  confirmationMatchText?: string;
  isLoading?: boolean;
}

export const DangerActionModal: React.FC<DangerActionModalProps> = ({
  visible,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm Action',
  cancelText = 'Cancel',
  requiresTyping = false,
  confirmationMatchText = 'DELETE',
  isLoading = false,
}) => {
  const [typedValue, setTypedValue] = useState('');

  const isConfirmed = requiresTyping
    ? typedValue.trim().toUpperCase() === confirmationMatchText.toUpperCase()
    : true;

  const handleClose = () => {
    setTypedValue('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              <View style={styles.warningIcon}>
                <Icon name="AlertTriangle" size="md" color={colors.error} />
              </View>

              <Typography variant="h3" color={colors.textPrimary} align="center" style={styles.title}>
                {title}
              </Typography>

              <Typography variant="body" color={colors.textSecondary} align="center" style={styles.description}>
                {description}
              </Typography>

              {requiresTyping ? (
                <View style={styles.inputContainer}>
                  <Typography variant="micro" color={colors.textMuted} style={{ marginBottom: 6 }}>
                    Type <Typography variant="captionBold" color={colors.error}>{confirmationMatchText}</Typography> to confirm:
                  </Typography>
                  <TextInput
                    style={styles.textInput}
                    placeholder={confirmationMatchText}
                    placeholderTextColor={colors.textMuted}
                    value={typedValue}
                    onChangeText={setTypedValue}
                    autoCapitalize="characters"
                  />
                </View>
              ) : null}

              <View style={styles.btnRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.cancelBtn}
                  onPress={handleClose}
                  disabled={isLoading}
                >
                  <Typography variant="captionBold" color={colors.textSecondary}>
                    {cancelText}
                  </Typography>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.confirmBtn,
                    (!isConfirmed || isLoading) && styles.disabledBtn,
                  ]}
                  onPress={onConfirm}
                  disabled={!isConfirmed || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Typography variant="captionBold" color={colors.white}>
                      {confirmText}
                    </Typography>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.cardBackground,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  warningIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  inputContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  textInput: {
    width: '100%',
    height: 44,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  btnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    opacity: 0.4,
  },
});
