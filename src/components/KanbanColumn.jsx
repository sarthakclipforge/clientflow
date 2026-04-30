/* src/components/KanbanColumn.jsx */
import { useState } from 'react'

const FIT_COLORS = {
  'HIGH FIT':     '#4ade80',
  'MODERATE FIT': '#fbbf24',
  'LOW FIT':      '#f87171',
}

function daysSince(dateStr) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / 86400000)
}

export default function KanbanColumn({ title, leads = [], onCardClick, onDrop, overdue = false }) {
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      className="flex flex-col rounded-xl min-w-[200px] max-w-[220px] shrink-0"
      style={{
        background: '#0f0f0f',
        border: dragOver ? '1px solid #4ade80' : '1px solid #1e1e1e',
        transition: 'border-color 0.15s',
        height: 'fit-content',
        minHeight: '120px',
      }}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault()
        setDragOver(false)
        const data = JSON.parse(e.dataTransfer.getData('text/plain') || '{}')
        onDrop?.(data)
      }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: '#1e1e1e' }}>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#888' }}>
          {title}
        </span>
        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#1e1e1e', color: '#6b6b6b' }}>
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="p-2 flex flex-col gap-2">
        {leads.map(lead => {
          const days  = daysSince(lead.updated_at || lead.added_at)
          const isOverdue = overdue && lead._fuOverdue

          return (
            <div
              key={lead.id}
              className="kanban-card rounded-lg p-3 cursor-pointer hover:border-opacity-60 transition-all"
              style={{
                background: '#141414',
                border: isOverdue ? '1px solid rgba(220,38,38,0.4)' : '1px solid #222',
              }}
              draggable
              onDragStart={e => e.dataTransfer.setData('text/plain', JSON.stringify({ id: lead.id, handle: lead.handle }))}
              onClick={() => onCardClick?.(lead)}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-mono font-medium truncate" style={{ color: '#c0c0c0' }}>
                  {lead.handle}
                </span>
                {isOverdue && (
                  <span className="text-xs px-1 py-0.5 rounded" style={{ background: 'rgba(220,38,38,0.15)', color: '#f87171' }}>
                    FU!
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {lead.fit_score && (
                  <span className="text-xs" style={{ color: FIT_COLORS[lead.fit_score] || '#888' }}>
                    {lead.fit_score.split(' ')[0]}
                  </span>
                )}
                {lead.email     && <span style={{ color: '#4ade80', fontSize: 10 }}>✉</span>}
                {lead.instagram && <span style={{ color: '#f87171', fontSize: 10 }}>IG</span>}
                {lead.twitter   && <span style={{ color: '#60a5fa', fontSize: 10 }}>𝕏</span>}
                {days !== null && (
                  <span className="ml-auto text-xs" style={{ color: '#444' }}>{days}d</span>
                )}
              </div>
            </div>
          )
        })}

        {leads.length === 0 && (
          <div className="text-center py-6 text-xs" style={{ color: '#333' }}>
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}
