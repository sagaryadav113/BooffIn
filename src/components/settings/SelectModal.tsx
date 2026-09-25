import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import { Typography } from '../core/Typography';
import { Icon, IconName } from '../core/Icon';

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
  icon?: IconName;
}

interface SelectModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: SelectOption[];
  selectedValue: string;
  onSelect: (val: any) => void;
}

export const SelectModal: React.FC<SelectModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  options,
  selectedValue,
  onSelect,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              <View style={styles.header}>
                <Typography variant="h3" color={colors.textPrimary}>
                  {title}
                </Typography>
                {subtitle ? (
                  <Typography variant="caption" color={colors.textSecondary} style={{ marginTop: 4 }}>
                    {subtitle}
                  </Typography>
                ) : null}
              </View>

              <View style={styles.optionsList}>
                {options.map((option, index) => {
                  const isSelected = option.value === selectedValue;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      activeOpacity={0.7}
                      style={[
                        styles.optionRow,
                        index !== options.length - 1 && styles.optionBorder,
                        isSelected && styles.selectedRow,
                      ]}
                      onPress={() => {
                        onSelect(option.value);
                        onClose();
                      }}
                    >
                      {option.icon ? (
                        <View style={styles.optionIconCircle}>
                          <Icon name={option.icon} size="sm" color={colors.textPrimary} />
                        </View>
                      ) : null}

                      <View style={styles.optionMeta}>
                        <Typography
                          variant="captionBold"
                          color={isSelected ? colors.black : colors.textPrimary}
                        >
                          {option.label}
                        </Typography>
                        {option.description ? (
                          <Typography variant="micro" color={colors.textSecondary} style={{ marginTop: 2 }}>
                            {option.description}
                          </Typography>
                        ) : null}
                      </View>

                      {isSelected ? (
                        <Icon name="Check" size="sm" color={colors.black} />
                      ) : (
                        <View style={styles.radioEmpty} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.cancelBtn}
                onPress={onClose}
              >
                <Typography variant="captionBold" color={colors.textSecondary}>
                  Cancel
                </Typography>
              </TouchableOpacity>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    marginBottom: spacing.md,
  },
  optionsList: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.cardBackground,
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  selectedRow: {
    backgroundColor: '#F8FAFC',
  },
  optionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionMeta: {
    flex: 1,
    marginRight: spacing.sm,
  },
  radioEmpty: {
    width: 18,
    height: 18,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.borderDark,
  },
  cancelBtn: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});
