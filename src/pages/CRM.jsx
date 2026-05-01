// src/pages/CRM.jsx — Mobile: column picker. Desktop: horizontal kanban
import { useEffect, useState } from 'react'
import { leadsDB, outreachDB } from '../lib/db'
import { useFollowUps } from '../hooks/useFollowUps'
import { useNavigate } from 'react-router-dom'

const COLUMNS = [
  { key: 'unreviewed',  title: 'Unreviewed'  },
  { key: 'to_research', title: 'To Research' },
  { key: 'contacted',   title: 'Contacted'   },
  { key: 'followed_up', title: 'Followed Up' },
  { key: 'replied',     title: 'Replied'     },
  { key: 'converted',   title: 'Converted'   },
  { key: 'archived',    title: 'Archived'    },
]
const COL_TO_STATUS = {
  unreviewed: 'unreviewed', to_research: 'to_research',
  contacted: 'contacted', followed_up: 'contacted',
  replied: 'replied', converted: 'converted', archived: 'archived',
}

const FIT_COLORS = { 'HIGH FIT': '#4ade80', 'MODERATE FIT': '#fbbf24', 'LOW FIT': '#f87171' }
const STATUS_COLORS = { unreviewed: '#60a5fa', to_research: '#fbbf24', contacted: '#4ade80', replied: '#a78bfa', converted: '#4ade80', archived: '#555' }

export default function CRM() {
  const [leads, setLeads]   = useState([])
  const [logs, setLogs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCol, setActiveCol] = useState('unreviewed')
  const { followUps } = useFollowUps()
  const navigate = useNavigate()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [l, lg] = await Promise.all([leadsDB.getAll(), outreachDB.getAll()])
    setLeads(l); setLogs(lg); setLoading(false)
  }

  function getColumnLeads(colKey) {
    return leads.filter(lead => {
      const leadLogs  = logs.filter(l => l.lead_id === lead.id)
      const hasFU1    = leadLogs.some(l => l.follow_up_1_sent)
      if (colKey === 'followed_up') return lead.status === 'contacted' && hasFU1
      if (colKey === 'contacted')   return lead.status === 'contacted' && !hasFU1
      if (colKey === 'replied')     return lead.status === 'replied' || leadLogs.some(l => l.reply_received)
      return lead.status === COL_TO_STATUS[colKey]
    })
  }

  async function moveLead(id, colKey) {
    const newStatus = COL_TO_STATUS[colKey] || colKey
    await leadsDB.update(id, { status: newStatus })
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l))
  }

  if (loading) return <div className="flex items-center justify-center h-full text-sm" style={{ color: '#444' }}>Loading pipeline…</div>

  const activeLeads = getColumnLeads(activeCol)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: '#1e1e1e' }}>
        <h1 className="text-base font-bold text-white">Pipeline</h1>
        {followUps.length > 0 && (
          <span className="text-xs px-2 py-1 rounded-full font-semibold"
            style={{ background: 'rgba(220,38,38,0.12)', color: '#f87171', border: '1px solid rgba(220,38,38,0.2)' }}>
            {followUps.length} FU due
          </span>
        )}
      </div>

      {/* ── MOBILE: Column picker + card list ── */}
      <div className="flex flex-col flex-1 overflow-hidden md:hidden">
        {/* Column picker */}
        <div className="flex overflow-x-auto gap-1.5 px-3 py-2 shrink-0" style={{ borderBottom: '1px solid #1e1e1e' }}>
          {COLUMNS.map(col => {
            const count = getColumnLeads(col.key).length
            const active = activeCol === col.key
            return (
              <button key={col.key}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap"
                style={{
                  background: active ? '#4ade80' : '#1c1c1c',
                  color: active ? '#000' : '#888',
                  border: '1px solid ' + (active ? '#4ade80' : '#2a2a2a'),
                }}
                onClick={() => setActiveCol(col.key)}>
                {col.title}
                {count > 0 && (
                  <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none"
                    style={{ background: active ? 'rgba(0,0,0,0.2)' : '#2a2a2a', color: active ? '#000' : '#888' }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Cards in active column */}
        <div className="flex-1 overflow-y-auto">
          {activeLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40">
              <div className="text-2xl mb-2">📭</div>
              <div className="text-xs" style={{ color: '#444' }}>No leads in {COLUMNS.find(c => c.key === activeCol)?.title}</div>
            </div>
          ) : activeLeads.map(lead => (
            <div key={lead.id} className="border-b px-4 py-3.5"
              style={{ borderColor: '#111' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: '#c0c0c0' }}>{lead.handle}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#555' }}>
                    {lead.subscribers} · <span style={{ color: FIT_COLORS[lead.fit_score] || '#888' }}>{lead.fit_score}</span>
                  </div>
                </div>
                <button
                  className="text-xs px-3 py-1.5 rounded-lg shrink-0"
                  style={{ background: 'rgba(74,222,128,0.08)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}
                  onClick={() => navigate(`/research/${lead.id}`)}>
                  Open →
                </button>
              </div>
              {/* Move to dropdown */}
              <div className="mt-2">
                <select
                  className="text-xs px-2 py-1.5 rounded-lg outline-none w-full"
                  style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', color: '#888' }}
                  value={activeCol}
                  onChange={e => moveLead(lead.id, e.target.value)}>
                  <option value="" disabled>Move to…</option>
                  {COLUMNS.filter(c => c.key !== activeCol).map(c => (
                    <option key={c.key} value={c.key}>{c.title}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DESKTOP: Horizontal kanban ── */}
      <div className="hidden md:flex flex-1 overflow-x-auto p-4 gap-4">
        {COLUMNS.map(col => {
          const colLeads = getColumnLeads(col.key)
          return (
            <div key={col.key} className="flex flex-col shrink-0 w-52 rounded-xl overflow-hidden"
              style={{ background: '#141414', border: '1px solid #1e1e1e' }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { const id = e.dataTransfer.getData('leadId'); if (id) moveLead(id, col.key) }}>
              <div className="px-3 py-2.5 border-b flex items-center justify-between" style={{ borderColor: '#1e1e1e' }}>
                <span className="text-xs font-semibold" style={{ color: '#888' }}>{col.title}</span>
                {colLeads.length > 0 && (
                  <span className="text-[10px] px-1.5 rounded-full font-bold"
                    style={{ background: '#2a2a2a', color: '#555' }}>{colLeads.length}</span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
                {colLeads.map(lead => (
                  <div key={lead.id}
                    className="kanban-card p-3 rounded-lg cursor-grab active:cursor-grabbing"
                    style={{ background: '#1c1c1c', border: '1px solid #2a2a2a' }}
                    draggable
                    onDragStart={e => e.dataTransfer.setData('leadId', lead.id)}
                    onClick={() => navigate(`/research/${lead.id}`)}>
                    <div className="text-xs font-medium truncate" style={{ color: '#c0c0c0' }}>{lead.handle}</div>
                    <div className="text-[10px] mt-1" style={{ color: '#555' }}>{lead.subscribers}</div>
                    <div className="text-[10px] mt-0.5 font-bold" style={{ color: FIT_COLORS[lead.fit_score] || '#888' }}>{lead.fit_score}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
