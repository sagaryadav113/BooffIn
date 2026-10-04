# BOOFFIN ADMIN PORTAL — ROLE & PERMISSION MATRIX
**Document Version:** 1.0.0 (Stage 1 Architecture)  
**Status:** STAGE 1 AUTHORITATIVE MATRIX

---

## 1. Role Hierarchy & Boundaries

The BooffIn Admin Portal utilizes strict Role-Based Access Control (RBAC). Permissions are derived solely from verified server-side membership in `public.admin_members`.

### Initial Roles (Stage 1)
1. **`SUPER_ADMIN`**: Full platform authority. Manages admin team members, role assignments, security policies, high-risk approval workflows, and system configurations.
2. **`ADMIN`**: Platform administration and operational authority. Handles user management, content takedowns, report escalation, academic verification, taxonomy curation, and initiates approval requests.
3. **`MODERATOR`**: Content, community, and report review authority. Handles review of abuse/spam reports, reviewing flagged posts/comments, user warnings, and basic triage.

---

## 2. Granular Permissions Catalog

Permissions are structured using standard hierarchical namespacing (`<resource>.<action>`):

```
users.*           - User lifecycle, profiles, warnings, and suspension
posts.*           - Research shares, papers, discussions moderation
comments.*        - Threaded commentary moderation
reports.*         - Abuse & spam triage and resolution
taxonomy.*        - Research fields, topics, and category management
admins.*          - Admin member invitations, role changes, and deactivations
audit_logs.*      - Accessing and filtering audit records
approvals.*       - Two-person high-risk action requests and approvals
security.*        - Security monitoring, session revocation, rate-limits
system_health.*   - Infrastructure health, RPC performance, query latency
analytics.*       - Platform-wide scientific engagement and user metrics
```

---

## 3. Authoritative Role-Permission Matrix

| Permission Key | Description | `SUPER_ADMIN` | `ADMIN` | `MODERATOR` | High-Risk Approval Required? |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **`dashboard.view`** | View admin overview metrics & system status | ✅ | ✅ | ✅ | ❌ |
| **`users.read`** | View user list, academic profile, basic stats | ✅ | ✅ | ✅ | ❌ |
| **`users.view_sensitive`** | View account email, registration IP, verification | ✅ | ✅ | ❌ | ❌ |
| **`users.warn`** | Issue formal administrative warning to researcher | ✅ | ✅ | ✅ | ❌ |
| **`users.suspend`** | Temporarily suspend user account from platform | ✅ | ✅ | ❌ | ❌ |
| **`users.unsuspend`** | Restore suspended user account | ✅ | ✅ | ❌ | ❌ |
| **`users.delete.request`** | Initiate account deletion request (Two-Admin) | ✅ | ✅ | ❌ | ✅ (Step 1) |
| **`users.delete.approve`** | Independently approve account deletion request | ✅ | ❌ | ❌ | ✅ (Step 2 - Dual Admin) |
| **`posts.read`** | View all published and unlisted posts | ✅ | ✅ | ✅ | ❌ |
| **`posts.flag`** | Flag post for editorial or policy review | ✅ | ✅ | ✅ | ❌ |
| **`posts.remove`** | Soft-delete / hide policy-violating post | ✅ | ✅ | ❌ | ❌ |
| **`posts.restore`** | Restore wrongfully removed post | ✅ | ✅ | ❌ | ❌ |
| **`comments.read`** | View all discussion comments and reply trees | ✅ | ✅ | ✅ | ❌ |
| **`comments.remove`** | Soft-delete / hide policy-violating comment | ✅ | ✅ | ✅ | ❌ |
| **`reports.read`** | View abuse, harassment, and spam reports queue | ✅ | ✅ | ✅ | ❌ |
| **`reports.assign`** | Assign report to self or team member | ✅ | ✅ | ✅ | ❌ |
| **`reports.resolve`** | Transition report status (`actioned`, `dismissed`) | ✅ | ✅ | ✅ | ❌ |
| **`taxonomy.manage`** | Create, edit, rename, or merge research topics | ✅ | ✅ | ❌ | ❌ |
| **`admins.read`** | View active admin team members and roles | ✅ | ✅ | ❌ | ❌ |
| **`admins.invite`** | Invite new administrator with role assignment | ✅ | ❌ | ❌ | ❌ |
| **`admins.role_change`** | Change role of existing admin member | ✅ | ❌ | ❌ | ❌ |
| **`admins.deactivate`** | Deactivate admin access for team member | ✅ | ❌ | ❌ | ❌ |
| **`audit_logs.read`** | View and search immutable administrative audit logs | ✅ | ✅ | ❌ | ❌ |
| **`audit_logs.export`** | Export compliance audit trails (CSV/JSON) | ✅ | ❌ | ❌ | ❌ |
| **`approvals.read`** | View pending high-risk approval requests | ✅ | ✅ | ❌ | ❌ |
| **`approvals.create`** | Create dual-authorization request | ✅ | ✅ | ❌ | ❌ |
| **`approvals.approve`** | Approve dual-authorization request (Non-author) | ✅ | ❌ | ❌ | ✅ |
| **`approvals.reject`** | Reject dual-authorization request | ✅ | ❌ | ❌ | ❌ |
| **`security.read`** | View security metrics, failed logins, anomaly flags | ✅ | ✅ | ❌ | ❌ |
| **`security.manage`** | Trigger session revocation, IP block, MFA reset | ✅ | ❌ | ❌ | ❌ |
| **`system_health.read`** | View database health, query stats, storage health | ✅ | ✅ | ❌ | ❌ |
| **`analytics.read`** | View aggregated platform growth & scientific stats | ✅ | ✅ | ✅ | ❌ |

---

## 4. Fundamental RBAC Rules & Guardrails

1. **Server-Authoritative Enforcement:**
   Frontend checks (`hasPermission(role, perm)`) exist strictly to customize UI elements (buttons, navigation tabs). Database RLS policies and RPC functions independently evaluate `get_admin_role(auth.uid())` and reject unauthorized mutations regardless of client state.

2. **Self-Escalation Prevention:**
   An administrator (`ADMIN`) **cannot** change their own role or promote themselves to `SUPER_ADMIN`. The database RPC `admin_change_member_role()` asserts `caller_role = 'SUPER_ADMIN'` and `caller_id <> target_admin_id`.

3. **Two-Admin Rule for Destructive Actions:**
   Permanent account deletion or irreversible data purges require two independent administrators. Admin A creates the request in `admin_approval_requests`. Admin B approves it. The database trigger `chk_no_self_approval` enforces `requested_by <> approved_by` at the PostgreSQL engine level.

4. **Least Privilege Principle:**
   Moderators have zero visibility into user credentials, private settings, admin member lists, or audit logs. They only have the exact access required to review reports and flag content.
