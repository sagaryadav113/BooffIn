// ============================================================================
// BOOFFIN ADMIN PORTAL — CONSTANTS & STYLING TOKENS
// ============================================================================

export const ADMIN_COLORS = {
  // Foundation (Black & White)
  bgPrimary: '#0A0A0C',
  bgSecondary: '#121316',
  bgCard: '#18191E',
  bgHover: '#202228',
  bgActive: '#262932',
  
  // Borders
  borderSubtle: '#272A34',
  borderStrong: '#3A3F4D',
  
  // Typography
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  
  // BooffIn Emerald Accent
  emeraldPrimary: '#059669',
  emeraldDark: '#064E3B',
  emeraldLight: '#10B981',
  emeraldBg: 'rgba(5, 150, 105, 0.12)',
  emeraldBorder: 'rgba(5, 150, 105, 0.3)',
  
  // Status Accents
  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.12)',
  dangerBorder: 'rgba(239, 68, 68, 0.3)',
  
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.12)',
  warningBorder: 'rgba(245, 158, 11, 0.3)',
  
  info: '#3B82F6',
  infoBg: 'rgba(59, 130, 246, 0.12)',
  infoBorder: 'rgba(59, 130, 246, 0.3)',
};

export const ADMIN_NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid', permission: null },
  { key: 'users', label: 'Users', icon: 'users', permission: 'users.read' },
  { key: 'reports', label: 'Reports', icon: 'flag', permission: 'reports.read' },
  { key: 'moderation', label: 'Moderation', icon: 'shield', permission: 'posts.read' },
  { key: 'approvals', label: 'Approvals', icon: 'check-circle', permission: 'approvals.read' },
  { key: 'team', label: 'Team', icon: 'user-check', permission: 'admins.read' },
  { key: 'audit-logs', label: 'Audit Logs', icon: 'file-text', permission: 'audit_logs.read' },
  { key: 'security', label: 'Security', icon: 'lock', permission: 'security.read' },
  { key: 'analytics', label: 'Analytics', icon: 'bar-chart', permission: null },
  { key: 'system-health', label: 'System Health', icon: 'activity', permission: 'system_health.read' },
  { key: 'settings', label: 'Settings', icon: 'settings', permission: null },
] as const;

export type AdminNavKey = typeof ADMIN_NAV_ITEMS[number]['key'];
