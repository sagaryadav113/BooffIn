const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const OLD_SUPABASE_URL = 'https://lvstuqhrmagzqkgwlisl.supabase.co';
const OLD_SUPABASE_ANON_KEY = 'sb_publishable_fXyEsViLthF0T7A3NHBXpA_UUUVbrbx';

const oldClient = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_ANON_KEY);

function sqlVal(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (Array.isArray(val)) {
    if (val.length === 0) return "'{}'";
    const escaped = val.map(item => '"' + String(item).replace(/"/g, '\\"') + '"').join(',');
    return "'{" + escaped.replace(/'/g, "''") + "}'";
  }
  if (typeof val === 'object') {
    return "'" + JSON.stringify(val).replace(/'/g, "''") + "'::jsonb";
  }
  return "'" + String(val).replace(/'/g, "''") + "'";
}

async function exportTable(table, conflictTarget = 'id') {
  const { data, error } = await oldClient.from(table).select('*');
  if (error) {
    console.error(`Error fetching table ${table}: ${error.message}`);
    return '';
  }
  if (!data || data.length === 0) {
    console.log(`Table ${table} has 0 rows, skipping.`);
    return '';
  }
  const cols = Object.keys(data[0]);
  let out = `-- Table: public.${table} (${data.length} rows)\n`;
  out += `INSERT INTO public.${table} (${cols.join(', ')})\nVALUES\n`;
  const rowLines = data.map(row => {
    const vals = cols.map(c => sqlVal(row[c]));
    return `  (${vals.join(', ')})`;
  });
  out += rowLines.join(',\n') + '\n';
  out += `ON CONFLICT (${conflictTarget}) DO NOTHING;\n\n`;
  console.log(`Exported ${table}: ${data.length} rows.`);
  return out;
}

async function generate() {
  console.log('Connecting to old database and extracting data...');
  let sql = '-- ============================================================================\n';
  sql += '-- BOOFFIN: COMPLETE DATA MIGRATION FROM OLD PROJECT TO BOOFFIN V2\n';
  sql += '-- Run this script in the new Supabase SQL Editor\n';
  sql += '-- Transfers: Profiles, Topics, Papers, Authors, Posts, Comments, Likes, Bookmarks, Reposts, Follows\n';
  sql += '-- ============================================================================\n\n';

  sql += '-- 1. Ensure any extended columns exist before data insert\n';
  sql += 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;\n';
  sql += 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_custom_avatar BOOLEAN DEFAULT FALSE;\n';
  sql += 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_custom_banner BOOLEAN DEFAULT FALSE;\n';
  sql += 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;\n';
  sql += 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lab_group TEXT;\n';
  sql += 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_field TEXT;\n';
  sql += 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS secondary_fields TEXT[] DEFAULT \'{}\';\n';
  sql += 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS degree_program TEXT;\n';
  sql += 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS graduation_year INTEGER;\n';
  sql += 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_scholar_url TEXT;\n';
  sql += 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS researchgate_url TEXT;\n';
  sql += 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;\n';
  sql += 'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS scopus_id TEXT;\n';
  sql += 'ALTER TABLE public.paper_authors ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();\n';
  sql += 'ALTER TABLE public.post_topics ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();\n';
  sql += 'ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS path LTREE;\n\n';

  sql += '-- 2. Temporarily drop foreign key constraint on profiles.id referencing auth.users\n';
  sql += '-- (Allows existing profiles to exist seamlessly even before users re-authenticate)\n';
  sql += 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;\n\n';

  const tables = [
    { name: 'profiles', conflict: 'id' },
    { name: 'topics', conflict: 'slug' },
    { name: 'papers', conflict: 'id' },
    { name: 'paper_authors', conflict: 'id' },
    { name: 'posts', conflict: 'id' },
    { name: 'post_topics', conflict: 'id' },
    { name: 'comments', conflict: 'id' },
    { name: 'likes', conflict: 'id' },
    { name: 'bookmarks', conflict: 'id' },
    { name: 'reposts', conflict: 'id' },
    { name: 'follows', conflict: 'follower_id, following_id' }
  ];

  for (const t of tables) {
    const chunk = await exportTable(t.name, t.conflict);
    sql += chunk;
  }

  const outPath = path.join(__dirname, '..', 'supabase', 'TRANSFER_OLD_DATA_TO_V2.sql');
  fs.writeFileSync(outPath, sql, 'utf8');
  console.log(`\nMigration SQL script created at ${outPath} (${sql.length} characters)`);
}

generate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
