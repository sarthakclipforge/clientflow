/* src/components/LeadCard.jsx — Swiper card with drag + keyboard */
import { useRef, useState } from 'react'

const FIT_STYLES = {
  'HIGH FIT':     { bg: 'rgba(74,222,128,0.12)', color: '#4ade80', border: 'rgba(74,222,128,0.3)' },
  'MODERATE FIT': { bg: 'rgba(251,191,36,0.1)',  color: '#fbbf24', border: 'rgba(251,191,36,0.25)' },
  'LOW FIT':      { bg: 'rgba(248,113,113,0.1)', color: '#f87171', border: 'rgba(248,113,113,0.25)' },
}

function initials(name) {
  return (name || '?').split(/\s|@/).filter(Boolean).slice(0,2).map(w => w[0]).join('').toUpperCase()
}

export default function LeadCard({ lead, onSwipeLeft, onSwipeRight, index = 0, total = 1 }) {
  const cardRef = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [dx, setDx] = useState(0)
  const startX = useRef(0)

  const fit   = lead.fit_score || 'MODERATE FIT'
  const style = FIT_STYLES[fit] || FIT_STYLES['MODERATE FIT']

  // Pointer drag
  const onPointerDown = (e) => {
    startX.current = e.clientX
    setDragging(true)
    cardRef.current?.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!dragging) return
    setDx(e.clientX - startX.current)
  }
  const onPointerUp = () => {
    setDragging(false)
    if (dx > 80)       { onSwipeRight?.(); setDx(0) }
    else if (dx < -80) { onSwipeLeft?.();  setDx(0) }
    else               { setDx(0) }
  }

  const rotation = dx * 0.08
  const opacity  = Math.max(0.4, 1 - Math.abs(dx) / 300)

  const scaleMap = [1, 0.95, 0.90]
  const scale = scaleMap[Math.min(index, 2)]
  const yOffset = index * 10

  return (
    <div
      ref={cardRef}
      className="absolute w-full rounded-2xl select-none"
      style={{
        background: '#141414',
        border: '1px solid #2a2a2a',
        transform: index === 0
          ? `translateX(${dx}px) rotate(${rotation}deg)`
          : `scale(${scale}) translateY(${yOffset}px)`,
        opacity: index === 0 ? opacity : (1 - index * 0.2),
        zIndex: 10 - index,
        cursor: index === 0 ? 'grab' : 'default',
        transition: dragging ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
        touchAction: 'none',
        top: 0, left: 0,
        maxWidth: '480px',
        margin: '0 auto',
      }}
      onPointerDown={index === 0 ? onPointerDown : undefined}
      onPointerMove={index === 0 ? onPointerMove : undefined}
      onPointerUp={index === 0 ? onPointerUp : undefined}
    >
      {/* Swipe direction indicators */}
      {index === 0 && Math.abs(dx) > 30 && (
        <div
          className="absolute top-4 right-4 font-black text-xl px-3 py-1 rounded-lg border-2"
          style={dx > 0
            ? { color: '#4ade80', borderColor: '#4ade80', background: 'rgba(74,222,128,0.1)' }
            : { color: '#f87171', borderColor: '#f87171', background: 'rgba(248,113,113,0.1)' }}
        >
          {dx > 0 ? '✓ RESEARCH' : '✗ SKIP'}
        </div>
      )}

      <div className="p-6">
        {/* Avatar + handle */}
        <div className="flex items-start gap-4 mb-5">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg,#1a2a1a,#2a3a2a)', color: '#4ade80' }}
          >
            {initials(lead.channel_name || lead.handle)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white text-base truncate">{lead.channel_name || lead.handle}</div>
            <a
              href={lead.channel_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-mono hover:text-green-400 transition-colors"
              style={{ color: '#6b6b6b' }}
              onClick={e => e.stopPropagation()}
            >
              {lead.handle}
            </a>
            <div className="text-sm font-semibold mt-1" style={{ color: '#e8e8e8' }}>
              {lead.subscribers} subscribers
            </div>
          </div>
          <div
            className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold border"
            style={{ background: style.bg, color: style.color, borderColor: style.border }}
          >
            {fit}
          </div>
        </div>

        {/* Fit reason */}
        {lead.fit_reason && (
          <div
            className="text-sm rounded-lg p-3 mb-4"
            style={{ background: '#1a1a1a', color: '#a0a0a0', lineHeight: 1.5 }}
          >
            💡 {lead.fit_reason}
          </div>
        )}

        {/* Contact icons */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {lead.email    && <span className="text-xs px-2 py-1 rounded" style={{ background: '#1c2a1c', color: '#4ade80' }}>✉ Email</span>}
          {lead.instagram && <span className="text-xs px-2 py-1 rounded" style={{ background: '#2a1c1c', color: '#f87171' }}>IG</span>}
          {lead.twitter  && <span className="text-xs px-2 py-1 rounded" style={{ background: '#1c1c2a', color: '#60a5fa' }}>𝕏</span>}
          {lead.website  && <span className="text-xs px-2 py-1 rounded" style={{ background: '#2a2a1c', color: '#fbbf24' }}>🌐</span>}
        </div>

        {/* Expanded description */}
        {expanded && lead.notes && (
          <div className="text-xs rounded-lg p-3 mb-4" style={{ background: '#111', color: '#888', lineHeight: 1.6 }}>
            {lead.notes}
          </div>
        )}

        {/* Expand toggle */}
        <button
          className="text-xs w-full py-1.5 rounded border transition-colors"
          style={{ borderColor: '#2a2a2a', color: '#555', background: 'transparent' }}
          onClick={() => setExpanded(!expanded)}
          onPointerDown={e => e.stopPropagation()}
        >
          {expanded ? '▲ Less' : '▼ More'}
        </button>
      </div>

      {/* Action buttons */}
      {index === 0 && (
        <div className="flex gap-3 px-6 pb-5">
          <button
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all"
            style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}
            onClick={onSwipeLeft}
            onPointerDown={e => e.stopPropagation()}
          >
            ✗ Archive
          </button>
          <button
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all"
            style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}
            onClick={onSwipeRight}
            onPointerDown={e => e.stopPropagation()}
          >
            ✓ Research →
          </button>
        </div>
      )}
    </div>
  )
}
