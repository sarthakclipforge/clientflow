/* src/components/FollowUpStrip.jsx */
import { useNavigate } from 'react-router-dom'

function daysSince(dateStr) {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export default function FollowUpStrip({ followUps = [] }) {
  const navigate = useNavigate()
  if (followUps.length === 0) return null

  return (
    <div className="mb-6 rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.04)' }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: 'rgba(220,38,38,0.2)' }}>
        <span className="text-sm">🔔</span>
        <span className="text-sm font-semibold" style={{ color: '#f87171' }}>
          {followUps.length} Follow-up{followUps.length !== 1 ? 's' : ''} Due Today
        </span>
      </div>
      <div className="flex gap-3 p-3 overflow-x-auto">
        {followUps.map(fu => {
          const lead = fu.leads
          const days = daysSince(fu.contacted_at || fu.created_at)
          return (
            <div
              key={fu.id}
              className="shrink-0 rounded-lg p-3 border min-w-[180px]"
              style={{ background: '#141414', borderColor: '#2a2a2a' }}
            >
              <div className="text-xs font-mono font-semibold mb-1" style={{ color: '#e8e8e8' }}>
                {lead?.handle || '—'}
              </div>
              <div className="flex items-center gap-2 mb-2.5">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(220,38,38,0.15)', color: '#f87171' }}
                >
                  FU{fu.fuNum}
                </span>
                <span className="text-xs" style={{ color: '#555' }}>{days}d ago</span>
              </div>
              <button
                className="w-full text-xs py-1.5 rounded-lg font-medium transition-all"
                style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}
                onClick={() => navigate(`/contact/${lead?.id}?fu=${fu.fuNum}&logId=${fu.id}`)}
              >
                Follow Up →
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
