/* src/pages/Swiper.jsx — Card-by-card lead review */
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { leadsDB } from '../lib/db'
import LeadCard from '../components/LeadCard'
import toast, { Toaster } from 'react-hot-toast'

export default function Swiper() {
  const navigate = useNavigate()
  const [queue, setQueue]       = useState([])
  const [index, setIndex]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [swiping, setSwiping]   = useState(false)

  useEffect(() => { loadQueue() }, [])

  async function loadQueue() {
    setLoading(true)
    const all = await leadsDB.getAll({ status: 'unreviewed' })
    const sorted = all.sort((a, b) => {
      const o = { 'HIGH FIT': 0, 'MODERATE FIT': 1, 'LOW FIT': 2 }
      return (o[a.fit_score] ?? 1) - (o[b.fit_score] ?? 1)
    })
    setQueue(sorted)
    setIndex(0)
    setLoading(false)
  }

  const current   = queue[index]
  const remaining = queue.length - index

  const swipeLeft = useCallback(async () => {
    if (!current || swiping) return
    setSwiping(true)
    await leadsDB.update(current.id, { status: 'archived' })
    const archivedLead = current
    setIndex(i => i + 1)
    setSwiping(false)

    toast.custom(t => (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', color: '#e8e8e8' }}>
        <span className="text-sm">Archived <strong>{archivedLead.handle}</strong></span>
        <button
          className="text-xs px-3 py-1 rounded-lg"
          style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}
          onClick={async () => {
            await leadsDB.update(archivedLead.id, { status: 'unreviewed' })
            toast.dismiss(t.id)
            loadQueue()
          }}
        >
          Undo
        </button>
      </div>
    ), { duration: 5000 })
  }, [current, swiping])

  const swipeRight = useCallback(async () => {
    if (!current || swiping) return
    setSwiping(true)
    await leadsDB.update(current.id, { status: 'to_research' })
    setIndex(i => i + 1)
    setSwiping(false)
    navigate(`/research/${current.id}`)
  }, [current, swiping, navigate])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowLeft'  || e.key === 'a') swipeLeft()
      if (e.key === 'ArrowRight' || e.key === 'd') swipeRight()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [swipeLeft, swipeRight])

  if (loading) return (
    <div className="flex items-center justify-center h-full text-sm" style={{ color: '#444' }}>
      Loading queue…
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <Toaster position="bottom-center" />

      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: '#1e1e1e' }}>
        <div>
          <h1 className="text-lg font-bold text-white">Swiper</h1>
          <p className="text-xs mt-0.5" style={{ color: '#6b6b6b' }}>
            {remaining > 0 ? `${remaining} lead${remaining !== 1 ? 's' : ''} in queue` : 'Queue empty'}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: '#555' }}>
          <span>← / A = Archive</span>
          <span>→ / D = Research</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        {remaining === 0 ? (
          <div className="text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-white mb-2">Queue Clear</h2>
            <p className="text-sm mb-6" style={{ color: '#6b6b6b' }}>
              No unreviewed leads. Import more from LeadScout or check your Research queue.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}
                onClick={() => navigate('/import')}
              >
                ⬆ Import Leads
              </button>
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: '#1c1c1c', color: '#888', border: '1px solid #2a2a2a' }}
                onClick={() => navigate('/crm')}
              >
                📊 View Pipeline
              </button>
            </div>
          </div>
        ) : (
          <div className="relative w-full" style={{ maxWidth: 480, height: 420 }}>
            {queue.slice(index, index + 3).map((lead, i) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                index={i}
                total={remaining}
                onSwipeLeft={i  === 0 ? swipeLeft  : undefined}
                onSwipeRight={i === 0 ? swipeRight : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
