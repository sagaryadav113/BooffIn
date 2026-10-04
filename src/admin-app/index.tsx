// ============================================================================
// BOOFFIN ADMIN PORTAL — ISOLATED VERCEL DEPLOYMENT ENTRY POINT
// Reuses the authoritative existing AdminPortalRoot component
// ============================================================================

import React from 'react';
import { AdminPortalRoot } from '../admin/views/AdminPortalRoot';

export default function AdminAppIndex() {
  return <AdminPortalRoot />;
}
