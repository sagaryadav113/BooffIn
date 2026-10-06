import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Video,
  MapPin,
  AlignLeft,
  Bell,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Filter,
  Download,
  Share2,
  Check,
  X,
  SlidersHorizontal,
  RefreshCw,
  Eye,
  CheckCircle2,
} from 'lucide-react-native';
import { ADMIN_COLORS, ADMIN_RADII } from '../lib/constants';
import {
  AdminCalendarEvent,
  CalendarColorId,
  CALENDAR_COLOR_PALETTES,
  CalendarParticipant,
  CalendarViewMode,
} from '../types/calendar';
import { adminCalendarService } from '../services/adminCalendarService';

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const AdminCalendarView: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // 1. Calendar State & Viewport
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDayDate, setSelectedDayDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [mobileSubMode, setMobileSubMode] = useState<'agenda' | 'grid'>('agenda');
  const [events, setEvents] = useState<AdminCalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [teamMembers, setTeamMembers] = useState<CalendarParticipant[]>([]);

  // 2. Selected / Active Event for Drawer Editing
  const [selectedEvent, setSelectedEvent] = useState<AdminCalendarEvent | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isNewEvent, setIsNewEvent] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formDate, setFormDate] = useState<string>('');
  const [formStartTime, setFormStartTime] = useState<string>('14:00');
  const [formEndTime, setFormEndTime] = useState<string>('15:00');
  const [formIsAllDay, setFormIsAllDay] = useState<boolean>(false);
  const [formIsRecurring, setFormIsRecurring] = useState<boolean>(false);
  const [formColorId, setFormColorId] = useState<CalendarColorId>('purple');
  const [formLocation, setFormLocation] = useState<string>('');
  const [formMeetingLink, setFormMeetingLink] = useState<string>('');
  const [formParticipants, setFormParticipants] = useState<CalendarParticipant[]>([]);
  const [formReminders, setFormReminders] = useState<string[]>(['15 mins before']);

  // Filter & Search
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [filterColor, setFilterColor] = useState<CalendarColorId | 'all'>('all');

  // Compute Active Week Boundaries (Sunday - Saturday)
  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  // Current Live Time Indicator calculation
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const isCurrentWeek = weekDays.some(
    d => d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  );
  const currentMinutesOffset = (currentHour - 8) * 60 + currentMin;
  const currentLineTop = (currentMinutesOffset / 60) * 80; // 80px per hour row

  // 3. Load Events & Team Members
  const loadData = async () => {
    setLoading(true);
    try {
      const startDate = new Date(weekDays[0]);
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date(weekDays[6]);
      endDate.setDate(endDate.getDate() + 7);

      const [eventsRes, members] = await Promise.all([
        adminCalendarService.listEvents(startDate, endDate),
        adminCalendarService.fetchTeamMembers(),
      ]);

      setTeamMembers(members);

      if (!eventsRes.error && eventsRes.events) {
        setEvents(eventsRes.events);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.warn('Error loading calendar data:', err);
      setEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Setup Supabase Realtime synchronization
    const unsubscribe = adminCalendarService.subscribe(
      (newEvent) => {
        setEvents((prev) => {
          const exists = prev.some((e) => e.id === newEvent.id);
          if (exists) {
            return prev.map((e) => (e.id === newEvent.id ? newEvent : e));
          }
          return [...prev, newEvent];
        });
      },
      (updatedEvent) => {
        setEvents((prev) => prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)));
        if (selectedEvent?.id === updatedEvent.id) {
          setSelectedEvent(updatedEvent);
        }
      },
      (deletedEventId) => {
        setEvents((prev) => prev.filter((e) => e.id !== deletedEventId));
        if (selectedEvent?.id === deletedEventId) {
          setIsDrawerOpen(false);
          setSelectedEvent(null);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentDate]);

  // Navigate Weeks
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') {
      d.setDate(d.getDate() - 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') {
      d.setDate(d.getDate() + 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Open Event Editor / Inspector
  const openEventDetails = (event: AdminCalendarEvent) => {
    setSelectedEvent(event);
    setIsNewEvent(false);
    setFormTitle(event.title);
    setFormDescription(event.description || '');
    
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    setFormDate(start.toISOString().split('T')[0]);
    setFormStartTime(start.toTimeString().slice(0, 5));
    setFormEndTime(end.toTimeString().slice(0, 5));
    setFormIsAllDay(event.is_all_day);
    setFormIsRecurring(event.is_recurring);
    setFormColorId(event.color_id);
    setFormLocation(event.location || '');
    setFormMeetingLink(event.meeting_link || '');
    setFormParticipants(event.participants || []);
    setFormReminders(event.reminders || ['15 mins before']);
    setIsDrawerOpen(true);
  };

  // Quick-Add Event on Slot Click or Add Button
  const handleCreateNew = (targetDate?: Date, targetHour?: number) => {
    const baseDate = targetDate || new Date();
    const hour = targetHour !== undefined ? targetHour : 14;
    
    const start = new Date(baseDate);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(baseDate);
    end.setHours(hour + 1, 0, 0, 0);

    setSelectedEvent(null);
    setIsNewEvent(true);
    setFormTitle('');
    setFormDescription('');
    setFormDate(start.toISOString().split('T')[0]);
    setFormStartTime(start.toTimeString().slice(0, 5));
    setFormEndTime(end.toTimeString().slice(0, 5));
    setFormIsAllDay(false);
    setFormIsRecurring(false);
    setFormColorId('purple');
    setFormLocation('');
    setFormMeetingLink('');
    setFormParticipants([]);
    setFormReminders(['15 mins before']);
    setIsDrawerOpen(true);
  };

  // Save / Update Handler
  const handleSaveEvent = async () => {
    if (!formTitle.trim()) {
      alert('Please provide an event title.');
      return;
    }

    setSaving(true);
    try {
      const datePart = formDate || new Date().toISOString().split('T')[0];
      const startDateTime = new Date(`${datePart}T${formStartTime}:00`);
      const endDateTime = new Date(`${datePart}T${formEndTime}:00`);

      if (isNewEvent || !selectedEvent) {
        const { event, error } = await adminCalendarService.createEvent({
          title: formTitle,
          description: formDescription,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          is_all_day: formIsAllDay,
          is_recurring: formIsRecurring,
          color_id: formColorId,
          category: 'Operations',
          location: formLocation,
          meeting_link: formMeetingLink,
          reminders: formReminders,
          participants: formParticipants,
        });

        if (error) {
          alert('Error saving event: ' + error.message);
          return;
        }

        if (event) {
          setEvents((prev) => [...prev.filter((e) => e.id !== event.id), event]);
        }
      } else {
        const palette = CALENDAR_COLOR_PALETTES[formColorId];
        const { event, error } = await adminCalendarService.updateEvent(selectedEvent.id, {
          title: formTitle,
          description: formDescription,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          is_all_day: formIsAllDay,
          is_recurring: formIsRecurring,
          color_id: formColorId,
          color_bg: palette.bg,
          color_border: palette.border,
          color_text: palette.text,
          location: formLocation,
          meeting_link: formMeetingLink,
          reminders: formReminders,
          participants: formParticipants,
        });

        if (error) {
          alert('Error updating event: ' + error.message);
          return;
        }

        // Update local state
        if (event) {
          setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
        }
      }

      setSaveSuccessMsg('Event synchronized across all Admin Consoles!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      setIsDrawerOpen(false);
    } catch (err: any) {
      alert('Error saving event: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete Handler
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    if (confirm('Delete this event from the shared team calendar?')) {
      await adminCalendarService.deleteEvent(selectedEvent.id);
      setEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id));
      setIsDrawerOpen(false);
    }
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (filterColor !== 'all' && e.color_id !== filterColor) return false;
      if (filterSearch.trim()) {
        const q = filterSearch.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchDesc = e.description?.toLowerCase().includes(q);
        const matchLoc = e.location?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchLoc) return false;
      }
      return true;
    });
  }, [events, filterColor, filterSearch]);

  // All Day Events for the current week
  const allDayEvents = useMemo(() => {
    return filteredEvents.filter((e) => e.is_all_day);
  }, [filteredEvents]);

  // Time-slotted Events for the current week
  const timeEvents = useMemo(() => {
    return filteredEvents.filter((e) => !e.is_all_day);
  }, [filteredEvents]);

  // Selected Day Events for Mobile Agenda
  const selectedDayEvents = useMemo(() => {
    return filteredEvents
      .filter((e) => {
        const eventDate = new Date(e.start_time);
        return (
          eventDate.getDate() === selectedDayDate.getDate() &&
          eventDate.getMonth() === selectedDayDate.getMonth() &&
          eventDate.getFullYear() === selectedDayDate.getFullYear()
        );
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [filteredEvents, selectedDayDate]);

  // Event count helper for date selector dots
  const getEventCountForDate = (date: Date) => {
    return filteredEvents.filter((e) => {
      const eventDate = new Date(e.start_time);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    }).length;
  };

  // Toggle participant acceptance
  const toggleParticipant = (member: CalendarParticipant) => {
    setFormParticipants((prev) => {
      const exists = prev.some((p) => p.id === member.id);
      if (exists) {
        return prev.filter((p) => p.id !== member.id);
      } else {
        return [...prev, { ...member, accepted: true }];
      }
    });
  };

  const renderDrawerContent = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.drawerContent}>
      {/* Title Input */}
      <View style={styles.drawerSection}>
        <TextInput
          style={styles.titleInput}
          value={formTitle}
          onChangeText={setFormTitle}
          placeholder="Event Title..."
          placeholderTextColor={ADMIN_COLORS.textMuted}
        />
      </View>

      {/* Date Input */}
      <View style={styles.formRow}>
        <CalendarIcon size={16} color={ADMIN_COLORS.textSecondary} />
        <TextInput
          style={styles.fieldInput}
          value={formDate}
          onChangeText={setFormDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={ADMIN_COLORS.textMuted}
        />
      </View>

      {/* Time Selection Pills */}
      <View style={styles.timePillsRow}>
        <View style={styles.timePill}>
          <Clock size={14} color={ADMIN_COLORS.textSecondary} />
          <TextInput
            style={styles.timeInput}
            value={formStartTime}
            onChangeText={setFormStartTime}
            placeholder="14:00"
          />
        </View>
        <Text style={styles.timeDash}>—</Text>
        <View style={styles.timePill}>
          <Clock size={14} color={ADMIN_COLORS.textSecondary} />
          <TextInput
            style={styles.timeInput}
            value={formEndTime}
            onChangeText={setFormEndTime}
            placeholder="15:00"
          />
        </View>
      </View>

      {/* Toggles: All Day & Recurring */}
      <View style={styles.togglesRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, formIsAllDay && styles.toggleBtnActive]}
          onPress={() => setFormIsAllDay(!formIsAllDay)}
        >
          <View style={[styles.toggleCircle, formIsAllDay && styles.toggleCircleActive]} />
          <Text style={styles.toggleText}>All day</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, formIsRecurring && styles.toggleBtnActive]}
          onPress={() => setFormIsRecurring(!formIsRecurring)}
        >
          <View style={[styles.toggleCircle, formIsRecurring && styles.toggleCircleActive]} />
          <Text style={styles.toggleText}>Yearly / Repeat</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* Participants Section */}
      <View style={styles.drawerSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Participants</Text>
          <TouchableOpacity
            style={styles.addParticipantBtn}
            onPress={() => {
              // Toggle first unassigned team member
              const unassigned = teamMembers.find(
                (m) => !formParticipants.some((p) => p.id === m.id)
              );
              if (unassigned) {
                toggleParticipant(unassigned);
              }
            }}
          >
            <Plus size={13} color="#2563EB" />
            <Text style={styles.addParticipantBtnText}>Add participant</Text>
          </TouchableOpacity>
        </View>

        {/* Team member chips */}
        <View style={styles.participantsList}>
          {teamMembers.length === 0 ? (
            <Text style={{ fontSize: 12, color: ADMIN_COLORS.textMuted, fontStyle: 'italic', paddingVertical: 6 }}>
              No team members configured yet.
            </Text>
          ) : (
            teamMembers.map((member) => {
              const isSelected = formParticipants.some((p) => p.id === member.id);
              return (
                <TouchableOpacity
                  key={member.id}
                  style={[styles.participantRow, isSelected && styles.participantRowActive]}
                  onPress={() => toggleParticipant(member)}
                >
                  <View style={styles.participantAvatar}>
                    <Text style={styles.avatarInitial}>{member.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName}>{member.name}</Text>
                    <Text style={styles.participantRole}>{member.role || 'Admin'}</Text>
                  </View>
                  {isSelected && <CheckCircle2 size={16} color="#059669" />}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </View>

      <View style={styles.divider} />

      {/* Video Meeting Link */}
      <View style={styles.formRow}>
        <Video size={16} color={ADMIN_COLORS.textSecondary} />
        <TextInput
          style={styles.fieldInput}
          value={formMeetingLink}
          onChangeText={setFormMeetingLink}
          placeholder="https://meet.google.com/..."
          placeholderTextColor={ADMIN_COLORS.textMuted}
        />
      </View>

      {/* Location */}
      <View style={styles.formRow}>
        <MapPin size={16} color={ADMIN_COLORS.textSecondary} />
        <TextInput
          style={styles.fieldInput}
          value={formLocation}
          onChangeText={setFormLocation}
          placeholder="Location or Room..."
          placeholderTextColor={ADMIN_COLORS.textMuted}
        />
      </View>

      {/* Description / Agenda */}
      <View style={styles.descSection}>
        <AlignLeft size={16} color={ADMIN_COLORS.textSecondary} style={{ marginTop: 6 }} />
        <TextInput
          style={styles.descInput}
          value={formDescription}
          onChangeText={setFormDescription}
          placeholder="Meeting agenda or notes..."
          placeholderTextColor={ADMIN_COLORS.textMuted}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Reminders Pill */}
      <TouchableOpacity
        style={styles.remindersBtn}
        onPress={() => alert('Reminder alert set: 15 minutes before event.')}
      >
        <Bell size={14} color={ADMIN_COLORS.textSecondary} />
        <Text style={styles.remindersBtnText}>Add Reminders</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* Color Palette Selector */}
      <View style={styles.colorPaletteSection}>
        <Text style={styles.paletteLabel}>Color Theme</Text>
        <View style={styles.colorsRow}>
          {Object.keys(CALENDAR_COLOR_PALETTES).map((colorKey) => {
            const theme = CALENDAR_COLOR_PALETTES[colorKey as CalendarColorId];
            const isSelected = formColorId === colorKey;

            return (
              <TouchableOpacity
                key={colorKey}
                style={[
                  styles.colorCircle,
                  { backgroundColor: theme.dot },
                  isSelected && styles.colorCircleSelected,
                ]}
                onPress={() => setFormColorId(colorKey as CalendarColorId)}
              >
                {isSelected && <Check size={12} color="#FFFFFF" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.drawerActions}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => setIsDrawerOpen(false)}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>

        {!isNewEvent && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteEvent}
          >
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSaveEvent}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>
              {isNewEvent ? 'Save Event' : 'Update'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* 1. TOP HEADER CONTROLS (METIS SAAS DESIGN) */}
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        {/* Left: Title & Navigation */}
        <View style={[styles.headerLeft, isMobile && styles.headerLeftMobile]}>
          <Text style={styles.pageTitle}>Calendar</Text>

          <View style={styles.navButtonGroup}>
            <TouchableOpacity style={styles.todayButton} onPress={handleToday}>
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>

            <View style={styles.monthNavigator}>
              <Text style={styles.monthLabel}>
                {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
              </Text>
              <TouchableOpacity style={styles.arrowButton} onPress={handlePrev}>
                <ChevronLeft size={16} color={ADMIN_COLORS.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.arrowButton} onPress={handleNext}>
                <ChevronRight size={16} color={ADMIN_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Right: View Selector, Filter, Export, New Event */}
        <View style={[styles.headerRight, isMobile && styles.headerRightMobile]}>
          <View style={styles.viewSelector}>
            {(['week', 'day', 'month'] as CalendarViewMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.viewTab, viewMode === mode && styles.viewTabActive]}
                onPress={() => setViewMode(mode)}
              >
                <Text style={[styles.viewTabText, viewMode === mode && styles.viewTabTextActive]}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.actionIconBtn, filterColor !== 'all' && styles.actionIconBtnActive]}
            onPress={() => setShowFilterModal(!showFilterModal)}
          >
            <Filter size={15} color={filterColor !== 'all' ? '#2563EB' : ADMIN_COLORS.textSecondary} />
            <Text style={[styles.actionBtnText, filterColor !== 'all' && { color: '#2563EB' }]}>Filter</Text>
          </TouchableOpacity>

          {!isMobile && (
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={() => alert('Calendar schedule exported to CSV / iCal format.')}
            >
              <Download size={15} color={ADMIN_COLORS.textSecondary} />
              <Text style={styles.actionBtnText}>Export</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.newEventBtn}
            onPress={() => handleCreateNew()}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.newEventBtnText}>Add Event</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Realtime Success Toast Notification */}
      {saveSuccessMsg && (
        <View style={styles.toastSuccess}>
          <CheckCircle2 size={16} color="#064E3B" />
          <Text style={styles.toastSuccessText}>{saveSuccessMsg}</Text>
        </View>
      )}

      {/* 2. MOBILE-SPECIFIC DAY SELECTOR & AGENDAR VIEW */}
      {isMobile ? (
        <View style={styles.mobileCalendarContainer}>
          {/* Horizontal 7-Day Date Selector Ribbon */}
          <View style={styles.mobileDayStrip}>
            {weekDays.map((dayDate, idx) => {
              const isSelected =
                dayDate.getDate() === selectedDayDate.getDate() &&
                dayDate.getMonth() === selectedDayDate.getMonth() &&
                dayDate.getFullYear() === selectedDayDate.getFullYear();
              const isToday =
                dayDate.getDate() === now.getDate() &&
                dayDate.getMonth() === now.getMonth() &&
                dayDate.getFullYear() === now.getFullYear();
              const count = getEventCountForDate(dayDate);

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.mobileDayPill,
                    isSelected && styles.mobileDayPillSelected,
                    isToday && !isSelected && styles.mobileDayPillToday,
                  ]}
                  onPress={() => setSelectedDayDate(dayDate)}
                >
                  <Text
                    style={[
                      styles.mobileDayName,
                      isSelected && styles.mobileDayNameSelected,
                      isToday && !isSelected && styles.mobileDayNameToday,
                    ]}
                  >
                    {DAYS_SHORT[dayDate.getDay()]}
                  </Text>
                  <View
                    style={[
                      styles.mobileDateCircle,
                      isSelected && styles.mobileDateCircleSelected,
                      isToday && !isSelected && styles.mobileDateCircleToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.mobileDateNumber,
                        isSelected && styles.mobileDateNumberSelected,
                        isToday && !isSelected && styles.mobileDateNumberToday,
                      ]}
                    >
                      {dayDate.getDate()}
                    </Text>
                  </View>
                  {count > 0 && (
                    <View
                      style={[
                        styles.mobileEventDot,
                        isSelected && { backgroundColor: '#FFFFFF' },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Sub-view toggle (Agenda vs Week Grid) */}
          <View style={styles.mobileSubModeRow}>
            <View style={styles.mobileSubModeTabs}>
              <TouchableOpacity
                style={[
                  styles.mobileSubModeTab,
                  mobileSubMode === 'agenda' && styles.mobileSubModeTabActive,
                ]}
                onPress={() => setMobileSubMode('agenda')}
              >
                <Text
                  style={[
                    styles.mobileSubModeTabText,
                    mobileSubMode === 'agenda' && styles.mobileSubModeTabTextActive,
                  ]}
                >
                  Agenda ({selectedDayEvents.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.mobileSubModeTab,
                  mobileSubMode === 'grid' && styles.mobileSubModeTabActive,
                ]}
                onPress={() => setMobileSubMode('grid')}
              >
                <Text
                  style={[
                    styles.mobileSubModeTabText,
                    mobileSubMode === 'grid' && styles.mobileSubModeTabTextActive,
                  ]}
                >
                  Time Grid
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.mobileAddForDayBtn}
              onPress={() => handleCreateNew(selectedDayDate)}
            >
              <Plus size={14} color="#059669" />
              <Text style={styles.mobileAddForDayText}>Add Event</Text>
            </TouchableOpacity>
          </View>

          {/* Render selected sub-view */}
          {mobileSubMode === 'agenda' ? (
            <ScrollView
              style={styles.mobileAgendaScroll}
              contentContainerStyle={styles.mobileAgendaContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.mobileAgendaHeader}>
                <Text style={styles.mobileAgendaDateTitle}>
                  {selectedDayDate.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={styles.mobileAgendaCountBadge}>
                  {selectedDayEvents.length}{' '}
                  {selectedDayEvents.length === 1 ? 'event' : 'events'}
                </Text>
              </View>

              {selectedDayEvents.length === 0 ? (
                <View style={styles.mobileEmptyCard}>
                  <View style={styles.mobileEmptyIconCircle}>
                    <CalendarIcon size={26} color="#059669" />
                  </View>
                  <Text style={styles.mobileEmptyTitle}>No events scheduled</Text>
                  <Text style={styles.mobileEmptySubtitle}>
                    You have a clear schedule for this day.
                  </Text>
                  <TouchableOpacity
                    style={styles.mobileEmptyAddBtn}
                    onPress={() => handleCreateNew(selectedDayDate)}
                  >
                    <Plus size={15} color="#FFFFFF" />
                    <Text style={styles.mobileEmptyAddBtnText}>Schedule Event</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                selectedDayEvents.map((evt) => {
                  const evtStart = new Date(evt.start_time);
                  const evtEnd = new Date(evt.end_time);
                  const theme =
                    CALENDAR_COLOR_PALETTES[evt.color_id] ||
                    CALENDAR_COLOR_PALETTES.purple;

                  const timeDisplay = evt.is_all_day
                    ? 'All Day'
                    : `${evtStart.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })} - ${evtEnd.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`;

                  return (
                    <TouchableOpacity
                      key={evt.id}
                      style={[
                        styles.mobileAgendaCard,
                        { borderLeftColor: theme.dot },
                      ]}
                      onPress={() => openEventDetails(evt)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.mobileCardHeader}>
                        <View style={styles.mobileTimePill}>
                          <Clock size={12} color="#059669" />
                          <Text style={styles.mobileTimePillText}>
                            {timeDisplay}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.mobileCategoryBadge,
                            { backgroundColor: theme.bg, borderColor: theme.border },
                          ]}
                        >
                          <Text
                            style={[
                              styles.mobileCategoryText,
                              { color: theme.text },
                            ]}
                          >
                            {evt.category || 'Operations'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.mobileCardTitle}>{evt.title}</Text>

                      {evt.description ? (
                        <Text
                          style={styles.mobileCardDesc}
                          numberOfLines={2}
                        >
                          {evt.description}
                        </Text>
                      ) : null}

                      <View style={styles.mobileCardFooter}>
                        {evt.meeting_link ? (
                          <View style={styles.mobileMeetBadge}>
                            <Video size={13} color="#2563EB" />
                            <Text style={styles.mobileMeetText}>
                              Video Meet
                            </Text>
                          </View>
                        ) : null}

                        {evt.location ? (
                          <View style={styles.mobileLocBadge}>
                            <MapPin size={13} color="#64748B" />
                            <Text
                              style={styles.mobileLocText}
                              numberOfLines={1}
                            >
                              {evt.location}
                            </Text>
                          </View>
                        ) : null}

                        {evt.participants && evt.participants.length > 0 && (
                          <View style={styles.mobileAvatarsGroup}>
                            {evt.participants.slice(0, 3).map((p, pIdx) => (
                              <View
                                key={p.id || pIdx}
                                style={[
                                  styles.mobileMiniAvatar,
                                  { zIndex: 10 - pIdx, marginLeft: pIdx === 0 ? 0 : -6 },
                                ]}
                              >
                                <Text style={styles.mobileMiniAvatarText}>
                                  {p.name?.charAt(0) || 'A'}
                                </Text>
                              </View>
                            ))}
                            {evt.participants.length > 3 && (
                              <Text style={styles.mobileExtraAvatars}>
                                +{evt.participants.length - 3}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          ) : (
            /* Scrollable Grid View when requested on mobile */
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1 }}
            >
              <View style={[styles.gridContainer, { minWidth: 680 }]}>
                {/* Day Headers Row */}
                <View style={styles.daysHeaderRow}>
                  <View style={styles.timezoneBox}>
                    <Text style={styles.timezoneText}>UTC +5:30</Text>
                  </View>
                  {weekDays.map((dayDate, idx) => {
                    const isToday =
                      dayDate.getDate() === now.getDate() &&
                      dayDate.getMonth() === now.getMonth() &&
                      dayDate.getFullYear() === now.getFullYear();

                    return (
                      <View
                        key={idx}
                        style={[
                          styles.dayHeaderCol,
                          isToday && styles.dayHeaderColToday,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayHeaderText,
                            isToday && styles.dayHeaderTextToday,
                          ]}
                        >
                          {DAYS_SHORT[dayDate.getDay()]} {dayDate.getDate()}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* All Day Row */}
                <View style={styles.allDayRow}>
                  <View style={styles.allDayLabelBox}>
                    <Text style={styles.allDayLabel}>All day</Text>
                  </View>
                  {weekDays.map((dayDate, idx) => {
                    const dayAllDayEvents = allDayEvents.filter((e) => {
                      const eventDate = new Date(e.start_time);
                      return (
                        eventDate.getDate() === dayDate.getDate() &&
                        eventDate.getMonth() === dayDate.getMonth()
                      );
                    });

                    return (
                      <View key={idx} style={styles.allDayCol}>
                        {dayAllDayEvents.map((evt) => (
                          <TouchableOpacity
                            key={evt.id}
                            style={[
                              styles.allDayCapsule,
                              {
                                backgroundColor: evt.color_bg,
                                borderColor: evt.color_border,
                              },
                            ]}
                            onPress={() => openEventDetails(evt)}
                          >
                            <Text
                              style={[
                                styles.allDayCapsuleText,
                                { color: evt.color_text },
                              ]}
                              numberOfLines={1}
                            >
                              {evt.title}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })}
                </View>

                {/* Hourly Grid */}
                <ScrollView
                  style={styles.gridScrollView}
                  showsVerticalScrollIndicator={true}
                >
                  <View style={styles.hoursGridWrapper}>
                    {HOURS.map((hour) => {
                      const hourFormatted =
                        hour === 12
                          ? '12 PM'
                          : hour > 12
                          ? `${hour - 12} PM`
                          : `${hour} AM`;

                      return (
                        <View key={hour} style={styles.hourRow}>
                          <View style={styles.hourLabelBox}>
                            <Text style={styles.hourLabel}>{hourFormatted}</Text>
                          </View>
                          {weekDays.map((dayDate, colIdx) => (
                            <TouchableOpacity
                              key={colIdx}
                              style={styles.hourCell}
                              onPress={() => handleCreateNew(dayDate, hour)}
                              activeOpacity={0.7}
                            />
                          ))}
                        </View>
                      );
                    })}

                    {timeEvents.map((evt) => {
                      const evtStart = new Date(evt.start_time);
                      const evtEnd = new Date(evt.end_time);

                      const dayIndex = weekDays.findIndex(
                        (d) =>
                          d.getDate() === evtStart.getDate() &&
                          d.getMonth() === evtStart.getMonth() &&
                          d.getFullYear() === evtStart.getFullYear()
                      );

                      if (dayIndex === -1) return null;

                      const startHourFloat =
                        evtStart.getHours() + evtStart.getMinutes() / 60;
                      const endHourFloat =
                        evtEnd.getHours() + evtEnd.getMinutes() / 60;
                      const durationHours = Math.max(
                        0.5,
                        endHourFloat - startHourFloat
                      );

                      const topPos = (startHourFloat - 8) * 80;
                      const heightPos = Math.max(38, durationHours * 80 - 4);

                      return (
                        <TouchableOpacity
                          key={evt.id}
                          style={[
                            styles.eventBlock,
                            {
                              top: topPos + 2,
                              height: heightPos,
                              left: `${8.5 + dayIndex * 13.0}%`,
                              width: '12.3%',
                              backgroundColor: evt.color_bg,
                              borderColor: evt.color_border,
                            },
                          ]}
                          onPress={() => openEventDetails(evt)}
                          activeOpacity={0.85}
                        >
                          <Text
                            style={[
                              styles.eventTitle,
                              { color: evt.color_text },
                            ]}
                            numberOfLines={1}
                          >
                            {evt.title}
                          </Text>
                          <Text
                            style={[
                              styles.eventTime,
                              { color: evt.color_text },
                            ]}
                            numberOfLines={1}
                          >
                            {`${
                              evtStart.getHours() > 12
                                ? evtStart.getHours() - 12
                                : evtStart.getHours()
                            } - ${
                              evtEnd.getHours() > 12
                                ? evtEnd.getHours() - 12
                                : evtEnd.getHours()
                            } ${evtEnd.getHours() >= 12 ? 'PM' : 'AM'}`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            </ScrollView>
          )}
        </View>
      ) : (
        /* DESKTOP METIS SAAS GRID */
        <View style={styles.mainLayout}>
          <ScrollView
            horizontal={false}
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            <View style={styles.gridContainer}>
              {/* Day Headers Row */}
              <View style={styles.daysHeaderRow}>
                <View style={styles.timezoneBox}>
                  <Text style={styles.timezoneText}>UTC +5:30</Text>
                </View>

                {weekDays.map((dayDate, idx) => {
                  const isToday =
                    dayDate.getDate() === now.getDate() &&
                    dayDate.getMonth() === now.getMonth() &&
                    dayDate.getFullYear() === now.getFullYear();

                  return (
                    <View
                      key={idx}
                      style={[
                        styles.dayHeaderCol,
                        isToday && styles.dayHeaderColToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayHeaderText,
                          isToday && styles.dayHeaderTextToday,
                        ]}
                      >
                        {DAYS_SHORT[dayDate.getDay()]} {dayDate.getDate()}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* All Day Row */}
              <View style={styles.allDayRow}>
                <View style={styles.allDayLabelBox}>
                  <Text style={styles.allDayLabel}>All day</Text>
                </View>

                {weekDays.map((dayDate, idx) => {
                  const dayAllDayEvents = allDayEvents.filter((e) => {
                    const eventDate = new Date(e.start_time);
                    return (
                      eventDate.getDate() === dayDate.getDate() &&
                      eventDate.getMonth() === dayDate.getMonth()
                    );
                  });

                  return (
                    <View key={idx} style={styles.allDayCol}>
                      {dayAllDayEvents.map((evt) => (
                        <TouchableOpacity
                          key={evt.id}
                          style={[
                            styles.allDayCapsule,
                            {
                              backgroundColor: evt.color_bg,
                              borderColor: evt.color_border,
                            },
                          ]}
                          onPress={() => openEventDetails(evt)}
                        >
                          <Text
                            style={[
                              styles.allDayCapsuleText,
                              { color: evt.color_text },
                            ]}
                            numberOfLines={1}
                          >
                            {evt.title}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                })}
              </View>

              {/* Hourly Scrollable Grid */}
              <ScrollView
                style={styles.gridScrollView}
                showsVerticalScrollIndicator={true}
              >
                <View style={styles.hoursGridWrapper}>
                  {HOURS.map((hour) => {
                    const hourFormatted =
                      hour === 12
                        ? '12 PM'
                        : hour > 12
                        ? `${hour - 12} PM`
                        : `${hour} AM`;

                    return (
                      <View key={hour} style={styles.hourRow}>
                        <View style={styles.hourLabelBox}>
                          <Text style={styles.hourLabel}>{hourFormatted}</Text>
                        </View>
                        {weekDays.map((dayDate, colIdx) => (
                          <TouchableOpacity
                            key={colIdx}
                            style={styles.hourCell}
                            onPress={() => handleCreateNew(dayDate, hour)}
                            activeOpacity={0.7}
                          />
                        ))}
                      </View>
                    );
                  })}

                  {isCurrentWeek &&
                    currentMinutesOffset >= 0 &&
                    currentMinutesOffset <= HOURS.length * 60 && (
                      <View
                        style={[
                          styles.currentTimeLine,
                          { top: currentLineTop },
                        ]}
                      >
                        <View style={styles.currentTimeBadge}>
                          <Text style={styles.currentTimeBadgeText}>
                            {now.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                        <View style={styles.currentTimeBar} />
                      </View>
                    )}

                  {timeEvents.map((evt) => {
                    const evtStart = new Date(evt.start_time);
                    const evtEnd = new Date(evt.end_time);

                    const dayIndex = weekDays.findIndex(
                      (d) =>
                        d.getDate() === evtStart.getDate() &&
                        d.getMonth() === evtStart.getMonth() &&
                        d.getFullYear() === evtStart.getFullYear()
                    );

                    if (dayIndex === -1) return null;

                    const startHourFloat =
                      evtStart.getHours() + evtStart.getMinutes() / 60;
                    const endHourFloat =
                      evtEnd.getHours() + evtEnd.getMinutes() / 60;
                    const durationHours = Math.max(
                      0.5,
                      endHourFloat - startHourFloat
                    );

                    const topPos = (startHourFloat - 8) * 80;
                    const heightPos = Math.max(38, durationHours * 80 - 4);

                    return (
                      <TouchableOpacity
                        key={evt.id}
                        style={[
                          styles.eventBlock,
                          {
                            top: topPos + 2,
                            height: heightPos,
                            left: `${8.5 + dayIndex * 13.0}%`,
                            width: '12.3%',
                            backgroundColor: evt.color_bg,
                            borderColor: evt.color_border,
                          },
                        ]}
                        onPress={() => openEventDetails(evt)}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.eventTitle,
                            { color: evt.color_text },
                          ]}
                          numberOfLines={1}
                        >
                          {evt.title}
                        </Text>
                        <Text
                          style={[
                            styles.eventTime,
                            { color: evt.color_text },
                          ]}
                          numberOfLines={1}
                        >
                          {`${
                            evtStart.getHours() > 12
                              ? evtStart.getHours() - 12
                              : evtStart.getHours()
                          } - ${
                            evtEnd.getHours() > 12
                              ? evtEnd.getHours() - 12
                              : evtEnd.getHours()
                          } ${evtEnd.getHours() >= 12 ? 'PM' : 'AM'}`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </ScrollView>

          {/* Desktop Inline Drawer */}
          {isDrawerOpen && (
            <View style={styles.rightDrawer}>{renderDrawerContent()}</View>
          )}
        </View>
      )}

      {/* Mobile Event Editor Modal */}
      {isMobile && (
        <Modal
          visible={isDrawerOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsDrawerOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => setIsDrawerOpen(false)}>
              <View style={styles.modalOverlay} />
            </TouchableWithoutFeedback>
            <View style={styles.modalSheetContainer}>
              <View style={styles.modalSheetHeader}>
                <Text style={styles.modalSheetTitle}>
                  {isNewEvent ? 'New Team Event' : 'Edit Event'}
                </Text>
                <TouchableOpacity
                  onPress={() => setIsDrawerOpen(false)}
                  style={styles.modalCloseBtn}
                >
                  <X size={18} color="#64748B" />
                </TouchableOpacity>
              </View>
              {renderDrawerContent()}
            </View>
          </View>
        </Modal>
      )}

      {/* 4. FILTER MODAL */}
      {showFilterModal && (
        <View style={styles.filterPopup}>
          <View style={styles.filterPopupHeader}>
            <Text style={styles.filterPopupTitle}>Filter Calendar Events</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <X size={16} color={ADMIN_COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.filterSearchInput}
            value={filterSearch}
            onChangeText={setFilterSearch}
            placeholder="Search by title or location..."
            placeholderTextColor={ADMIN_COLORS.textMuted}
          />

          <Text style={styles.filterSubheader}>Filter by Color Code</Text>
          <View style={styles.filterColorsRow}>
            <TouchableOpacity
              style={[styles.filterColorChip, filterColor === 'all' && styles.filterColorChipActive]}
              onPress={() => setFilterColor('all')}
            >
              <Text style={[styles.filterColorChipText, filterColor === 'all' && styles.filterColorChipTextActive]}>
                All Colors
              </Text>
            </TouchableOpacity>

            {Object.keys(CALENDAR_COLOR_PALETTES).map((colKey) => (
              <TouchableOpacity
                key={colKey}
                style={[
                  styles.filterColorChip,
                  filterColor === colKey && styles.filterColorChipActive,
                ]}
                onPress={() => setFilterColor(colKey as CalendarColorId)}
              >
                <View
                  style={[
                    styles.filterDot,
                    { backgroundColor: CALENDAR_COLOR_PALETTES[colKey as CalendarColorId].dot },
                  ]}
                />
                <Text style={styles.filterColorChipText}>
                  {CALENDAR_COLOR_PALETTES[colKey as CalendarColorId].label.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// STYLES (METIS LIGHT SAAS CALENDAR DESIGN)
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  headerMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  headerLeftMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
    width: '100%',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRightMobile: {
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  navButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  todayButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  todayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 10000,
  },
  modalSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  monthNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  monthLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginRight: 4,
  },
  arrowButton: {
    padding: 4,
  },
  viewSelector: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
  },
  viewTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  viewTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  viewTabTextActive: {
    fontWeight: '600',
    color: '#0F172A',
  },
  actionIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  actionIconBtnActive: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: ADMIN_COLORS.textSecondary,
  },
  newEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: ADMIN_RADII.button,
    backgroundColor: ADMIN_COLORS.emeraldPrimary,
  },
  newEventBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  toastSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ADMIN_COLORS.statusSuccessBg,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.statusSuccessBorder,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  toastSuccessText: {
    fontSize: 13,
    fontWeight: '600',
    color: ADMIN_COLORS.statusSuccessText,
  },

  // Main Layout Grid
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  gridContainer: {
    flex: 1,
    backgroundColor: ADMIN_COLORS.bgSurface,
  },
  daysHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.border,
    backgroundColor: ADMIN_COLORS.bgCanvas,
  },
  timezoneBox: {
    width: 65,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: ADMIN_COLORS.border,
  },
  timezoneText: {
    fontSize: 11,
    fontWeight: '600',
    color: ADMIN_COLORS.textMuted,
  },
  dayHeaderCol: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: ADMIN_COLORS.border,
  },
  dayHeaderColToday: {
    backgroundColor: ADMIN_COLORS.bgActive,
    borderBottomWidth: 2,
    borderBottomColor: ADMIN_COLORS.emeraldPrimary,
  },
  dayHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: ADMIN_COLORS.textSecondary,
  },
  dayHeaderTextToday: {
    color: ADMIN_COLORS.emeraldDark,
    fontWeight: '700',
  },

  // All Day Row
  allDayRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.border,
    backgroundColor: ADMIN_COLORS.bgSurface,
    minHeight: 44,
  },
  allDayLabelBox: {
    width: 65,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: ADMIN_COLORS.border,
  },
  allDayLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: ADMIN_COLORS.textMuted,
  },
  allDayCol: {
    flex: 1,
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: ADMIN_COLORS.border,
    gap: 4,
  },
  allDayCapsule: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ADMIN_RADII.badge,
    borderWidth: 1,
  },
  allDayCapsuleText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Hourly Scrollable Area
  gridScrollView: {
    flex: 1,
  },
  hoursGridWrapper: {
    position: 'relative',
  },
  hourRow: {
    flexDirection: 'row',
    height: 80,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.borderSubtle,
  },
  hourLabelBox: {
    width: 65,
    paddingTop: 8,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: ADMIN_COLORS.border,
  },
  hourLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: ADMIN_COLORS.textMuted,
  },
  hourCell: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: ADMIN_COLORS.borderSubtle,
  },

  // Current Live Time Marker Line
  currentTimeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  currentTimeBadge: {
    backgroundColor: ADMIN_COLORS.emeraldPrimary,
    borderRadius: ADMIN_RADII.badge,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    zIndex: 11,
  },
  currentTimeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  currentTimeBar: {
    flex: 1,
    height: 2,
    backgroundColor: ADMIN_COLORS.emeraldPrimary,
  },

  // Event Blocks in Grid
  eventBlock: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    overflow: 'hidden',
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.85,
  },

  // 3. Right-Hand Side Drawer Inspector
  rightDrawer: {
    width: 340,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
  },
  drawerContent: {
    padding: 20,
    gap: 16,
  },
  drawerSection: {
    gap: 8,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 6,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fieldInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  timePillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeInput: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  timeDash: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  togglesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleBtnActive: {},
  toggleCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  toggleCircleActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#4F46E5',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  addParticipantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addParticipantBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  participantsList: {
    gap: 6,
    marginTop: 4,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
  },
  participantRowActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
  },
  participantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4338CA',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  participantRole: {
    fontSize: 10,
    color: '#64748B',
  },
  descSection: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  descInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    minHeight: 50,
    textAlignVertical: 'top',
  },
  remindersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  remindersBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  colorPaletteSection: {
    gap: 8,
  },
  paletteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  colorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colorCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircleSelected: {
    borderWidth: 2,
    borderColor: '#0F172A',
    transform: [{ scale: 1.15 }],
  },
  drawerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  deleteBtn: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#4F46E5', // Indigo 600
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Filter Popover
  filterPopup: {
    position: 'absolute',
    top: 70,
    right: 180,
    width: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 50,
    gap: 12,
  },
  filterPopupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterPopupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  filterSearchInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterSubheader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterColorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterColorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  filterColorChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  filterColorChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#334155',
  },
  filterColorChipTextActive: {
    fontWeight: '700',
    color: '#2563EB',
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Mobile Specific Calendar Styles
  mobileCalendarContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mobileDayStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 4,
  },
  mobileDayPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  mobileDayPillSelected: {
    backgroundColor: '#ECFDF5', // Soft emerald
  },
  mobileDayPillToday: {},
  mobileDayName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  mobileDayNameSelected: {
    color: '#059669',
    fontWeight: '700',
  },
  mobileDayNameToday: {
    color: '#059669',
  },
  mobileDateCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  mobileDateCircleSelected: {
    backgroundColor: '#059669',
  },
  mobileDateCircleToday: {
    borderWidth: 1.5,
    borderColor: '#059669',
  },
  mobileDateNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  mobileDateNumberSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  mobileDateNumberToday: {
    color: '#059669',
    fontWeight: '700',
  },
  mobileEventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#059669',
    marginTop: 3,
  },
  mobileSubModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  mobileSubModeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  mobileSubModeTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  mobileSubModeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  mobileSubModeTabText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  mobileSubModeTabTextActive: {
    fontWeight: '700',
    color: '#0F172A',
  },
  mobileAddForDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  mobileAddForDayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  mobileAgendaScroll: {
    flex: 1,
  },
  mobileAgendaContent: {
    padding: 14,
    gap: 12,
    paddingBottom: 40,
  },
  mobileAgendaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  mobileAgendaDateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  mobileAgendaCountBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  mobileAgendaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  mobileCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mobileTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  mobileTimePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  mobileCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  mobileCategoryText: {
    fontSize: 10,
    fontWeight: '700',
  },
  mobileCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  mobileCardDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  mobileCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  mobileMeetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  mobileMeetText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  mobileLocBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mobileLocText: {
    fontSize: 11,
    color: '#64748B',
  },
  mobileAvatarsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  mobileMiniAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  mobileMiniAvatarText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mobileExtraAvatars: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 4,
  },
  mobileEmptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    gap: 8,
    marginTop: 10,
  },
  mobileEmptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  mobileEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  mobileEmptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  mobileEmptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  mobileEmptyAddBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
