import React, { useState } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
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
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Typography variant="captionBold" color={colors.textPrimary} style={styles.label}>
          {label}
        </Typography>
      )}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          error ? styles.inputWrapperError : null,
        ]}
      >
        {leftIcon && (
          <View style={styles.leftIconWrapper}>
            <Icon name={leftIcon} size="sm" color={colors.textSecondary} />
          </View>
        )}

        <TextInput
          style={[styles.input, style]}
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
          >
            <Icon name={rightIcon} size="sm" color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Typography variant="micro" color={colors.accentRed} style={styles.helperText}>
          {error}
        </Typography>
      ) : hint ? (
        <Typography variant="micro" color={colors.textSecondary} style={styles.helperText}>
          {hint}
        </Typography>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  inputWrapperFocused: {
    borderColor: colors.black,
    backgroundColor: colors.white,
  },
  inputWrapperError: {
    borderColor: colors.accentRed,
  },
  leftIconWrapper: {
    marginRight: spacing.sm,
  },
  rightIconWrapper: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  helperText: {
    marginTop: spacing.xs,
  },
});
