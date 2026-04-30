-- ──────────────────────────────────────────────────────────────
-- ClientFlow Supabase Schema — ADR-002
-- Run this in Supabase Dashboard → SQL Editor
-- ──────────────────────────────────────────────────────────────

-- 1. import_batches (must exist before leads FK)
CREATE TABLE IF NOT EXISTS import_batches (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source       text,                        -- "leadscout_pdf" / "csv" / "manual"
  filename     text,
  export_date  date,
  lead_count   int,
  imported_at  timestamptz DEFAULT now()
);

-- 2. leads
CREATE TABLE IF NOT EXISTS leads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle           text NOT NULL,            -- @handle (lowercase)
  channel_name     text,
  channel_url      text,
  subscribers      text,
  niche            text,
  fit_score        text,                     -- "HIGH FIT" / "MODERATE FIT" / "LOW FIT"
  fit_reason       text,
  email            text,
  instagram        text,
  twitter          text,
  website          text,
  contact_method   text,
  contact_status   text DEFAULT 'unknown',   -- "verified"/"form_only"/"dm_only"/"unknown"
  latest_video     text,
  notes            text,
  status           text DEFAULT 'unreviewed',
                                             -- "unreviewed"/"to_research"/"contacted"
                                             -- "replied"/"converted"/"archived"
  batch_id         uuid REFERENCES import_batches(id) ON DELETE SET NULL,
  added_at         timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- Unique index on handle (case-insensitive deduplication)
CREATE UNIQUE INDEX IF NOT EXISTS leads_handle_unique ON leads (lower(handle));

-- 3. user_profile
CREATE TABLE IF NOT EXISTS user_profile (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text,
  service_desc      text,
  proof_line        text,
  email_signature   text,
  groq_key_ref      text,                   -- Groq API key (stored in profile for client-side version)
  followup_days_1   int DEFAULT 4,
  followup_days_2   int DEFAULT 5,
  created_at        timestamptz DEFAULT now()
);

-- 4. outreach_log
CREATE TABLE IF NOT EXISTS outreach_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid REFERENCES leads(id) ON DELETE CASCADE,
  contacted_at      timestamptz DEFAULT now(),
  channel_used      text,                   -- "email" / "instagram" / "twitter"
  subject_line      text,
  message_body      text,
  hook_style        text,                   -- "observation" / "result" / "curiosity"
  groq_model        text,
  sequence_num      int DEFAULT 1,          -- 1=initial, 2=FU1, 3=FU2
  follow_up_1_due   date,
  follow_up_1_sent  timestamptz,
  follow_up_2_due   date,
  follow_up_2_sent  timestamptz,
  reply_received    boolean DEFAULT false,
  reply_at          timestamptz,
  outcome           text,                   -- "converted"/"not_interested"/"no_reply"/"open"
  created_at        timestamptz DEFAULT now()
);

-- ── Row Level Security ──────────────────────────────────────────
-- NOTE: For a single-user no-auth setup, RLS can be disabled.
-- To disable: ALTER TABLE leads DISABLE ROW LEVEL SECURITY; (etc.)
-- To enable with auth later, uncomment the policies below.

-- ALTER TABLE leads          ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE outreach_log   ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_profile   ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

-- Permissive policies (all access for authenticated users — single operator):
-- CREATE POLICY "Allow all for authenticated" ON leads         FOR ALL USING (true);
-- CREATE POLICY "Allow all for authenticated" ON outreach_log  FOR ALL USING (true);
-- CREATE POLICY "Allow all for authenticated" ON user_profile  FOR ALL USING (true);
-- CREATE POLICY "Allow all for authenticated" ON import_batches FOR ALL USING (true);
