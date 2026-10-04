# BOOFFIN ADMIN PORTAL — ARCHITECTURE SPECIFICATION (STAGE 1)
**Document Version:** 1.0.0  
**Status:** STAGE 1 FOUNDATION  
**Primary Host:** `booffin-admin.vercel.app` (Future: `admin.booffin.com`)

---

## 1. Architectural Philosophy & Vision

The BooffIn Admin Portal is a dedicated, secure, information-dense operational console designed for BooffIn founders, platform administrators, and community moderators.

### Key Architectural Tenets:
1. **Single Backend Integration:** Powered directly by the existing BooffIn Supabase PostgreSQL database and Supabase Auth identity system. No shadow database or duplicate tables.
2. **Separation of Concerns:** Isolated routing and codebase structure (`src/admin/`). Zero admin navigation, buttons, or indicators in the public user-facing application (`booff-in.vercel.app`).
3. **Information-Dense & Minimalist Visual Identity:** Retains BooffIn's design DNA (black/white foundation, `#064E3B` emerald dark green accent, Inter typography, clean bordered card language) optimized for high-density administrative workflows.
4. **Defense-in-Depth:** Multi-layered security spanning route guards, verified server-side RBAC, database RLS policies, two-person high-risk action approval, and append-only audit trails.

---

## 2. Directory & Component Structure

The Admin Portal foundation is organized within `src/admin/`:

```
src/admin/
├── types/
│   ├── index.ts                      # Core admin TypeScript definitions
│   ├── roles.ts                      # Roles, permissions & RBAC types
│   ├── audit.ts                      # Audit log schemas & action enums
│   └── approvals.ts                  # Dual-approval request types
│
├── lib/
│   ├── permissions.ts                # Permission catalog & evaluator engine
│   ├── rbac.ts                       # Role hierarchy & membership validator
│   └── constants.ts                  # Admin routes, visual tokens & thresholds
│
├── services/
│   ├── adminAuthService.ts           # Admin login, session & MFA status
│   ├── adminAuthorizationService.ts  # Database membership & role verification
│   ├── adminUserService.ts           # User inspection, warning & status service
│   ├── adminReportService.ts         # Abuse & spam report triage service
│   ├── adminModerationService.ts     # Content moderation (posts/comments)
│   ├── adminApprovalService.ts       # Two-person dual approval service
│   ├── adminAuditService.ts          # Audit logging & compliance log fetching
│   └── adminSecurityService.ts       # Security health & threat monitoring
│
├── hooks/
│   ├── useAdminAuth.ts               # Admin auth state, login & role hook
│   └── useAdminPermissions.ts        # Dynamic permission check hook
│
├── components/
│   ├── layout/
│   │   ├── AdminLayoutShell.tsx      # Admin header, sidebar & main container
│   │   ├── AdminHeader.tsx           # Global admin header with identity & breadcrumbs
│   │   └── AdminSidebar.tsx          # 11-section admin navigation sidebar
│   ├── core/
│   │   ├── AdminBadge.tsx            # Role, status & risk badges
│   │   ├── AdminDataTable.tsx        # High-density sortable data table
│   │   ├── AdminStatCard.tsx         # KPI & operational metrics card
│   │   └── PermissionGate.tsx        # Declarative permission UI guard
│   └── feedback/
│       ├── AdminEmptyState.tsx       # Standard empty data state
│       └── AdminAccessDenied.tsx     # 403 Forbidden screen with audit notice
│
├── views/
│   ├── auth/
│   │   ├── AdminLoginView.tsx        # Admin identity authentication
│   │   └── AdminMfaView.tsx          # TOTP verification challenge placeholder
│   ├── dashboard/
│   │   └── AdminDashboardView.tsx    # Operational metrics & triage queues
│   ├── users/
│   │   └── AdminUsersView.tsx        # Researcher lookup & moderation
│   ├── reports/
│   │   └── AdminReportsView.tsx      # Community abuse & spam report queue
│   ├── moderation/
│   │   └── AdminModerationView.tsx   # Flagged papers, posts & comments
│   ├── approvals/
│   │   └── AdminApprovalsView.tsx    # Two-person dual authorization requests
│   ├── team/
│   │   └── AdminTeamView.tsx         # Admin membership & RBAC management
│   ├── auditLogs/
│   │   └── AdminAuditLogsView.tsx    # Immutable compliance audit stream
│   ├── security/
│   │   └── AdminSecurityView.tsx     # Threat monitoring & session oversight
│   ├── analytics/
│   │   └── AdminAnalyticsView.tsx    # Scientific engagement & platform analytics
│   ├── systemHealth/
│   │   └── AdminSystemHealthView.tsx # Database latency, RPC health & storage
│   └── settings/
│       └── AdminSettingsView.tsx     # Administrative platform configuration
│
└── tests/
    └── adminSecurity.test.ts         # Stage 1 security test suite
```

---

## 3. Navigation Sections (11-Section Core Console)

1. **Dashboard (`/admin/dashboard`)**: Operational health summary, pending report count, open approval requests, 24h user registrations, active discussions.
2. **Users (`/admin/users`)**: Searchable directory of registered researchers, academic titles, institutions, ORCID verification status, warnings, and suspension controls.
3. **Reports (`/admin/reports`)**: Live queue of user reports (`spam`, `harassment`, `misinformation`, `inappropriate`, `copyright`), reporter details, and triage workflow.
4. **Moderation (`/admin/moderation`)**: Content oversight across research posts and threaded comments with soft-delete / restore actions.
5. **Approvals (`/admin/approvals`)**: Dual-admin authorization queue for high-risk operations (permanent account deletion, bulk mutations).
6. **Team (`/admin/team`)**: Admin member roster, role assignment (`SUPER_ADMIN`, `ADMIN`, `MODERATOR`), and invite management.
7. **Audit Logs (`/admin/audit-logs`)**: Searchable, append-only log of every administrative query, status change, and moderation decision.
8. **Security (`/admin/security`)**: Failed auth attempts, rate-limit triggers, MFA status inspection, and session revocation tools.
9. **Analytics (`/admin/analytics`)**: Growth trends, paper hype distributions, field popularity, and publication metrics.
10. **System Health (`/admin/system-health`)**: PostgreSQL query times, storage utilization, and RPC execution metrics.
11. **Settings (`/admin/settings`)**: Platform-wide feature flags, maintenance mode settings, and notification broadcast controls.

---

## 4. Stage 1 Scope & Boundary

Stage 1 establishes the structural shell, database model proposals, RBAC catalog, and testing harness. No destructive actions or production migrations are deployed in Stage 1.
