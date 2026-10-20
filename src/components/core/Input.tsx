import React, { useState } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { colors as staticColors, radii, spacing, typography, layout, useColors, useIsDark } from '../../theme';
import { Typography } from './Typography';
import { Icon, IconName } from './Icon';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  style,
  ...props
}) => {
  const colors = useColors();
  const isDark = useIsDark();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Typography variant="labelBold" color={colors.textPrimary} style={styles.label}>
          {label}
        </Typography>
      )}

      <View
        style={[
          styles.inputWrapper,
          { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight },
          props.multiline && { alignItems: 'flex-start', paddingTop: spacing.xs, paddingBottom: spacing.xs },
          isFocused && [styles.inputWrapperFocused, { backgroundColor: isDark ? colors.backgroundSecondary : colors.white, borderColor: isDark ? '#10B981' : colors.primary }],
          error ? styles.inputWrapperError : null,
        ]}
      >
        {leftIcon && (
          <View style={[styles.leftIconWrapper, props.multiline && { marginTop: spacing.sm }]}>
            <Icon name={leftIcon} size="sm" color={colors.textSecondary} />
          </View>
        )}

        <TextInput
          style={[
            styles.input,
            { color: colors.textPrimary },
            props.multiline && { minHeight: 68, textAlignVertical: 'top' },
            style,
          ]}
          placeholderTextColor={colors.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {rightIcon && (
          <TouchableOpacity
            disabled={!onRightIconPress}
            onPress={onRightIconPress}
            style={styles.rightIconWrapper}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name={rightIcon} size="sm" color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Typography variant="metadata" color={colors.accentRed} style={styles.helperText}>
          {error}
        </Typography>
      ) : hint ? (
        <Typography variant="metadata" color={colors.textSecondary} style={styles.helperText}>
          {hint}
        </Typography>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.xs + 2,
    fontSize: 14,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.backgroundSecondary,
    borderWidth: 1,
    borderColor: staticColors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md + 2,
    minHeight: layout.inputHeights.md,
  },
  inputWrapperFocused: {
    borderColor: staticColors.black,
    backgroundColor: staticColors.white,
  },
  inputWrapperError: {
    borderColor: staticColors.accentRed,
  },
  leftIconWrapper: {
    marginRight: spacing.sm,
  },
  rightIconWrapper: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    ...typography.body,
    color: staticColors.textPrimary,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
  },
  helperText: {
    marginTop: spacing.xs + 1,
    fontSize: 12.5,
  },
});
