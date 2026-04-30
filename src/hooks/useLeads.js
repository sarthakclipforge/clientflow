/* src/hooks/useLeads.js — leads table CRUD + status transitions */
import { useState, useEffect, useCallback } from 'react'
import { leadsDB, batchesDB } from '../lib/db'

export function useLeads(filters = {}) {
  const [leads, setLeads]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const data = await leadsDB.getAll(filters)
      setLeads(data)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [JSON.stringify(filters)])

  useEffect(() => { fetch() }, [fetch])

  const updateStatus = async (id, status) => {
    await leadsDB.update(id, { status })
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
  }

  const updateLead = async (id, patch) => {
    await leadsDB.update(id, patch)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
  }

  const importLeads = async (leadsList, batchMeta) => {
    const batch = await batchesDB.create(batchMeta)
    const result = await leadsDB.upsertMany(leadsList, batch.id)
    return result
  }

  const getLeadById  = (id) => leadsDB.getById(id)
  const getCounts    = ()   => leadsDB.getCounts()

  return { leads, loading, error, refetch: fetch, updateStatus, updateLead, importLeads, getLeadById, getCounts }
}
