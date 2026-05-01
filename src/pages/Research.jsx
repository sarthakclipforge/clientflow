/* src/pages/Research.jsx — Post-swipe research panel */
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { leadsDB } from '../lib/db'

const CONTACT_STATUS_OPTS = [
  { value: 'verified',  label: 'Verified Email' },
  { value: 'form_only', label: 'Contact Form Only' },
  { value: 'dm_only',   label: 'DM Only' },
  { value: 'unknown',   label: 'Unknown' },
]

export default function Research() {
  const { leadId } = useParams()
  const navigate   = useNavigate()
  const [lead, setLead]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  const [form, setForm] = useState({
    email: '', instagram: '', twitter: '', linkedin: '', website: '',
    latest_video: '', notes: '', contact_status: 'unknown',
  })

  useEffect(() => { loadLead() }, [leadId])

  async function loadLead() {
    const data = await leadsDB.getById(leadId)
    if (data) {
      setLead(data)
      setForm({
        email:          data.email          || '',
        instagram:      data.instagram      || '',
        twitter:        data.twitter        || '',
        linkedin:       data.linkedin       || '',
        website:        data.website        || '',
        latest_video:   data.latest_video   || '',
        notes:          data.notes          || '',
        contact_status: data.contact_status || 'unknown',
      })
    }
    setLoading(false)
  }

  async function continueToContact() {
    setSaving(true)
    await leadsDB.update(leadId, { ...form })
    setSaving(false)
    navigate(`/contact/${leadId}`)
  }

  // Has enough data from import to skip research
  async function skipWithImportedData() {
    await leadsDB.update(leadId, { ...form, contact_status: form.email ? 'verified' : form.contact_status })
    navigate(`/contact/${leadId}`)
  }

  async function skipForNow() {
    await leadsDB.update(leadId, { ...form, status: 'to_research' })
    navigate('/swiper')
  }

  if (loading) return <div className="flex items-center justify-center h-full text-sm" style={{ color: '#444' }}>Loading…</div>
  if (!lead)   return <div className="flex items-center justify-center h-full text-sm" style={{ color: '#f87171' }}>Lead not found</div>

  const FIT_COLORS = { 'HIGH FIT': '#4ade80', 'MODERATE FIT': '#fbbf24', 'LOW FIT': '#f87171' }

  // Build smart quick-links for this channel
  const rawHandle  = (lead.handle || '').replace(/^@/, '')
  const ytAboutURL = `https://www.youtube.com/@${rawHandle}/about`
  const ytChannelURL = lead.channel_url || `https://www.youtube.com/@${rawHandle}`
  const googleSearchURL = `https://www.google.com/search?q=%22%40${rawHandle}%22+email+contact+youtube`

  // Detect if imported data is already rich enough to skip research
  const hasImportedContact = !!(lead.email || lead.instagram || lead.twitter || lead.linkedin || lead.website)

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-xl mx-auto w-full py-4 px-4">

        {/* Context card */}
        <div className="rounded-xl border p-4 mb-5" style={{ background: '#141414', borderColor: '#2a2a2a' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
              style={{ background: '#1a2a1a', color: '#4ade80' }}>
              {(lead.channel_name || lead.handle)[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white truncate">{lead.channel_name || lead.handle}</div>
              <div className="text-xs font-mono" style={{ color: '#6b6b6b' }}>{lead.handle} · {lead.subscribers}</div>
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded-full shrink-0"
              style={{ color: FIT_COLORS[lead.fit_score] || '#888' }}>
              {lead.fit_score}
            </span>
          </div>
          {lead.fit_reason && <p className="text-xs mt-2" style={{ color: '#888' }}>💡 {lead.fit_reason}</p>}
        </div>

        {/* ── Quick Links strip ─────────────────────────────────── */}
        <div className="rounded-xl border p-4 mb-5" style={{ background: '#0f1a0f', borderColor: 'rgba(74,222,128,0.2)' }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#4ade80' }}>
            🔍 Find Their Contact Info
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={ytAboutURL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{ background: 'rgba(255,0,0,0.12)', color: '#ff6b6b', border: '1px solid rgba(255,0,0,0.2)', textDecoration: 'none' }}
            >
              ▶ YouTube About Page
            </a>
            <a
              href={ytChannelURL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{ background: '#1c1c1c', color: '#888', border: '1px solid #2a2a2a', textDecoration: 'none' }}
            >
              📺 Channel Home
            </a>
            <a
              href={googleSearchURL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{ background: '#1c1c1c', color: '#888', border: '1px solid #2a2a2a', textDecoration: 'none' }}
            >
              🔍 Google for email
            </a>
          </div>
          <p className="text-xs mt-2.5" style={{ color: '#444' }}>
            Tip: The About page usually lists business email under "Contact". Copy it and paste below.
          </p>
        </div>

        {/* ── Skip banner — when imported data is already rich ── */}
        {hasImportedContact && (
          <div className="rounded-xl border p-4 mb-5 flex items-center justify-between gap-4"
            style={{ background: 'rgba(74,222,128,0.05)', borderColor: 'rgba(74,222,128,0.25)' }}>
            <div>
              <div className="text-sm font-semibold" style={{ color: '#4ade80' }}>
                ✓ Contact data already imported
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#888' }}>
                {lead.email     && <span className="mr-3">✉ {lead.email}</span>}
                {lead.instagram && <span className="mr-3">IG {lead.instagram}</span>}
                {lead.twitter   && <span className="mr-3">𝕏 {lead.twitter}</span>}
                {lead.linkedin  && <span>in {lead.linkedin}</span>}
              </div>
            </div>
            <button
              className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap"
              style={{ background: '#4ade80', color: '#000' }}
              onClick={skipWithImportedData}
            >
              Use this →
            </button>
          </div>
        )}

        <h2 className="text-lg font-bold text-white mb-1">Add / Update Details</h2>
        <p className="text-sm mb-5" style={{ color: '#6b6b6b' }}>
          Open the About page above, copy any contact info you find, paste below.
        </p>

        {/* Fields */}
        <div className="flex flex-col gap-4">
          {[
            { key: 'email',        label: '✉ Email',              placeholder: 'hello@creator.com',              type: 'email' },
            { key: 'instagram',    label: 'IG Instagram',         placeholder: '@creatorhandle',                 type: 'text' },
            { key: 'twitter',      label: '𝕏 Twitter / X',       placeholder: '@creatorhandle',                 type: 'text' },
            { key: 'linkedin',     label: 'in LinkedIn',          placeholder: 'linkedin.com/in/handle or @name', type: 'text' },
            { key: 'website',      label: '🌐 Website',           placeholder: 'https://creator.com',            type: 'url' },
            { key: 'latest_video', label: '🎬 Latest Video Title', placeholder: 'How I made $10k with AI…',     type: 'text' },
            { key: 'notes',        label: '📝 Notes',             placeholder: 'Anything notable…',             type: 'text' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>
                {f.label}
              </label>
              <input
                type={f.type}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', color: '#e8e8e8' }}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>Contact Status</label>
            <select
              className="px-3 py-2 rounded-lg text-sm outline-none w-full"
              style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', color: '#e8e8e8' }}
              value={form.contact_status}
              onChange={e => setForm(p => ({ ...p, contact_status: e.target.value }))}
            >
              {CONTACT_STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Actions — sticky on mobile */}
        <div className="sticky bottom-0 flex gap-3 mt-6 pb-4 pt-2" style={{ background: '#0a0a0a' }}>
          <button
            className="flex-1 py-3 rounded-xl font-semibold text-sm"
            style={{ background: '#4ade80', color: '#000' }}
            onClick={continueToContact}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Continue →'}
          </button>
          <button
            className="px-4 py-3 rounded-xl font-medium text-sm shrink-0"
            style={{ background: '#1c1c1c', color: '#888', border: '1px solid #2a2a2a' }}
            onClick={skipForNow}
            disabled={saving}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
