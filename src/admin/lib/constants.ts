// ============================================================================
// BOOFFIN ADMIN PORTAL — ENTERPRISE DESIGN TOKENS & CONSTANTS
// ============================================================================

export const ADMIN_COLORS = {
  // Canvas & Surfaces (High density, crisp enterprise workstation)
  bgCanvas: '#F8FAFC',        // Slate 50 layout backing
  bgSurface: '#FFFFFF',       // Pure White card & table surface
  bgHover: '#F1F5F9',         // Slate 100 on hover
  bgActive: '#ECFDF5',        // Emerald 50 active row / tab
  bgActiveSubtle: '#F0FDF4',  // Light Emerald 50
  
  // Structural 1px Borders & Dividers
  border: '#E2E8F0',          // Slate 200 crisp 1px border
  borderSubtle: '#F1F5F9',    // Slate 100 cell divider
  borderFocus: '#047857',     // Emerald 700 active ring
  borderStrong: '#CBD5E1',    // Slate 300 strong outline
  
  // Text Hierarchy (Inter / System sans-serif)
  textPrimary: '#0F172A',     // Slate 900 primary high-contrast text
  textSecondary: '#475569',   // Slate 600 secondary body & labels
  textMuted: '#94A3B8',       // Slate 400 captions & metadata
  textLight: '#64748B',       // Slate 500 table headers
  textInverse: '#FFFFFF',     // White text on dark/colored button
  
  // BooffIn Emerald Primary & Accents
  emeraldPrimary: '#047857',  // Emerald 700 (Enterprise Brand Accent)
  emeraldHover: '#065F46',    // Emerald 800 hover
  emeraldDark: '#064E3B',     // Emerald 900
  emeraldLight: '#10B981',    // Emerald 500 status dot
  emeraldBg: '#ECFDF5',       // Emerald 50 soft background
  emeraldBorder: '#A7F3D0',   // Emerald 200
  
  // Restrained Status System (Neutral/tinted bg + sharp indicator dot)
  statusSuccessBg: '#F0FDF4',
  statusSuccessText: '#047857',
  statusSuccessDot: '#10B981',
  statusSuccessBorder: '#DCFCE7',

  statusWarningBg: '#FFFBEB',
  statusWarningText: '#B45309',
  statusWarningDot: '#F59E0B',
  statusWarningBorder: '#FEF3C7',

  statusDangerBg: '#FEF2F2',
  statusDangerText: '#B91C1C',
  statusDangerDot: '#EF4444',
  statusDangerBorder: '#FEE2E2',

  statusNeutralBg: '#F8FAFC',
  statusNeutralText: '#475569',
  statusNeutralDot: '#94A3B8',
  statusNeutralBorder: '#E2E8F0',
  
  statusInfoBg: '#F0F9FF',
  statusInfoText: '#0369A1',
  statusInfoDot: '#0EA5E9',
  statusInfoBorder: '#E0F2FE',

  // Compatibility aliases
  bgPrimary: '#F8FAFC',
  bgCard: '#FFFFFF',
  danger: '#B91C1C',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FEE2E2',
  warning: '#B45309',
  warningBg: '#FFFBEB',
  warningBorder: '#FEF3C7',
  actionBlue: '#0369A1',
};

export const ADMIN_RADII = {
  badge: 4,
  button: 6,
  input: 6,
  card: 8,
  modal: 10,
};

export interface AdminNavItemDef {
  key: string;
  label: string;
  icon: string;
  permission: string | null;
}

export interface AdminNavGroupDef {
  category: string;
  items: AdminNavItemDef[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroupDef[] = [
  {
    category: 'CORE OVERVIEW',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', permission: null },
      { key: 'calendar', label: 'Calendar', icon: 'Calendar', permission: null },
      { key: 'support', label: 'Support Desk', icon: 'LifeBuoy', permission: null },
      { key: 'team-chat', label: 'Team Chat', icon: 'MessagesSquare', permission: null },
    ],
  },
  {
    category: 'GOVERNANCE & SAFETY',
    items: [
      { key: 'users', label: 'Researchers', icon: 'Users', permission: 'users.read' },
      { key: 'reports', label: 'Reports', icon: 'Flag', permission: 'reports.read' },
      { key: 'moderation', label: 'Moderation', icon: 'ShieldAlert', permission: 'posts.read' },
      { key: 'approvals', label: 'Approvals', icon: 'CheckSquare', permission: 'approvals.read' },
      { key: 'team', label: 'Team & RBAC', icon: 'UserCheck', permission: 'admins.read' },
    ],
  },
  {
    category: 'SYSTEM & LOGS',
    items: [
      { key: 'audit-logs', label: 'Audit Logs', icon: 'FileText', permission: 'audit_logs.read' },
      { key: 'security', label: 'Security & 2FA', icon: 'ShieldCheck', permission: 'security.read' },
      { key: 'analytics', label: 'Analytics', icon: 'TrendingUp', permission: null },
      { key: 'system-health', label: 'System Health', icon: 'Activity', permission: 'system_health.read' },
      { key: 'settings', label: 'Settings', icon: 'Settings', permission: null },
      { key: 'profile', label: 'My Profile', icon: 'User', permission: null },
    ],
  },
];

export const ADMIN_NAV_ITEMS = ADMIN_NAV_GROUPS.flatMap((group) => group.items) as readonly AdminNavItemDef[];

export type AdminNavKey =
  | 'dashboard'
  | 'calendar'
  | 'support'
  | 'team-chat'
  | 'users'
  | 'reports'
  | 'moderation'
  | 'approvals'
  | 'team'
  | 'audit-logs'
  | 'security'
  | 'analytics'
  | 'system-health'
  | 'settings'
  | 'profile';

