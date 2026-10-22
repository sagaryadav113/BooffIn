import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { radii, spacing } from '../../theme';

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  onComplete?: (otp: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  hasError = false,
}) => {
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  // Pad or slice value to match length
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  // Auto-focus first empty cell on mount
  useEffect(() => {
    const firstEmpty = digits.findIndex((d) => !d);
    const targetIndex = firstEmpty === -1 ? length - 1 : firstEmpty;
    inputRefs.current[targetIndex]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChangeText = (text: string, index: number) => {
    if (disabled) return;

    // Handle full paste (e.g. user copied "123456")
    const cleanNumbers = text.replace(/[^0-9]/g, '');
    if (cleanNumbers.length > 1) {
      const pastedOtp = cleanNumbers.slice(0, length);
      onChange(pastedOtp);
      try {
        Haptics.selectionAsync();
      } catch {}

      // Focus the last cell or trigger complete
      const nextFocus = Math.min(pastedOtp.length, length - 1);
      inputRefs.current[nextFocus]?.focus();

      if (pastedOtp.length === length && onComplete) {
        onComplete(pastedOtp);
      }
      return;
    }

    const singleDigit = cleanNumbers.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = singleDigit;
    const newOtp = newDigits.join('');
    onChange(newOtp);

    if (singleDigit) {
      try {
        Haptics.selectionAsync();
      } catch {}

      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      } else if (newOtp.length === length && onComplete) {
        onComplete(newOtp);
      }
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  return (
    <View style={styles.container}>
      {digits.map((digit, index) => {
        const isFocused = focusedIndex === index;
        return (
          <TextInput
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            value={digit}
            onChangeText={(text) => handleChangeText(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex(-1)}
            keyboardType="number-pad"
            maxLength={length} // Allow paste into any cell
            editable={!disabled}
            selectTextOnFocus
            autoComplete="one-time-code"
            style={[
              styles.cell,
              digit ? styles.cellFilled : null,
              isFocused ? styles.cellFocused : null,
              hasError ? styles.cellError : null,
              disabled ? styles.cellDisabled : null,
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginVertical: spacing.md,
  },
  cell: {
    width: 48,
    height: 56,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8F9FA',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          transition: 'all 0.15s ease',
        } as any)
      : {}),
  },
  cellFilled: {
    borderColor: '#9CA3AF',
    backgroundColor: '#FFFFFF',
  },
  cellFocused: {
    borderColor: '#064E3B',
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  cellError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  cellDisabled: {
    opacity: 0.5,
    backgroundColor: '#F3F4F6',
  },
});
