/* src/components/SwipeableRow.jsx
   iOS-style swipe-left-to-reveal-delete for mobile lists.
   Children = the normal row content.
   onDelete = async callback (row calls it, parent removes item).
*/
import { useRef, useState } from 'react'

const THRESHOLD  = 72   // px to swipe before button locks open
const DELETE_W   = 80   // width of red delete zone

export default function SwipeableRow({ children, onDelete, disabled = false }) {
  const startX  = useRef(null)
  const startY  = useRef(null)
  const [offset, setOffset]   = useState(0)      // how far left the row has moved
  const [locked, setLocked]   = useState(false)  // delete button is fully revealed
  const [deleting, setDeleting] = useState(false)

  /* Touch start — capture start position */
  function onTouchStart(e) {
    if (disabled) return
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
  }

  /* Touch move — only track horizontal swipes (ignore vertical scroll) */
  function onTouchMove(e) {
    if (startX.current === null || disabled) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current
    if (Math.abs(dy) > Math.abs(dx) && !locked) return  // vertical scroll wins
    if (dx > 0 && !locked) { setOffset(0); return }    // swipe right = close
    const raw = Math.max(-DELETE_W * 1.2, dx)
    setOffset(locked ? Math.min(0, -DELETE_W + dx) : raw)
  }

  /* Touch end — snap open or closed */
  function onTouchEnd() {
    if (disabled) return
    startX.current = null
    if (Math.abs(offset) >= THRESHOLD) {
      setOffset(-DELETE_W)
      setLocked(true)
    } else {
      setOffset(0)
      setLocked(false)
    }
  }

  /* Close (swipe back) */
  function close() { setOffset(0); setLocked(false) }

  async function handleDelete() {
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className="relative overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Red delete zone — sits behind the row */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center"
        style={{ width: DELETE_W, background: '#dc2626' }}
      >
        <button
          className="flex flex-col items-center gap-0.5 text-white text-xs font-semibold w-full h-full justify-center"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting
            ? <span className="text-base animate-spin">↻</span>
            : <span className="text-base">🗑</span>
          }
          <span style={{ fontSize: 10 }}>Delete</span>
        </button>
      </div>

      {/* Row content — slides left on swipe */}
      <div
        className="relative"
        style={{
          transform: `translateX(${offset}px)`,
          transition: 'transform 0.2s ease',
          background: '#0a0a0a',
          willChange: 'transform',
        }}
        onClick={() => { if (locked) { close(); } }}
      >
        {children}
      </div>
    </div>
  )
}
