/* src/components/StatCard.jsx */
export default function StatCard({ label, value, sub, color = '#4ade80', icon }) {
  return (
    <div className="rounded-xl p-5 border" style={{ background: '#141414', borderColor: '#2a2a2a' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b6b6b' }}>
          {label}
        </div>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className="text-3xl font-bold" style={{ color }}>
        {value ?? '—'}
      </div>
      {sub && <div className="text-xs mt-1.5" style={{ color: '#555' }}>{sub}</div>}
    </div>
  )
}
