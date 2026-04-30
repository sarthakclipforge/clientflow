/**
 * setup-db.mjs
 * Creates all ClientFlow tables in Supabase via the database REST endpoint.
 * Run once: node setup-db.mjs
 */

const SUPABASE_URL  = 'https://fwvgyzpltzzregefouuo.supabase.co'
const ANON_KEY      = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3dmd5enBsdHp6cmVnZWZvdXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NDU2NzksImV4cCI6MjA5MzEyMTY3OX0.kzCMZ2Pi0PmtYNlDafd7yOK1TY0ehqudfZiTcTOuh1U'

// Tables as individual SQL statements — each sent separately
const STATEMENTS = [

`CREATE TABLE IF NOT EXISTS import_batches (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source       text,
  filename     text,
  export_date  date,
  lead_count   int,
  imported_at  timestamptz DEFAULT now()
)`,

`CREATE TABLE IF NOT EXISTS leads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle           text NOT NULL,
  channel_name     text,
  channel_url      text,
  subscribers      text,
  niche            text,
  fit_score        text,
  fit_reason       text,
  email            text,
  instagram        text,
  twitter          text,
  website          text,
  contact_method   text,
  contact_status   text DEFAULT 'unknown',
  latest_video     text,
  notes            text,
  status           text DEFAULT 'unreviewed',
  batch_id         uuid REFERENCES import_batches(id) ON DELETE SET NULL,
  added_at         timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
)`,

`CREATE UNIQUE INDEX IF NOT EXISTS leads_handle_unique ON leads (lower(handle))`,

`CREATE TABLE IF NOT EXISTS user_profile (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text,
  service_desc      text,
  proof_line        text,
  email_signature   text,
  groq_key_ref      text,
  followup_days_1   int DEFAULT 4,
  followup_days_2   int DEFAULT 5,
  created_at        timestamptz DEFAULT now()
)`,

`CREATE TABLE IF NOT EXISTS outreach_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid REFERENCES leads(id) ON DELETE CASCADE,
  contacted_at      timestamptz DEFAULT now(),
  channel_used      text,
  subject_line      text,
  message_body      text,
  hook_style        text,
  groq_model        text,
  sequence_num      int DEFAULT 1,
  follow_up_1_due   date,
  follow_up_1_sent  timestamptz,
  follow_up_2_due   date,
  follow_up_2_sent  timestamptz,
  reply_received    boolean DEFAULT false,
  reply_at          timestamptz,
  outcome           text,
  created_at        timestamptz DEFAULT now()
)`,

// Allow full access via anon key (no RLS for single-user tool)
`ALTER TABLE leads          DISABLE ROW LEVEL SECURITY`,
`ALTER TABLE import_batches DISABLE ROW LEVEL SECURITY`,
`ALTER TABLE user_profile   DISABLE ROW LEVEL SECURITY`,
`ALTER TABLE outreach_log   DISABLE ROW LEVEL SECURITY`,

]

async function runSQL(sql) {
  // Supabase exposes a pgmeta query endpoint via the pg REST API
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey':        ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  return { status: res.status, body: await res.text() }
}

// Alternative: try the pg endpoint
async function runSQLviaPG(sql) {
  const res = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'apikey':        ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  return { status: res.status, body: await res.text() }
}

console.log('🔧 Setting up ClientFlow database...\n')

let useRPC = true

for (const sql of STATEMENTS) {
  const preview = sql.trim().slice(0, 60).replace(/\n/g, ' ')
  process.stdout.write(`  ${preview}… `)

  let result = await runSQL(sql)
  if (result.status === 404 || result.status === 405) {
    // Try pg endpoint
    result = await runSQLviaPG(sql)
  }

  if (result.status === 200 || result.status === 204) {
    console.log('✅')
  } else {
    const body = result.body.slice(0, 200)
    if (body.includes('already exists') || body.includes('PGRST')) {
      console.log('✓ (already exists)')
    } else {
      console.log(`⚠ ${result.status}: ${body}`)
    }
  }
}

console.log('\n✅ Done — checking tables exist...')

// Verify by querying each table
const tables = ['import_batches', 'leads', 'user_profile', 'outreach_log']
for (const t of tables) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${t}?limit=0`, {
    headers: {
      'apikey':        ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
    }
  })
  const ok = res.status === 200
  console.log(`  ${ok ? '✅' : '❌'} ${t} (HTTP ${res.status})`)
}
