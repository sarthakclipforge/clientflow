# 🌊 ClientFlow
### Lead Outreach Pipeline — BAW Studios · Phase 2 of 2 · ADR-002

**Stack:** React + Vite · Tailwind CSS · Supabase · Groq API

---

## Quick Start

### 1. Supabase Setup (5 minutes)
1. Create a free project at [supabase.com](https://supabase.com)
2. Dashboard → **SQL Editor** → paste the contents of `supabase/schema.sql` → Run
3. Dashboard → **Settings → API** → copy `Project URL` and `anon public` key

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your Supabase URL and anon key
```

### 3. Install and Run
```bash
npm install
npm run dev
# Open http://localhost:5173
```

### 4. First-Time Setup in App
1. Go to **Settings** → fill in your name, service description, proof line, signature
2. Paste your Groq key (gsk_) — badge turns green
3. Go to **Import** → upload a LeadScout PDF
4. Go to **Swiper** → start swiping → Research Panel opens on right swipe
5. Make Contact → generate message → Mark as Sent → CRM tracks it

---

## Screens

| Route | Screen | Purpose |
|---|---|---|
| /leads | Lead List | Browse all leads, filters, stats strip |
| /swiper | Swiper | Card-by-card review — right = research, left = archive |
| /research/:id | Research Panel | Add email/IG/Twitter/video after right swipe |
| /contact/:id | Make Contact | AI message generation + send actions |
| /crm | Pipeline | 7-column Kanban + follow-up queue |
| /stats | Stats | Response rate, hook style, channel performance |
| /settings | Settings | Profile, Groq key, FU intervals |
| /import | Import | PDF / CSV / Manual lead import |

---

## Supabase Edge Function (Optional)

```bash
npm install -g supabase
supabase login
supabase functions deploy groq-proxy --project-ref YOUR_PROJECT_REF
supabase secrets set GROQ_API_KEY=gsk_...
```

Without the Edge Function, Groq calls go direct from the browser. Works fine for a single-user personal tool.

---

## Vercel Deployment
1. Push to GitHub
2. Connect repo in Vercel dashboard
3. Add env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
4. Deploy

---

*ClientFlow ADR-002 v1.1 · BAW Studios · Depends on ADR-001 (LeadScout Chrome Extension)*
