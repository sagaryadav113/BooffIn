import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronUp, ChevronDown } from 'lucide-react-native';

export interface InteractiveClockPickerProps {
  value: string; // 'HH:mm', e.g. '14:30'
  onChange: (time24: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function parse24HourToClock(timeStr: string) {
  const [hStr, mStr] = (timeStr || '07:00').split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) h = 7;
  let m = parseInt(mStr, 10);
  if (isNaN(m)) m = 0;

  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;

  return { hour: hour12, minute: m, period };
}

export function formatClockTo24Hour(hour12: number, minute: number, period: 'AM' | 'PM') {
  let h24 = hour12 % 12;
  if (period === 'PM') h24 += 12;
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

const PRESET_TIMES = [
  { label: '09:00 AM', time: '09:00' },
  { label: '11:00 AM', time: '11:00' },
  { label: '02:00 PM', time: '14:00' },
  { label: '04:00 PM', time: '16:00' },
  { label: '06:00 PM', time: '18:00' },
];

export const InteractiveClockPicker: React.FC<InteractiveClockPickerProps> = ({
  value,
  onChange,
  style,
}) => {
  const [activeCol, setActiveCol] = useState<'hour' | 'minute' | 'period'>('hour');

  const { hour, minute, period } = useMemo(() => parse24HourToClock(value), [value]);

  const [rawHourInput, setRawHourInput] = useState<string | null>(null);
  const [rawMinuteInput, setRawMinuteInput] = useState<string | null>(null);

  const hourInputRef = useRef<TextInput>(null);
  const minuteInputRef = useRef<TextInput>(null);

  const displayHour = rawHourInput !== null ? rawHourInput : String(hour).padStart(2, '0');
  const displayMinute = rawMinuteInput !== null ? rawMinuteInput : String(minute).padStart(2, '0');

  const updateTime = useCallback(
    (newHour: number, newMin: number, newPeriod: 'AM' | 'PM') => {
      const formatted = formatClockTo24Hour(newHour, newMin, newPeriod);
      onChange(formatted);
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    },
    [onChange]
  );

  // Chevron Handlers
  const incrementHour = () => {
    let next = hour + 1;
    if (next > 12) next = 1;
    setActiveCol('hour');
    setRawHourInput(null);
    updateTime(next, minute, period);
  };

  const decrementHour = () => {
    let prev = hour - 1;
    if (prev < 1) prev = 12;
    setActiveCol('hour');
    setRawHourInput(null);
    updateTime(prev, minute, period);
  };

  const incrementMinute = () => {
    let next = minute + 1;
    if (next >= 60) next = 0;
    setActiveCol('minute');
    setRawMinuteInput(null);
    updateTime(hour, next, period);
  };

  const decrementMinute = () => {
    let prev = minute - 1;
    if (prev < 0) prev = 59;
    setActiveCol('minute');
    setRawMinuteInput(null);
    updateTime(hour, prev, period);
  };

  const togglePeriod = () => {
    const nextP = period === 'AM' ? 'PM' : 'AM';
    setActiveCol('period');
    updateTime(hour, minute, nextP);
  };

  // Keyboard Typing: Hour with validation <= 24
  const handleHourChangeText = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');

    if (cleaned === '') {
      setRawHourInput('');
      return;
    }

    let num = parseInt(cleaned, 10);
    if (isNaN(num)) {
      setRawHourInput('');
      return;
    }

    if (num > 23) {
      num = 23;
    }

    let newPeriod = period;
    let newHour12 = num;

    if (num === 0) {
      newPeriod = 'AM';
      newHour12 = 12;
    } else if (num >= 13 && num <= 23) {
      newPeriod = 'PM';
      newHour12 = num % 12;
      if (newHour12 === 0) newHour12 = 12;
    } else if (num >= 1 && num <= 12) {
      newHour12 = num;
    }

    setRawHourInput(String(num).slice(0, 2));
    updateTime(newHour12, minute, newPeriod);

    // Auto-advance to minute field when 2 digits are typed
    if (cleaned.length >= 2) {
      setTimeout(() => {
        minuteInputRef.current?.focus();
        setActiveCol('minute');
      }, 50);
    }
  };

  const handleHourBlur = () => {
    setRawHourInput(null);
  };

  // Keyboard Typing: Minute with validation < 60
  const handleMinuteChangeText = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');

    if (cleaned === '') {
      setRawMinuteInput('');
      return;
    }

    let num = parseInt(cleaned, 10);
    if (isNaN(num)) {
      setRawMinuteInput('');
      return;
    }

    if (num >= 60) {
      num = 59;
    }

    setRawMinuteInput(cleaned.length === 1 ? cleaned : String(num).padStart(2, '0'));
    updateTime(hour, num, period);
  };

  const handleMinuteBlur = () => {
    setRawMinuteInput(null);
  };

  // Optional Web mouse-wheel scroll support
  const handleWheelCol = (e: any, col: 'hour' | 'minute' | 'period') => {
    if (Platform.OS !== 'web') return;
    const delta = e.deltaY;
    if (delta < 0) {
      if (col === 'hour') incrementHour();
      else if (col === 'minute') incrementMinute();
      else togglePeriod();
    } else if (delta > 0) {
      if (col === 'hour') decrementHour();
      else if (col === 'minute') decrementMinute();
      else togglePeriod();
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* 1. UP CHEVRONS ROW */}
      <View style={styles.chevronsRow}>
        <TouchableOpacity
          onPress={incrementHour}
          activeOpacity={0.6}
          style={styles.chevronBtn}
          accessibilityLabel="Increment Hour"
        >
          <ChevronUp
            size={22}
            color={activeCol === 'hour' ? '#0D9488' : '#64748B'}
            strokeWidth={2.5}
          />
        </TouchableOpacity>

        <View style={styles.colonSpacer} />

        <TouchableOpacity
          onPress={incrementMinute}
          activeOpacity={0.6}
          style={styles.chevronBtn}
          accessibilityLabel="Increment Minute"
        >
          <ChevronUp
            size={22}
            color={activeCol === 'minute' ? '#0D9488' : '#64748B'}
            strokeWidth={2.5}
          />
        </TouchableOpacity>

        <View style={styles.colonSpacer} />

        <TouchableOpacity
          onPress={togglePeriod}
          activeOpacity={0.6}
          style={styles.chevronBtn}
          accessibilityLabel="Toggle AM/PM"
        >
          <ChevronUp
            size={22}
            color={activeCol === 'period' ? '#0D9488' : '#64748B'}
            strokeWidth={2.5}
          />
        </TouchableOpacity>
      </View>

      {/* 2. MAIN DIGITAL CARD (Windows Alarm Style in Light Mode) */}
      <View style={styles.timeCard}>
        {/* Hour Column */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            setActiveCol('hour');
            hourInputRef.current?.focus();
          }}
          // @ts-ignore Web wheel event
          onWheel={(e) => handleWheelCol(e, 'hour')}
          style={[styles.segment, activeCol === 'hour' && styles.segmentActive]}
        >
          <TextInput
            ref={hourInputRef}
            value={displayHour}
            onChangeText={handleHourChangeText}
            onFocus={() => setActiveCol('hour')}
            onBlur={handleHourBlur}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            placeholder="00"
            placeholderTextColor="#94A3B8"
            returnKeyType="next"
            onSubmitEditing={() => {
              minuteInputRef.current?.focus();
              setActiveCol('minute');
            }}
            style={[
              styles.timeInput,
              activeCol === 'hour' && styles.timeInputActive,
            ]}
          />
          {activeCol === 'hour' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>

        {/* Colon 1 */}
        <View style={styles.colonContainer}>
          <Text style={styles.colonText}>:</Text>
        </View>

        {/* Minute Column */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            setActiveCol('minute');
            minuteInputRef.current?.focus();
          }}
          // @ts-ignore Web wheel event
          onWheel={(e) => handleWheelCol(e, 'minute')}
          style={[styles.segment, activeCol === 'minute' && styles.segmentActive]}
        >
          <TextInput
            ref={minuteInputRef}
            value={displayMinute}
            onChangeText={handleMinuteChangeText}
            onFocus={() => setActiveCol('minute')}
            onBlur={handleMinuteBlur}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            placeholder="00"
            placeholderTextColor="#94A3B8"
            returnKeyType="done"
            onSubmitEditing={() => setActiveCol('period')}
            style={[
              styles.timeInput,
              activeCol === 'minute' && styles.timeInputActive,
            ]}
          />
          {activeCol === 'minute' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>

        {/* Colon 2 */}
        <View style={styles.colonContainer}>
          <Text style={styles.colonText}>:</Text>
        </View>

        {/* Period Column (AM / PM) */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={togglePeriod}
          // @ts-ignore Web wheel event
          onWheel={(e) => handleWheelCol(e, 'period')}
          style={[styles.segment, activeCol === 'period' && styles.segmentActive]}
        >
          <Text
            style={[
              styles.periodText,
              activeCol === 'period' && styles.periodTextActive,
            ]}
          >
            {period}
          </Text>
          {activeCol === 'period' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </View>

      {/* 3. DOWN CHEVRONS ROW */}
      <View style={styles.chevronsRow}>
        <TouchableOpacity
          onPress={decrementHour}
          activeOpacity={0.6}
          style={styles.chevronBtn}
          accessibilityLabel="Decrement Hour"
        >
          <ChevronDown
            size={22}
            color={activeCol === 'hour' ? '#0D9488' : '#64748B'}
            strokeWidth={2.5}
          />
        </TouchableOpacity>

        <View style={styles.colonSpacer} />

        <TouchableOpacity
          onPress={decrementMinute}
          activeOpacity={0.6}
          style={styles.chevronBtn}
          accessibilityLabel="Decrement Minute"
        >
          <ChevronDown
            size={22}
            color={activeCol === 'minute' ? '#0D9488' : '#64748B'}
            strokeWidth={2.5}
          />
        </TouchableOpacity>

        <View style={styles.colonSpacer} />

        <TouchableOpacity
          onPress={togglePeriod}
          activeOpacity={0.6}
          style={styles.chevronBtn}
          accessibilityLabel="Toggle AM/PM"
        >
          <ChevronDown
            size={22}
            color={activeCol === 'period' ? '#0D9488' : '#64748B'}
            strokeWidth={2.5}
          />
        </TouchableOpacity>
      </View>

      {/* 4. QUICK PRESETS ROW */}
      <View style={styles.presetsSection}>
        <Text style={styles.presetsLabel}>Quick Presets:</Text>
        <View style={styles.presetsRow}>
          {PRESET_TIMES.map((p) => {
            const isMatch = value === p.time;
            return (
              <TouchableOpacity
                key={p.time}
                onPress={() => {
                  setRawHourInput(null);
                  setRawMinuteInput(null);
                  onChange(p.time);
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                }}
                style={[styles.presetChip, isMatch && styles.presetChipActive]}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    isMatch && styles.presetChipTextActive,
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginVertical: 6,
  },
  chevronsRow: {
    width: 280,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colonSpacer: {
    width: 16,
  },
  chevronBtn: {
    flex: 1,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  timeCard: {
    width: 280,
    height: 74,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
  },
  timeInput: {
    fontSize: 32,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.5,
    textAlign: 'center',
    width: '100%',
    height: '100%',
    padding: 0,
    margin: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outline: 'none' } as any) : {}),
  },
  timeInputActive: {
    color: '#0F172A',
  },
  periodText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  periodTextActive: {
    color: '#0F172A',
  },
  colonContainer: {
    width: 16,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colonText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 4,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#0D9488', // Cyan/teal accent line matching Windows alarm
  },
  presetsSection: {
    width: 280,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  presetsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  presetChip: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#164E3F',
    borderColor: '#164E3F',
  },
  presetChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
