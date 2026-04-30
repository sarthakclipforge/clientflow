/* src/hooks/useFollowUps.js — FU queue using db.js */
import { useState, useEffect } from 'react'
import { outreachDB, leadsDB } from '../lib/db'

export function useFollowUps() {
  const [followUps, setFollowUps] = useState([])
  const [loading, setLoading]     = useState(true)

  const fetchFollowUps = async () => {
    setLoading(true)
    const data = await outreachDB.getDueFollowUps()
    setFollowUps(data)
    setLoading(false)
    return data
  }

  useEffect(() => { fetchFollowUps() }, [])

  const runAutoArchive = async () => {
    const grace = new Date()
    grace.setDate(grace.getDate() - 3)
    const graceStr = grace.toISOString()

    const all = await outreachDB.getAll()
    const overdue = all.filter(l =>
      l.follow_up_2_sent &&
      l.follow_up_2_sent < graceStr &&
      !l.reply_received &&
      !l.outcome
    )
    for (const o of overdue) {
      await leadsDB.update(o.lead_id, { status: 'archived' })
      await outreachDB.update(o.id, { outcome: 'no_reply' })
    }
  }

  return { followUps, loading, refetch: fetchFollowUps, runAutoArchive }
}
