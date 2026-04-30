/* src/hooks/useProfile.js — user_profile via db.js */
import { useState, useEffect } from 'react'
import { profileDB } from '../lib/db'

export function useProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchProfile() }, [])

  const fetchProfile = async () => {
    setLoading(true)
    const data = await profileDB.get()
    setProfile(data || {})
    setLoading(false)
    return data
  }

  const saveProfile = async (patch) => {
    await profileDB.save(patch)
    setProfile(prev => ({ ...prev, ...patch }))
  }

  const saveGroqKey = (key) => saveProfile({ groq_key_ref: key })
  const getGroqKey  = ()    => profile?.groq_key_ref || null

  return { profile, loading, saveProfile, saveGroqKey, getGroqKey, refetch: fetchProfile }
}
