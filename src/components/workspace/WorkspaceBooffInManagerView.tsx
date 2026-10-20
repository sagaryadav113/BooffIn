import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Plus,
  Search,
  Calendar,
  Trash2,
  Edit3,
  User,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
  Check,
  ArrowRight,
} from 'lucide-react-native';
import { Avatar } from '../core/Avatar';
import { InteractiveClockPicker } from '../common/InteractiveClockPicker';
import {
  Workspace,
  WorkspaceMember,
  WorkspaceTask,
  WorkspaceTaskStatus,
  WorkspaceTaskPriority,
  WorkspaceTaskColor,
} from '../../types/workspace';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useColors, useIsDark } from '../../theme';

// Enable layout animations on Android if available
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function useManagerStyles() {
  const colors = useColors();
  const isDark = useIsDark();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  return { styles, isDark, colors };
}

export interface WorkspaceBooffInManagerViewProps {
  workspace: Workspace;
  members: WorkspaceMember[];
  onOpenCalendar?: (targetDate?: string) => void;
}

/**
 * Minimalist Column Definitions (Clean typography, no emojis or noisy icons)
 */
interface ColumnConfig {
  id: WorkspaceTaskStatus;
  title: string;
  subtitle: string;
  accentColor: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'todo',
    title: 'To Do',
    subtitle: 'Backlog & queued work',
    accentColor: '#64748B',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    subtitle: 'Active tasks',
    accentColor: '#2563EB',
  },
  {
    id: 'review',
    title: 'Review',
    subtitle: 'Verification & feedback',
    accentColor: '#7C3AED',
  },
  {
    id: 'done',
    title: 'Done',
    subtitle: 'Completed items',
    accentColor: '#059669',
  },
];

/**
 * Subtle Minimalist Color Accents (Left border / accent tags)
 */
export const MINIMAL_CARD_COLORS: Record<
  WorkspaceTaskColor,
  {
    id: WorkspaceTaskColor;
    name: string;
    border: string;
    accent: string;
    bg: string;
  }
> = {
  blue: {
    id: 'blue',
    name: 'Blue',
    border: '#BFDBFE',
    accent: '#2563EB',
    bg: '#FFFFFF',
  },
  purple: {
    id: 'purple',
    name: 'Purple',
    border: '#DDD6FE',
    accent: '#7C3AED',
    bg: '#FFFFFF',
  },
  pink: {
    id: 'pink',
    name: 'Rose',
    border: '#FECDD3',
    accent: '#E11D48',
    bg: '#FFFFFF',
  },
  peach: {
    id: 'peach',
    name: 'Amber',
    border: '#FED7AA',
    accent: '#D97706',
    bg: '#FFFFFF',
  },
  green: {
    id: 'green',
    name: 'Green',
    border: '#BBF7D0',
    accent: '#059669',
    bg: '#FFFFFF',
  },
};

export function resolveTaskColor(task: WorkspaceTask): WorkspaceTaskColor {
  if (task.color && MINIMAL_CARD_COLORS[task.color]) {
    return task.color;
  }
  if (task.priority === 'urgent') return 'pink';
  if (task.priority === 'high') return 'peach';
  if (task.status === 'done') return 'green';
  if (task.status === 'review') return 'purple';
  return 'blue';
}

/**
 * Minimalist Animated Task Card
 * Pure typography, no emojis, smooth floating physics transitions
 */
interface AnimatedTaskCardProps {
  task: WorkspaceTask;
  isNewlyArrived?: boolean;
  onQuickMove: (task: WorkspaceTask, direction: 'next' | 'prev') => void;
  onEdit: (task: WorkspaceTask) => void;
  onDelete: (task: WorkspaceTask) => void;
  onOpenCalendar?: (targetDate?: string) => void;
  isDesktop: boolean;
}

const AnimatedTaskCard: React.FC<AnimatedTaskCardProps> = ({
  task,
  isNewlyArrived,
  onQuickMove,
  onEdit,
  onDelete,
  onOpenCalendar,
}) => {
  const { styles, isDark } = useManagerStyles();
  const isCompleted = task.status === 'done';
  const statusOrder: WorkspaceTaskStatus[] = ['todo', 'in_progress', 'review', 'done'];
  const colIdx = statusOrder.indexOf(task.status);
  const canMovePrev = colIdx > 0;
  const canMoveNext = colIdx < statusOrder.length - 1;
  const nextCol = canMoveNext ? COLUMNS[colIdx + 1] : null;

  const colorKey = resolveTaskColor(task);
  const colorTheme = MINIMAL_CARD_COLORS[colorKey];

  // Animation values using useState for React 19 safety
  const [floatAnim] = useState(() => new Animated.Value(0));
  const [arrivalAnim] = useState(() => new Animated.Value(isNewlyArrived ? 0 : 1));
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (isNewlyArrived) {
      arrivalAnim.setValue(0);
      Animated.spring(arrivalAnim, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [isNewlyArrived, arrivalAnim]);

  const handleTriggerMove = (direction: 'next' | 'prev') => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    // Float & glide animation towards next/prev column
    Animated.parallel([
      Animated.timing(floatAnim, {
        toValue: direction === 'next' ? 1 : -1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onQuickMove(task, direction);
    });
  };

  const translateX = floatAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-50, 0, 50],
  });

  const translateY = Animated.add(
    floatAnim.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [-10, 0, -10],
    }),
    arrivalAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-10, 0],
    })
  );

  const scale = Animated.multiply(
    floatAnim.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [1.03, 1, 1.03],
    }),
    arrivalAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.96, 1],
    })
  );

  const rotate = floatAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-2deg', '0deg', '2deg'],
  });

  const opacity = Animated.multiply(
    floatAnim.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [0.3, 1, 0.3],
    }),
    arrivalAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 1],
    })
  );

  // Minimalist Priority Badge (Clean pure text, zero emojis)
  const renderPriorityBadge = (priority: WorkspaceTaskPriority) => {
    switch (priority) {
      case 'urgent':
        return (
          <View style={[styles.priorityBadge, { backgroundColor: isDark ? '#3B1219' : '#FEF2F2', borderColor: isDark ? '#7F1D1D' : '#FEE2E2' }]}>
            <Text style={[styles.priorityText, { color: isDark ? '#F87171' : '#DC2626' }]}>Urgent</Text>
          </View>
        );
      case 'high':
        return (
          <View style={[styles.priorityBadge, { backgroundColor: isDark ? '#3D2408' : '#FFFBEB', borderColor: isDark ? '#78350F' : '#FEF3C7' }]}>
            <Text style={[styles.priorityText, { color: isDark ? '#FBBF24' : '#D97706' }]}>High</Text>
          </View>
        );
      case 'medium':
        return (
          <View style={[styles.priorityBadge, { backgroundColor: isDark ? '#161B26' : '#F8FAFC', borderColor: isDark ? '#1F2636' : '#E2E8F0' }]}>
            <Text style={[styles.priorityText, { color: isDark ? '#94A3B8' : '#475569' }]}>Medium</Text>
          </View>
        );
      case 'low':
      default:
        return (
          <View style={[styles.priorityBadge, { backgroundColor: isDark ? '#161B26' : '#F8FAFC', borderColor: isDark ? '#1F2636' : '#E2E8F0' }]}>
            <Text style={[styles.priorityText, { color: isDark ? '#64748B' : '#64748B' }]}>Low</Text>
          </View>
        );
    }
  };

  // Minimalist Date Label (Clean pure text, zero emojis)
  const renderDateLabel = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    let label = dateStr.slice(5);
    let color = isDark ? '#94A3B8' : '#475569';
    if (dateStr < today) {
      label = 'Overdue';
      color = isDark ? '#F87171' : '#DC2626';
    } else if (dateStr === today) {
      label = 'Due Today';
      color = isDark ? '#FBBF24' : '#D97706';
    }
    return { label, color };
  };

  const dateInfo = task.due_date ? renderDateLabel(task.due_date) : null;

  return (
    <Animated.View
      style={[
        styles.taskCard,
        {
          opacity,
          transform: [{ translateX }, { translateY }, { scale }, { rotate }],
        },
        isCompleted && styles.taskCardCompleted,
        isNewlyArrived && [styles.newlyArrivedCard, { borderColor: colorTheme.accent }],
      ]}
    >
      {/* Subtle Minimal Left Accent Border */}
      <View style={[styles.cardLeftAccent, { backgroundColor: colorTheme.accent }]} />

      {/* Top Header Row: Priority & Due Date */}
      <View style={styles.cardHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {renderPriorityBadge(task.priority)}
          {task.sync_with_calendar && dateInfo && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onOpenCalendar?.(task.due_date || undefined)}
              style={styles.calendarBadge}
            >
              <Calendar size={11} color={dateInfo.color} />
              <Text style={[styles.calendarBadgeText, { color: dateInfo.color }]}>
                {dateInfo.label} {task.due_time ? `@ ${task.due_time}` : ''}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Minimal Action Buttons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <TouchableOpacity
            onPress={() => onEdit(task)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.cardIconBtn}
          >
            <Edit3 size={13} color={isDark ? '#64748B' : '#94A3B8'} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(task)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.cardIconBtn}
          >
            <Trash2 size={13} color={isDark ? '#64748B' : '#94A3B8'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Task Content */}
      <TouchableOpacity activeOpacity={0.8} onPress={() => onEdit(task)}>
        <Text style={[styles.taskTitle, isCompleted && styles.taskTitleCompleted]}>
          {task.title}
        </Text>
        {Boolean(task.description) && (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {task.description}
          </Text>
        )}
      </TouchableOpacity>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <View style={styles.cardTagsRow}>
          {task.tags.map((tag, idx) => (
            <View key={`${task.id}_tag_${idx}`} style={styles.tagPill}>
              <Text style={styles.tagPillText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Card Footer: Assignee & Minimal Stage Advancement */}
      <View style={styles.cardFooterRow}>
        {/* Assignee */}
        <View style={styles.assigneeContainer}>
          {task.assignee ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Avatar
                uri={task.assignee.avatarUrl || undefined}
                name={task.assignee.fullName}
                size="xs"
              />
              <Text style={styles.assigneeName} numberOfLines={1}>
                {task.assignee.fullName}
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <User size={12} color={isDark ? '#64748B' : '#94A3B8'} />
              <Text style={styles.unassignedText}>Unassigned</Text>
            </View>
          )}
        </View>

        {/* Minimalist Advance Stage Actions (No emojis) */}
        <View style={styles.stageTransferRow}>
          {canMovePrev && (
            <TouchableOpacity
              onPress={() => handleTriggerMove('prev')}
              style={styles.stepBtnPrev}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <ChevronLeft size={13} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          )}

          {canMoveNext && nextCol ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleTriggerMove('next')}
              style={styles.advanceStagePill}
            >
              <Text style={styles.advanceStageText}>
                {nextCol.title}
              </Text>
              <ArrowRight size={11} color={isDark ? '#60A5FA' : '#2563EB'} />
            </TouchableOpacity>
          ) : (
            <View style={styles.completedBadgePill}>
              <Text style={styles.completedBadgeText}>Completed</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

/**
 * -------------------------------------------------------------
 * 1. Hovering Mini Calendar Picker
 * -------------------------------------------------------------
 */
interface HoveringCalendarPickerProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const HoveringCalendarPicker: React.FC<HoveringCalendarPickerProps> = ({
  selectedDate,
  onSelectDate,
  onClose,
}) => {
  const { styles, isDark } = useManagerStyles();
  const initialDate = useMemo(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const [y, m, d] = selectedDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [selectedDate]);

  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    try {
      Haptics.selectionAsync();
    } catch {}
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    try {
      Haptics.selectionAsync();
    } catch {}
  };

  const calendarDays = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: {
      dateStr: string;
      dayNum: number;
      isCurrent: boolean;
      isToday: boolean;
      isSelected: boolean;
    }[] = [];

    // Preceding month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = totalDaysInPrevMonth - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dNum);
      const dStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNum: dNum,
        isCurrent: false,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDate,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNum: d,
        isCurrent: true,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDate,
      });
    }

    // Trailing next month days
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(currentYear, currentMonth + 1, d);
      const dStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNum: d,
        isCurrent: false,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDate,
      });
    }

    return days;
  }, [currentYear, currentMonth, selectedDate]);

  const handleSelectDay = (dateStr: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    onSelectDate(dateStr);
  };

  const handleSelectToday = () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    handleSelectDay(todayStr);
  };

  const handleSelectTomorrow = () => {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    const tmrStr = `${tmr.getFullYear()}-${String(tmr.getMonth() + 1).padStart(2, '0')}-${String(tmr.getDate()).padStart(2, '0')}`;
    handleSelectDay(tmrStr);
  };

  return (
    <View style={styles.hoveringPopoverCard}>
      {/* Month & Year Navigation Header */}
      <View style={styles.popoverHeaderRow}>
        <TouchableOpacity
          onPress={handlePrevMonth}
          style={styles.popoverNavBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={15} color={isDark ? '#F9FAFB' : '#0F172A'} />
        </TouchableOpacity>
        <Text style={styles.popoverMonthTitle}>
          {MONTH_NAMES[currentMonth]} {currentYear}
        </Text>
        <TouchableOpacity
          onPress={handleNextMonth}
          style={styles.popoverNavBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronRight size={15} color={isDark ? '#F9FAFB' : '#0F172A'} />
        </TouchableOpacity>
      </View>

      {/* Weekday Row */}
      <View style={styles.popoverWeekdaysRow}>
        {WEEKDAY_NAMES.map((wd) => (
          <Text key={wd} style={styles.popoverWeekdayText}>
            {wd}
          </Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.popoverDaysGrid}>
        {calendarDays.map((item, idx) => (
          <TouchableOpacity
            key={`${item.dateStr}_${idx}`}
            activeOpacity={0.7}
            onPress={() => handleSelectDay(item.dateStr)}
            style={[
              styles.popoverDayCell,
              item.isSelected && styles.popoverDayCellSelected,
              !item.isSelected && item.isToday && styles.popoverDayCellToday,
            ]}
          >
            <Text
              style={[
                styles.popoverDayText,
                !item.isCurrent && styles.popoverDayTextMuted,
                item.isSelected && styles.popoverDayTextSelected,
                !item.isSelected && item.isToday && styles.popoverDayTextToday,
              ]}
            >
              {item.dayNum}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Shortcuts Footer */}
      <View style={styles.popoverFooterRow}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity onPress={handleSelectToday} style={styles.popoverShortcutPill}>
            <Text style={styles.popoverShortcutText}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSelectTomorrow} style={styles.popoverShortcutPill}>
            <Text style={styles.popoverShortcutText}>Tomorrow</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.popoverCloseBtn}>
          <Text style={styles.popoverCloseText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * -------------------------------------------------------------
 * 2. Square Hour and Minute Selection for Time
 * -------------------------------------------------------------
 */
interface SquareTimePickerProps {
  selectedTime: string; // 'HH:mm' e.g. '14:00'
  onSelectTime: (timeStr: string) => void;
  onClose: () => void;
}

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES_5 = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const SquareTimePicker: React.FC<SquareTimePickerProps> = ({
  selectedTime,
  onSelectTime,
  onClose,
}) => {
  const { styles, isDark } = useManagerStyles();
  const { hour24, minute } = useMemo(() => {
    const [hStr, mStr] = (selectedTime || '14:00').split(':');
    let h = parseInt(hStr, 10);
    if (isNaN(h)) h = 14;
    let m = parseInt(mStr, 10);
    if (isNaN(m)) m = 0;
    return { hour24: h, minute: m };
  }, [selectedTime]);

  const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;

  const update24Time = (newH12: number, newMin: number, newPeriod: 'AM' | 'PM') => {
    let h24 = newH12 % 12;
    if (newPeriod === 'PM') h24 += 12;
    const formatted = `${String(h24).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`;
    try {
      Haptics.selectionAsync();
    } catch {}
    onSelectTime(formatted);
  };

  const handleSelectHour = (h: number) => {
    update24Time(h, minute, period);
  };

  const handleSelectMinute = (m: number) => {
    update24Time(hour12, m, period);
  };

  const handleTogglePeriod = (p: 'AM' | 'PM') => {
    if (p !== period) {
      update24Time(hour12, minute, p);
    }
  };

  const handlePreset = (presetTime: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    onSelectTime(presetTime);
  };

  const [clockMode, setClockMode] = useState<'squares' | 'dial'>('squares');

  return (
    <View style={styles.hoveringTimePopoverCard}>
      {/* Clock Setting Header & Mode Switcher */}
      <View style={styles.clockModeHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Clock size={14} color={isDark ? '#34D399' : '#0F172A'} />
          <Text style={styles.clockModeTitle}>Clock Setting</Text>
        </View>

        <View style={styles.clockModeTabs}>
          <TouchableOpacity
            onPress={() => setClockMode('squares')}
            style={[styles.clockModeTab, clockMode === 'squares' && styles.clockModeTabActive]}
          >
            <Text style={[styles.clockModeTabText, clockMode === 'squares' && styles.clockModeTabTextActive]}>
              Squares
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setClockMode('dial')}
            style={[styles.clockModeTab, clockMode === 'dial' && styles.clockModeTabActive]}
          >
            <Text style={[styles.clockModeTabText, clockMode === 'dial' && styles.clockModeTabTextActive]}>
              Dial
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {clockMode === 'squares' ? (
        <>
          {/* Current Time Display & AM/PM Toggle */}
          <View style={styles.timeHeaderRow}>
            <View>
              <Text style={styles.timeDisplayMain}>
                {String(hour12).padStart(2, '0')}:{String(minute).padStart(2, '0')} {period}
              </Text>
              <Text style={styles.timeDisplaySub}>24h: {String(hour24).padStart(2, '0')}:{String(minute).padStart(2, '0')}</Text>
            </View>

            <View style={styles.periodToggleRow}>
              <TouchableOpacity
                onPress={() => handleTogglePeriod('AM')}
                style={[styles.periodSquareBtn, period === 'AM' && styles.periodSquareBtnActive]}
              >
                <Text style={[styles.periodSquareText, period === 'AM' && styles.periodSquareTextActive]}>
                  AM
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleTogglePeriod('PM')}
                style={[styles.periodSquareBtn, period === 'PM' && styles.periodSquareBtnActive]}
              >
                <Text style={[styles.periodSquareText, period === 'PM' && styles.periodSquareTextActive]}>
                  PM
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Small Square Hour Selection */}
          <Text style={styles.timeSectionLabel}>HOUR</Text>
          <View style={styles.squaresGrid}>
            {HOURS_12.map((h) => {
              const isSelected = h === hour12;
              return (
                <TouchableOpacity
                  key={`hour_${h}`}
                  activeOpacity={0.7}
                  onPress={() => handleSelectHour(h)}
                  style={[
                    styles.timeSquareBtn,
                    isSelected && styles.timeSquareBtnHourActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.timeSquareText,
                      isSelected && styles.timeSquareTextActive,
                    ]}
                  >
                    {String(h).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Small Square Minute Selection */}
          <Text style={styles.timeSectionLabel}>MINUTE</Text>
          <View style={styles.squaresGrid}>
            {MINUTES_5.map((m) => {
              const isSelected = Math.floor(minute / 5) * 5 === m;
              return (
                <TouchableOpacity
                  key={`min_${m}`}
                  activeOpacity={0.7}
                  onPress={() => handleSelectMinute(m)}
                  style={[
                    styles.timeSquareBtn,
                    isSelected && styles.timeSquareBtnMinActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.timeSquareText,
                      isSelected && styles.timeSquareTextActive,
                    ]}
                  >
                    :{String(m).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: 4 }}>
          <InteractiveClockPicker
            value={selectedTime || '14:00'}
            onChange={(val) => {
              try {
                Haptics.selectionAsync();
              } catch {}
              onSelectTime(val);
            }}
          />
        </View>
      )}

      {/* Presets & Done */}
      <View style={styles.popoverFooterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
          {['09:00', '12:00', '14:00', '17:00'].map((preset) => (
            <TouchableOpacity
              key={preset}
              onPress={() => handlePreset(preset)}
              style={styles.popoverShortcutPill}
            >
              <Text style={styles.popoverShortcutText}>{preset}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity onPress={onClose} style={styles.popoverCloseBtn}>
          <Text style={styles.popoverCloseText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const WorkspaceBooffInManagerView: React.FC<WorkspaceBooffInManagerViewProps> = ({
  workspace,
  members,
  onOpenCalendar,
}) => {
  const { styles, isDark, colors } = useManagerStyles();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const currentUser = useAuthStore((s) => s.user);
  const tasks = useWorkspaceStore((s) => s.tasks);
  const loadTasks = useWorkspaceStore((s) => s.loadTasks);
  const createTask = useWorkspaceStore((s) => s.createTask);
  const updateTask = useWorkspaceStore((s) => s.updateTask);
  const deleteTask = useWorkspaceStore((s) => s.deleteTask);
  const moveTaskStatus = useWorkspaceStore((s) => s.moveTaskStatus);

  // Fresh load on mount or workspace change
  useEffect(() => {
    if (workspace?.id) {
      loadTasks(workspace.id);
    }
  }, [workspace?.id, loadTasks]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'mine' | 'urgent' | 'due_soon'>('all');

  // Mobile active column selector
  const [mobileActiveColumn, setMobileActiveColumn] = useState<WorkspaceTaskStatus>('todo');

  // Track task that just arrived via floating transition
  const [newlyArrivedTaskId, setNewlyArrivedTaskId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WorkspaceTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<WorkspaceTask | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<WorkspaceTaskStatus>('todo');
  const [formPriority, setFormPriority] = useState<WorkspaceTaskPriority>('medium');
  const [formColor, setFormColor] = useState<WorkspaceTaskColor>('blue');
  const [formDueDate, setFormDueDate] = useState('');
  const [formDueTime, setFormDueTime] = useState('');
  const [formAssigneeId, setFormAssigneeId] = useState<string>('');
  const [formTags, setFormTags] = useState('');
  const [formSyncCalendar, setFormSyncCalendar] = useState(true);

  // Hovering Popover state for Date & Time selection
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    let result = tasks || [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q)))
      );
    }

    if (selectedFilter === 'mine' && currentUser?.id) {
      result = result.filter((t) => t.assignee_id === currentUser.id || t.creator_id === currentUser.id);
    } else if (selectedFilter === 'urgent') {
      result = result.filter((t) => t.priority === 'urgent' || t.priority === 'high');
    } else if (selectedFilter === 'due_soon') {
      const today = new Date().toISOString().split('T')[0];
      result = result.filter((t) => t.due_date && t.due_date >= today && t.status !== 'done');
    }

    return result;
  }, [tasks, searchQuery, selectedFilter, currentUser]);

  // Task Counts per Column
  const columnTasksMap = useMemo(() => {
    const map: Record<WorkspaceTaskStatus, WorkspaceTask[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };
    for (const task of filteredTasks) {
      if (map[task.status]) {
        map[task.status].push(task);
      } else {
        map.todo.push(task);
      }
    }
    return map;
  }, [filteredTasks]);

  // Statistics & Progress
  const totalCount = tasks?.length || 0;
  const completedCount = tasks?.filter((t) => t.status === 'done').length || 0;
  const inProgressCount = tasks?.filter((t) => t.status === 'in_progress').length || 0;
  const reviewCount = tasks?.filter((t) => t.status === 'review').length || 0;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Open Create Modal
  const handleOpenCreateModal = (initialStatus: WorkspaceTaskStatus = 'todo') => {
    setEditingTask(null);
    setFormTitle('');
    setFormDescription('');
    setFormStatus(initialStatus);
    setFormPriority('medium');
    setFormColor('blue');
    const today = new Date().toISOString().split('T')[0];
    setFormDueDate(today);
    setFormDueTime('14:00');
    setFormAssigneeId(currentUser?.id || '');
    setFormTags('');
    setFormSyncCalendar(true);
    setIsDatePickerOpen(false);
    setIsTimePickerOpen(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (task: WorkspaceTask) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDescription(task.description || '');
    setFormStatus(task.status);
    setFormPriority(task.priority);
    setFormColor(resolveTaskColor(task));
    setFormDueDate(task.due_date || '');
    setFormDueTime(task.due_time || '12:00');
    setFormAssigneeId(task.assignee_id || '');
    setFormTags(task.tags ? task.tags.join(', ') : '');
    setFormSyncCalendar(task.sync_with_calendar ?? true);
    setIsDatePickerOpen(false);
    setIsTimePickerOpen(false);
    setIsModalOpen(true);
  };

  // Save Task (Create or Update)
  const handleSaveTask = async () => {
    if (!formTitle.trim()) {
      Alert.alert('Required Field', 'Please provide a title for this task.');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedTags = formTags
        .split(',')
        .map((s) => s.trim().replace(/^#/, ''))
        .filter(Boolean);

      const resolvedAssignee = members.find((m) => m.user_id === formAssigneeId)?.profile || null;

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      if (editingTask) {
        await updateTask(editingTask.id, workspace.id, {
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          status: formStatus,
          priority: formPriority,
          color: formColor,
          due_date: formDueDate.trim() || null,
          due_time: formDueTime.trim() || null,
          assignee_id: formAssigneeId || null,
          assignee: resolvedAssignee,
          tags: parsedTags,
          sync_with_calendar: formSyncCalendar,
        });
      } else {
        const res = await createTask({
          workspaceId: workspace.id,
          title: formTitle.trim(),
          description: formDescription.trim() || undefined,
          status: formStatus,
          priority: formPriority,
          color: formColor,
          dueDate: formDueDate.trim() || null,
          dueTime: formDueTime.trim() || null,
          assigneeId: formAssigneeId || null,
          assignee: resolvedAssignee,
          tags: parsedTags,
          syncWithCalendar: formSyncCalendar,
        });
        if (res.error || !res.task) {
          Alert.alert('Save Error', res.error || 'Failed to save task to cloud');
          return;
        }
        if (res.task) {
          setNewlyArrivedTaskId(res.task.id);
          setTimeout(() => setNewlyArrivedTaskId(null), 1800);
        }
      }

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      setIsModalOpen(false);
    } catch (err: any) {
      Alert.alert('Save Error', err.message || 'Could not save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Move forward / backward with smooth layout transition
  const handleQuickMove = async (task: WorkspaceTask, direction: 'next' | 'prev') => {
    const statusOrder: WorkspaceTaskStatus[] = ['todo', 'in_progress', 'review', 'done'];
    const currentIndex = statusOrder.indexOf(task.status);
    if (currentIndex < 0) return;

    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex >= 0 && targetIndex < statusOrder.length) {
      const newStatus = statusOrder[targetIndex];

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      await moveTaskStatus(task.id, workspace.id, newStatus);

      setNewlyArrivedTaskId(task.id);
      setTimeout(() => setNewlyArrivedTaskId(null), 1800);

      if (!isDesktop) {
        setMobileActiveColumn(newStatus);
      }
    }
  };

  // Confirm delete task
  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      await deleteTask(taskToDelete.id, workspace.id);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      setTaskToDelete(null);
    } catch (err: any) {
      Alert.alert('Delete Error', err.message || 'Could not delete task');
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Minimalist Header & Progress */}
      <View style={styles.headerBanner}>
        <View style={styles.headerTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>BooffIn Manager</Text>
            <Text style={styles.headerSubtitle}>
              Task tracking and calendar milestones
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleOpenCreateModal()}
            style={styles.createTaskBtn}
          >
            <Plus size={14} color="#FFFFFF" />
            <Text style={styles.createTaskBtnText}>{isDesktop ? 'New Task' : 'Add'}</Text>
          </TouchableOpacity>
        </View>

        {/* Minimalist Summary Counter Row */}
        <View style={styles.statsStrip}>
          <View style={styles.statsMetricsRow}>
            <Text style={styles.statItemText}>
              <Text style={styles.statNumber}>{totalCount}</Text> tasks
            </Text>
            <Text style={styles.statDot}>·</Text>
            <Text style={styles.statItemText}>
              <Text style={[styles.statNumber, { color: '#2563EB' }]}>{inProgressCount}</Text> in progress
            </Text>
            <Text style={styles.statDot}>·</Text>
            <Text style={styles.statItemText}>
              <Text style={[styles.statNumber, { color: '#7C3AED' }]}>{reviewCount}</Text> in review
            </Text>
            <Text style={styles.statDot}>·</Text>
            <Text style={styles.statItemText}>
              <Text style={[styles.statNumber, { color: '#059669' }]}>{completedCount}</Text> done
            </Text>
          </View>

          {/* Minimal 3px Progress Line */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${completionPercent}%` }]} />
          </View>
        </View>

        {/* Minimal Search & Filter Pills */}
        <View style={styles.filterControlRow}>
          <View style={styles.searchBar}>
            <Search size={13} color={isDark ? '#64748B' : '#94A3B8'} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Filter tasks..."
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              style={styles.searchInput}
            />
            {Boolean(searchQuery) && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={13} color={isDark ? '#94A3B8' : '#94A3B8'} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsStrip}>
            <TouchableOpacity
              onPress={() => setSelectedFilter('all')}
              style={[styles.subFilterPill, selectedFilter === 'all' && styles.subFilterPillActive]}
            >
              <Text style={[styles.subFilterPillText, selectedFilter === 'all' && styles.subFilterPillTextActive]}>
                All
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedFilter('mine')}
              style={[styles.subFilterPill, selectedFilter === 'mine' && styles.subFilterPillActive]}
            >
              <Text style={[styles.subFilterPillText, selectedFilter === 'mine' && styles.subFilterPillTextActive]}>
                Assigned to Me
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedFilter('urgent')}
              style={[styles.subFilterPill, selectedFilter === 'urgent' && styles.subFilterPillActive]}
            >
              <Text style={[styles.subFilterPillText, selectedFilter === 'urgent' && styles.subFilterPillTextActive]}>
                High Priority
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedFilter('due_soon')}
              style={[styles.subFilterPill, selectedFilter === 'due_soon' && styles.subFilterPillActive]}
            >
              <Text style={[styles.subFilterPillText, selectedFilter === 'due_soon' && styles.subFilterPillTextActive]}>
                Due Soon
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* 2. Responsive Board Columns */}
      {isDesktop ? (
        /* DESKTOP LAYOUT: Multi-column side-by-side minimalist board */
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.desktopBoardContainer}
        >
          {COLUMNS.map((column) => {
            const colTasks = columnTasksMap[column.id] || [];

            return (
              <View key={column.id} style={styles.desktopColumn}>
                {/* Minimal Column Header (Clean typography, no emojis) */}
                <View style={styles.columnHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.columnTitle}>{column.title}</Text>
                    <Text style={styles.columnCountText}>{colTasks.length}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleOpenCreateModal(column.id)}
                    style={styles.columnAddBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Plus size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                  </TouchableOpacity>
                </View>

                {/* Column Task Cards ScrollView */}
                <ScrollView
                  style={styles.columnCardsScroll}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
                >
                  {colTasks.length === 0 ? (
                    <View style={styles.emptyColumnContainer}>
                      <Text style={styles.emptyColumnText}>No tasks</Text>
                      <TouchableOpacity
                        onPress={() => handleOpenCreateModal(column.id)}
                        style={styles.emptyColumnAddBtn}
                      >
                        <Text style={styles.emptyColumnAddText}>+ Add task</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    colTasks.map((task) => (
                      <AnimatedTaskCard
                        key={task.id}
                        task={task}
                        isNewlyArrived={newlyArrivedTaskId === task.id}
                        onQuickMove={handleQuickMove}
                        onEdit={handleOpenEditModal}
                        onDelete={setTaskToDelete}
                        onOpenCalendar={onOpenCalendar}
                        isDesktop={true}
                      />
                    ))
                  )}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        /* MOBILE LAYOUT: Clean segmented column selector */
        <View style={styles.mobileBoardWrapper}>
          <View style={styles.mobileTabsRow}>
            {COLUMNS.map((col) => {
              const count = columnTasksMap[col.id]?.length || 0;
              const isActive = mobileActiveColumn === col.id;

              return (
                <TouchableOpacity
                  key={col.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setMobileActiveColumn(col.id);
                    try {
                      Haptics.selectionAsync();
                    } catch {}
                  }}
                  style={[
                    styles.mobileTabPill,
                    isActive && styles.mobileTabPillActive,
                  ]}
                >
                  <Text style={[styles.mobileTabText, isActive && styles.mobileTabTextActive]}>
                    {col.title}
                  </Text>
                  <Text style={[styles.mobileTabCountText, isActive && styles.mobileTabCountTextActive]}>
                    {count}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Active Mobile Column Cards */}
          <ScrollView
            style={styles.mobileCardsScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.mobileCardsContent}
          >
            {columnTasksMap[mobileActiveColumn]?.length === 0 ? (
              <View style={styles.emptyColumnContainer}>
                <Text style={styles.emptyColumnText}>No tasks</Text>
                <TouchableOpacity
                  onPress={() => handleOpenCreateModal(mobileActiveColumn)}
                  style={styles.emptyColumnAddBtn}
                >
                  <Text style={styles.emptyColumnAddText}>+ Add task</Text>
                </TouchableOpacity>
              </View>
            ) : (
              columnTasksMap[mobileActiveColumn].map((task) => (
                <AnimatedTaskCard
                  key={task.id}
                  task={task}
                  isNewlyArrived={newlyArrivedTaskId === task.id}
                  onQuickMove={handleQuickMove}
                  onEdit={handleOpenEditModal}
                  onDelete={setTaskToDelete}
                  onOpenCalendar={onOpenCalendar}
                  isDesktop={false}
                />
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* 3. Create / Edit Task Modal (Minimalist) */}
      <Modal visible={isModalOpen} transparent animationType="fade" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, isDesktop && { maxWidth: 500 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTask ? 'Edit Task' : 'New Task'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCloseBtn}>
                <X size={18} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBodyScroll}
              contentContainerStyle={{ paddingBottom: isDatePickerOpen || isTimePickerOpen ? 260 : 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="Task title..."
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                style={styles.textInput}
              />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Details or references..."
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                multiline
                numberOfLines={3}
                style={[styles.textInput, styles.textAreaInput]}
              />

              <Text style={styles.fieldLabel}>Column</Text>
              <View style={styles.modalPillsRow}>
                {COLUMNS.map((col) => (
                  <TouchableOpacity
                    key={col.id}
                    onPress={() => setFormStatus(col.id)}
                    style={[
                      styles.choicePill,
                      formStatus === col.id && styles.choicePillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choicePillText,
                        formStatus === col.id && styles.choicePillTextActive,
                      ]}
                    >
                      {col.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Priority</Text>
              <View style={styles.modalPillsRow}>
                {(['low', 'medium', 'high', 'urgent'] as WorkspaceTaskPriority[]).map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setFormPriority(p)}
                    style={[
                      styles.choicePill,
                      formPriority === p && styles.choicePillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choicePillText,
                        formPriority === p && styles.choicePillTextActive,
                      ]}
                    >
                      {p.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Accent Tag</Text>
              <View style={styles.colorPickerRow}>
                {(Object.keys(MINIMAL_CARD_COLORS) as WorkspaceTaskColor[]).map((cKey) => {
                  const cfg = MINIMAL_CARD_COLORS[cKey];
                  const isSelected = formColor === cKey;
                  return (
                    <TouchableOpacity
                      key={cKey}
                      onPress={() => setFormColor(cKey)}
                      style={[
                        styles.colorPickerPill,
                        isSelected && { borderColor: cfg.accent, backgroundColor: isDark ? '#161B26' : '#F8FAFC' },
                      ]}
                    >
                      <View style={[styles.colorPickerDot, { backgroundColor: cfg.accent }]} />
                      <Text style={[styles.colorPickerText, isSelected && { color: cfg.accent, fontWeight: '700' }]}>
                        {cfg.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ position: 'relative', zIndex: 100 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1.2, position: 'relative' }}>
                    <Text style={styles.fieldLabel}>Due Date (YYYY-MM-DD)</Text>
                    <View style={styles.inputWithIconWrap}>
                      <TextInput
                        value={formDueDate}
                        onChangeText={setFormDueDate}
                        onFocus={() => {
                          setIsDatePickerOpen(true);
                          setIsTimePickerOpen(false);
                        }}
                        placeholder="2026-10-20"
                        placeholderTextColor="#94A3B8"
                        style={styles.textInputWithIcon}
                      />
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          setIsDatePickerOpen((prev) => !prev);
                          setIsTimePickerOpen(false);
                        }}
                        style={styles.inputIconBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Calendar size={16} color={isDatePickerOpen ? '#2563EB' : '#475569'} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={{ flex: 1, minWidth: 140, position: 'relative' }}>
                    <Text style={styles.fieldLabel}>Time (Clock)</Text>
                    <View style={styles.inputWithIconWrap}>
                      <TextInput
                        value={formDueTime}
                        onChangeText={setFormDueTime}
                        onFocus={() => {
                          setIsTimePickerOpen(true);
                          setIsDatePickerOpen(false);
                        }}
                        placeholder="14:00"
                        placeholderTextColor="#94A3B8"
                        style={styles.textInputWithIcon}
                      />
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          setIsTimePickerOpen((prev) => !prev);
                          setIsDatePickerOpen(false);
                        }}
                        style={styles.inputIconBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Clock size={16} color={isTimePickerOpen ? '#2563EB' : '#0F172A'} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Floating / Hovering Date Picker */}
                {isDatePickerOpen && (
                  <HoveringCalendarPicker
                    selectedDate={formDueDate}
                    onSelectDate={(newDate) => {
                      setFormDueDate(newDate);
                      setIsDatePickerOpen(false);
                    }}
                    onClose={() => setIsDatePickerOpen(false)}
                  />
                )}

                {/* Floating / Hovering Square Time Picker */}
                {isTimePickerOpen && (
                  <SquareTimePicker
                    selectedTime={formDueTime}
                    onSelectTime={(newTime) => {
                      setFormDueTime(newTime);
                    }}
                    onClose={() => setIsTimePickerOpen(false)}
                  />
                )}
              </View>

              <Text style={styles.fieldLabel}>Assignee</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                <TouchableOpacity
                  onPress={() => setFormAssigneeId('')}
                  style={[
                    styles.assigneeChoicePill,
                    !formAssigneeId && styles.assigneeChoicePillActive,
                  ]}
                >
                  <Text style={[styles.assigneeChoiceText, !formAssigneeId && styles.assigneeChoiceTextActive]}>
                    Unassigned
                  </Text>
                </TouchableOpacity>

                {members.map((m) => {
                  const isSelected = formAssigneeId === m.user_id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => setFormAssigneeId(m.user_id)}
                      style={[
                        styles.assigneeChoicePill,
                        isSelected && styles.assigneeChoicePillActive,
                      ]}
                    >
                      <Avatar uri={m.profile?.avatarUrl || undefined} name={m.profile?.fullName || 'Researcher'} size="xs" />
                      <Text style={[styles.assigneeChoiceText, isSelected && styles.assigneeChoiceTextActive]}>
                        {m.profile?.fullName || 'Member'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.fieldLabel}>Tags (comma separated)</Text>
              <TextInput
                value={formTags}
                onChangeText={setFormTags}
                placeholder="e.g. Experiment, Review"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />

              {/* Minimal Calendar Sync Toggle */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setFormSyncCalendar(!formSyncCalendar)}
                style={styles.syncCalendarRow}
              >
                <View style={[styles.checkboxSquare, formSyncCalendar && styles.checkboxSquareChecked]}>
                  {formSyncCalendar && <Check size={11} color="#FFFFFF" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.syncCalendarTitle}>Sync with Workspace Calendar</Text>
                  <Text style={styles.syncCalendarSubtitle}>
                    Creates linked milestone on agenda
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setIsModalOpen(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveTask}
                disabled={isSubmitting}
                style={[styles.modalSubmitBtn, isSubmitting && { opacity: 0.7 }]}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>
                    {editingTask ? 'Save' : 'Create'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 4. Delete Confirmation Modal */}
      <Modal visible={Boolean(taskToDelete)} transparent animationType="fade" onRequestClose={() => setTaskToDelete(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxWidth: 380 }]}>
            <View style={styles.deleteHeader}>
              <Text style={styles.deleteTitle}>Delete Task?</Text>
              <Text style={styles.deleteSubtitle}>
                Are you sure you want to delete &ldquo;{taskToDelete?.title}&rdquo;?
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setTaskToDelete(null)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Keep</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmDelete}
                style={[styles.modalSubmitBtn, { backgroundColor: '#DC2626' }]}
              >
                <Text style={styles.modalSubmitBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0B0F17' : '#F8FAFC',
  },
  headerBanner: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: isDark ? '#111622' : '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#1F2636' : '#E2E8F0',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: isDark ? '#F9FAFB' : '#0F172A',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: isDark ? '#94A3B8' : '#64748B',
    marginTop: 1,
  },
  createTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: isDark ? '#10B981' : '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  createTaskBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  /* STATS & PROGRESS */
  statsStrip: {
    marginTop: 10,
    gap: 6,
  },
  statsMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  statItemText: {
    fontSize: 12,
    color: isDark ? '#94A3B8' : '#64748B',
    fontWeight: '500',
  },
  statNumber: {
    fontWeight: '700',
    color: isDark ? '#F9FAFB' : '#0F172A',
  },
  statDot: {
    color: isDark ? '#475569' : '#CBD5E1',
    fontSize: 12,
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: isDark ? '#1F2636' : '#F1F5F9',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: isDark ? '#10B981' : '#0F172A',
    borderRadius: 1.5,
  },

  /* FILTER CONTROLS */
  filterControlRow: {
    marginTop: 10,
    gap: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: isDark ? '#161B26' : '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? '#1F2636' : '#E2E8F0',
    paddingHorizontal: 9,
    height: 32,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: isDark ? '#F9FAFB' : '#0F172A',
    paddingVertical: 0,
  },
  filterPillsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: isDark ? '#161B26' : '#F8FAFC',
    borderWidth: 1,
    borderColor: isDark ? '#1F2636' : '#E2E8F0',
  },
  subFilterPillActive: {
    backgroundColor: isDark ? '#10B981' : '#0F172A',
    borderColor: isDark ? '#10B981' : '#0F172A',
  },
  subFilterPillText: {
    fontSize: 11,
    color: isDark ? '#94A3B8' : '#475569',
    fontWeight: '500',
  },
  subFilterPillTextActive: {
    color: '#FFFFFF',
  },

  /* DESKTOP LAYOUT */
  desktopBoardContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 14,
  },
  desktopColumn: {
    width: 290,
    backgroundColor: isDark ? '#111622' : '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDark ? '#1F2636' : '#E2E8F0',
    overflow: 'hidden',
    maxHeight: '100%',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#1F2636' : '#E2E8F0',
    backgroundColor: isDark ? '#161B26' : '#FFFFFF',
  },
  columnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: isDark ? '#F9FAFB' : '#0F172A',
  },
  columnCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? '#94A3B8' : '#64748B',
  },
  columnAddBtn: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: isDark ? '#1F2636' : 'transparent',
  },
  columnCardsScroll: {
    flex: 1,
    padding: 10,
  },

  /* MOBILE LAYOUT */
  mobileBoardWrapper: {
    flex: 1,
  },
  mobileTabsRow: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#111622' : '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#1F2636' : '#E2E8F0',
    gap: 6,
  },
  mobileTabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? '#1F2636' : '#E2E8F0',
    backgroundColor: isDark ? '#161B26' : '#F8FAFC',
  },
  mobileTabPillActive: {
    backgroundColor: isDark ? '#1F2636' : '#FFFFFF',
    borderColor: isDark ? '#10B981' : '#0F172A',
    borderWidth: 1.5,
  },
  mobileTabText: {
    fontSize: 11,
    color: isDark ? '#94A3B8' : '#64748B',
    fontWeight: '500',
  },
  mobileTabTextActive: {
    color: isDark ? '#F9FAFB' : '#0F172A',
    fontWeight: '700',
  },
  mobileTabCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: isDark ? '#64748B' : '#94A3B8',
  },
  mobileTabCountTextActive: {
    color: isDark ? '#10B981' : '#0F172A',
    fontWeight: '700',
  },
  mobileCardsScroll: {
    flex: 1,
  },
  mobileCardsContent: {
    padding: 12,
    gap: 10,
    paddingBottom: 40,
  },

  /* MINIMALIST TASK CARD */
  taskCard: {
    backgroundColor: isDark ? '#161B26' : '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: isDark ? '#1F2636' : '#E2E8F0',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.2 : 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  taskCardCompleted: {
    opacity: 0.7,
  },
  cardLeftAccent: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    left: 0,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  newlyArrivedCard: {
    borderWidth: 1.5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingLeft: 4,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  calendarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  calendarBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  cardIconBtn: {
    padding: 3,
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: isDark ? '#F9FAFB' : '#0F172A',
    lineHeight: 18,
    paddingLeft: 4,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: isDark ? '#64748B' : '#64748B',
  },
  taskDescription: {
    fontSize: 11,
    color: isDark ? '#94A3B8' : '#64748B',
    marginTop: 3,
    lineHeight: 16,
    paddingLeft: 4,
  },
  cardTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: 8,
    paddingLeft: 4,
  },
  tagPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    backgroundColor: isDark ? '#1F2636' : '#F1F5F9',
  },
  tagPillText: {
    fontSize: 10,
    color: isDark ? '#94A3B8' : '#475569',
    fontWeight: '500',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#1F2636' : '#F8FAFC',
    paddingLeft: 4,
  },
  assigneeContainer: {
    flex: 1,
  },
  assigneeName: {
    fontSize: 11,
    fontWeight: '500',
    color: isDark ? '#E2E8F0' : '#334155',
    maxWidth: 90,
  },
  unassignedText: {
    fontSize: 10,
    color: isDark ? '#64748B' : '#94A3B8',
  },
  stageTransferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepBtnPrev: {
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: isDark ? '#1F2636' : '#F8FAFC',
    borderWidth: 1,
    borderColor: isDark ? '#2D3748' : '#E2E8F0',
  },
  advanceStagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 5,
    backgroundColor: isDark ? '#1E293B' : '#EFF6FF',
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#DBEAFE',
  },
  advanceStageText: {
    fontSize: 10,
    fontWeight: '600',
    color: isDark ? '#60A5FA' : '#2563EB',
  },
  completedBadgePill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: isDark ? '#34D399' : '#059669',
  },

  /* EMPTY COLUMN STATE */
  emptyColumnContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: isDark ? '#1F2636' : '#CBD5E1',
    borderRadius: 8,
    marginTop: 4,
    gap: 4,
  },
  emptyColumnText: {
    fontSize: 11,
    color: isDark ? '#64748B' : '#94A3B8',
  },
  emptyColumnAddBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  emptyColumnAddText: {
    fontSize: 11,
    fontWeight: '600',
    color: isDark ? '#10B981' : '#2563EB',
  },

  /* MODALS */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: isDark ? '#111622' : '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: isDark ? '#1F2636' : '#E2E8F0',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: isDark ? '#F9FAFB' : '#0F172A',
  },
  modalCloseBtn: {
    padding: 2,
  },
  modalBodyScroll: {
    maxHeight: 440,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: isDark ? '#94A3B8' : '#64748B',
    marginTop: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  textInput: {
    backgroundColor: isDark ? '#161B26' : '#F8FAFC',
    borderWidth: 1,
    borderColor: isDark ? '#1F2636' : '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: isDark ? '#F9FAFB' : '#0F172A',
  },
  textAreaInput: {
    minHeight: 65,
    textAlignVertical: 'top',
  },
  modalPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  colorPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  colorPickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: isDark ? '#161B26' : '#FFFFFF',
    borderWidth: 1,
    borderColor: isDark ? '#1F2636' : '#E2E8F0',
  },
  colorPickerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  colorPickerText: {
    fontSize: 11,
    color: isDark ? '#E2E8F0' : '#475569',
    fontWeight: '500',
  },
  choicePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: isDark ? '#161B26' : '#F8FAFC',
    borderWidth: 1,
    borderColor: isDark ? '#1F2636' : '#E2E8F0',
  },
  choicePillActive: {
    borderColor: isDark ? '#10B981' : '#0F172A',
    backgroundColor: isDark ? '#10B981' : '#0F172A',
  },
  choicePillText: {
    fontSize: 11,
    color: isDark ? '#94A3B8' : '#475569',
    fontWeight: '500',
  },
  choicePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  assigneeChoicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 16,
    backgroundColor: isDark ? '#161B26' : '#F8FAFC',
    borderWidth: 1,
    borderColor: isDark ? '#1F2636' : '#E2E8F0',
  },
  assigneeChoicePillActive: {
    borderColor: isDark ? '#10B981' : '#0F172A',
    backgroundColor: isDark ? '#10B981' : '#0F172A',
  },
  assigneeChoiceText: {
    fontSize: 11,
    color: isDark ? '#94A3B8' : '#475569',
    fontWeight: '500',
  },
  assigneeChoiceTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  syncCalendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 6,
    backgroundColor: isDark ? '#161B26' : '#F8FAFC',
    borderWidth: 1,
    borderColor: isDark ? '#1F2636' : '#E2E8F0',
    marginTop: 12,
  },
  checkboxSquare: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: isDark ? '#2D3748' : '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? '#111622' : '#FFFFFF',
  },
  checkboxSquareChecked: {
    backgroundColor: isDark ? '#10B981' : '#0F172A',
    borderColor: isDark ? '#10B981' : '#0F172A',
  },
  syncCalendarTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: isDark ? '#F9FAFB' : '#0F172A',
  },
  syncCalendarSubtitle: {
    fontSize: 10,
    color: isDark ? '#94A3B8' : '#64748B',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#1F2636' : '#F1F5F9',
  },
  modalCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: isDark ? '#94A3B8' : '#64748B',
  },
  modalSubmitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: isDark ? '#10B981' : '#0F172A',
  },
  modalSubmitBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  /* DELETE MODAL */
  deleteHeader: {
    paddingVertical: 4,
  },
  deleteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: isDark ? '#F9FAFB' : '#0F172A',
    marginBottom: 4,
  },
  deleteSubtitle: {
    fontSize: 12,
    color: isDark ? '#94A3B8' : '#64748B',
    lineHeight: 16,
  },

  /* INPUT WITH ICON */
  inputWithIconWrap: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#161B26' : '#F8FAFC',
    borderWidth: 1,
    borderColor: isDark ? '#1F2636' : '#CBD5E1',
    borderRadius: 6,
    overflow: 'hidden',
  },
  textInputWithIcon: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: isDark ? '#F9FAFB' : '#0F172A',
  },
  inputIconBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  /* HOVERING CALENDAR POPOVER */
  hoveringPopoverCard: {
    position: 'absolute',
    top: 60,
    left: 0,
    width: 285,
    backgroundColor: isDark ? '#111622' : '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDark ? '#1F2636' : '#CBD5E1',
    padding: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 12,
    zIndex: 1000,
  },
  popoverHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  popoverNavBtn: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: isDark ? '#161B26' : '#F1F5F9',
  },
  popoverMonthTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: isDark ? '#F9FAFB' : '#0F172A',
  },
  popoverWeekdaysRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  popoverWeekdayText: {
    width: 37,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: isDark ? '#64748B' : '#94A3B8',
  },
  popoverDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  popoverDayCell: {
    width: 37,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  popoverDayCellSelected: {
    backgroundColor: isDark ? '#10B981' : '#0F172A',
  },
  popoverDayCellToday: {
    borderWidth: 1,
    borderColor: isDark ? '#10B981' : '#2563EB',
  },
  popoverDayText: {
    fontSize: 11,
    fontWeight: '500',
    color: isDark ? '#E2E8F0' : '#0F172A',
  },
  popoverDayTextMuted: {
    color: isDark ? '#475569' : '#CBD5E1',
  },
  popoverDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  popoverDayTextToday: {
    color: isDark ? '#10B981' : '#2563EB',
    fontWeight: '700',
  },
  popoverFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#1F2636' : '#F1F5F9',
  },
  popoverShortcutPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: isDark ? '#161B26' : '#F1F5F9',
  },
  popoverShortcutText: {
    fontSize: 10,
    fontWeight: '600',
    color: isDark ? '#94A3B8' : '#475569',
  },
  popoverCloseBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: isDark ? '#1F2636' : '#0F172A',
  },
  popoverCloseText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  /* HOVERING TIME POPOVER */
  hoveringTimePopoverCard: {
    position: 'absolute',
    top: 60,
    right: 0,
    width: 295,
    backgroundColor: isDark ? '#111622' : '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDark ? '#1F2636' : '#CBD5E1',
    padding: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 12,
    zIndex: 1000,
  },
  clockModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#1F2636' : '#F1F5F9',
  },
  clockModeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: isDark ? '#F9FAFB' : '#0F172A',
  },
  clockModeTabs: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: isDark ? '#161B26' : '#F1F5F9',
    padding: 2,
    borderRadius: 6,
  },
  clockModeTab: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  clockModeTabActive: {
    backgroundColor: isDark ? '#1F2636' : '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  clockModeTabText: {
    fontSize: 10,
    fontWeight: '500',
    color: isDark ? '#94A3B8' : '#64748B',
  },
  clockModeTabTextActive: {
    color: isDark ? '#F9FAFB' : '#0F172A',
    fontWeight: '700',
  },
  timeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#1F2636' : '#F1F5F9',
  },
  timeDisplayMain: {
    fontSize: 13,
    fontWeight: '700',
    color: isDark ? '#F9FAFB' : '#0F172A',
  },
  timeDisplaySub: {
    fontSize: 10,
    color: isDark ? '#94A3B8' : '#64748B',
  },
  periodToggleRow: {
    flexDirection: 'row',
    gap: 4,
  },
  periodSquareBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: isDark ? '#161B26' : '#F1F5F9',
    borderWidth: 1,
    borderColor: isDark ? '#1F2636' : '#E2E8F0',
  },
  periodSquareBtnActive: {
    backgroundColor: isDark ? '#10B981' : '#0F172A',
    borderColor: isDark ? '#10B981' : '#0F172A',
  },
  periodSquareText: {
    fontSize: 10,
    fontWeight: '600',
    color: isDark ? '#94A3B8' : '#64748B',
  },
  periodSquareTextActive: {
    color: '#FFFFFF',
  },
  timeSectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: isDark ? '#64748B' : '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 2,
  },
  squaresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
  },
  timeSquareBtn: {
    width: 36,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    backgroundColor: isDark ? '#161B26' : '#F8FAFC',
    borderWidth: 1,
    borderColor: isDark ? '#1F2636' : '#E2E8F0',
  },
  timeSquareBtnHourActive: {
    backgroundColor: isDark ? '#10B981' : '#0F172A',
    borderColor: isDark ? '#10B981' : '#0F172A',
  },
  timeSquareBtnMinActive: {
    backgroundColor: isDark ? '#10B981' : '#2563EB',
    borderColor: isDark ? '#10B981' : '#2563EB',
  },
  timeSquareText: {
    fontSize: 11,
    fontWeight: '600',
    color: isDark ? '#E2E8F0' : '#334155',
  },
  timeSquareTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default WorkspaceBooffInManagerView;
