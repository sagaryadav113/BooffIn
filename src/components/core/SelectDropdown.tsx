import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors as staticColors, radii, spacing, typography, useColors, useIsDark } from '../../theme';
import { Typography } from './Typography';
import { Sheet } from './Sheet';

export interface DropdownOption {
  label: string;
  value: string;
  subtitle?: string;
  isDestructive?: boolean;
}

export interface SelectDropdownProps {
  label?: string;
  placeholder?: string;
  value?: string | null;
  options: DropdownOption[];
  onSelect: (value: string) => void;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  disabled?: boolean;
  sheetTitle?: string;
}

export const SelectDropdown: React.FC<SelectDropdownProps> = ({
  label,
  placeholder = 'Select an option...',
  value,
  options,
  onSelect,
  error,
  hint,
  containerStyle,
  disabled = false,
  sheetTitle,
}) => {
  const colors = useColors();
  const isDark = useIsDark();
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleOpen = () => {
    if (disabled) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsOpen(true);
  };

  const handleSelect = (val: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    onSelect(val);
    setIsOpen(false);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Typography variant="labelBold" color={colors.textPrimary} style={styles.label}>
          {label}
        </Typography>
      )}

      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.8}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
        style={[
          styles.triggerBox,
          {
            backgroundColor: isDark ? colors.backgroundSecondary : '#F8F9FA',
            borderColor: error ? colors.accentRed : colors.borderLight,
          },
          disabled && styles.disabledTrigger,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.valueText,
            { color: selectedOption ? colors.textPrimary : colors.textSecondary },
          ]}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>

        <ChevronDown size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      {error ? (
        <Typography variant="caption" color={colors.accentRed} style={styles.helperText}>
          {error}
        </Typography>
      ) : hint ? (
        <Typography variant="caption" color={colors.textSecondary} style={styles.helperText}>
          {hint}
        </Typography>
      ) : null}

      {/* Slide-up Sheet for Selection */}
      <Sheet
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        title={sheetTitle || label || 'Select Option'}
      >
        <ScrollView
          style={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => handleSelect(opt.value)}
                activeOpacity={0.7}
                style={[
                  styles.optionRow,
                  {
                    borderBottomColor: colors.borderLight,
                    backgroundColor: isSelected
                      ? isDark
                        ? 'rgba(255,255,255,0.06)'
                        : '#F0FDF4'
                      : 'transparent',
                  },
                ]}
              >
                <View style={styles.optionTextContainer}>
                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color: isSelected ? '#064E3B' : colors.textPrimary,
                        fontWeight: isSelected ? '600' : '400',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {opt.subtitle && (
                    <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                      {opt.subtitle}
                    </Text>
                  )}
                </View>

                {isSelected && <Check size={18} color="#064E3B" strokeWidth={2.4} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Sheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: spacing.xs,
  },
  triggerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  disabledTrigger: {
    opacity: 0.5,
  },
  valueText: {
    fontSize: 15,
    flex: 1,
    marginRight: spacing.sm,
  },
  helperText: {
    marginTop: spacing.xxs,
  },
  sheetContent: {
    maxHeight: 380,
    paddingBottom: spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionTextContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  optionLabel: {
    fontSize: 15,
  },
  optionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
