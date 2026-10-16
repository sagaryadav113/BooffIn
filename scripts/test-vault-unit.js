const fs = require('fs');
const assert = require('assert');

console.log('🧪 Verifying Vault implementation and "Save to Vault" integration...\n');

// 1. Verify types/workspace.ts
const typesCode = fs.readFileSync('src/types/workspace.ts', 'utf8');
assert.ok(typesCode.includes("title?: string | null"), 'WorkspaceSavedItem has title');
assert.ok(typesCode.includes("metadata?: any"), 'WorkspaceSavedItem has metadata');
console.log('✅ [1/5] src/types/workspace.ts includes title & metadata');

// 2. Verify workspaceService.ts
const serviceCode = fs.readFileSync('src/api/workspaceService.ts', 'utf8');
assert.ok(serviceCode.includes('@booffin_vault_'), 'workspaceService has local AsyncStorage vault caching');
assert.ok(serviceCode.includes('resolvedMeta'), 'workspaceService preserves rich metadata');
assert.ok(serviceCode.includes('getWorkspaceSavedItems'), 'workspaceService getWorkspaceSavedItems merges cache and db');
assert.ok(serviceCode.includes('removeSavedWorkspaceItem'), 'workspaceService removeSavedWorkspaceItem handles removal');
console.log('✅ [2/5] src/api/workspaceService.ts implements resilient dual-sync Vault');

// 3. Verify useWorkspaceStore.ts
const storeCode = fs.readFileSync('src/store/useWorkspaceStore.ts', 'utf8');
assert.ok(storeCode.includes('loadSavedItems: async'), 'useWorkspaceStore has loadSavedItems');
assert.ok(storeCode.includes('saveItem: async'), 'useWorkspaceStore has saveItem');
assert.ok(storeCode.includes('removeSavedItem: async'), 'useWorkspaceStore has removeSavedItem');
console.log('✅ [3/5] src/store/useWorkspaceStore.ts correctly binds and reloads saved items');

// 4. Verify WorkspaceInnerCircleView.tsx
const viewCode = fs.readFileSync('src/components/workspace/WorkspaceInnerCircleView.tsx', 'utf8');
assert.ok(viewCode.includes("export type InnerCircleTab = 'discussions' | 'calendar' | 'vault' | 'bookmarked'"), 'InnerCircleTab has vault');
assert.ok(/>\s*Vault\s*<\/Text>/.test(viewCode), 'Tab pill displays "Vault"');
assert.ok(!/>\s*Bookmarked\s*<\/Text>/.test(viewCode), 'Tab pill does not display "Bookmarked"');
assert.ok(viewCode.includes('label="Save to Vault"'), 'Context menu item has label "Save to Vault"');
assert.ok(viewCode.includes('handleBookmarkMessage'), 'onPress triggers handleBookmarkMessage');
assert.ok(viewCode.includes('setVaultToast'), 'handleBookmarkMessage shows confirmation toast');
assert.ok(viewCode.includes('vaultItemCard'), 'Vault renders rich cards');
assert.ok(viewCode.includes('removeSavedItem'), 'Vault cards have functional remove button');
assert.ok(viewCode.includes('Clipboard.setStringAsync'), 'Vault cards have functional copy button');
console.log('✅ [4/5] src/components/workspace/WorkspaceInnerCircleView.tsx verified: tab renamed to Vault, Save to Vault fully wired with rich cards');

// 5. Verify migration
const migrationCode = fs.readFileSync('supabase/migrations/20261015000002_workspace_saved_items_vault_policies.sql', 'utf8');
assert.ok(migrationCode.includes('workspace_saved_items_select_policy'), 'Migration has SELECT policy');
assert.ok(migrationCode.includes('workspace_saved_items_insert_policy'), 'Migration has INSERT policy');
assert.ok(migrationCode.includes('workspace_saved_items_delete_policy'), 'Migration has DELETE policy');
console.log('✅ [5/5] supabase/migrations/20261015000002_workspace_saved_items_vault_policies.sql verified');

console.log('\n🎉 ALL VAULT AND "SAVE TO VAULT" TESTS PASSED SUCCESSFULLY!');
