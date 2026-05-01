/* src/pages/Stats.jsx — Analytics dashboard */
import { useEffect, useState } from 'react'
import { outreachDB, leadsDB } from '../lib/db'
import StatCard from '../components/StatCard'

const PERIODS = [
  { label: '7 days',   days: 7    },
  { label: '30 days',  days: 30   },
  { label: 'All time', days: 9999 },
]

function pct(num, den) {
  if (!den) return '0%'
  return Math.round((num / den) * 100) + '%'
}

export default function Stats() {
  const [period, setPeriod]   = useState(30)
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStats() }, [period])

  async function loadStats() {
    setLoading(true)
    const since = period === 9999 ? '1970-01-01' : new Date(Date.now() - period * 86400000).toISOString()

    const [allLogs, allLeads] = await Promise.all([
      outreachDB.getAll(),
      leadsDB.getAll(),
    ])
    const logs = allLogs.filter(l => (l.created_at || '') >= since)

    const total     = logs.length
    const replied   = logs.filter(l => l.reply_received).length
    const converted = logs.filter(l => l.outcome === 'converted').length
    const fu1Sent   = logs.filter(l => l.follow_up_1_sent).length
    const fu1Replied = logs.filter(l => l.follow_up_1_sent && l.reply_received).length

    const hookMap = {}
    const channelMap = {}
    for (const l of logs) {
      if (l.hook_style) {
        if (!hookMap[l.hook_style]) hookMap[l.hook_style] = { sent: 0, replied: 0 }
        hookMap[l.hook_style].sent++
        if (l.reply_received) hookMap[l.hook_style].replied++
      }
      if (l.channel_used) {
        if (!channelMap[l.channel_used]) channelMap[l.channel_used] = { sent: 0, replied: 0 }
        channelMap[l.channel_used].sent++
        if (l.reply_received) channelMap[l.channel_used].replied++
      }
    }

    const withReply = logs.filter(l => l.reply_received && l.reply_at && l.contacted_at)
    const avgReplyDays = withReply.length
      ? Math.round(withReply.reduce((s, l) => s + (new Date(l.reply_at) - new Date(l.contacted_at)), 0) / withReply.length / 86400000)
      : null

    const pipelineMap = {}
    allLeads.forEach(l => { pipelineMap[l.status] = (pipelineMap[l.status] || 0) + 1 })

    setStats({ total, replied, converted, fu1Sent, fu1Replied, hookMap, channelMap, avgReplyDays, pipelineMap })
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between gap-2" style={{ borderColor: '#1e1e1e' }}>
        <h1 className="text-base font-bold text-white">Stats</h1>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#141414', border: '1px solid #2a2a2a' }}>
          {PERIODS.map(p => (
            <button
              key={p.days}
              className="px-2.5 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{ background: period === p.days ? '#2a2a2a' : 'transparent', color: period === p.days ? '#e8e8e8' : '#6b6b6b' }}
              onClick={() => setPeriod(p.days)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-sm" style={{ color: '#444' }}>Loading stats…</div>
        ) : !stats ? null : (
          <div className="flex flex-col gap-4">
            {/* 1 col on mobile, 2 on sm, 4 on lg */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Outreach"   value={stats.total}   icon="📤" />
              <StatCard label="Response Rate"    value={pct(stats.replied, stats.total)}    color="#4ade80" icon="💬" sub={`${stats.replied} from ${stats.total}`} />
              <StatCard label="Conversion Rate"  value={pct(stats.converted, stats.replied)} color="#fbbf24" icon="🏆" sub={`${stats.converted} from ${stats.replied} replies`} />
              <StatCard label="Avg Reply Time"   value={stats.avgReplyDays != null ? `${stats.avgReplyDays}d` : '—'} icon="⏱" color="#60a5fa" />
            </div>

            <div className="rounded-xl border p-5" style={{ background: '#141414', borderColor: '#2a2a2a' }}>
              <div className="text-sm font-semibold mb-3" style={{ color: '#888' }}>Follow-Up Lift</div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><div className="text-2xl font-bold" style={{ color: '#60a5fa' }}>{stats.replied - stats.fu1Replied}</div><div className="text-xs mt-1" style={{ color: '#555' }}>From initial</div></div>
                <div><div className="text-2xl font-bold" style={{ color: '#4ade80' }}>{stats.fu1Replied}</div><div className="text-xs mt-1" style={{ color: '#555' }}>From FU</div></div>
                <div><div className="text-2xl font-bold" style={{ color: '#fbbf24' }}>{stats.fu1Sent ? `+${Math.round(stats.fu1Replied / stats.fu1Sent * 100)}%` : '—'}</div><div className="text-xs mt-1" style={{ color: '#555' }}>FU response rate</div></div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border p-5" style={{ background: '#141414', borderColor: '#2a2a2a' }}>
                <div className="text-sm font-semibold mb-4" style={{ color: '#888' }}>Hook Style Performance</div>
                {Object.entries(stats.hookMap).length === 0 ? (
                  <div className="text-xs" style={{ color: '#444' }}>No data yet — send some messages first</div>
                ) : Object.entries(stats.hookMap)
                    .sort((a, b) => (b[1].replied / (b[1].sent || 1)) - (a[1].replied / (a[1].sent || 1)))
                    .map(([style, v]) => {
                      const rate = v.sent ? Math.round(v.replied / v.sent * 100) : 0
                      return (
                        <div key={style} className="flex items-center gap-3 mb-3">
                          <div className="text-xs w-20 shrink-0" style={{ color: '#888' }}>{style}</div>
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#2a2a2a' }}>
                            <div className="h-full rounded-full" style={{ width: `${rate}%`, background: '#4ade80' }} />
                          </div>
                          <div className="text-xs w-10 text-right font-bold" style={{ color: '#4ade80' }}>{rate}%</div>
                          <div className="text-xs w-12 text-right" style={{ color: '#444' }}>{v.sent} sent</div>
                        </div>
                      )
                    })
                }
              </div>

              <div className="rounded-xl border p-5" style={{ background: '#141414', borderColor: '#2a2a2a' }}>
                <div className="text-sm font-semibold mb-4" style={{ color: '#888' }}>Channel Performance</div>
                {Object.entries(stats.channelMap).length === 0 ? (
                  <div className="text-xs" style={{ color: '#444' }}>No data yet</div>
                ) : Object.entries(stats.channelMap)
                    .sort((a, b) => (b[1].replied / (b[1].sent || 1)) - (a[1].replied / (a[1].sent || 1)))
                    .map(([ch, v]) => {
                      const rate = v.sent ? Math.round(v.replied / v.sent * 100) : 0
                      const icons = { email: '✉', instagram: 'IG', twitter: '𝕏' }
                      return (
                        <div key={ch} className="flex items-center gap-3 mb-3">
                          <div className="text-xs w-20 shrink-0 capitalize" style={{ color: '#888' }}>{icons[ch] || ''} {ch}</div>
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#2a2a2a' }}>
                            <div className="h-full rounded-full" style={{ width: `${rate}%`, background: '#60a5fa' }} />
                          </div>
                          <div className="text-xs w-10 text-right font-bold" style={{ color: '#60a5fa' }}>{rate}%</div>
                          <div className="text-xs w-12 text-right" style={{ color: '#444' }}>{v.sent} sent</div>
                        </div>
                      )
                    })
                }
              </div>
            </div>

            <div className="rounded-xl border p-5" style={{ background: '#141414', borderColor: '#2a2a2a' }}>
              <div className="text-sm font-semibold mb-4" style={{ color: '#888' }}>Pipeline Health</div>
              <div className="flex gap-6 flex-wrap">
                {Object.entries(stats.pipelineMap).map(([status, count]) => (
                  <div key={status} className="text-center">
                    <div className="text-xl font-bold text-white">{count}</div>
                    <div className="text-xs mt-0.5 capitalize" style={{ color: '#555' }}>{status.replace('_', ' ')}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
