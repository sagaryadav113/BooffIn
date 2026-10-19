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
import Svg, { Circle, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Clock } from 'lucide-react-native';

export interface InteractiveClockPickerProps {
  value: string; // 'HH:mm', e.g. '14:30'
  onChange: (time24: string) => void;
  style?: StyleProp<ViewStyle>;
}

const DIAL_SIZE = 230;
const DIAL_RADIUS = DIAL_SIZE / 2; // 115
const HAND_RADIUS = 78; // Distance from center to numbers

export function parse24HourToClock(timeStr: string) {
  const [hStr, mStr] = (timeStr || '14:00').split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) h = 14;
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
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');

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

  const handleSelectHour = (h: number) => {
    setRawHourInput(null);
    updateTime(h, minute, period);
    // Smooth auto-transition to minute selection
    setTimeout(() => {
      setMode('minute');
    }, 200);
  };

  const handleSelectMinute = (m: number) => {
    setRawMinuteInput(null);
    updateTime(hour, m, period);
  };

  const handleTogglePeriod = (p: 'AM' | 'PM') => {
    if (p !== period) {
      updateTime(hour, minute, p);
    }
  };

  // Manual Typing: Hour validation (cannot cross 24)
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

    // Validation: Hours cannot cross 24 (valid range: 0 to 23 / 24 max)
    if (num > 23) {
      num = 23;
    }

    let newPeriod = period;
    let newHour12 = num;

    if (num === 0) {
      newPeriod = 'AM';
      newHour12 = 12;
    } else if (num >= 13 && num <= 23) {
      // User entered 24-hour style (e.g. 14 -> 2 PM, 23 -> 11 PM)
      newPeriod = 'PM';
      newHour12 = num % 12;
      if (newHour12 === 0) newHour12 = 12;
    } else if (num >= 1 && num <= 12) {
      newHour12 = num;
    }

    setRawHourInput(String(num).slice(0, 2));
    updateTime(newHour12, minute, newPeriod);

    // Auto-advance to minute input when 2 digits are typed
    if (cleaned.length >= 2) {
      setTimeout(() => {
        minuteInputRef.current?.focus();
        setMode('minute');
      }, 50);
    }
  };

  const handleHourBlur = () => {
    setRawHourInput(null);
  };

  // Manual Typing: Minute validation (cannot cross 60, max 59)
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

    // Validation: Minutes cannot cross 60 (max is 59)
    if (num >= 60) {
      num = 59;
    }

    setRawMinuteInput(cleaned.length === 1 ? cleaned : String(num).padStart(2, '0'));
    updateTime(hour, num, period);
  };

  const handleMinuteBlur = () => {
    setRawMinuteInput(null);
  };

  // Clock Hand End Coordinates
  const handCoords = useMemo(() => {
    let angleRad = 0;
    if (mode === 'hour') {
      const angleDeg = (hour % 12) * 30; // 360 / 12 = 30
      angleRad = (angleDeg * Math.PI) / 180;
    } else {
      const angleDeg = minute * 6; // 360 / 60 = 6
      angleRad = (angleDeg * Math.PI) / 180;
    }

    const x = DIAL_RADIUS + HAND_RADIUS * Math.sin(angleRad);
    const y = DIAL_RADIUS - HAND_RADIUS * Math.cos(angleRad);
    return { x, y };
  }, [mode, hour, minute]);

  // Touch on dial face
  const handleDialPress = (evt: any) => {
    const { locationX, locationY } = evt.nativeEvent;
    if (typeof locationX !== 'number' || typeof locationY !== 'number') return;

    const dx = locationX - DIAL_RADIUS;
    const dy = locationY - DIAL_RADIUS;
    let angleRad = Math.atan2(dx, -dy);
    if (angleRad < 0) angleRad += 2 * Math.PI;
    const deg = (angleRad * 180) / Math.PI;

    if (mode === 'hour') {
      let snappedH = Math.round(deg / 30) % 12;
      if (snappedH === 0) snappedH = 12;
      handleSelectHour(snappedH);
    } else {
      let snappedM = Math.round(deg / 6) % 60;
      handleSelectMinute(snappedM);
    }
  };

  // Hour numbers 1-12
  const hourPositions = useMemo(() => {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => {
      const angleRad = ((h * 30) * Math.PI) / 180;
      const x = DIAL_RADIUS + HAND_RADIUS * Math.sin(angleRad) - 16;
      const y = DIAL_RADIUS - HAND_RADIUS * Math.cos(angleRad) - 16;
      return { num: h, x, y };
    });
  }, []);

  // Minute numbers (00, 05, 10... 55)
  const minutePositions = useMemo(() => {
    return [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => {
      const angleRad = ((m * 6) * Math.PI) / 180;
      const x = DIAL_RADIUS + HAND_RADIUS * Math.sin(angleRad) - 16;
      const y = DIAL_RADIUS - HAND_RADIUS * Math.cos(angleRad) - 16;
      return { num: m, label: String(m).padStart(2, '0'), x, y };
    });
  }, []);

  return (
    <View style={[styles.container, style]}>
      {/* Header: Editable Digital Display (Manual typing) + AM/PM Toggle */}
      <View style={styles.digitalHeader}>
        <View style={styles.digitalTimeRow}>
          {/* Editable Hour Segment */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setMode('hour');
              hourInputRef.current?.focus();
            }}
            style={[styles.digitalSegment, mode === 'hour' && styles.digitalSegmentActive]}
          >
            <TextInput
              ref={hourInputRef}
              value={displayHour}
              onChangeText={handleHourChangeText}
              onFocus={() => setMode('hour')}
              onBlur={handleHourBlur}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              placeholder="00"
              placeholderTextColor="#94A3B8"
              returnKeyType="next"
              onSubmitEditing={() => {
                minuteInputRef.current?.focus();
                setMode('minute');
              }}
              style={[
                styles.digitalInput,
                mode === 'hour' && styles.digitalInputActive,
              ]}
            />
            <Text style={styles.digitalSub}>HOUR</Text>
          </TouchableOpacity>

          <Text style={styles.digitalColon}>:</Text>

          {/* Editable Minute Segment */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setMode('minute');
              minuteInputRef.current?.focus();
            }}
            style={[styles.digitalSegment, mode === 'minute' && styles.digitalSegmentActive]}
          >
            <TextInput
              ref={minuteInputRef}
              value={displayMinute}
              onChangeText={handleMinuteChangeText}
              onFocus={() => setMode('minute')}
              onBlur={handleMinuteBlur}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              placeholder="00"
              placeholderTextColor="#94A3B8"
              returnKeyType="done"
              style={[
                styles.digitalInput,
                mode === 'minute' && styles.digitalInputActive,
              ]}
            />
            <Text style={styles.digitalSub}>MIN</Text>
          </TouchableOpacity>
        </View>

        {/* AM / PM Segmented Control */}
        <View style={styles.periodSwitcher}>
          <TouchableOpacity
            onPress={() => handleTogglePeriod('AM')}
            style={[styles.periodBtn, period === 'AM' && styles.periodBtnActive]}
          >
            <Text style={[styles.periodText, period === 'AM' && styles.periodTextActive]}>
              AM
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleTogglePeriod('PM')}
            style={[styles.periodBtn, period === 'PM' && styles.periodBtnActive]}
          >
            <Text style={[styles.periodText, period === 'PM' && styles.periodTextActive]}>
              PM
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mode Sub-nav: Pick Hours vs Minutes */}
      <View style={styles.modeTabsRow}>
        <TouchableOpacity
          onPress={() => {
            setMode('hour');
            hourInputRef.current?.focus();
          }}
          style={[styles.modeTab, mode === 'hour' && styles.modeTabActive]}
        >
          <Clock size={12} color={mode === 'hour' ? '#164E3F' : '#64748B'} />
          <Text style={[styles.modeTabText, mode === 'hour' && styles.modeTabTextActive]}>
            Select Hour ({hour} {period})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setMode('minute');
            minuteInputRef.current?.focus();
          }}
          style={[styles.modeTab, mode === 'minute' && styles.modeTabActive]}
        >
          <Clock size={12} color={mode === 'minute' ? '#164E3F' : '#64748B'} />
          <Text style={[styles.modeTabText, mode === 'minute' && styles.modeTabTextActive]}>
            Select Minute (:{String(minute).padStart(2, '0')})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Interactive Dial Face */}
      <View style={styles.dialWrapper}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleDialPress}
          style={styles.dialCircle}
        >
          {/* SVG Hand and Hub */}
          <Svg width={DIAL_SIZE} height={DIAL_SIZE} style={StyleSheet.absoluteFill}>
            {/* Outer Subtle Rim */}
            <Circle
              cx={DIAL_RADIUS}
              cy={DIAL_RADIUS}
              r={DIAL_RADIUS - 2}
              fill="#F8FAFC"
              stroke="#E2E8F0"
              strokeWidth={1.5}
            />
            {/* Center Hand Line */}
            <Line
              x1={DIAL_RADIUS}
              y1={DIAL_RADIUS}
              x2={handCoords.x}
              y2={handCoords.y}
              stroke="#164E3F"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            {/* Selected Target Disc */}
            <Circle
              cx={handCoords.x}
              cy={handCoords.y}
              r={16}
              fill="#164E3F"
            />
            {/* Center Hub */}
            <Circle
              cx={DIAL_RADIUS}
              cy={DIAL_RADIUS}
              r={5}
              fill="#164E3F"
            />
          </Svg>

          {/* Numbers positioned on the dial */}
          {mode === 'hour'
            ? hourPositions.map((pos) => {
                const isSelected = pos.num === hour;
                return (
                  <TouchableOpacity
                    key={`h-${pos.num}`}
                    onPress={() => handleSelectHour(pos.num)}
                    style={[
                      styles.numberCircle,
                      { left: pos.x, top: pos.y },
                    ]}
                  >
                    <Text
                      style={[
                        styles.numberText,
                        isSelected && styles.numberTextSelected,
                      ]}
                    >
                      {pos.num}
                    </Text>
                  </TouchableOpacity>
                );
              })
            : minutePositions.map((pos) => {
                const isSelected = pos.num === minute;
                return (
                  <TouchableOpacity
                    key={`m-${pos.num}`}
                    onPress={() => handleSelectMinute(pos.num)}
                    style={[
                      styles.numberCircle,
                      { left: pos.x, top: pos.y },
                    ]}
                  >
                    <Text
                      style={[
                        styles.numberText,
                        isSelected && styles.numberTextSelected,
                      ]}
                    >
                      {pos.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
        </TouchableOpacity>
      </View>

      {/* Quick Presets Row */}
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
    padding: 14,
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
  digitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  digitalTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  digitalSegment: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    minWidth: 56,
  },
  digitalSegmentActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#164E3F',
  },
  digitalInput: {
    fontSize: 22,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.5,
    textAlign: 'center',
    padding: 0,
    margin: 0,
    minWidth: 42,
    height: 30,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outline: 'none' } as any) : {}),
  },
  digitalInputActive: {
    color: '#164E3F',
  },
  digitalSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 1,
  },
  digitalColon: {
    fontSize: 22,
    fontWeight: '800',
    color: '#164E3F',
    marginHorizontal: 2,
    marginBottom: 8,
  },
  periodSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  periodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  periodBtnActive: {
    backgroundColor: '#164E3F',
    shadowColor: '#164E3F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  periodTextActive: {
    color: '#FFFFFF',
  },
  modeTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  modeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modeTabActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#164E3F',
  },
  modeTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: '#164E3F',
    fontWeight: '700',
  },
  dialWrapper: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  dialCircle: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    borderRadius: DIAL_RADIUS,
    position: 'relative',
  },
  numberCircle: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  numberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  numberTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  presetsSection: {
    width: '100%',
    marginTop: 12,
    paddingTop: 8,
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
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#164E3F',
    borderColor: '#164E3F',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
