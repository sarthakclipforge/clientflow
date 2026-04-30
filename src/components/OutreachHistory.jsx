/* src/components/OutreachHistory.jsx — slide-in panel showing full message history */
import { useEffect, useState } from 'react'
import { outreachDB } from '../lib/db'

function fmt(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function OutreachHistory({ lead, onClose }) {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    if (lead?.id) outreachDB.getForLead(lead.id).then(setLogs)
  }, [lead?.id])

  if (!lead) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-md overflow-y-auto slide-in-right"
        style={{ background: '#111', borderLeft: '1px solid #2a2a2a' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#2a2a2a' }}>
          <div>
            <div className="font-bold text-white">{lead.handle}</div>
            <div className="text-xs mt-0.5" style={{ color: '#6b6b6b' }}>{lead.channel_name}</div>
          </div>
          <button className="text-xl" style={{ color: '#555' }} onClick={onClose}>✕</button>
        </div>

        {/* Lead info */}
        <div className="px-5 py-4 border-b" style={{ borderColor: '#1e1e1e' }}>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ['Subscribers', lead.subscribers],
              ['Fit Score',   lead.fit_score],
              ['Email',       lead.email || '—'],
              ['Instagram',   lead.instagram || '—'],
              ['Twitter',     lead.twitter || '—'],
              ['Website',     lead.website || '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ color: '#555' }}>{k}</div>
                <div style={{ color: '#c0c0c0' }} className="font-medium mt-0.5 truncate">{v}</div>
              </div>
            ))}
          </div>
          {lead.latest_video && (
            <div className="mt-3">
              <div className="text-xs mb-1" style={{ color: '#555' }}>Latest Video</div>
              <div className="text-xs" style={{ color: '#a0a0a0' }}>{lead.latest_video}</div>
            </div>
          )}
          {lead.notes && (
            <div className="mt-3">
              <div className="text-xs mb-1" style={{ color: '#555' }}>Notes</div>
              <div className="text-xs" style={{ color: '#a0a0a0' }}>{lead.notes}</div>
            </div>
          )}
        </div>

        {/* Outreach history */}
        <div className="px-5 py-4">
          <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#555' }}>
            Outreach History
          </div>

          {logs.length === 0 ? (
            <div className="text-sm text-center py-8" style={{ color: '#444' }}>No messages sent yet</div>
          ) : (
            <div className="flex flex-col gap-4">
              {logs.map(log => (
                <div key={log.id} className="rounded-lg p-4 border" style={{ background: '#141414', borderColor: '#222' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase" style={{ color: '#4ade80' }}>
                      #{log.sequence_num} · {log.channel_used?.toUpperCase()}
                    </span>
                    <span className="text-xs" style={{ color: '#555' }}>{fmt(log.contacted_at || log.created_at)}</span>
                  </div>
                  {log.subject_line && (
                    <div className="text-xs font-semibold mb-2" style={{ color: '#c0c0c0' }}>
                      Subject: {log.subject_line}
                    </div>
                  )}
                  <div className="text-xs whitespace-pre-wrap" style={{ color: '#888', lineHeight: 1.6 }}>
                    {log.message_body}
                  </div>
                  <div className="flex gap-4 mt-3 text-xs" style={{ color: '#444' }}>
                    <span>Hook: {log.hook_style}</span>
                    {log.follow_up_1_due && <span>FU1: {fmt(log.follow_up_1_due)}{log.follow_up_1_sent ? ' ✓' : ''}</span>}
                    {log.follow_up_2_due && <span>FU2: {fmt(log.follow_up_2_due)}{log.follow_up_2_sent ? ' ✓' : ''}</span>}
                    {log.reply_received && <span style={{ color: '#4ade80' }}>Replied ✓</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
