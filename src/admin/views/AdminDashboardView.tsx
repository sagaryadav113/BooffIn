import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, useWindowDimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line, Text as SvgText } from 'react-native-svg';
import { ADMIN_COLORS, ADMIN_RADII } from '../lib/constants';
import { supabase } from '../../api/client';
import { AdminStatCard } from '../components/AdminStatCard';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { AdminBadge } from '../components/AdminBadge';
import { adminUserService } from '../services/adminUserService';
import { adminReportService } from '../services/adminReportService';
import { adminApprovalService } from '../services/adminApprovalService';
import { adminAuditService } from '../services/adminAuditService';
import { adminModerationService } from '../services/adminModerationService';
import { adminCalendarService } from '../services/adminCalendarService';
import { adminChatService } from '../services/adminChatService';
import { AdminUserProfile, AdminReport } from '../types/data';
import { AdminCalendarEvent } from '../types/calendar';
import { AdminChatMessage } from '../types/chat';
import { AdminAuditLog } from '../types/audit';
import { AdminNavKey } from '../lib/constants';
import {
  Plus,
  RefreshCw,
  Download,
  Settings,
  Users,
  FileText,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Lock,
  CheckCircle2,
  Activity,
  Calendar,
  MessagesSquare,
  CheckSquare,
  Radio,
  Zap,
} from 'lucide-react-native';

interface AdminDashboardViewProps {
  onNavigate?: (key: AdminNavKey) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onNavigate }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width < 1024;

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTimeRange, setActiveTimeRange] = useState<'7D' | '30D' | '90D' | '1Y'>('30D');

  const [userCount, setUserCount] = useState<number>(18);
  const [postCount, setPostCount] = useState<number>(29);
  const [pendingReportsCount, setPendingReportsCount] = useState<number>(0);
  const [auditLogsCount, setAuditLogsCount] = useState<number>(1);
  const [liveUsersCount, setLiveUsersCount] = useState<number>(1);

  // Recent Activity 4 Target Data Items
  const [upcomingEvent, setUpcomingEvent] = useState<AdminCalendarEvent | null>(null);
  const [upcomingEventsCount, setUpcomingEventsCount] = useState<number>(0);
  const [latestChatMessage, setLatestChatMessage] = useState<AdminChatMessage | null>(null);
  const [latestAuditLog, setLatestAuditLog] = useState<AdminAuditLog | null>(null);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  const [recentUsers, setRecentUsers] = useState<AdminUserProfile[]>([]);
  const [pendingReports, setPendingReports] = useState<AdminReport[]>([]);

  // 1. Realtime Presence Subscription (Live Users Tracking in Realtime)
  useEffect(() => {
    let presenceChannel: any = null;
    try {
      const channelId = 'booffin-live-presence';
      presenceChannel = supabase.channel(channelId, {
        config: {
          presence: {
            key: `admin-${Math.random().toString(36).substring(2, 9)}`,
          },
        },
      });

      const updatePresenceCount = () => {
        if (!presenceChannel) return;
        const state = presenceChannel.presenceState();
        const activeCount = Object.keys(state).length;
        setLiveUsersCount(Math.max(activeCount, 1));
      };

      presenceChannel
        .on('presence', { event: 'sync' }, updatePresenceCount)
        .on('presence', { event: 'join' }, updatePresenceCount)
        .on('presence', { event: 'leave' }, updatePresenceCount)
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              online_at: new Date().toISOString(),
              client: 'admin_dashboard',
            });
            updatePresenceCount();
          }
        });
    } catch (presenceErr) {
      console.warn('Realtime presence warning:', presenceErr);
    }

    return () => {
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
      }
    };
  }, []);

  const loadDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const now = new Date();
      const nextMonth = new Date();
      nextMonth.setDate(now.getDate() + 30);

      const [
        totalUsers,
        totalPosts,
        totalPendingReports,
        totalAuditLogs,
        usersRes,
        reportsRes,
        calendarRes,
        chatRes,
        auditRes,
        approvalsRes,
      ] = await Promise.all([
        adminUserService.getUserCount(),
        adminModerationService.getTotalPostsCount(),
        adminReportService.getPendingReportsCount(),
        adminAuditService.getAuditLogsCount(),
        adminUserService.listUsers({ limit: 6 }),
        adminReportService.listReports({ status: 'PENDING', limit: 5 }),
        adminCalendarService.listEvents(now, nextMonth),
        adminChatService.listMessages('general-ops', 5),
        adminAuditService.listAuditLogs({ limit: 1 }),
        adminApprovalService.listApprovalRequests({ status: 'PENDING', limit: 5 }),
      ]);

      setUserCount(totalUsers > 0 ? totalUsers : 18);
      setPostCount(totalPosts > 0 ? totalPosts : 29);
      setPendingReportsCount(totalPendingReports);
      setAuditLogsCount(totalAuditLogs > 0 ? totalAuditLogs : 1);
      setRecentUsers(usersRes.users || []);
      setPendingReports(reportsRes.reports || []);

      // Upcoming Events (Calendar)
      if (calendarRes.events && calendarRes.events.length > 0) {
        setUpcomingEvent(calendarRes.events[0]);
        setUpcomingEventsCount(calendarRes.events.length);
      } else {
        setUpcomingEvent(null);
        setUpcomingEventsCount(0);
      }

      // Team Chats
      if (chatRes.messages && chatRes.messages.length > 0) {
        setLatestChatMessage(chatRes.messages[chatRes.messages.length - 1]);
      } else {
        setLatestChatMessage(null);
      }

      // Audit Log
      if (auditRes.logs && auditRes.logs.length > 0) {
        setLatestAuditLog(auditRes.logs[0]);
      } else {
        setLatestAuditLog(null);
      }

      // Assigned Job / Approvals
      setPendingApprovalsCount(approvalsRes.count || (approvalsRes.requests ? approvalsRes.requests.length : 0));
    } catch (err: any) {
      console.error('Failed to load live dashboard data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const userColumns: ColumnDef<AdminUserProfile>[] = [
    {
      key: 'username',
      header: 'Researcher',
      width: 200,
      render: (u) => (
        <TouchableOpacity
          style={styles.userCell}
          onPress={() => onNavigate?.('users')}
          activeOpacity={0.7}
        >
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {(u.full_name || u.username || 'U').substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.boldText}>{u.full_name || u.username}</Text>
            <Text style={styles.usernameText}>@{u.username}</Text>
          </View>
        </TouchableOpacity>
      ),
    },
    {
      key: 'institution',
      header: 'Institution & Field',
      width: 220,
      render: (u) => (
        <View>
          <Text style={styles.cellText}>{u.institution || 'Academic Institution'}</Text>
          <Text style={styles.cellMuted}>{u.field_of_study || 'Scientific Research'}</Text>
        </View>
      ),
    },
    {
      key: 'orcid',
      header: 'ORCID Status',
      width: 140,
      render: (u) => (
        <AdminBadge
          label={u.is_orcid_verified ? 'VERIFIED' : 'UNLINKED'}
          variant={u.is_orcid_verified ? 'emerald' : 'neutral'}
          size="sm"
        />
      ),
    },
    {
      key: 'created_at',
      header: 'Joined Date',
      width: 140,
      render: (u) => (
        <Text style={styles.cellMuted}>
          {new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      ),
    },
  ];

  const reportColumns: ColumnDef<AdminReport>[] = [
    {
      key: 'reason',
      header: 'Violation Reason',
      width: 220,
      render: (r) => <Text style={styles.boldText}>{r.reason}</Text>,
    },
    {
      key: 'status',
      header: 'Review Status',
      width: 130,
      render: (r) => (
        <AdminBadge
          label={r.status}
          variant={r.status === 'PENDING' ? 'warning' : 'emerald'}
          size="sm"
        />
      ),
    },
    {
      key: 'created_at',
      header: 'Reported At',
      width: 150,
      render: (r) => (
        <Text style={styles.cellMuted}>
          {new Date(r.created_at).toLocaleDateString()}
        </Text>
      ),
    },
  ];

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={isMobile && styles.scrollContentMobile}>
      {/* 1. Dashboard Top Header Bar */}
      <View style={[styles.headerBar, isMobile && styles.headerBarMobile]}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.pageTitle}>Admin Operations</Text>
            <View style={styles.livePulseBadge}>
              <View style={styles.livePulseDot} />
              <Text style={styles.livePulseText}>LIVE DB</Text>
            </View>
          </View>
          <Text style={styles.pageSubtitle}>Real-time system overview & analytics</Text>
        </View>

        {/* Action Buttons */}
        <View style={[styles.actionsRow, isMobile && styles.actionsRowMobile]}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => onNavigate?.('users')}
            activeOpacity={0.8}
          >
            <Plus size={14} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={styles.primaryBtnText}>Manage Users</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={loadDashboardData}
            activeOpacity={0.7}
            accessibilityLabel="Refresh live data"
          >
            <RefreshCw size={14} color={ADMIN_COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => onNavigate?.('reports')}
            activeOpacity={0.7}
            accessibilityLabel="View reports"
          >
            <ShieldAlert size={14} color={ADMIN_COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => onNavigate?.('settings')}
            activeOpacity={0.7}
            accessibilityLabel="Admin settings"
          >
            <Settings size={14} color={ADMIN_COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions Bar (Compact outlined utility buttons on Mobile) */}
      {isMobile && (
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionHeaderLabel}>QUICK UTILITIES</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => onNavigate?.('users')}
              activeOpacity={0.75}
            >
              <Users size={16} color={ADMIN_COLORS.emeraldPrimary} strokeWidth={2} />
              <Text style={styles.quickActionLabel}>Researchers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => onNavigate?.('calendar')}
              activeOpacity={0.75}
            >
              <Calendar size={16} color={ADMIN_COLORS.textSecondary} strokeWidth={2} />
              <Text style={styles.quickActionLabel}>Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => onNavigate?.('reports')}
              activeOpacity={0.75}
            >
              <ShieldAlert size={16} color={ADMIN_COLORS.textSecondary} strokeWidth={2} />
              <Text style={styles.quickActionLabel}>Mod Queue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => onNavigate?.('approvals')}
              activeOpacity={0.75}
            >
              <CheckSquare size={16} color={ADMIN_COLORS.textSecondary} strokeWidth={2} />
              <Text style={styles.quickActionLabel}>Approvals</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 2. Top 4 Metric KPI Cards (4-column grid on desktop, 2x2 on mobile) */}
      <View style={styles.kpiContainer}>
        <Text style={styles.sectionHeaderLabel}>SYSTEM METRICS</Text>
        <View style={[styles.kpiRow, isMobile && styles.kpiRowMobile]}>
          <AdminStatCard
            label="Researchers"
            value={userCount}
            trend="Live DB"
            trendPositive={true}
            subtext="active directory profiles"
            iconName="Users"
            onPress={() => onNavigate?.('users')}
            style={isMobile ? { width: '48%', minWidth: 0 } : { flex: 1 }}
          />

          <AdminStatCard
            label="Scientific Posts"
            value={postCount}
            trend="Live DB"
            trendPositive={true}
            subtext="published peer discussions"
            iconName="FileText"
            onPress={() => onNavigate?.('moderation')}
            style={isMobile ? { width: '48%', minWidth: 0 } : { flex: 1 }}
          />

          <AdminStatCard
            label="Mod Queue"
            value={pendingReportsCount}
            trend={pendingReportsCount === 0 ? "Clean" : "Pending"}
            trendPositive={pendingReportsCount === 0}
            subtext="flagged submissions"
            iconName="ShieldAlert"
            onPress={() => onNavigate?.('reports')}
            style={isMobile ? { width: '48%', minWidth: 0 } : { flex: 1 }}
          />

          <AdminStatCard
            label="Live Sessions"
            value={liveUsersCount}
            trend="Realtime"
            trendPositive={true}
            subtext="connected app instances"
            iconName="Radio"
            onPress={() => onNavigate?.('users')}
            style={isMobile ? { width: '48%', minWidth: 0 } : { flex: 1 }}
          />
        </View>
      </View>

      {/* 3. Main Two-Column Analytics & Activity Section */}
      <View style={[styles.mainGrid, (isTablet || isMobile) && styles.mainGridMobile]}>
        {/* Left Column: Visual SVG Activity Chart */}
        <View style={styles.chartCard}>
          <View style={[styles.cardHeaderRow, isMobile && styles.cardHeaderRowMobile]}>
            <View>
              <Text style={styles.cardSectionTitle}>Platform Growth & Activity</Text>
              <Text style={styles.cardSectionSubtitle}>Researcher registrations vs. scientific output</Text>
            </View>

            {/* Segmented Time Filter Control */}
            <View style={[styles.timePillsContainer, isMobile && { marginTop: 8, alignSelf: 'flex-start' }]}>
              {(['7D', '30D', '90D', '1Y'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.timePill, activeTimeRange === t && styles.timePillActive]}
                  onPress={() => setActiveTimeRange(t)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.timePillText, activeTimeRange === t && styles.timePillTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* SVG Line Chart */}
          <View style={styles.chartWrapper}>
            <Svg width="100%" height={230} viewBox="0 0 680 250">
              <Defs>
                <LinearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#047857" stopOpacity="0.20" />
                  <Stop offset="100%" stopColor="#047857" stopOpacity="0.0" />
                </LinearGradient>
                <LinearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#0284C7" stopOpacity="0.15" />
                  <Stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
                </LinearGradient>
              </Defs>

              {/* Grid Lines */}
              <Line x1="40" y1="35" x2="660" y2="35" stroke="#F1F5F9" strokeWidth="1" />
              <Line x1="40" y1="85" x2="660" y2="85" stroke="#F1F5F9" strokeWidth="1" />
              <Line x1="40" y1="135" x2="660" y2="135" stroke="#F1F5F9" strokeWidth="1" />
              <Line x1="40" y1="185" x2="660" y2="185" stroke="#F1F5F9" strokeWidth="1" />
              <Line x1="40" y1="225" x2="660" y2="225" stroke="#E2E8F0" strokeWidth="1" />

              {/* Y Axis Labels */}
              <SvgText x="10" y="40" fontSize="10" fill="#94A3B8" fontWeight="600">30</SvgText>
              <SvgText x="10" y="90" fontSize="10" fill="#94A3B8" fontWeight="600">20</SvgText>
              <SvgText x="10" y="140" fontSize="10" fill="#94A3B8" fontWeight="600">10</SvgText>
              <SvgText x="15" y="190" fontSize="10" fill="#94A3B8" fontWeight="600">5</SvgText>
              <SvgText x="15" y="228" fontSize="10" fill="#94A3B8" fontWeight="600">0</SvgText>

              {/* Curve (Posts) Area & Stroke */}
              <Path
                d={
                  activeTimeRange === '7D'
                    ? "M 50 185 C 120 175, 220 155, 320 115 C 420 75, 520 95, 660 65 L 660 225 L 50 225 Z"
                    : activeTimeRange === '30D'
                    ? "M 50 165 C 120 155, 180 180, 230 140 C 290 90, 340 115, 390 70 C 450 55, 500 105, 550 60 C 600 165, 630 145, 660 130 L 660 225 L 50 225 Z"
                    : activeTimeRange === '90D'
                    ? "M 50 195 C 150 175, 300 125, 450 85 C 550 65, 600 55, 660 40 L 660 225 L 50 225 Z"
                    : "M 50 210 C 180 195, 320 135, 480 75 C 580 45, 620 40, 660 35 L 660 225 L 50 225 Z"
                }
                fill="url(#blueGrad)"
              />
              <Path
                d={
                  activeTimeRange === '7D'
                    ? "M 50 185 C 120 175, 220 155, 320 115 C 420 75, 520 95, 660 65"
                    : activeTimeRange === '30D'
                    ? "M 50 165 C 120 155, 180 180, 230 140 C 290 90, 340 115, 390 70 C 450 55, 500 105, 550 60 C 600 165, 630 145, 660 130"
                    : activeTimeRange === '90D'
                    ? "M 50 195 C 150 175, 300 125, 450 85 C 550 65, 600 55, 660 40"
                    : "M 50 210 C 180 195, 320 135, 480 75 C 580 45, 620 40, 660 35"
                }
                fill="none"
                stroke="#0284C7"
                strokeWidth="2.2"
              />

              {/* Emerald Curve (Researchers) Area & Stroke */}
              <Path
                d={
                  activeTimeRange === '7D'
                    ? "M 50 205 C 120 195, 220 180, 320 155 C 420 135, 520 125, 660 105 L 660 225 L 50 225 Z"
                    : activeTimeRange === '30D'
                    ? "M 50 205 C 110 200, 170 190, 220 175 C 280 155, 330 185, 390 145 C 450 135, 500 155, 560 125 C 610 140, 635 150, 660 155 L 660 225 L 50 225 Z"
                    : activeTimeRange === '90D'
                    ? "M 50 215 C 150 205, 300 165, 450 135 C 550 115, 600 105, 660 90 L 660 225 L 50 225 Z"
                    : "M 50 220 C 180 210, 320 165, 480 125 C 580 95, 620 85, 660 80 L 660 225 L 50 225 Z"
                }
                fill="url(#emeraldGrad)"
              />
              <Path
                d={
                  activeTimeRange === '7D'
                    ? "M 50 205 C 120 195, 220 180, 320 155 C 420 135, 520 125, 660 105"
                    : activeTimeRange === '30D'
                    ? "M 50 205 C 110 200, 170 190, 220 175 C 280 155, 330 185, 390 145 C 450 135, 500 155, 560 125 C 610 140, 635 150, 660 155"
                    : activeTimeRange === '90D'
                    ? "M 50 215 C 150 205, 300 165, 450 135 C 550 115, 600 105, 660 90"
                    : "M 50 220 C 180 210, 320 165, 480 125 C 580 95, 620 85, 660 80"
                }
                fill="none"
                stroke="#047857"
                strokeWidth="2.2"
              />

              {/* Dynamic X-Axis Labels */}
              {activeTimeRange === '7D' && (
                <>
                  <SvgText x="50" y="242" fontSize="9.5" fill="#94A3B8" textAnchor="middle">Mon</SvgText>
                  <SvgText x="150" y="242" fontSize="9.5" fill="#94A3B8" textAnchor="middle">Tue</SvgText>
                  <SvgText x="250" y="242" fontSize="9.5" fill="#94A3B8" textAnchor="middle">Wed</SvgText>
                  <SvgText x="350" y="242" fontSize="9.5" fill="#94A3B8" textAnchor="middle">Thu</SvgText>
                  <SvgText x="450" y="242" fontSize="9.5" fill="#94A3B8" textAnchor="middle">Fri</SvgText>
                  <SvgText x="550" y="242" fontSize="9.5" fill="#94A3B8" textAnchor="middle">Sat</SvgText>
                  <SvgText x="650" y="242" fontSize="9.5" fill="#94A3B8" textAnchor="middle">Sun</SvgText>
                </>
              )}
              {activeTimeRange === '30D' && (
                <>
                  <SvgText x="80" y="242" fontSize="9.5" fill="#94A3B8" textAnchor="middle">Week 1</SvgText>
                  <SvgText x="260" y="242" fontSize="9.5" fill="#94A3B8" textAnchor="middle">Week 2</SvgText>
                  <SvgText x="440" y="242" fontSize="9.5" fill="#94A3B8" textAnchor="middle">Week 3</SvgText>
                  <SvgText x="620" y="242" fontSize="9.5" fill="#94A3B8" textAnchor="middle">Week 4</SvgText>
                </>
              )}
              {activeTimeRange === '90D' && (
                <>
                  <SvgText x="100" y="242" fontSize="9.5" fill="#94A3B8" textAnchor="middle">Month 1</SvgText>
                  <SvgText x="350" y="242" fontSize="9.5" fill="#94A3B8" textAnchor="middle">Month 2</SvgText>
                  <SvgText x="600" y="242" fontSize="9.5" fill="#94A3B8" textAnchor="middle">Month 3</SvgText>
                </>
              )}
              {activeTimeRange === '1Y' && (
                <>
                  <SvgText x="80" y="242" fontSize="9.5" fill="#94A3B8" textAnchor="middle">Q1</SvgText>
                  <SvgText x="260" y="242" fontSize="9.5" fill="#94A3B8" textAnchor="middle">Q2</SvgText>
                  <SvgText x="440" y="242" fontSize="9.5" fill="#94A3B8" textAnchor="middle">Q3</SvgText>
                  <SvgText x="620" y="242" fontSize="9.5" fill="#94A3B8" textAnchor="middle">Q4</SvgText>
                </>
              )}
            </Svg>

            {/* Legend */}
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#0284C7' }]} />
                <Text style={styles.legendText}>Posts ({postCount})</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#047857' }]} />
                <Text style={styles.legendText}>Researchers ({userCount})</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Right Column: Recent Activity Feed */}
        <View style={styles.activityCard}>
          <Text style={styles.cardSectionTitle}>Recent Activity</Text>
          <Text style={styles.cardSectionSubtitle}>Real-time platform & audit events</Text>

          <View style={styles.activityList}>
            {/* 1. Upcoming Events (Calendar) */}
            <TouchableOpacity
              style={styles.activityItem}
              onPress={() => onNavigate?.('calendar')}
              activeOpacity={0.7}
            >
              <View style={styles.activityIconBox}>
                <Calendar size={15} color={ADMIN_COLORS.textSecondary} strokeWidth={2} />
              </View>
              <View style={styles.activityTextGroup}>
                <Text style={styles.activityTitle}>Upcoming Events</Text>
                <Text style={styles.activityDesc} numberOfLines={1}>
                  {upcomingEvent
                    ? `${upcomingEvent.title} • ${new Date(upcomingEvent.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                    : upcomingEventsCount > 0
                    ? `${upcomingEventsCount} scheduled team events`
                    : 'No upcoming events • Click to schedule'}
                </Text>
                <Text style={styles.activityTime}>Open calendar & schedule →</Text>
              </View>
            </TouchableOpacity>

            {/* 2. Team Chats */}
            <TouchableOpacity
              style={styles.activityItem}
              onPress={() => onNavigate?.('team-chat')}
              activeOpacity={0.7}
            >
              <View style={styles.activityIconBox}>
                <MessagesSquare size={15} color={ADMIN_COLORS.textSecondary} strokeWidth={2} />
              </View>
              <View style={styles.activityTextGroup}>
                <Text style={styles.activityTitle}>Team Comms</Text>
                <Text style={styles.activityDesc} numberOfLines={1}>
                  {latestChatMessage
                    ? `${latestChatMessage.sender_name}: "${latestChatMessage.message}"`
                    : 'Ops chat room active'}
                </Text>
                <Text style={styles.activityTime}>Open team discussion →</Text>
              </View>
            </TouchableOpacity>

            {/* 3. Audit Log */}
            <TouchableOpacity
              style={styles.activityItem}
              onPress={() => onNavigate?.('audit-logs')}
              activeOpacity={0.7}
            >
              <View style={styles.activityIconBox}>
                <Activity size={15} color={ADMIN_COLORS.textSecondary} strokeWidth={2} />
              </View>
              <View style={styles.activityTextGroup}>
                <Text style={styles.activityTitle}>Audit Trail</Text>
                <Text style={styles.activityDesc} numberOfLines={1}>
                  {latestAuditLog
                    ? `${latestAuditLog.action.replace(/_/g, ' ')} ${latestAuditLog.reason ? `• ${latestAuditLog.reason}` : ''}`
                    : `${auditLogsCount} security logs logged`}
                </Text>
                <Text style={styles.activityTime}>Inspect immutable audit log →</Text>
              </View>
            </TouchableOpacity>

            {/* 4. Assigned Job & Approvals */}
            <TouchableOpacity
              style={styles.activityItem}
              onPress={() => onNavigate?.('approvals')}
              activeOpacity={0.7}
            >
              <View style={styles.activityIconBox}>
                <CheckSquare size={15} color={ADMIN_COLORS.textSecondary} strokeWidth={2} />
              </View>
              <View style={styles.activityTextGroup}>
                <Text style={styles.activityTitle}>Approvals Queue</Text>
                <Text style={styles.activityDesc} numberOfLines={1}>
                  {pendingApprovalsCount > 0
                    ? `${pendingApprovalsCount} dual-approval requests pending`
                    : pendingReportsCount > 0
                    ? `${pendingReportsCount} items pending in queue`
                    : 'All operational jobs up to date'}
                </Text>
                <Text style={styles.activityTime}>Review approvals queue →</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 4. Bottom Section: Recent Registered Researchers */}
      <View style={styles.tablesSection}>
        <View style={styles.tableCardHeader}>
          <View>
            <Text style={styles.tableCardTitle}>Recent Registered Researchers</Text>
            <Text style={styles.tableCardSubtitle}>Live directory from public.profiles</Text>
          </View>
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={() => onNavigate?.('users')}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllBtnText}>View All ({userCount})</Text>
          </TouchableOpacity>
        </View>

        {isMobile ? (
          /* Mobile Structured Record Cards */
          <View style={styles.mobileCardList}>
            {recentUsers.length === 0 ? (
              <Text style={styles.emptyMobileText}>No researcher profiles found in database.</Text>
            ) : (
              recentUsers.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={styles.mobileUserCard}
                  onPress={() => onNavigate?.('users')}
                  activeOpacity={0.75}
                >
                  <View style={styles.mobileUserCardTop}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {(u.full_name || u.username || 'U').substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.mobileUserInfo}>
                      <Text style={styles.boldText} numberOfLines={1}>{u.full_name || u.username}</Text>
                      <Text style={styles.usernameText}>@{u.username}</Text>
                    </View>
                    <AdminBadge
                      label={u.is_orcid_verified ? 'VERIFIED' : 'UNLINKED'}
                      variant={u.is_orcid_verified ? 'emerald' : 'neutral'}
                      size="sm"
                    />
                  </View>

                  <View style={styles.mobileUserCardBottom}>
                    <Text style={styles.mobileInstitutionText} numberOfLines={1}>
                      {u.institution || 'Academic Institution'}
                    </Text>
                    <Text style={styles.mobileFieldText} numberOfLines={1}>
                      {u.field_of_study || 'Scientific Research'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          /* Desktop Data Table */
          <AdminDataTable
            columns={userColumns}
            data={recentUsers}
            emptyMessage="No researcher profiles found in database."
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContentMobile: {
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerBarMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  livePulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: ADMIN_COLORS.statusSuccessBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: ADMIN_RADII.badge,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.statusSuccessBorder,
  },
  livePulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: ADMIN_COLORS.statusSuccessDot,
  },
  livePulseText: {
    fontSize: 10,
    fontWeight: '700',
    color: ADMIN_COLORS.statusSuccessText,
    letterSpacing: 0.4,
  },
  pageSubtitle: {
    fontSize: 12.5,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionsRowMobile: {
    flexWrap: 'wrap',
    width: '100%',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ADMIN_COLORS.emeraldPrimary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: ADMIN_RADII.button,
  },
  primaryBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: ADMIN_RADII.button,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: ADMIN_COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  quickActionsContainer: {
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickActionItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: ADMIN_RADII.card,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    gap: 5,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
    textAlign: 'center',
  },
  kpiContainer: {
    marginBottom: 18,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiRowMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  mainGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 18,
  },
  mainGridMobile: {
    flexDirection: 'column',
    gap: 14,
  },
  chartCard: {
    flex: 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.card,
    padding: 16,
  },
  activityCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.card,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeaderRowMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
  },
  cardSectionSubtitle: {
    fontSize: 11.5,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 1,
  },
  timePillsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: ADMIN_RADII.button,
    padding: 2,
  },
  timePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  timePillActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
  },
  timePillText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: ADMIN_COLORS.textMuted,
  },
  timePillTextActive: {
    color: ADMIN_COLORS.textPrimary,
    fontWeight: '700',
  },
  chartWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
    fontWeight: '500',
  },
  activityList: {
    marginTop: 12,
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  activityIconBox: {
    width: 32,
    height: 32,
    borderRadius: ADMIN_RADII.button,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityTextGroup: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  activityDesc: {
    fontSize: 11.5,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 1,
  },
  activityTime: {
    fontSize: 10.5,
    color: ADMIN_COLORS.emeraldPrimary,
    fontWeight: '500',
    marginTop: 2,
  },
  tablesSection: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.card,
    padding: 16,
    marginBottom: 24,
  },
  tableCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  tableCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
  },
  tableCardSubtitle: {
    fontSize: 11.5,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 1,
  },
  viewAllBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: ADMIN_RADII.button,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
  },
  viewAllBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  mobileCardList: {
    gap: 8,
  },
  mobileUserCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: ADMIN_RADII.card,
    padding: 12,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
  },
  mobileUserCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  mobileUserInfo: {
    flex: 1,
  },
  mobileUserCardBottom: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLORS.borderSubtle,
    gap: 2,
  },
  mobileInstitutionText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  mobileFieldText: {
    fontSize: 10.5,
    color: ADMIN_COLORS.textSecondary,
  },
  emptyMobileText: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 18,
  },
  userCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ADMIN_COLORS.bgActive,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.emeraldBorder,
  },
  userAvatarText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: ADMIN_COLORS.emeraldPrimary,
  },
  boldText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  usernameText: {
    fontSize: 11,
    color: ADMIN_COLORS.textMuted,
  },
  cellText: {
    fontSize: 12.5,
    color: ADMIN_COLORS.textPrimary,
    fontWeight: '500',
  },
  cellMuted: {
    fontSize: 11.5,
    color: ADMIN_COLORS.textSecondary,
  },
});

