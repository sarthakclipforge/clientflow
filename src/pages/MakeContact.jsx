/* src/pages/MakeContact.jsx — AI message generation + send */
import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { leadsDB, outreachDB } from '../lib/db'
import { useProfile } from '../hooks/useProfile'
import { useOutreach } from '../hooks/useOutreach'
import { useStore } from '../lib/store'
import { generateEmail, generateDM, generateFU1, generateFU2, MODEL_DISPLAY } from '../lib/groq'
import toast, { Toaster } from 'react-hot-toast'

const HOOK_STYLES = [
  { id: 'Observation', label: 'Observation', desc: '"I noticed that [specific thing]…" — shows you watched',           emoji: '👁' },
  { id: 'Result',      label: 'Result',      desc: '"Creators in your niche typically see X result…" — proof-forward', emoji: '📈' },
  { id: 'Curiosity',   label: 'Curiosity',   desc: '"Quick question about how you\'re handling…" — low pressure',     emoji: '❓' },
]

export default function MakeContact() {
  const { leadId }        = useParams()
  const [searchParams]    = useSearchParams()
  const navigate          = useNavigate()
  const { profile }       = useProfile()
  const { logOutreach }   = useOutreach()
  const { detectedModel } = useStore()

  const fuNum = searchParams.get('fu') ? parseInt(searchParams.get('fu')) : 0
  const logId = searchParams.get('logId') || null

  const [lead, setLead]           = useState(null)
  const [outreachLog, setOutreachLog] = useState(null)
  const [step, setStep]           = useState(fuNum ? 'generate' : 'method')
  const [method, setMethod]       = useState(null)
  const [hookStyle, setHookStyle] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError]   = useState('')
  const [message, setMessage]     = useState({ subjects: [], selectedSubject: 0, body: '' })
  const [marking, setMarking]     = useState(false)
  const [marked, setMarked]       = useState(false)

  useEffect(() => { loadData() }, [leadId])

  async function loadData() {
    const data = await leadsDB.getById(leadId)
    setLead(data)
    if (fuNum && logId) {
      const logs = await outreachDB.getForLead(leadId)
      const log = logs.find(l => l.id === logId) || logs[logs.length - 1]
      setOutreachLog(log)
      setMethod(log?.channel_used || 'email')
      setHookStyle(log?.hook_style || 'Observation')
    }
  }

  const apiKey = profile?.groq_key_ref
  const model  = detectedModel || 'llama-3.3-70b-versatile'

  async function generate() {
    if (!apiKey) { setGenError('Add your Groq API key in Settings first.'); return }
    if (!profile?.name) { setGenError('Fill in your profile name in Settings first.'); return }
    setGenerating(true); setGenError('')

    try {
      let result
      if (fuNum === 1) {
        result = await generateFU1(apiKey, model, lead, outreachLog, 4, method)
        setMessage({
          subjects: result.subject ? [result.subject] : [],
          selectedSubject: 0,
          body: normalizeBody(result.body || result.message || ''),
        })
      } else if (fuNum === 2) {
        result = await generateFU2(apiKey, model, lead, 9)
        setMessage({ subjects: [], selectedSubject: 0, body: normalizeBody(result.message || '') })
      } else if (method === 'email') {
        result = await generateEmail(apiKey, model, lead, profile, hookStyle)
        setMessage({ subjects: result.subject_variants || [], selectedSubject: 0, body: normalizeBody(result.body || '') })
      } else {
        result = await generateDM(apiKey, model, lead, profile, hookStyle)
        setMessage({ subjects: [], selectedSubject: 0, body: normalizeBody(result.message || '') })
      }
      setStep('editor')
    } catch (e) {
      setGenError(e.message)
    }
    setGenerating(false)
  }

  // Normalize escaped \n from Groq into real newlines
  function normalizeBody(raw) {
    if (!raw) return ''
    return raw
      .replace(/\\n/g, '\n')   // literal \n → real newline
      .replace(/\\t/g, '  ')   // literal \t → spaces
      .trim()
  }

  async function markSent() {
    setMarking(true)
    try {
      const subject = message.subjects[message.selectedSubject] || ''
      if (fuNum) {
        const patch = fuNum === 1
          ? { follow_up_1_sent: new Date().toISOString() }
          : { follow_up_2_sent: new Date().toISOString() }
        if (fuNum === 1 && profile?.followup_days_2) {
          const fu2 = new Date()
          fu2.setDate(fu2.getDate() + (profile.followup_days_2 || 5))
          patch.follow_up_2_due = fu2.toISOString().split('T')[0]
        }
        await outreachDB.update(logId, patch)
      } else {
        await logOutreach({
          lead_id:         lead.id,
          channel_used:    method,
          subject_line:    subject,
          message_body:    message.body,
          hook_style:      hookStyle,
          groq_model:      model,
          followup_days_1: profile?.followup_days_1 || 4,
        })
        await leadsDB.update(lead.id, { status: 'contacted' })
      }
      setMarked(true)
      toast.success('Marked as sent!')
      setTimeout(() => navigate('/swiper'), 1500)
    } catch (e) {
      toast.error(e.message)
    }
    setMarking(false)
  }

  function sendAction() {
    const body = encodeURIComponent(message.body)
    if (method === 'email') {
      const subj = encodeURIComponent(message.subjects[message.selectedSubject] || '')
      window.open(`mailto:${lead.email || ''}?subject=${subj}&body=${body}`, '_blank')
    } else if (method === 'instagram') {
      navigator.clipboard?.writeText(message.body)
      window.open(`https://instagram.com/${(lead.instagram || '').replace('@', '')}`, '_blank')
      toast.success('Message copied! Opening Instagram…')
    } else if (method === 'linkedin') {
      navigator.clipboard?.writeText(message.body)
      const li = lead.linkedin || ''
      const url = li.startsWith('http') ? li : `https://linkedin.com/in/${li.replace('@', '')}`
      window.open(url, '_blank')
      toast.success('Message copied! Opening LinkedIn…')
    } else {
      navigator.clipboard?.writeText(message.body)
      window.open(`https://twitter.com/messages/compose?text=${body}`, '_blank')
      toast.success('Message copied! Opening Twitter…')
    }
  }

  if (!lead) return <div className="flex items-center justify-center h-full text-sm" style={{ color: '#444' }}>Loading…</div>

  const HAS = { email: !!lead.email, instagram: !!lead.instagram, twitter: !!lead.twitter, linkedin: !!lead.linkedin }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Toaster position="top-right" />
      <div className="max-w-xl mx-auto w-full py-8 px-6">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">{fuNum ? `Follow-Up ${fuNum}` : 'Make Contact'}</h1>
            <p className="text-xs mt-1 font-mono" style={{ color: '#6b6b6b' }}>{lead.handle} · {lead.subscribers}</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-lg" style={{ background: '#1e1e1e', color: '#555' }}>
            {MODEL_DISPLAY[model] || model}
          </span>
        </div>

        {/* Step: Contact Method */}
        {step === 'method' && (
          <div className="fade-in">
            <h2 className="text-sm font-semibold mb-3" style={{ color: '#888' }}>1. Choose Contact Method</h2>
            <div className="flex flex-col gap-3 mb-6">
              {[
                { id: 'email',     label: 'Email',     icon: '✉',  detail: lead.email },
                { id: 'instagram', label: 'Instagram', icon: 'IG', detail: lead.instagram },
                { id: 'twitter',   label: 'Twitter/X', icon: '𝕏', detail: lead.twitter },
                { id: 'linkedin',  label: 'LinkedIn',  icon: 'in', detail: lead.linkedin },
              ].map(m => (
                <button
                  key={m.id}
                  disabled={!HAS[m.id]}
                  className="flex items-center gap-4 p-4 rounded-xl border text-left transition-all"
                  style={{
                    background: method === m.id ? 'rgba(74,222,128,0.08)' : '#141414',
                    border: method === m.id ? '1px solid rgba(74,222,128,0.4)' : '1px solid #2a2a2a',
                    opacity: HAS[m.id] ? 1 : 0.35,
                    cursor: HAS[m.id] ? 'pointer' : 'not-allowed',
                  }}
                  onClick={() => HAS[m.id] && setMethod(m.id)}
                >
                  <span className="text-xl w-8 text-center">{m.icon}</span>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: '#e8e8e8' }}>{m.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: HAS[m.id] ? '#888' : '#444' }}>
                      {HAS[m.id] ? m.detail : 'No data — add in Research Panel'}
                    </div>
                  </div>
                  {method === m.id && <span className="ml-auto text-sm" style={{ color: '#4ade80' }}>✓</span>}
                </button>
              ))}
            </div>
            <button
              disabled={!method}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: method ? '#4ade80' : '#1e1e1e', color: method ? '#000' : '#444' }}
              onClick={() => method && setStep('hook')}
            >
              Next: Choose Hook Style →
            </button>
          </div>
        )}

        {/* Step: Hook Style */}
        {step === 'hook' && (
          <div className="fade-in">
            <h2 className="text-sm font-semibold mb-3" style={{ color: '#888' }}>2. Choose Hook Style</h2>
            <div className="flex flex-col gap-3 mb-6">
              {HOOK_STYLES.map(h => (
                <button
                  key={h.id}
                  className="flex items-start gap-4 p-4 rounded-xl border text-left transition-all"
                  style={{
                    background: hookStyle === h.id ? 'rgba(74,222,128,0.08)' : '#141414',
                    border: hookStyle === h.id ? '1px solid rgba(74,222,128,0.4)' : '1px solid #2a2a2a',
                  }}
                  onClick={() => setHookStyle(h.id)}
                >
                  <span className="text-xl">{h.emoji}</span>
                  <div>
                    <div className="text-sm font-semibold mb-0.5" style={{ color: '#e8e8e8' }}>{h.label}</div>
                    <div className="text-xs" style={{ color: '#888' }}>{h.desc}</div>
                  </div>
                  {hookStyle === h.id && <span className="ml-auto text-sm" style={{ color: '#4ade80' }}>✓</span>}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-3 rounded-xl text-sm" style={{ background: '#1e1e1e', color: '#888' }} onClick={() => setStep('method')}>← Back</button>
              <button
                disabled={!hookStyle}
                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
                style={{ background: hookStyle ? '#4ade80' : '#1e1e1e', color: hookStyle ? '#000' : '#444' }}
                onClick={() => { if (hookStyle) { setStep('generate'); setTimeout(generate, 50) } }}
              >
                {hookStyle ? 'Generate Message →' : 'Select a style first'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Generate */}
        {step === 'generate' && (
          <div className="fade-in text-center py-16">
            {generating ? (
              <>
                <div className="text-3xl mb-3 animate-pulse">✨</div>
                <div className="text-sm" style={{ color: '#888' }}>Generating with {MODEL_DISPLAY[model] || model}…</div>
              </>
            ) : genError ? (
              <>
                <div className="text-3xl mb-3">⚠️</div>
                <div className="text-sm mb-4" style={{ color: '#f87171' }}>{genError}</div>
                <button className="px-4 py-2 rounded-lg text-sm" style={{ background: '#4ade80', color: '#000' }} onClick={generate}>Retry</button>
              </>
            ) : (
              <button className="px-6 py-3 rounded-xl font-semibold text-sm" style={{ background: '#4ade80', color: '#000' }} onClick={generate}>
                Generate →
              </button>
            )}
          </div>
        )}

        {/* Step: Editor */}
        {step === 'editor' && (
          <div className="fade-in">
            {method === 'email' && message.subjects.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#555' }}>Subject Line</div>
                <div className="flex flex-col gap-1.5">
                  {message.subjects.map((s, i) => (
                    <button
                      key={i}
                      className="text-left px-3 py-2 rounded-lg text-sm transition-all"
                      style={{
                        background: message.selectedSubject === i ? 'rgba(74,222,128,0.08)' : '#141414',
                        border: message.selectedSubject === i ? '1px solid rgba(74,222,128,0.4)' : '1px solid #1e1e1e',
                        color: message.selectedSubject === i ? '#e8e8e8' : '#888',
                      }}
                      onClick={() => setMessage(m => ({ ...m, selectedSubject: i }))}
                    >
                      {i + 1}. {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#555' }}>Message</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: '#444' }}>
                    {message.body.trim().split(/\s+/).filter(Boolean).length} words
                  </span>
                  <button
                    className="text-xs px-2 py-1 rounded-md"
                    style={{ background: '#1e1e1e', color: '#888', border: '1px solid #2a2a2a' }}
                    onClick={() => { navigator.clipboard?.writeText(message.body); toast.success('Copied!') }}
                  >
                    Copy
                  </button>
                </div>
              </div>
              <textarea
                className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none font-mono"
                style={{
                  background: '#141414',
                  border: '1px solid #2a2a2a',
                  color: '#e8e8e8',
                  lineHeight: 1.75,
                  minHeight: 260,
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'Inter, sans-serif',
                }}
                value={message.body}
                onChange={e => setMessage(m => ({ ...m, body: e.target.value }))}
                rows={Math.max(10, message.body.split('\n').length + 2)}
              />
            </div>

            {genError && <div className="text-xs mb-3" style={{ color: '#f87171' }}>⚠ {genError}</div>}

            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                className="px-3 py-2 rounded-lg text-xs font-medium"
                style={{ background: '#1e1e1e', color: '#888', border: '1px solid #2a2a2a' }}
                onClick={() => { setStep('hook'); setMessage({ subjects: [], selectedSubject: 0, body: '' }) }}
              >
                Try different hook
              </button>
              <button
                className="px-3 py-2 rounded-lg text-xs font-medium"
                style={{ background: 'rgba(74,222,128,0.08)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}
                onClick={() => { setStep('generate'); setTimeout(generate, 50) }}
              >
                ✨ Regenerate
              </button>
            </div>

            <div className="flex gap-3">
              <button
                className="flex-1 py-3 rounded-xl font-semibold text-sm"
                style={{ background: '#4ade80', color: '#000' }}
                onClick={sendAction}
              >
                {method === 'email' ? '📧 Open in Mail' : '📋 Copy & Open Profile'}
              </button>
              <button
                className="px-4 py-3 rounded-xl font-semibold text-sm"
                style={{
                  background: marked ? '#16a34a' : 'rgba(74,222,128,0.1)',
                  color: '#4ade80',
                  border: '1px solid rgba(74,222,128,0.3)',
                  opacity: marking ? 0.7 : 1,
                }}
                onClick={markSent}
                disabled={marking || marked}
              >
                {marked ? '✓ Sent!' : '✓ Mark Sent'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
