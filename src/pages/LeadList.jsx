/* src/pages/LeadList.jsx — Mobile: card list + pill filters. Desktop: table */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeads } from '../hooks/useLeads'

const STATUS_OPTS  = ['all','unreviewed','to_research','contacted','archived']
const FIT_OPTS     = ['all','HIGH FIT','MODERATE FIT','LOW FIT']
const FIT_COLORS   = { 'HIGH FIT': '#4ade80', 'MODERATE FIT': '#fbbf24', 'LOW FIT': '#f87171' }
const STATUS_COLORS= { unreviewed: '#60a5fa', to_research: '#fbbf24', contacted: '#4ade80', archived: '#555' }

function daysSince(d) {
  if (!d) return '—'
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000) + 'd'
}

function SkeletonCard() {
  return (
    <div className="p-4 border-b" style={{ borderColor: '#111' }}>
      <div className="flex items-center gap-3">
        <div className="skeleton w-10 h-10 rounded-lg" />
        <div className="flex-1">
          <div className="skeleton h-3 w-32 mb-2" />
          <div className="skeleton h-2.5 w-20" />
        </div>
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
    </div>
  )
}

export default function LeadList() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({ status: 'all', fit: 'all', search: '' })
  const [counts, setCounts]   = useState({})
  const [detailLead, setDetailLead] = useState(null)
  const { leads, loading, getCounts } = useLeads(
    Object.fromEntries(Object.entries(filters).filter(([,v]) => v && v !== 'all'))
  )

  useEffect(() => { getCounts().then(setCounts) }, [leads])

  const STATS = [
    { label: 'Unreviewed',  value: counts.unreviewed || 0, status: 'unreviewed', color: '#60a5fa' },
    { label: 'To Research', value: counts.to_research || 0, status: 'to_research', color: '#fbbf24' },
    { label: 'Contacted',   value: counts.contacted   || 0, status: 'contacted',   color: '#4ade80' },
    { label: 'Archived',    value: counts.archived    || 0, status: 'archived',    color: '#555' },
    { label: 'Total',       value: counts.total       || 0, status: 'all',         color: '#e8e8e8' },
  ]

  return (
    <div className="flex h-full overflow-hidden">

      {/* Desktop filter sidebar */}
      <div className="hidden md:block w-48 shrink-0 border-r overflow-y-auto py-4 px-3"
        style={{ background: '#0d0d0d', borderColor: '#1e1e1e' }}>
        <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#555' }}>Status</div>
        {STATUS_OPTS.map(s => (
          <button key={s}
            className="block w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium mb-0.5 transition-colors capitalize"
            style={{ background: filters.status === s ? 'rgba(74,222,128,0.08)' : 'transparent', color: filters.status === s ? '#4ade80' : '#6b6b6b' }}
            onClick={() => setFilters(f => ({ ...f, status: s }))}>
            {s === 'all' ? 'All Statuses' : s.replace('_', ' ')}
          </button>
        ))}
        <div className="text-xs font-semibold uppercase tracking-wider mt-4 mb-3" style={{ color: '#555' }}>Fit Score</div>
        {FIT_OPTS.map(f => (
          <button key={f}
            className="block w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium mb-0.5 transition-colors"
            style={{ background: filters.fit === f ? 'rgba(74,222,128,0.08)' : 'transparent', color: filters.fit === f ? '#4ade80' : '#6b6b6b' }}
            onClick={() => setFilters(prev => ({ ...prev, fit: f }))}>
            {f === 'all' ? 'All Fits' : f}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: '#1e1e1e' }}>
          <h1 className="text-base font-bold text-white">Lead List</h1>
          <div className="flex gap-2">
            {counts.unreviewed > 0 && (
              <button className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}
                onClick={() => navigate('/swiper')}>
                👆 Swiper ({counts.unreviewed})
              </button>
            )}
            <button className="px-3 py-1.5 rounded-lg text-xs font-semibold hidden md:block"
              style={{ background: '#4ade80', color: '#000' }}
              onClick={() => navigate('/import')}>
              ⬆ Import
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex border-b shrink-0 overflow-x-auto" style={{ borderColor: '#1e1e1e' }}>
          {STATS.map(s => (
            <button key={s.status}
              className="flex-1 py-2.5 text-center text-xs transition-colors border-r last:border-r-0 min-w-[64px]"
              style={{ borderColor: '#1e1e1e', background: filters.status === s.status ? 'rgba(255,255,255,0.03)' : 'transparent' }}
              onClick={() => setFilters(f => ({ ...f, status: s.status }))}>
              <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] mt-0.5" style={{ color: '#555' }}>{s.label}</div>
            </button>
          ))}
        </div>

        {/* Mobile filters row */}
        <div className="flex md:hidden gap-1.5 px-3 py-2 overflow-x-auto shrink-0" style={{ borderBottom: '1px solid #1e1e1e' }}>
          {STATUS_OPTS.map(s => (
            <button key={s}
              className="shrink-0 px-2.5 py-1 rounded-full text-xs font-medium capitalize whitespace-nowrap"
              style={{ background: filters.status === s ? '#4ade80' : '#1c1c1c', color: filters.status === s ? '#000' : '#888', border: '1px solid #2a2a2a' }}
              onClick={() => setFilters(f => ({ ...f, status: s }))}>
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b shrink-0" style={{ borderColor: '#1e1e1e' }}>
          <input
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: '#141414', border: '1px solid #2a2a2a', color: '#e8e8e8', fontSize: 16 }}
            placeholder="Search handle or channel…"
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          />
        </div>

        {/* List / Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <>{[1,2,3,4,5].map(i => <SkeletonCard key={i} />)}</>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="text-3xl mb-2">📭</div>
              <div className="text-sm" style={{ color: '#444' }}>
                No leads. <button className="underline" style={{ color: '#4ade80' }} onClick={() => navigate('/import')}>Import</button>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="md:hidden">
                {leads.map(lead => (
                  <div key={lead.id} className="flex items-center gap-3 px-4 py-3.5 border-b active:bg-white/5"
                    style={{ borderColor: '#111' }}
                    onClick={() => setDetailLead(lead)}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: '#1a2a1a', color: '#4ade80' }}>
                      {(lead.channel_name || lead.handle)[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: '#c0c0c0' }}>{lead.handle}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs" style={{ color: '#555' }}>{lead.subscribers}</span>
                        {lead.email    && <span style={{ color: '#4ade80', fontSize: 10 }}>✉</span>}
                        {lead.instagram && <span style={{ color: '#e1306c', fontSize: 10 }}>IG</span>}
                        {lead.linkedin  && <span style={{ color: '#0a66c2', fontSize: 10 }}>in</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold" style={{ color: FIT_COLORS[lead.fit_score] || '#888' }}>
                        {(lead.fit_score || '').replace(' FIT', '')}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
                        style={{ background: `${STATUS_COLORS[lead.status] || '#555'}20`, color: STATUS_COLORS[lead.status] || '#555' }}>
                        {(lead.status || 'unreviewed').replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <table className="hidden md:table w-full text-xs">
                <thead>
                  <tr style={{ background: '#0f0f0f' }}>
                    {['Handle','Subscribers','Fit','Contact','Status','Added'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 font-semibold uppercase tracking-wider border-b"
                        style={{ borderColor: '#1e1e1e', color: '#555' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => (
                    <tr key={lead.id} className="border-b cursor-pointer hover:bg-white/[0.02]"
                      style={{ borderColor: '#111' }}
                      onClick={() => setDetailLead(lead)}>
                      <td className="px-4 py-3">
                        <div className="font-mono font-medium" style={{ color: '#c0c0c0' }}>{lead.handle}</div>
                        <div className="text-xs mt-0.5" style={{ color: '#444' }}>{lead.channel_name}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold font-mono" style={{ color: '#888' }}>{lead.subscribers || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold" style={{ color: FIT_COLORS[lead.fit_score] || '#888', fontSize: 10 }}>{lead.fit_score || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 items-center">
                          {lead.email     && <span title={lead.email}     style={{ color: '#4ade80' }}>✉</span>}
                          {lead.instagram && <span title={lead.instagram} style={{ color: '#e1306c' }}>IG</span>}
                          {lead.twitter   && <span title={lead.twitter}   style={{ color: '#60a5fa' }}>𝕏</span>}
                          {lead.linkedin  && <span title={lead.linkedin}  style={{ color: '#0a66c2' }}>in</span>}
                          {!lead.email && !lead.instagram && !lead.twitter && !lead.linkedin && <span style={{ color: '#333' }}>—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                          style={{ background: `${STATUS_COLORS[lead.status] || '#555'}15`, color: STATUS_COLORS[lead.status] || '#555' }}>
                          {(lead.status || 'unreviewed').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: '#444' }}>{daysSince(lead.added_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      {/* Detail panel — full screen on mobile, side panel on desktop */}
      {detailLead && (
        <div className="fixed inset-0 z-50 flex items-start justify-end"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setDetailLead(null)}>
          <div
            className="h-full overflow-y-auto slide-in-right p-5 w-full md:w-80"
            style={{ background: '#111', borderLeft: '1px solid #2a2a2a' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white">{detailLead.handle}</h3>
              <button className="text-xl p-1" style={{ color: '#555' }} onClick={() => setDetailLead(null)}>✕</button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              {[
                ['Channel',     detailLead.channel_name],
                ['Subscribers', detailLead.subscribers],
                ['Fit Score',   detailLead.fit_score],
                ['Fit Reason',  detailLead.fit_reason],
                ['Status',      detailLead.status?.replace('_', ' ')],
                ['Notes',       detailLead.notes],
              ].map(([k, v]) => v ? (
                <div key={k} className="pb-2.5 border-b" style={{ borderColor: '#1e1e1e' }}>
                  <div style={{ color: '#555' }}>{k}</div>
                  <div className="mt-0.5" style={{ color: '#c0c0c0' }}>{v}</div>
                </div>
              ) : null)}

              {detailLead.email && (
                <div className="pb-2.5 border-b" style={{ borderColor: '#1e1e1e' }}>
                  <div style={{ color: '#555' }}>Email</div>
                  <a href={`mailto:${detailLead.email}`} className="mt-0.5 block hover:underline truncate" style={{ color: '#4ade80' }}>
                    ✉ {detailLead.email}
                  </a>
                </div>
              )}
              {detailLead.instagram && (
                <div className="pb-2.5 border-b" style={{ borderColor: '#1e1e1e' }}>
                  <div style={{ color: '#555' }}>Instagram</div>
                  <a href={`https://instagram.com/${detailLead.instagram.replace('@','')}`} target="_blank" rel="noreferrer"
                    className="mt-0.5 block hover:underline" style={{ color: '#e1306c' }}>
                    IG {detailLead.instagram}
                  </a>
                </div>
              )}
              {detailLead.twitter && (
                <div className="pb-2.5 border-b" style={{ borderColor: '#1e1e1e' }}>
                  <div style={{ color: '#555' }}>Twitter / X</div>
                  <a href={`https://twitter.com/${detailLead.twitter.replace('@','')}`} target="_blank" rel="noreferrer"
                    className="mt-0.5 block hover:underline" style={{ color: '#60a5fa' }}>
                    𝕏 {detailLead.twitter}
                  </a>
                </div>
              )}
              {detailLead.linkedin && (
                <div className="pb-2.5 border-b" style={{ borderColor: '#1e1e1e' }}>
                  <div style={{ color: '#555' }}>LinkedIn</div>
                  <a href={detailLead.linkedin.startsWith('http') ? detailLead.linkedin : `https://linkedin.com/in/${detailLead.linkedin.replace('@','')}`}
                    target="_blank" rel="noreferrer" className="mt-0.5 block hover:underline truncate" style={{ color: '#0a66c2' }}>
                    in {detailLead.linkedin}
                  </a>
                </div>
              )}
              {detailLead.website && (
                <div className="pb-2.5 border-b" style={{ borderColor: '#1e1e1e' }}>
                  <div style={{ color: '#555' }}>Website</div>
                  <a href={detailLead.website.startsWith('http') ? detailLead.website : `https://${detailLead.website}`}
                    target="_blank" rel="noreferrer" className="mt-0.5 block hover:underline truncate" style={{ color: '#fbbf24' }}>
                    🌐 {detailLead.website}
                  </a>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 mt-5">
              {detailLead.channel_url && (
                <a href={detailLead.channel_url} target="_blank" rel="noreferrer"
                  className="block text-center text-xs py-3 rounded-xl font-medium"
                  style={{ background: 'rgba(74,222,128,0.08)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
                  ↗ View YouTube Channel
                </a>
              )}
              <a href={`https://www.youtube.com/@${detailLead.handle?.replace('@','')}/about`}
                target="_blank" rel="noreferrer"
                className="block text-center text-xs py-3 rounded-xl"
                style={{ background: '#1c1c1c', color: '#888', border: '1px solid #2a2a2a' }}>
                ▶ YouTube About Page
              </a>
              <button
                className="w-full text-center text-xs py-3 rounded-xl"
                style={{ background: '#1c1c1c', color: '#888', border: '1px solid #2a2a2a' }}
                onClick={() => { setDetailLead(null); navigate(`/research/${detailLead.id}`) }}>
                ✏ Edit Research Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
