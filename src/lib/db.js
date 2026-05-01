/* ──────────────────────────────────────────────────────────────
   src/lib/db.js  v2 — Supabase PRIMARY, localStorage = offline cache
   Write-through: Supabase first → mirror to cache.
   Offline: queue writes → flush on reconnect.
   ────────────────────────────────────────────────────────────── */
import { supabase } from './supabase'

// ── localStorage helpers ──────────────────────────────────────
function lsGet(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}
function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }
function uid() { return crypto.randomUUID() }

// ── Network helpers ───────────────────────────────────────────
export function isOnline() { return navigator.onLine !== false }

// ── Offline Write Queue ───────────────────────────────────────
const QUEUE_KEY = 'cf_offline_queue'

function enqueue(op) {
  const q = lsGet(QUEUE_KEY, [])
  lsSet(QUEUE_KEY, [...q, { ...op, _queuedAt: Date.now() }])
}

export async function flushOfflineQueue() {
  const q = lsGet(QUEUE_KEY, [])
  if (!q.length) return 0
  const remaining = []
  let flushed = 0
  for (const op of q) {
    try {
      if      (op.type === 'insert') await supabase.from(op.table).insert(op.data)
      else if (op.type === 'upsert') await supabase.from(op.table).upsert(op.data, { onConflict: 'id' })
      else if (op.type === 'update') await supabase.from(op.table).update(op.data).eq('id', op.id)
      flushed++
    } catch {
      remaining.push(op)
    }
  }
  lsSet(QUEUE_KEY, remaining)
  return flushed
}

export function getPendingCount() { return (lsGet(QUEUE_KEY, [])).length }

// Call once from App.jsx — listens for reconnect and flushes queue
export function initOfflineSync() {
  window.addEventListener('online', () => { flushOfflineQueue() })
}

// ── Safe Supabase write helper ────────────────────────────────
// Tries Supabase; if offline or error → enqueues for later
async function sbWrite(type, table, data, id = null) {
  if (!isOnline()) { enqueue({ type, table, data, id }); return { queued: true } }
  try {
    if      (type === 'insert') { const r = await supabase.from(table).insert(data).select().single(); if (r.error) throw r.error; return r.data }
    else if (type === 'upsert') { const r = await supabase.from(table).upsert(data, { onConflict: 'id' }).select().single(); if (r.error) throw r.error; return r.data }
    else if (type === 'update') { const r = await supabase.from(table).update(data).eq('id', id).select().single(); if (r.error) throw r.error; return r.data }
  } catch (e) {
    enqueue({ type, table, data, id })
    return { queued: true }
  }
}

// ── Safe Supabase read helper ─────────────────────────────────
// Merges Supabase response with locally-written records not yet synced.
// This prevents locally-inserted leads from disappearing when Supabase
// returns an older snapshot.
async function sbRead(table, cacheKey, buildQuery) {
  const cached = lsGet(cacheKey, [])
  if (isOnline()) {
    try {
      const { data, error } = await buildQuery(supabase.from(table))
      if (!error && data !== null) {
        // Keep any records that exist locally but aren't in Supabase yet
        const sbIds = new Set(data.map(r => r.id))
        const localOnly = cached.filter(r => r.id && !sbIds.has(r.id))
        const merged = [...data, ...localOnly]
        lsSet(cacheKey, merged)
        return { data: merged, fromCache: false }
      }
    } catch {}
  }
  return { data: cached, fromCache: true }
}

// ── LEADS ─────────────────────────────────────────────────────
export const leadsDB = {
  async getAll(filters = {}) {
    const { data } = await sbRead('leads', 'cf_cache_leads', q => {
      let query = q.select('*').order('added_at', { ascending: false })
      if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
      if (filters.fit    && filters.fit    !== 'all') query = query.eq('fit_score', filters.fit)
      if (filters.search) query = query.or(`handle.ilike.%${filters.search}%,channel_name.ilike.%${filters.search}%`)
      return query
    })
    let rows = data || []
    // Apply filters to cached data if we got from cache
    if (filters.status && filters.status !== 'all') rows = rows.filter(l => l.status === filters.status)
    if (filters.fit    && filters.fit    !== 'all') rows = rows.filter(l => l.fit_score === filters.fit)
    if (filters.search) {
      const s = filters.search.toLowerCase()
      rows = rows.filter(l => l.handle?.toLowerCase().includes(s) || l.channel_name?.toLowerCase().includes(s))
    }
    return rows
  },

  async getById(id) {
    const all = await this.getAll()
    return all.find(l => l.id === id) || null
  },

  async upsertMany(leads, batchId) {
    const now = new Date().toISOString()
    const existing = await this.getAll()
    const existingHandles = new Set(existing.map(l => (l.handle || '').toLowerCase()))
    const toInsert = []
    let skipped = 0
    for (const l of leads) {
      const h = (l.handle || '').toLowerCase()
      if (existingHandles.has(h)) { skipped++; continue }
      toInsert.push({ ...l, id: uid(), batch_id: batchId, added_at: now, updated_at: now })
    }
    if (toInsert.length > 0) {
      // Update cache immediately for instant UI
      const cached = lsGet('cf_cache_leads', [])
      lsSet('cf_cache_leads', [...toInsert, ...cached])
      // Write to Supabase — retry without batch_id if FK fails
      if (isOnline()) {
        try {
          const { error } = await supabase.from('leads').insert(toInsert)
          if (error) {
            // FK violation on batch_id? retry without it
            if (error.code === '23503') {
              const stripped = toInsert.map(({ batch_id, ...r }) => r)
              const r2 = await supabase.from('leads').insert(stripped)
              if (r2.error) toInsert.forEach(r => enqueue({ type: 'insert', table: 'leads', data: r }))
            } else {
              toInsert.forEach(r => enqueue({ type: 'insert', table: 'leads', data: r }))
            }
          }
        } catch {
          toInsert.forEach(r => enqueue({ type: 'insert', table: 'leads', data: r }))
        }
      } else {
        toInsert.forEach(r => enqueue({ type: 'insert', table: 'leads', data: r }))
      }
    }
    return { inserted: toInsert.length, skipped }
  },

  async update(id, patch) {
    const upd = { ...patch, updated_at: new Date().toISOString() }
    // Update cache immediately
    const cached = lsGet('cf_cache_leads', [])
    lsSet('cf_cache_leads', cached.map(l => l.id === id ? { ...l, ...upd } : l))
    await sbWrite('update', 'leads', upd, id)
  },

  async delete(id) {
    // Remove from cache immediately
    const cached = lsGet('cf_cache_leads', [])
    lsSet('cf_cache_leads', cached.filter(l => l.id !== id))
    // Delete from Supabase
    if (isOnline()) {
      try {
        const { error } = await supabase.from('leads').delete().eq('id', id)
        if (error) throw error
      } catch (e) {
        // Re-add to cache on failure so data isn't lost
        const c = lsGet('cf_cache_leads', [])
        const deleted = cached.find(l => l.id === id)
        if (deleted) lsSet('cf_cache_leads', [deleted, ...c])
        throw e
      }
    }
  },

  async getCounts() {
    const all = await this.getAll()
    const c = { unreviewed: 0, to_research: 0, contacted: 0, replied: 0, converted: 0, archived: 0, total: 0 }
    all.forEach(l => { if (c[l.status] !== undefined) c[l.status]++; c.total++ })
    return c
  },
}


// ── IMPORT BATCHES ────────────────────────────────────────────
export const batchesDB = {
  async create(meta) {
    const batch = { ...meta, id: uid(), imported_at: new Date().toISOString() }
    const cached = lsGet('cf_cache_batches', [])
    lsSet('cf_cache_batches', [...cached, batch])
    await sbWrite('insert', 'import_batches', batch)
    return batch
  },
}

// ── USER PROFILE ──────────────────────────────────────────────
export const profileDB = {
  async get() {
    const { data } = await sbRead('user_profile', 'cf_cache_profile', q =>
      q.select('*').limit(1).maybeSingle()
    )
    return (Array.isArray(data) ? data[0] : data) || {}
  },

  async save(patch) {
    const current = (Array.isArray(lsGet('cf_cache_profile')) ? lsGet('cf_cache_profile')[0] : lsGet('cf_cache_profile')) || {}
    const updated = { ...current, ...patch, id: current.id || uid(), updated_at: new Date().toISOString() }
    lsSet('cf_cache_profile', updated)
    if (current.id) {
      await sbWrite('update', 'user_profile', patch, current.id)
    } else {
      await sbWrite('insert', 'user_profile', updated)
    }
    return updated
  },
}

// ── OUTREACH LOG ──────────────────────────────────────────────
export const outreachDB = {
  async create(entry) {
    const log = { ...entry, id: uid(), created_at: new Date().toISOString() }
    // Update cache
    const cached = lsGet('cf_cache_outreach', [])
    lsSet('cf_cache_outreach', [...cached, log])
    await sbWrite('insert', 'outreach_log', log)
    return log
  },

  async getForLead(leadId) {
    const all = await this.getAll()
    return all.filter(l => l.lead_id === leadId)
  },

  async getAll() {
    const { data } = await sbRead('outreach_log', 'cf_cache_outreach', q =>
      q.select('*').order('created_at', { ascending: false })
    )
    return data || []
  },

  async update(id, patch) {
    const cached = lsGet('cf_cache_outreach', [])
    lsSet('cf_cache_outreach', cached.map(l => l.id === id ? { ...l, ...patch } : l))
    await sbWrite('update', 'outreach_log', patch, id)
  },

  async getDueFollowUps() {
    const today = new Date().toISOString().split('T')[0]
    const all = await this.getAll()
    const fu1 = all.filter(l => l.follow_up_1_due && l.follow_up_1_due <= today && !l.follow_up_1_sent).map(l => ({ ...l, fuNum: 1 }))
    const fu2 = all.filter(l => l.follow_up_2_due && l.follow_up_2_due <= today && !l.follow_up_2_sent && l.follow_up_1_sent).map(l => ({ ...l, fuNum: 2 }))
    return [...fu1, ...fu2]
  },
}
