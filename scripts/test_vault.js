const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  // Let's get an active workspace and user
  const { data: workspaces } = await supabase.from('workspaces').select('id, owner_id').limit(1);
  if (!workspaces || workspaces.length === 0) {
    console.log('No workspace found');
    return;
  }
  const ws = workspaces[0];
  console.log('Testing with workspace:', ws.id, 'owner:', ws.owner_id);

  // Test upsert as done in saveWorkspaceItem:
  const res = await supabase.from('workspace_saved_items').upsert(
    {
      workspace_id: ws.id,
      user_id: ws.owner_id,
      item_type: 'message',
      item_id: 'fake-msg-id-123',
      note: 'test note',
    },
    { onConflict: 'workspace_id,user_id,item_id' }
  );
  console.log('UPSERT result:', res);
}
test();
