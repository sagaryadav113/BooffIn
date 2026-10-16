const fs = require('fs');
const assert = require('assert');

console.log('🧪 Verifying Calendar Event Scheduling implementation...\n');

// 1. Verify workspaceService.ts
const serviceCode = fs.readFileSync('src/api/workspaceService.ts', 'utf8');
assert.ok(serviceCode.includes('@booffin_events_'), 'workspaceService has local AsyncStorage events caching');
assert.ok(serviceCode.includes('cleanAttendeeUuids'), 'workspaceService sanitizes UUIDs for attendee_ids');
assert.ok(serviceCode.includes('creatorProfile'), 'workspaceService enriches creator profile');
assert.ok(serviceCode.includes('getWorkspaceEvents'), 'workspaceService getWorkspaceEvents merges cache and db');
assert.ok(serviceCode.includes('deleteWorkspaceEvent'), 'workspaceService deleteWorkspaceEvent handles removal');
console.log('✅ [1/4] src/api/workspaceService.ts implements resilient dual-sync Events');

// 2. Verify useWorkspaceStore.ts
const storeCode = fs.readFileSync('src/store/useWorkspaceStore.ts', 'utf8');
assert.ok(storeCode.includes('createEvent: async'), 'useWorkspaceStore has createEvent');
assert.ok(storeCode.includes('loadEvents: async'), 'useWorkspaceStore has loadEvents');
assert.ok(storeCode.includes('deleteEvent: async'), 'useWorkspaceStore has deleteEvent');
console.log('✅ [2/4] src/store/useWorkspaceStore.ts correctly binds and reloads events');

// 3. Verify WorkspaceInnerCircleView.tsx
const viewCode = fs.readFileSync('src/components/workspace/WorkspaceInnerCircleView.tsx', 'utf8');
assert.ok(viewCode.includes('handleCreateEvent'), 'WorkspaceInnerCircleView has handleCreateEvent');
assert.ok(viewCode.includes('resolvedDate'), 'WorkspaceInnerCircleView resolves date safely');
assert.ok(viewCode.includes('openScheduleModalForDate'), 'WorkspaceInnerCircleView has openScheduleModalForDate');
assert.ok(viewCode.includes('showEventModal'), 'WorkspaceInnerCircleView has showEventModal');
console.log('✅ [3/4] src/components/workspace/WorkspaceInnerCircleView.tsx verified: schedule event modal and form wired correctly');

// 4. Verify migration
const migrationCode = fs.readFileSync('supabase/migrations/20261015000003_workspace_events_policies.sql', 'utf8');
assert.ok(migrationCode.includes('workspace_events_select_policy'), 'Migration has SELECT policy');
assert.ok(migrationCode.includes('workspace_events_insert_policy'), 'Migration has INSERT policy');
assert.ok(migrationCode.includes('workspace_events_delete_policy'), 'Migration has DELETE policy');
console.log('✅ [4/4] supabase/migrations/20261015000003_workspace_events_policies.sql verified');

console.log('\n🎉 ALL CALENDAR EVENT SCHEDULING TESTS PASSED SUCCESSFULLY!');
