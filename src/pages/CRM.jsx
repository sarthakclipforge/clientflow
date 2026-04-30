/* src/pages/CRM.jsx — Kanban pipeline + follow-up strip */
import { useEffect, useState } from 'react'
import { leadsDB, outreachDB } from '../lib/db'
import KanbanColumn from '../components/KanbanColumn'
import FollowUpStrip from '../components/FollowUpStrip'
import OutreachHistory from '../components/OutreachHistory'
import { useFollowUps } from '../hooks/useFollowUps'

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
  unreviewed:  'unreviewed',
  to_research: 'to_research',
  contacted:   'contacted',
  followed_up: 'contacted',
  replied:     'replied',
  converted:   'converted',
  archived:    'archived',
}

export default function CRM() {
  const [leads, setLeads]       = useState([])
  const [logs, setLogs]         = useState([])
  const [detailLead, setDetailLead] = useState(null)
  const [loading, setLoading]   = useState(true)
  const { followUps, refetch: refetchFU } = useFollowUps()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [leadsData, logsData] = await Promise.all([
      leadsDB.getAll(),
      outreachDB.getAll(),
    ])
    setLeads(leadsData)
    setLogs(logsData)
    setLoading(false)
  }

  function getColumnLeads(colKey) {
    return leads.filter(lead => {
      const leadLogs = logs.filter(l => l.lead_id === lead.id)
      const hasFU1Sent = leadLogs.some(l => l.follow_up_1_sent)
      if (colKey === 'followed_up') return lead.status === 'contacted' && hasFU1Sent
      if (colKey === 'contacted')   return lead.status === 'contacted' && !hasFU1Sent
      if (colKey === 'replied')     return lead.status === 'replied'   || leadLogs.some(l => l.reply_received)
      return lead.status === COL_TO_STATUS[colKey]
    })
  }

  async function handleDrop(colKey, { id }) {
    const newStatus = COL_TO_STATUS[colKey] || colKey
    await leadsDB.update(id, { status: newStatus })
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l))
  }

  if (loading) return <div className="flex items-center justify-center h-full text-sm" style={{ color: '#444' }}>Loading pipeline…</div>

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: '#1e1e1e' }}>
        <h1 className="text-lg font-bold text-white">Pipeline</h1>
        <div className="text-xs" style={{ color: '#555' }}>Drag cards between columns to update status</div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <FollowUpStrip followUps={followUps} />
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.key}
              title={col.title}
              leads={getColumnLeads(col.key)}
              onCardClick={setDetailLead}
              onDrop={(data) => handleDrop(col.key, data)}
            />
          ))}
        </div>
      </div>

      {detailLead && (
        <OutreachHistory lead={detailLead} onClose={() => { setDetailLead(null); refetchFU() }} />
      )}
    </div>
  )
}
