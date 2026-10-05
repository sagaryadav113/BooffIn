// ============================================================================
// BOOFFIN ADMIN PORTAL — CONSTANTS & STYLING TOKENS (LIGHT SAAS THEME)
// ============================================================================

export const ADMIN_COLORS = {
  // Light SaaS Canvas & Surfaces
  bgPrimary: '#F8FAFC',       // Slate 50 clean background
  bgSecondary: '#FFFFFF',     // Pure white surface
  bgCard: '#FFFFFF',          // Elevated white card
  bgHover: '#F1F5F9',         // Slate 100 on hover
  bgActive: '#ECFDF5',        // Emerald 50 on active
  bgSidebar: '#FFFFFF',       // Clean white sidebar
  bgHeader: '#FFFFFF',        // Clean white top bar
  
  // Clean Borders & Dividers
  borderSubtle: '#E2E8F0',    // Slate 200 light border
  borderStrong: '#CBD5E1',    // Slate 300 focus/active border
  
  // High-Contrast Typography
  textPrimary: '#0F172A',     // Slate 900 primary heading & body
  textSecondary: '#475569',   // Slate 600 descriptive text
  textMuted: '#94A3B8',       // Slate 400 captions & placeholders
  
  // BooffIn Emerald Accents
  emeraldPrimary: '#059669',  // Primary Emerald
  emeraldDark: '#064E3B',    // Deep Emerald (BooffIn Brand)
  emeraldLight: '#10B981',   // Vibrant Emerald
  emeraldBg: '#ECFDF5',      // Soft Emerald surface
  emeraldBorder: '#A7F3D0',  // Emerald border pill
  
  // Action & Status Accents
  actionBlue: '#2563EB',      // Modern Blue action button
  actionBlueHover: '#1D4ED8',
  actionBlueBg: '#EFF6FF',
  
  danger: '#EF4444',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',
  
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  
  info: '#2563EB',
  infoBg: '#EFF6FF',
  infoBorder: '#BFDBFE',
  
  neutralBg: '#F1F5F9',
  neutralBorder: '#E2E8F0',
};

export const ADMIN_NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', permission: null },
  { key: 'support', label: 'Support Desk', icon: 'LifeBuoy', permission: null },
  { key: 'team-chat', label: 'Team Chat', icon: 'MessagesSquare', permission: null },
  { key: 'users', label: 'Users', icon: 'Users', permission: 'users.read' },
  { key: 'reports', label: 'Reports', icon: 'Flag', permission: 'reports.read' },
  { key: 'moderation', label: 'Moderation', icon: 'ShieldAlert', permission: 'posts.read' },
  { key: 'approvals', label: 'Approvals', icon: 'CheckSquare', permission: 'approvals.read' },
  { key: 'team', label: 'Team', icon: 'UserCheck', permission: 'admins.read' },
  { key: 'audit-logs', label: 'Audit Logs', icon: 'FileText', permission: 'audit_logs.read' },
  { key: 'security', label: 'Security', icon: 'ShieldCheck', permission: 'security.read' },
  { key: 'analytics', label: 'Analytics', icon: 'TrendingUp', permission: null },
  { key: 'system-health', label: 'System Health', icon: 'Activity', permission: 'system_health.read' },
  { key: 'settings', label: 'Settings', icon: 'Settings', permission: null },
] as const;

export type AdminNavKey = typeof ADMIN_NAV_ITEMS[number]['key'];
