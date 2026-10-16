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
  CheckCircle2,
  Clock,
  Zap,
  Eye,
  Calendar,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Edit3,
  User,
  ChevronLeft,
  X,
  Flame,
  Check,
  Columns3,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react-native';
import { Avatar } from '../core/Avatar';
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

// Enable layout animations on Android if available
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface WorkspaceBooffInManagerViewProps {
  workspace: Workspace;
  members: WorkspaceMember[];
  onOpenCalendar?: (targetDate?: string) => void;
}

/**
 * 5 Pastel Sticky-Note Color Themes matching the reference Kanban board
 */
export interface CardColorTheme {
  id: WorkspaceTaskColor;
  name: string;
  dotColor: string;
  bg: string;
  border: string;
  titleColor: string;
  descColor: string;
  badgeBg: string;
  tagBg: string;
  tagColor: string;
  advanceBtnBg: string;
  advanceBtnBorder: string;
  advanceBtnText: string;
}

export const CARD_COLOR_THEMES: Record<WorkspaceTaskColor, CardColorTheme> = {
  blue: {
    id: 'blue',
    name: 'Sky Blue',
    dotColor: '#3B82F6',
    bg: '#D5E4FB',
    border: '#BCD5F8',
    titleColor: '#172554',
    descColor: '#1E3A8A',
    badgeBg: 'rgba(255, 255, 255, 0.75)',
    tagBg: 'rgba(255, 255, 255, 0.7)',
    tagColor: '#1D4ED8',
    advanceBtnBg: '#FFFFFF',
    advanceBtnBorder: '#93C5FD',
    advanceBtnText: '#1E40AF',
  },
  purple: {
    id: 'purple',
    name: 'Lilac',
    dotColor: '#8B5CF6',
    bg: '#E3DAF8',
    border: '#CEBFF6',
    titleColor: '#2E1065',
    descColor: '#4C1D95',
    badgeBg: 'rgba(255, 255, 255, 0.75)',
    tagBg: 'rgba(255, 255, 255, 0.7)',
    tagColor: '#6D28D9',
    advanceBtnBg: '#FFFFFF',
    advanceBtnBorder: '#C4B5FD',
    advanceBtnText: '#5B21B6',
  },
  pink: {
    id: 'pink',
    name: 'Rose Coral',
    dotColor: '#F43F5E',
    bg: '#F8CBD5',
    border: '#F2B1C0',
    titleColor: '#4C0519',
    descColor: '#881337',
    badgeBg: 'rgba(255, 255, 255, 0.75)',
    tagBg: 'rgba(255, 255, 255, 0.7)',
    tagColor: '#BE123C',
    advanceBtnBg: '#FFFFFF',
    advanceBtnBorder: '#FDA4AF',
    advanceBtnText: '#9F1239',
  },
  peach: {
    id: 'peach',
    name: 'Warm Peach',
    dotColor: '#F97316',
    bg: '#FCDCC3',
    border: '#F7C6A0',
    titleColor: '#431407',
    descColor: '#7C2D12',
    badgeBg: 'rgba(255, 255, 255, 0.75)',
    tagBg: 'rgba(255, 255, 255, 0.7)',
    tagColor: '#C2410C',
    advanceBtnBg: '#FFFFFF',
    advanceBtnBorder: '#FDBA74',
    advanceBtnText: '#9A3412',
  },
  green: {
    id: 'green',
    name: 'Mint Lime',
    dotColor: '#22C55E',
    bg: '#CFEBB9',
    border: '#B7E19C',
    titleColor: '#052E16',
    descColor: '#14532D',
    badgeBg: 'rgba(255, 255, 255, 0.75)',
    tagBg: 'rgba(255, 255, 255, 0.7)',
    tagColor: '#15803D',
    advanceBtnBg: '#FFFFFF',
    advanceBtnBorder: '#86EFAC',
    advanceBtnText: '#166534',
  },
};

/**
 * Intelligently resolves the card color:
 * Uses explicitly selected color, or falls back to priority/stage matching the screenshot.
 */
export function resolveTaskColor(task: WorkspaceTask): WorkspaceTaskColor {
  if (task.color && CARD_COLOR_THEMES[task.color]) {
    return task.color;
  }
  if (task.priority === 'urgent') return 'pink';
  if (task.priority === 'high') return 'peach';
  if (task.status === 'done') return 'green';
  if (task.status === 'review') return 'purple';
  return 'blue';
}

interface ColumnConfig {
  id: WorkspaceTaskStatus;
  title: string;
  subtitle: string;
  headerBg: string;
  headerBorder: string;
  headerTextColor: string;
  lightBg: string;
  borderColor: string;
  glowColor: string;
  icon: any;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'todo',
    title: 'Backlog / To Do',
    subtitle: 'Queued work & ideas',
    headerBg: '#DFEDE9',
    headerBorder: '#CCE4DE',
    headerTextColor: '#164E43',
    lightBg: '#F3FAF8',
    borderColor: '#CCE4DE',
    glowColor: 'rgba(22, 78, 67, 0.25)',
    icon: Clock,
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    subtitle: 'Active experiments',
    headerBg: '#FCEAE6',
    headerBorder: '#F7D4CD',
    headerTextColor: '#76211C',
    lightBg: '#FDF7F5',
    borderColor: '#F7D4CD',
    glowColor: 'rgba(118, 33, 28, 0.25)',
    icon: Zap,
  },
  {
    id: 'review',
    title: 'Peer Review',
    subtitle: 'Verification & checks',
    headerBg: '#EAE4F5',
    headerBorder: '#DDD1F0',
    headerTextColor: '#3D2073',
    lightBg: '#F7F4FB',
    borderColor: '#DDD1F0',
    glowColor: 'rgba(61, 32, 115, 0.25)',
    icon: Eye,
  },
  {
    id: 'done',
    title: 'Done',
    subtitle: 'Shipped & finalized',
    headerBg: '#FEF7DE',
    headerBorder: '#F6ECC5',
    headerTextColor: '#5E4912',
    lightBg: '#FFFDF7',
    borderColor: '#F6ECC5',
    glowColor: 'rgba(94, 73, 18, 0.25)',
    icon: CheckCircle2,
  },
];

/**
 * AnimatedTaskCard Component
 * Implements smooth floating transitions with pastel color-coding,
 * warning badges, and quick stage advancement.
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
  const isCompleted = task.status === 'done';
  const statusOrder: WorkspaceTaskStatus[] = ['todo', 'in_progress', 'review', 'done'];
  const colIdx = statusOrder.indexOf(task.status);
  const canMovePrev = colIdx > 0;
  const canMoveNext = colIdx < statusOrder.length - 1;
  const nextCol = canMoveNext ? COLUMNS[colIdx + 1] : null;

  // Resolved Pastel Theme
  const colorKey = resolveTaskColor(task);
  const theme = CARD_COLOR_THEMES[colorKey];
  const hasWarning = task.priority === 'urgent' || task.priority === 'high';

  // Animation values using useState for React 19 safety
  const [floatAnim] = useState(() => new Animated.Value(0)); // -1 (prev) ... 0 (idle) ... 1 (next)
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    // Float & glide animation towards next/prev column
    Animated.parallel([
      Animated.timing(floatAnim, {
        toValue: direction === 'next' ? 1 : -1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onQuickMove(task, direction);
    });
  };

  // Interpolations for floating lift & glide
  const translateX = floatAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-60, 0, 60],
  });

  const translateY = Animated.add(
    floatAnim.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [-12, 0, -12],
    }),
    arrivalAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-12, 0],
    })
  );

  const scale = Animated.multiply(
    floatAnim.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [1.04, 1, 1.04],
    }),
    arrivalAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.94, 1],
    })
  );

  const rotate = floatAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-2.5deg', '0deg', '2.5deg'],
  });

  const opacity = Animated.multiply(
    floatAnim.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [0.2, 1, 0.2],
    }),
    arrivalAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    })
  );

  // Helper for priority badges
  const renderPriorityBadge = (priority: WorkspaceTaskPriority) => {
    switch (priority) {
      case 'urgent':
        return (
          <View style={[styles.priorityBadge, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
            <Flame size={10} color="#DC2626" />
            <Text style={[styles.priorityText, { color: '#DC2626' }]}>Urgent</Text>
          </View>
        );
      case 'high':
        return (
          <View style={[styles.priorityBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
            <AlertCircle size={10} color="#D97706" />
            <Text style={[styles.priorityText, { color: '#D97706' }]}>High</Text>
          </View>
        );
      case 'medium':
        return (
          <View style={[styles.priorityBadge, { backgroundColor: theme.badgeBg, borderColor: theme.border }]}>
            <Text style={[styles.priorityText, { color: theme.descColor }]}>Medium</Text>
          </View>
        );
      case 'low':
      default:
        return (
          <View style={[styles.priorityBadge, { backgroundColor: theme.badgeBg, borderColor: theme.border }]}>
            <Text style={[styles.priorityText, { color: theme.descColor }]}>Low</Text>
          </View>
        );
    }
  };

  // Helper for relative date label
  const getRelativeDateLabel = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (dateStr < today) return { label: 'Overdue', color: '#DC2626', bg: '#FEE2E2', border: '#FECACA' };
    if (dateStr === today) return { label: 'Due Today', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' };
    return { label: `📅 ${dateStr.slice(5)}`, color: theme.descColor, bg: theme.badgeBg, border: theme.border };
  };

  const dateInfo = task.due_date ? getRelativeDateLabel(task.due_date) : null;

  return (
    <Animated.View
      style={[
        styles.taskCard,
        {
          backgroundColor: theme.bg,
          borderColor: theme.border,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }, { rotate }],
        },
        isCompleted && styles.taskCardCompleted,
        isNewlyArrived && [styles.newlyArrivedCard, { borderColor: theme.dotColor }],
      ]}
    >
      {/* Signature Warning Triangle marker from Kanban reference image */}
      {hasWarning && (
        <View style={styles.warningCornerMarker}>
          <AlertTriangle size={15} color="#DC2626" fill="#FEE2E2" />
        </View>
      )}

      {/* Top Header Row: Priority & Calendar Link */}
      <View style={styles.cardHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1, paddingRight: hasWarning ? 18 : 0 }}>
          {renderPriorityBadge(task.priority)}
          {task.sync_with_calendar && dateInfo && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onOpenCalendar?.(task.due_date || undefined)}
              style={[styles.calendarSyncBadge, { backgroundColor: dateInfo.bg, borderColor: dateInfo.border }]}
            >
              <Calendar size={10} color={dateInfo.color} />
              <Text style={[styles.calendarSyncBadgeText, { color: dateInfo.color }]}>
                {dateInfo.label} {task.due_time ? `@ ${task.due_time}` : ''}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Card Management Action Buttons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TouchableOpacity
            onPress={() => onEdit(task)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.cardIconBtn, { backgroundColor: theme.badgeBg }]}
          >
            <Edit3 size={13} color={theme.descColor} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(task)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.cardIconBtn, { backgroundColor: theme.badgeBg }]}
          >
            <Trash2 size={13} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Task Content */}
      <TouchableOpacity activeOpacity={0.8} onPress={() => onEdit(task)}>
        <Text style={[styles.taskTitle, { color: theme.titleColor }, isCompleted && styles.taskTitleCompleted]}>
          {task.title}
        </Text>
        {Boolean(task.description) && (
          <Text style={[styles.taskDescription, { color: theme.descColor }]} numberOfLines={2}>
            {task.description}
          </Text>
        )}
      </TouchableOpacity>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <View style={styles.cardTagsRow}>
          {task.tags.map((tag, idx) => (
            <View key={`${task.id}_tag_${idx}`} style={[styles.tagPill, { backgroundColor: theme.tagBg, borderColor: theme.border }]}>
              <Text style={[styles.tagPillText, { color: theme.tagColor }]}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Card Footer: Assignee & Interactive Stage Transition Pill */}
      <View style={[styles.cardFooterRow, { borderTopColor: 'rgba(0, 0, 0, 0.05)' }]}>
        {/* Assignee Tag */}
        <View style={styles.assigneeContainer}>
          {task.assignee ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Avatar
                uri={task.assignee.avatarUrl || undefined}
                name={task.assignee.fullName}
                size="xs"
              />
              <Text style={[styles.assigneeName, { color: theme.titleColor }]} numberOfLines={1}>
                {task.assignee.fullName}
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <User size={12} color={theme.descColor} />
              <Text style={[styles.unassignedText, { color: theme.descColor }]}>Unassigned</Text>
            </View>
          )}
        </View>

        {/* Floating Advance Stage Pill */}
        <View style={styles.stageTransferRow}>
          {canMovePrev && (
            <TouchableOpacity
              onPress={() => handleTriggerMove('prev')}
              style={[styles.stepBtnPrev, { backgroundColor: theme.advanceBtnBg, borderColor: theme.advanceBtnBorder }]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <ChevronLeft size={13} color={theme.advanceBtnText} />
            </TouchableOpacity>
          )}

          {canMoveNext && nextCol ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleTriggerMove('next')}
              style={[
                styles.advanceStagePill,
                { backgroundColor: theme.advanceBtnBg, borderColor: theme.advanceBtnBorder },
              ]}
            >
              <Text style={[styles.advanceStageText, { color: theme.advanceBtnText }]}>
                {nextCol.title}
              </Text>
              <ArrowRight size={11} color={theme.advanceBtnText} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.completedBadgePill, { backgroundColor: theme.badgeBg, borderColor: theme.border }]}>
              <CheckCircle2 size={12} color="#10B981" />
              <Text style={styles.completedBadgeText}>Done</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

export const WorkspaceBooffInManagerView: React.FC<WorkspaceBooffInManagerViewProps> = ({
  workspace,
  members,
  onOpenCalendar,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const currentUser = useAuthStore((s) => s.user);
  const tasks = useWorkspaceStore((s) => s.tasks);
  const createTask = useWorkspaceStore((s) => s.createTask);
  const updateTask = useWorkspaceStore((s) => s.updateTask);
  const deleteTask = useWorkspaceStore((s) => s.deleteTask);
  const moveTaskStatus = useWorkspaceStore((s) => s.moveTaskStatus);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'mine' | 'urgent' | 'due_soon'>('all');
  const [selectedColorFilter, setSelectedColorFilter] = useState<WorkspaceTaskColor | 'all'>('all');

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

    if (selectedColorFilter !== 'all') {
      result = result.filter((t) => resolveTaskColor(t) === selectedColorFilter);
    }

    return result;
  }, [tasks, searchQuery, selectedFilter, selectedColorFilter, currentUser]);

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
  const urgentCount = tasks?.filter((t) => t.priority === 'urgent' && t.status !== 'done').length || 0;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Open Create Modal
  const handleOpenCreateModal = (initialStatus: WorkspaceTaskStatus = 'todo') => {
    setEditingTask(null);
    setFormTitle('');
    setFormDescription('');
    setFormStatus(initialStatus);
    setFormPriority('medium');
    setFormColor(initialStatus === 'done' ? 'green' : initialStatus === 'review' ? 'purple' : 'blue');
    const today = new Date().toISOString().split('T')[0];
    setFormDueDate(today);
    setFormDueTime('14:00');
    setFormAssigneeId(currentUser?.id || '');
    setFormTags('Research');
    setFormSyncCalendar(true);
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

      // Dispatch layout animation for smooth sibling card readjustment
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      // Perform store update
      await moveTaskStatus(task.id, workspace.id, newStatus);

      // Trigger destination glow & arrival spring
      setNewlyArrivedTaskId(task.id);
      setTimeout(() => setNewlyArrivedTaskId(null), 2000);

      // On mobile, smoothly switch to the destination column so the user sees the card land!
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
      {/* 1. Header Banner & Real-Time Stats */}
      <View style={styles.headerBanner}>
        <View style={styles.headerTitleRow}>
          <View style={styles.iconBadge}>
            <Columns3 size={18} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.headerTitle}>BooffIn manager</Text>
              <View style={styles.statusBadge}>
                <Sparkles size={10} color="#059669" />
                <Text style={styles.statusBadgeText}>Kanban Board</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>
              Color-coded research tasks, peer review checkpoints, & calendar milestones
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleOpenCreateModal()}
            style={styles.createTaskBtn}
          >
            <Plus size={15} color="#FFFFFF" />
            <Text style={styles.createTaskBtnText}>{isDesktop ? 'New Task' : 'Add'}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Strip with Progress Bar */}
        <View style={styles.statsStrip}>
          <View style={styles.statsMetricsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statNumber}>{totalCount}</Text>
              <Text style={styles.statLabel}>Tasks</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statChip}>
              <Text style={[styles.statNumber, { color: '#0284C7' }]}>{inProgressCount}</Text>
              <Text style={styles.statLabel}>In Flight</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statChip}>
              <Text style={[styles.statNumber, { color: '#8B5CF6' }]}>
                {columnTasksMap.review?.length || 0}
              </Text>
              <Text style={styles.statLabel}>In Review</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statChip}>
              <Text style={[styles.statNumber, { color: '#10B981' }]}>{completedCount}</Text>
              <Text style={styles.statLabel}>Done</Text>
            </View>
            {urgentCount > 0 && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statChip}>
                  <Text style={[styles.statNumber, { color: '#DC2626' }]}>{urgentCount}</Text>
                  <Text style={styles.statLabel}>Urgent ⚠️</Text>
                </View>
              </>
            )}
          </View>

          {/* Micro Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${completionPercent}%` }]} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={11} color="#059669" />
              <Text style={styles.progressPercentText}>{completionPercent}% Shipped</Text>
            </View>
          </View>
        </View>

        {/* Search, Filter Pills & Color Palette Selector */}
        <View style={styles.filterControlRow}>
          <View style={styles.searchBar}>
            <Search size={14} color="#94A3B8" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Filter tasks, tags, or assignees..."
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
            />
            {Boolean(searchQuery) && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={14} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Color Palette Filter Strip (Matching the Reference Placeholders) */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsStrip}>
            <TouchableOpacity
              onPress={() => setSelectedFilter('all')}
              style={[styles.subFilterPill, selectedFilter === 'all' && selectedColorFilter === 'all' && styles.subFilterPillActive]}
            >
              <Text style={[styles.subFilterPillText, selectedFilter === 'all' && selectedColorFilter === 'all' && styles.subFilterPillTextActive]}>
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
                ⚠️ Warnings
              </Text>
            </TouchableOpacity>

            {/* Pastel Color Swatch Filters */}
            {(['blue', 'purple', 'pink', 'peach', 'green'] as WorkspaceTaskColor[]).map((c) => {
              const theme = CARD_COLOR_THEMES[c];
              const isSelected = selectedColorFilter === c;
              return (
                <TouchableOpacity
                  key={`filter_col_${c}`}
                  onPress={() => setSelectedColorFilter(isSelected ? 'all' : c)}
                  style={[
                    styles.colorFilterPill,
                    { backgroundColor: theme.bg, borderColor: isSelected ? theme.titleColor : theme.border },
                    isSelected && { borderWidth: 2 },
                  ]}
                >
                  <View style={[styles.colorFilterDot, { backgroundColor: theme.dotColor }]} />
                  <Text style={[styles.colorFilterText, { color: theme.titleColor }]}>
                    {theme.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* 2. Responsive Board Columns */}
      {isDesktop ? (
        /* DESKTOP LAYOUT: Multi-column side-by-side view with pastel color-coded cards */
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.desktopBoardContainer}
        >
          {COLUMNS.map((column) => {
            const colTasks = columnTasksMap[column.id] || [];
            const ColIcon = column.icon;

            return (
              <View key={column.id} style={styles.desktopColumn}>
                {/* Column Header matching the Pastel Palette from image */}
                <View
                  style={[
                    styles.columnHeader,
                    {
                      backgroundColor: column.headerBg,
                      borderBottomColor: column.headerBorder,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ColIcon size={16} color={column.headerTextColor} />
                    <Text style={[styles.columnTitle, { color: column.headerTextColor }]}>
                      {column.title}
                    </Text>
                    <View style={[styles.columnCountBadge, { backgroundColor: 'rgba(255, 255, 255, 0.7)' }]}>
                      <Text style={[styles.columnCountText, { color: column.headerTextColor }]}>
                        {colTasks.length}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleOpenCreateModal(column.id)}
                    style={[styles.columnAddBtn, { backgroundColor: 'rgba(255, 255, 255, 0.6)' }]}
                  >
                    <Plus size={14} color={column.headerTextColor} />
                  </TouchableOpacity>
                </View>

                {/* Column Task Cards ScrollView */}
                <ScrollView
                  style={[styles.columnCardsScroll, { backgroundColor: column.lightBg }]}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12, paddingBottom: 28 }}
                >
                  {colTasks.length === 0 ? (
                    <View style={styles.emptyColumnContainer}>
                      <ColIcon size={24} color="#CBD5E1" />
                      <Text style={styles.emptyColumnText}>No tasks in {column.title}</Text>
                      <TouchableOpacity
                        onPress={() => handleOpenCreateModal(column.id)}
                        style={styles.emptyColumnAddBtn}
                      >
                        <Plus size={12} color="#059669" />
                        <Text style={styles.emptyColumnAddText}>Add task</Text>
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
        /* MOBILE LAYOUT: Swipeable / Tabbed columns for touch ergonomics */
        <View style={styles.mobileBoardWrapper}>
          {/* Mobile Column Tab Selector Strip */}
          <View style={styles.mobileTabsRow}>
            {COLUMNS.map((col) => {
              const count = columnTasksMap[col.id]?.length || 0;
              const isActive = mobileActiveColumn === col.id;
              const ColIcon = col.icon;

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
                    { backgroundColor: col.headerBg, borderColor: col.headerBorder },
                    isActive && styles.mobileTabPillActive,
                  ]}
                >
                  <ColIcon size={13} color={col.headerTextColor} />
                  <Text style={[styles.mobileTabText, { color: col.headerTextColor }, isActive && { fontWeight: '800' }]}>
                    {col.title.split('/')[0].trim()}
                  </Text>
                  <View style={[styles.mobileTabCount, { backgroundColor: 'rgba(255, 255, 255, 0.8)' }]}>
                    <Text style={[styles.mobileTabCountText, { color: col.headerTextColor }]}>
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Active Mobile Column List */}
          <ScrollView
            style={styles.mobileCardsScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.mobileCardsContent}
          >
            {columnTasksMap[mobileActiveColumn]?.length === 0 ? (
              <View style={styles.emptyColumnContainer}>
                <Text style={styles.emptyColumnText}>
                  No tasks currently in {COLUMNS.find((c) => c.id === mobileActiveColumn)?.title}
                </Text>
                <TouchableOpacity
                  onPress={() => handleOpenCreateModal(mobileActiveColumn)}
                  style={styles.emptyColumnAddBtn}
                >
                  <Plus size={13} color="#059669" />
                  <Text style={styles.emptyColumnAddText}>Create task here</Text>
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

      {/* 3. Create / Edit Task Modal with Card Color Palette Picker */}
      <Modal visible={isModalOpen} transparent animationType="fade" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, isDesktop && { maxWidth: 540 }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.modalHeaderIconBadge}>
                  <Sparkles size={15} color="#059669" />
                </View>
                <Text style={styles.modalTitle}>
                  {editingTask ? 'Edit Task' : 'New Research Task'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.modalCloseBtn}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
              {/* Task Title */}
              <Text style={styles.fieldLabel}>Task Title *</Text>
              <TextInput
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="e.g. Conduct ablation study on transformer encoder"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />

              {/* Card Color Code Picker (Matching Image) */}
              <Text style={styles.fieldLabel}>Sticky Card Color Code</Text>
              <View style={styles.colorPickerRow}>
                {(['blue', 'purple', 'pink', 'peach', 'green'] as WorkspaceTaskColor[]).map((c) => {
                  const theme = CARD_COLOR_THEMES[c];
                  const isSelected = formColor === c;
                  return (
                    <TouchableOpacity
                      key={`modal_color_${c}`}
                      activeOpacity={0.8}
                      onPress={() => setFormColor(c)}
                      style={[
                        styles.colorPickerSwatch,
                        { backgroundColor: theme.bg, borderColor: isSelected ? theme.titleColor : theme.border },
                        isSelected && styles.colorPickerSwatchSelected,
                      ]}
                    >
                      <View style={[styles.colorPickerDot, { backgroundColor: theme.dotColor }]}>
                        {isSelected && <Check size={10} color="#FFFFFF" />}
                      </View>
                      <Text style={[styles.colorPickerLabel, { color: theme.titleColor }]}>
                        {theme.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Task Description */}
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Key deliverables, methodology notes, or paper references..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                style={[styles.textInput, styles.textAreaInput]}
              />

              {/* Status / Column Selector */}
              <Text style={styles.fieldLabel}>Workflow Column</Text>
              <View style={styles.modalPillsRow}>
                {COLUMNS.map((col) => (
                  <TouchableOpacity
                    key={col.id}
                    onPress={() => setFormStatus(col.id)}
                    style={[
                      styles.choicePill,
                      formStatus === col.id && [styles.choicePillActive, { borderColor: col.headerTextColor, backgroundColor: col.headerBg }],
                    ]}
                  >
                    <Text
                      style={[
                        styles.choicePillText,
                        formStatus === col.id && { color: col.headerTextColor, fontWeight: '700' },
                      ]}
                    >
                      {col.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Priority Selector */}
              <Text style={styles.fieldLabel}>Priority</Text>
              <View style={styles.modalPillsRow}>
                {(['low', 'medium', 'high', 'urgent'] as WorkspaceTaskPriority[]).map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => {
                      setFormPriority(p);
                      if (p === 'urgent') setFormColor('pink');
                      else if (p === 'high') setFormColor('peach');
                    }}
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
                      {p === 'urgent' || p === 'high' ? `⚠️ ${p.toUpperCase()}` : p.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Due Date & Time */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Due Date (YYYY-MM-DD)</Text>
                  <TextInput
                    value={formDueDate}
                    onChangeText={setFormDueDate}
                    placeholder="2026-10-20"
                    placeholderTextColor="#94A3B8"
                    style={styles.textInput}
                  />
                </View>
                <View style={{ width: 110 }}>
                  <Text style={styles.fieldLabel}>Time</Text>
                  <TextInput
                    value={formDueTime}
                    onChangeText={setFormDueTime}
                    placeholder="14:00"
                    placeholderTextColor="#94A3B8"
                    style={styles.textInput}
                  />
                </View>
              </View>

              {/* Assignee Selector */}
              <Text style={styles.fieldLabel}>Assign Researcher</Text>
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

              {/* Tags */}
              <Text style={styles.fieldLabel}>Tags (comma separated)</Text>
              <TextInput
                value={formTags}
                onChangeText={setFormTags}
                placeholder="e.g. Experiment, Review, Paper"
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />

              {/* Calendar Sync Toggle */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setFormSyncCalendar(!formSyncCalendar)}
                style={styles.syncCalendarRow}
              >
                <View style={[styles.checkboxSquare, formSyncCalendar && styles.checkboxSquareChecked]}>
                  {formSyncCalendar && <Check size={12} color="#FFFFFF" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.syncCalendarTitle}>Sync with Workspace Calendar</Text>
                  <Text style={styles.syncCalendarSubtitle}>
                    Automatically creates milestone markers on your Inner Circle agenda
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            {/* Modal Footer */}
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
                    {editingTask ? 'Save Changes' : 'Create Task'}
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
          <View style={[styles.modalCard, { maxWidth: 400 }]}>
            <View style={styles.deleteHeader}>
              <View style={styles.deleteIconBadge}>
                <Trash2 size={20} color="#DC2626" />
              </View>
              <Text style={styles.deleteTitle}>Delete Task?</Text>
              <Text style={styles.deleteSubtitle}>
                Are you sure you want to delete &ldquo;{taskToDelete?.title}&rdquo;? This will also remove any synced calendar milestones.
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setTaskToDelete(null)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Keep Task</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBanner: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  createTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#059669',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  createTaskBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* STATS & PROGRESS */
  statsStrip: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 8,
  },
  statsMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  progressPercentText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
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
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 34,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    paddingVertical: 0,
  },
  filterPillsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subFilterPill: {
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subFilterPillActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  subFilterPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  subFilterPillTextActive: {
    color: '#FFFFFF',
  },
  colorFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  colorFilterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  colorFilterText: {
    fontSize: 10,
    fontWeight: '700',
  },

  /* DESKTOP LAYOUT */
  desktopBoardContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  desktopColumn: {
    width: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    maxHeight: '100%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  columnTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  columnCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  columnCountText: {
    fontSize: 11,
    fontWeight: '800',
  },
  columnAddBtn: {
    padding: 4,
    borderRadius: 6,
  },
  columnCardsScroll: {
    flex: 1,
    padding: 12,
  },

  /* MOBILE LAYOUT */
  mobileBoardWrapper: {
    flex: 1,
  },
  mobileTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 6,
  },
  mobileTabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  mobileTabPillActive: {
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  mobileTabText: {
    fontSize: 11,
    fontWeight: '600',
  },
  mobileTabCount: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  mobileTabCountText: {
    fontSize: 9,
    fontWeight: '700',
  },
  mobileCardsScroll: {
    flex: 1,
  },
  mobileCardsContent: {
    padding: 12,
    gap: 12,
    paddingBottom: 40,
  },

  /* PASTEL STICKY TASK CARD */
  taskCard: {
    borderRadius: 12,
    padding: 13,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
    position: 'relative',
    borderWidth: 1.5,
  },
  taskCardCompleted: {
    opacity: 0.9,
  },
  warningCornerMarker: {
    position: 'absolute',
    top: -5,
    right: 8,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 2,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  newlyArrivedCard: {
    borderWidth: 2.5,
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  calendarSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  calendarSyncBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardIconBtn: {
    padding: 4,
    borderRadius: 6,
  },
  taskTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    lineHeight: 18,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
  },
  taskDescription: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
    fontWeight: '500',
  },
  cardTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tagPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  tagPillText: {
    fontSize: 10,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  assigneeContainer: {
    flex: 1,
  },
  assigneeName: {
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 95,
  },
  unassignedText: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  stageTransferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtnPrev: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  advanceStagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  advanceStageText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  completedBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },

  /* EMPTY COLUMN STATE */
  emptyColumnContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    marginTop: 6,
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  emptyColumnText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptyColumnAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
  },
  emptyColumnAddText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },

  /* MODALS & COLOR PICKER */
  colorPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  colorPickerSwatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  colorPickerSwatchSelected: {
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  colorPickerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPickerLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalHeaderIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBodyScroll: {
    maxHeight: 460,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  textAreaInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  modalPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  choicePill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  choicePillActive: {
    borderWidth: 1.5,
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  choicePillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  choicePillTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  assigneeChoicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5.5,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assigneeChoicePillActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  assigneeChoiceText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  assigneeChoiceTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  syncCalendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 14,
  },
  checkboxSquare: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxSquareChecked: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  syncCalendarTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  syncCalendarSubtitle: {
    fontSize: 10,
    color: '#15803D',
    marginTop: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSubmitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#059669',
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* DELETE MODAL */
  deleteHeader: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  deleteIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  deleteTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  deleteSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default WorkspaceBooffInManagerView;
