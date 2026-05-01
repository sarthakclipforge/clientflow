// src/hooks/useNetworkStatus.js
import { useEffect, useState } from 'react'
import { getPendingCount, flushOfflineQueue } from '../lib/db'

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pending, setPending]   = useState(getPendingCount())
  const [syncing, setSyncing]   = useState(false)

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
      setSyncing(true)
      flushOfflineQueue().then(n => {
        setSyncing(false)
        setPending(getPendingCount())
      })
    }
    function handleOffline() {
      setIsOnline(false)
      setPending(getPendingCount())
    }
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    // Refresh pending count every 5s
    const interval = setInterval(() => setPending(getPendingCount()), 5000)
    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  return { isOnline, pending, syncing }
}
