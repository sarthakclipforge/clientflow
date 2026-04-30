/* src/pages/Settings.jsx — Profile + Groq key + FU intervals */
import { useState, useEffect } from 'react'
import { useProfile } from '../hooks/useProfile'
import { useStore } from '../lib/store'
import { detectGroqModel, MODEL_DISPLAY } from '../lib/groq'

export default function Settings() {
  const { profile, loading, saveProfile } = useProfile()
  const { setDetectedModel, detectedModel } = useStore()

  const [form, setForm] = useState({
    name: '', service_desc: '', proof_line: '', email_signature: '',
    groq_key_ref: '', followup_days_1: 4, followup_days_2: 5,
  })
  const [saved, setSaved]       = useState(false)
  const [modelState, setModelState] = useState('idle')
  const [modelName, setModelName]   = useState('No key entered')
  const [error, setError]           = useState('')

  useEffect(() => {
    if (profile) {
      setForm({
        name:             profile.name || '',
        service_desc:     profile.service_desc || '',
        proof_line:       profile.proof_line || '',
        email_signature:  profile.email_signature || '',
        groq_key_ref:     profile.groq_key_ref || '',
        followup_days_1:  profile.followup_days_1 ?? 4,
        followup_days_2:  profile.followup_days_2 ?? 5,
      })
      if (profile.groq_key_ref) {
        tryDetect(profile.groq_key_ref)
      }
    }
  }, [profile?.id])

  async function tryDetect(key) {
    if (!key || !key.startsWith('gsk_')) {
      setModelState('idle'); setModelName('No key entered'); return
    }
    setModelState('detecting'); setModelName('Detecting…')
    try {
      const model = await detectGroqModel(key)
      setDetectedModel(model)
      setModelState('ready')
      setModelName(MODEL_DISPLAY[model] || model)
    } catch (e) {
      setModelState('error')
      setModelName('Invalid key or connection failed')
    }
  }

  let debounce = null
  function onKeyChange(e) {
    const val = e.target.value
    setForm(f => ({ ...f, groq_key_ref: val }))
    clearTimeout(debounce)
    debounce = setTimeout(() => tryDetect(val), 800)
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    try {
      await saveProfile(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e.message)
    }
  }

  const dotColor = { idle: '#6b6b6b', detecting: '#60a5fa', ready: '#4ade80', error: '#f87171' }[modelState]

  return (
    <div className="max-w-2xl mx-auto py-8 px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
        <p className="text-sm" style={{ color: '#6b6b6b' }}>Configure your profile and AI credentials</p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">

        {/* Profile section */}
        <section className="rounded-xl border p-5" style={{ background: '#141414', borderColor: '#2a2a2a' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#6b6b6b' }}>Your Profile</h2>
          <div className="flex flex-col gap-4">
            {[
              { id: 'name', label: 'Your Name', placeholder: 'Sarthak', key: 'name' },
              { id: 'service_desc', label: 'Service Description', placeholder: 'I edit YouTube videos for AI and business creators.', key: 'service_desc' },
              { id: 'proof_line', label: 'Proof Line', placeholder: 'Helped 3 creators 2x their retention in 30 days.', key: 'proof_line' },
            ].map(f => (
              <div key={f.id}>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>{f.label}</label>
                <input
                  id={f.id}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', color: '#e8e8e8' }}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>
                Email Signature <span style={{ color: '#444' }}>(max 200 chars)</span>
              </label>
              <textarea
                className="w-full px-3 py-2 rounded-lg text-sm resize-none outline-none"
                style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', color: '#e8e8e8', height: 80 }}
                placeholder={"— Sarthak\nBAW Studios | clipforge.io"}
                value={form.email_signature}
                maxLength={200}
                onChange={e => setForm(p => ({ ...p, email_signature: e.target.value }))}
              />
            </div>
          </div>
        </section>

        {/* Groq key section */}
        <section className="rounded-xl border p-5" style={{ background: '#141414', borderColor: '#2a2a2a' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#6b6b6b' }}>Groq API Key</h2>
          <div className="flex gap-3">
            <input
              id="groq-key"
              type="password"
              className="flex-1 px-3 py-2 rounded-lg text-sm font-mono outline-none"
              style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', color: '#e8e8e8' }}
              placeholder="gsk_…"
              value={form.groq_key_ref}
              onChange={onKeyChange}
              autoComplete="off"
              spellCheck={false}
            />
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap"
              style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', minWidth: 160 }}
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: dotColor, ...(modelState === 'detecting' ? { animation: 'pulse-dot 1s infinite' } : {}) }}
              />
              <span style={{ color: dotColor === '#6b6b6b' ? '#6b6b6b' : '#e8e8e8' }}>{modelName}</span>
            </div>
          </div>
          <p className="text-xs mt-2" style={{ color: '#444' }}>
            Free key at <a href="https://console.groq.com" target="_blank" rel="noreferrer" style={{ color: '#4ade80' }}>console.groq.com</a>. Same key as LeadScout.
          </p>
        </section>

        {/* Follow-up intervals */}
        <section className="rounded-xl border p-5" style={{ background: '#141414', borderColor: '#2a2a2a' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#6b6b6b' }}>Follow-Up Intervals</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Follow-up 1 (days after first contact)', key: 'followup_days_1', default: 4 },
              { label: 'Follow-up 2 (days after FU1)', key: 'followup_days_2', default: 5 },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>{f.label}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={1} max={14}
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: +e.target.value }))}
                    className="flex-1"
                    style={{ accentColor: '#4ade80' }}
                  />
                  <span className="text-sm font-bold w-6 text-right" style={{ color: '#4ade80' }}>{form[f.key]}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {error && <p className="text-sm px-4 py-2 rounded-lg" style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>{error}</p>}

        <button
          type="submit"
          className="self-start px-6 py-2.5 rounded-lg font-semibold text-sm transition-all"
          style={{ background: saved ? '#16a34a' : '#4ade80', color: '#000' }}
        >
          {saved ? '✓ Saved' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
