/* ──────────────────────────────────────────────────────────────
   src/lib/db.js
   Unified data layer — uses Supabase when tables exist, 
   falls back to localStorage when they don't.
   This lets the app run immediately without any DB setup.
   ────────────────────────────────────────────────────────────── */
import { supabase } from './supabase'

// ── localStorage helpers ──────────────────────────────────────
function lsGet(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}
function lsSet(key, val) { localStorage.setItem(key, JSON.stringify(val)) }
function uid() { return crypto.randomUUID() }

// ── Check Supabase availability ───────────────────────────────
// Only true when tables actually exist (zero errors)
let _supabaseReady = null
export async function isSupabaseReady() {
  if (_supabaseReady !== null) return _supabaseReady
  try {
    const { error } = await supabase.from('leads').select('id').limit(1)
    // ANY error (incl. PGRST205 table-not-found) = not ready → use localStorage
    _supabaseReady = !error
  } catch {
    _supabaseReady = false
  }
  return _supabaseReady
}
export function resetSupabaseReady() { _supabaseReady = null }

// ── LEADS ─────────────────────────────────────────────────────
export const leadsDB = {
  async getAll(filters = {}) {
    if (await isSupabaseReady()) {
      let q = supabase.from('leads').select('*').order('added_at', { ascending: false })
      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status)
      if (filters.fit    && filters.fit    !== 'all') q = q.eq('fit_score', filters.fit)
      if (filters.search) q = q.or(`handle.ilike.%${filters.search}%,channel_name.ilike.%${filters.search}%`)
      const { data } = await q
      return data || []
    }
    let leads = lsGet('cf_leads', [])
    if (filters.status && filters.status !== 'all') leads = leads.filter(l => l.status === filters.status)
    if (filters.fit    && filters.fit    !== 'all') leads = leads.filter(l => l.fit_score === filters.fit)
    if (filters.search) {
      const s = filters.search.toLowerCase()
      leads = leads.filter(l => l.handle?.toLowerCase().includes(s) || l.channel_name?.toLowerCase().includes(s))
    }
    return leads.sort((a, b) => new Date(b.added_at) - new Date(a.added_at))
  },

  async getById(id) {
    if (await isSupabaseReady()) {
      const { data } = await supabase.from('leads').select('*').eq('id', id).single()
      return data
    }
    return lsGet('cf_leads', []).find(l => l.id === id) || null
  },

  async upsertMany(leads, batchId) {
    const now = new Date().toISOString()
    // Read existing from localStorage (always the source of truth)
    const existing = lsGet('cf_leads', [])
    const existingHandles = new Set(existing.map(l => l.handle.toLowerCase()))

    const toInsert = []
    let skipped = 0
    for (const l of leads) {
      const h = (l.handle || '').toLowerCase()
      if (existingHandles.has(h)) { skipped++; continue }
      toInsert.push({ ...l, id: uid(), batch_id: batchId, added_at: now, updated_at: now })
    }

    // ALWAYS write to localStorage first
    lsSet('cf_leads', [...existing, ...toInsert])

    // Also sync to Supabase if tables exist (bonus)
    if (await isSupabaseReady() && toInsert.length > 0) {
      await supabase.from('leads').insert(toInsert).then()
    }

    return { inserted: toInsert.length, skipped }
  },

  async update(id, patch) {
    const upd = { ...patch, updated_at: new Date().toISOString() }
    // Always update localStorage
    const all = lsGet('cf_leads', [])
    lsSet('cf_leads', all.map(l => l.id === id ? { ...l, ...upd } : l))
    // Sync to Supabase if available
    if (await isSupabaseReady()) {
      await supabase.from('leads').update(upd).eq('id', id).then()
    }
  },

  async getCounts() {
    const all = await this.getAll()
    const counts = { unreviewed: 0, to_research: 0, contacted: 0, archived: 0, total: 0 }
    all.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; counts.total++ })
    return counts
  },
}

// ── IMPORT BATCHES ────────────────────────────────────────────
export const batchesDB = {
  async create(meta) {
    const batch = { ...meta, id: uid(), imported_at: new Date().toISOString() }
    // Always write to localStorage
    const all = lsGet('cf_batches', [])
    lsSet('cf_batches', [...all, batch])
    // Sync to Supabase if available
    if (await isSupabaseReady()) {
      await supabase.from('import_batches').insert(batch).then()
    }
    return batch
  },
}

// ── USER PROFILE ──────────────────────────────────────────────
export const profileDB = {
  async get() {
    // localStorage is source of truth; Supabase read is optional
    const local = lsGet('cf_profile', null)
    if (local) return local
    if (await isSupabaseReady()) {
      const { data } = await supabase.from('user_profile').select('*').limit(1).single()
      if (data) { lsSet('cf_profile', data); return data }
    }
    return {}
  },

  async save(patch) {
    const current = lsGet('cf_profile', {})
    const updated = { ...current, ...patch, id: current.id || uid() }
    lsSet('cf_profile', updated)
    if (await isSupabaseReady()) {
      if (current.id) {
        await supabase.from('user_profile').update(patch).eq('id', current.id).then()
      } else {
        await supabase.from('user_profile').insert(updated).then()
      }
    }
  },
}

// ── OUTREACH LOG ──────────────────────────────────────────────
export const outreachDB = {
  async create(entry) {
    const log = { ...entry, id: uid(), created_at: new Date().toISOString() }
    // Always write to localStorage first
    const all = lsGet('cf_outreach', [])
    lsSet('cf_outreach', [...all, log])
    if (await isSupabaseReady()) {
      await supabase.from('outreach_log').insert(log).then()
    }
    return log
  },

  async getForLead(leadId) {
    return lsGet('cf_outreach', []).filter(l => l.lead_id === leadId)
  },

  async getAll() {
    const logs  = lsGet('cf_outreach', [])
    const leads = lsGet('cf_leads', [])
    return logs.map(l => ({ ...l, leads: leads.find(ld => ld.id === l.lead_id) }))
  },

  async update(id, patch) {
    const all = lsGet('cf_outreach', [])
    lsSet('cf_outreach', all.map(l => l.id === id ? { ...l, ...patch } : l))
    if (await isSupabaseReady()) {
      await supabase.from('outreach_log').update(patch).eq('id', id).then()
    }
  },

  async getDueFollowUps() {
    const today = new Date().toISOString().split('T')[0]
    const all   = await this.getAll()
    const fu1 = all.filter(l => l.follow_up_1_due && l.follow_up_1_due <= today && !l.follow_up_1_sent).map(l => ({ ...l, fuNum: 1 }))
    const fu2 = all.filter(l => l.follow_up_2_due && l.follow_up_2_due <= today && !l.follow_up_2_sent && l.follow_up_1_sent).map(l => ({ ...l, fuNum: 2 }))
    return [...fu1, ...fu2]
  },
}
