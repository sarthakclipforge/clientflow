// src/components/OfflineBanner.jsx
import { useNetworkStatus } from '../hooks/useNetworkStatus'

export default function OfflineBanner() {
  const { isOnline, pending, syncing } = useNetworkStatus()

  if (isOnline && !syncing && pending === 0) return null

  const bg     = isOnline  ? (syncing ? 'rgba(96,165,250,0.12)' : 'rgba(74,222,128,0.1)') : 'rgba(251,191,36,0.12)'
  const border = isOnline  ? (syncing ? 'rgba(96,165,250,0.3)'  : 'rgba(74,222,128,0.25)') : 'rgba(251,191,36,0.3)'
  const color  = isOnline  ? (syncing ? '#60a5fa' : '#4ade80')  : '#fbbf24'
  const icon   = isOnline  ? (syncing ? '↑' : '✓') : '⚡'
  const text   = isOnline
    ? syncing
      ? `Syncing ${pending} change${pending !== 1 ? 's' : ''}…`
      : 'Back online'
    : `Offline — ${pending} change${pending !== 1 ? 's' : ''} queued`

  return (
    <div
      className="flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium"
      style={{ background: bg, borderBottom: `1px solid ${border}`, color }}
    >
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  )
}
