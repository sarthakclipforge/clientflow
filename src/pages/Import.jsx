/* src/pages/Import.jsx — PDF / CSV / Manual / Screenshot import wizard */
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeads } from '../hooks/useLeads'
import { parseLeadScoutPDF, parseLeadScoutCSV } from '../lib/pdfParser'
import { extractProfileFromImage } from '../lib/groq'
import { useStore } from '../lib/store'

const TABS = ['PDF', 'CSV', 'Screenshot', 'Manual']

const TAB_ICONS = { PDF: '📄 PDF', CSV: '📊 CSV', Screenshot: '📸 Screenshot', Manual: '✏️ Manual' }

const FIT_COLORS = { 'HIGH FIT': '#4ade80', 'MODERATE FIT': '#fbbf24', 'LOW FIT': '#f87171' }

export default function Import() {
  const navigate   = useNavigate()
  const { importLeads } = useLeads()
  const { detectedModel } = useStore()

  const [tab, setTab]           = useState('PDF')
  const [parsing, setParsing]   = useState(false)
  const [preview, setPreview]   = useState(null)
  const [error, setError]       = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult]     = useState(null)
  const fileRef    = useRef()
  const imgRef     = useRef()

  // Screenshot state
  const [screenshotImg, setScreenshotImg] = useState(null)   // data URL for preview
  const [extracting, setExtracting]       = useState(false)
  const [extracted, setExtracted]         = useState(null)   // raw result from vision

  // Manual form state
  const [manual, setManual] = useState({ handle: '', channel_name: '', subscribers: '', fit_score: 'MODERATE FIT', email: '', instagram: '', twitter: '', linkedin: '', website: '', notes: '' })

  async function onFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setPreview(null)
    setParsing(true)
    try {
      let parsed
      if (tab === 'PDF') {
        parsed = await parseLeadScoutPDF(file)
      } else {
        const text = await file.text()
        parsed = parseLeadScoutCSV(text)
        parsed.source = 'csv'; parsed.filename = file.name
      }
      setPreview(parsed)
    } catch (e) {
      setError(e.message)
    }
    setParsing(false)
  }

  async function confirmImport() {
    if (!preview?.leads?.length) return
    setImporting(true); setError('')
    try {
      const batchMeta = {
        source:      preview.source || 'leadscout_pdf',
        filename:    preview.filename || '',
        export_date: preview.exportDate || new Date().toISOString().split('T')[0],
        lead_count:  preview.leads.length,
      }
      const res = await importLeads(preview.leads, batchMeta)
      setResult(res)
    } catch (e) {
      setError(e.message)
    }
    setImporting(false)
  }

  async function importManual() {
    if (!manual.handle) { setError('Handle is required'); return }
    setImporting(true); setError('')
    try {
      const handle = manual.handle.startsWith('@') ? manual.handle.toLowerCase() : `@${manual.handle.toLowerCase()}`
      const lead = {
        handle,
        channel_name:  manual.channel_name || handle,
        channel_url:   `https://www.youtube.com/${handle}`,
        subscribers:   manual.subscribers  || '',
        fit_score:     manual.fit_score,
        email:         manual.email        || null,
        instagram:     manual.instagram    || null,
        twitter:       manual.twitter      || null,
        linkedin:      manual.linkedin     || null,
        website:       manual.website      || null,
        notes:         manual.notes        || null,
        contact_status: 'unknown',
        status:        'unreviewed',
      }
      const source = extracted ? 'screenshot' : 'manual'
      const res = await importLeads([lead], { source, lead_count: 1 })
      setResult(res)
      setExtracted(null)   // clear screenshot state after save
    } catch (e) {
      setError(e.message)
    }
    setImporting(false)
  }

  // ── Screenshot handlers ────────────────────────────────────────
  function onScreenshotSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setExtracted(null)
    const reader = new FileReader()
    reader.onload = () => setScreenshotImg(reader.result)
    reader.readAsDataURL(file)
  }

  async function runExtraction() {
    if (!screenshotImg) return
    const profile = JSON.parse(localStorage.getItem('cf_cache_profile') || 'null')
    const apiKey  = profile?.groq_key_ref
    if (!apiKey) { setError('Add your Groq API key in Settings first'); return }

    setExtracting(true); setError('')
    try {
      const base64    = screenshotImg.split(',')[1]
      const mimeMatch = screenshotImg.match(/data:([^;]+);/)
      const mimeType  = mimeMatch?.[1] || 'image/jpeg'
      const result    = await extractProfileFromImage(apiKey, base64, mimeType)
      setExtracted(result)
      // Auto-fill manual form
      setManual(prev => ({
        ...prev,
        handle:       result.handle       || prev.handle,
        channel_name: result.channel_name || prev.channel_name,
        subscribers:  result.subscribers  || prev.subscribers,
        fit_score:    ['HIGH FIT','MODERATE FIT','LOW FIT'].includes(result.fit_score)
                        ? result.fit_score : prev.fit_score,
        email:        result.email        || prev.email,
        instagram:    result.instagram    || prev.instagram,
        twitter:      result.twitter      || prev.twitter,
        linkedin:     result.linkedin     || prev.linkedin,
        website:      result.website      || prev.website,
        notes:        [result.niche, result.notes].filter(Boolean).join(' | ') || prev.notes,
      }))
    } catch (e) {
      setError('Vision extraction failed: ' + e.message)
    }
    setExtracting(false)
  }

  function clearScreenshot() {
    setScreenshotImg(null); setExtracted(null); setError('')
    if (imgRef.current) imgRef.current.value = ''
  }

  if (result) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-white mb-2">Import Complete</h2>
        <p className="text-sm mb-1" style={{ color: '#888' }}>
          <strong style={{ color: '#4ade80' }}>{result.inserted}</strong> leads imported
          {result.skipped > 0 && <> · <strong style={{ color: '#fbbf24' }}>{result.skipped}</strong> duplicates skipped</>}
        </p>
        <button
          className="mt-6 px-6 py-2.5 rounded-lg font-semibold text-sm"
          style={{ background: '#4ade80', color: '#000' }}
          onClick={() => navigate('/leads')}
        >
          View Lead List →
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 pb-24">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1">Import Leads</h1>
        <p className="text-sm" style={{ color: '#6b6b6b' }}>From LeadScout PDF, CSV, screenshot, or add manually</p>
      </div>

      {/* Tabs — scrollable on mobile */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg overflow-x-auto" style={{ background: '#141414', border: '1px solid #2a2a2a' }}>
        {TABS.map(t => (
          <button
            key={t}
            className="shrink-0 px-3 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              background: tab === t ? '#2a2a2a' : 'transparent',
              color:      tab === t ? '#e8e8e8' : '#6b6b6b',
            }}
            onClick={() => { setTab(t); setPreview(null); setError(''); setScreenshotImg(null); setExtracted(null) }}
          >
            {TAB_ICONS[t]}
          </button>
        ))}
      </div>

      {/* ── Screenshot Tab ─────────────────────────────────── */}
      {tab === 'Screenshot' && (
        <div className="fade-in">
          {!screenshotImg ? (
            /* Pick image */
            <div>
              {/* Desktop drag zone */}
              <div
                className="hidden md:flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-colors"
                style={{ borderColor: '#2a2a2a', background: '#0a0a0a' }}
                onClick={() => imgRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onScreenshotSelect({ target: { files: [f] } }) }}
              >
                <div className="text-5xl mb-4">📸</div>
                <div className="text-sm font-semibold mb-1" style={{ color: '#888' }}>
                  Drop a profile screenshot here, or click to browse
                </div>
                <div className="text-xs" style={{ color: '#444' }}>
                  Works with YouTube, Instagram, LinkedIn profile pages
                </div>
              </div>
              {/* Mobile: camera or gallery */}
              <div className="flex flex-col gap-3 md:hidden">
                <button
                  className="w-full py-10 rounded-2xl border-2 border-dashed flex flex-col items-center gap-3"
                  style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }}
                  onClick={() => { imgRef.current.setAttribute('capture', 'environment'); imgRef.current.click() }}
                >
                  <span className="text-4xl">📷</span>
                  <span className="text-sm font-semibold" style={{ color: '#888' }}>Take a Photo</span>
                  <span className="text-xs" style={{ color: '#444' }}>Open camera and point at profile screen</span>
                </button>
                <button
                  className="w-full py-6 rounded-2xl border flex flex-col items-center gap-2"
                  style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }}
                  onClick={() => { imgRef.current.removeAttribute('capture'); imgRef.current.click() }}
                >
                  <span className="text-2xl">🖼</span>
                  <span className="text-sm font-medium" style={{ color: '#666' }}>Upload from Gallery</span>
                </button>
              </div>
              <input
                ref={imgRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onScreenshotSelect}
              />
              <p className="mt-4 text-xs text-center" style={{ color: '#444' }}>
                💡 Tip: screenshot the YouTube About tab or Instagram bio to capture email & links
              </p>
            </div>
          ) : (
            /* Image preview + extract / result */
            <div className="fade-in">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium" style={{ color: '#888' }}>Screenshot preview</span>
                <button className="text-xs" style={{ color: '#555' }} onClick={clearScreenshot}>← Change photo</button>
              </div>

              {/* Preview */}
              <div className="rounded-xl overflow-hidden mb-4 border" style={{ borderColor: '#2a2a2a', maxHeight: 280 }}>
                <img src={screenshotImg} alt="Profile screenshot" className="w-full object-cover" />
              </div>

              {!extracted ? (
                <button
                  className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                  style={{ background: extracting ? '#1c1c1c' : '#4ade80', color: extracting ? '#555' : '#000' }}
                  onClick={runExtraction}
                  disabled={extracting}
                >
                  {extracting ? (
                    <><span className="animate-spin">✨</span> Analysing with AI…</>
                  ) : (
                    <>✨ Extract Profile Info</>
                  )}
                </button>
              ) : (
                /* Extracted — show summary + go to form */
                <div className="rounded-xl border p-4 mb-4" style={{ background: '#141414', borderColor: '#2a2a2a' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-green-400 text-sm">✓</span>
                    <span className="text-sm font-semibold text-white">Profile extracted! Review below.</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: '#888' }}>
                    {extracted.handle       && <div><span style={{ color: '#555' }}>Handle:</span> <span style={{ color: '#c0c0c0' }}>{extracted.handle}</span></div>}
                    {extracted.channel_name && <div><span style={{ color: '#555' }}>Name:</span> <span style={{ color: '#c0c0c0' }}>{extracted.channel_name}</span></div>}
                    {extracted.subscribers  && <div><span style={{ color: '#555' }}>Subs:</span> <span style={{ color: '#c0c0c0' }}>{extracted.subscribers}</span></div>}
                    {extracted.email        && <div><span style={{ color: '#555' }}>Email:</span> <span style={{ color: '#4ade80' }}>{extracted.email}</span></div>}
                    {extracted.instagram    && <div><span style={{ color: '#555' }}>IG:</span> <span style={{ color: '#e1306c' }}>{extracted.instagram}</span></div>}
                    {extracted.niche        && <div className="col-span-2"><span style={{ color: '#555' }}>Niche:</span> <span style={{ color: '#c0c0c0' }}>{extracted.niche}</span></div>}
                  </div>
                  <button
                    className="mt-4 w-full py-3 rounded-xl font-semibold text-sm"
                    style={{ background: '#4ade80', color: '#000' }}
                    onClick={() => setTab('Manual')}
                  >
                    Review &amp; Add Lead →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PDF / CSV upload */}
      {(tab === 'PDF' || tab === 'CSV') && !preview && (
        <div>
          {/* Desktop: drag zone */}
          <div
            className="hidden md:block border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors"
            style={{ borderColor: '#2a2a2a' }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { fileRef.current.files = e.dataTransfer.files; onFileSelect({ target: { files: e.dataTransfer.files } }) } }}
            onClick={() => fileRef.current?.click()}
          >
            <div className="text-4xl mb-3">{tab === 'PDF' ? '📄' : '📊'}</div>
            <div className="text-sm font-medium mb-1" style={{ color: '#888' }}>
              {parsing ? 'Parsing…' : `Drop ${tab} file here or click to browse`}
            </div>
            <div className="text-xs" style={{ color: '#444' }}>
              {tab === 'PDF' ? 'Must be exported from LeadScout' : 'Columns: handle, subscribers, contact_info, fit_assessment'}
            </div>
          </div>
          {/* Mobile: large tap button */}
          <button
            className="md:hidden w-full py-10 rounded-2xl border-2 border-dashed flex flex-col items-center gap-3"
            style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }}
            onClick={() => fileRef.current?.click()}
          >
            <span className="text-4xl">{tab === 'PDF' ? '📄' : '📊'}</span>
            <span className="text-sm font-semibold" style={{ color: '#888' }}>
              {parsing ? 'Parsing…' : `Tap to pick ${tab} file`}
            </span>
            <span className="text-xs" style={{ color: '#444' }}>
              {tab === 'PDF' ? 'Exported from LeadScout' : 'CSV with handle, subscribers, fit'}
            </span>
          </button>
          <input ref={fileRef} type="file" accept={tab === 'PDF' ? '.pdf' : '.csv,.txt'} className="hidden" onChange={onFileSelect} />
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium" style={{ color: '#888' }}>
              <strong style={{ color: '#4ade80' }}>{preview.leads.length}</strong> leads found
              {preview.duplicateCount > 0 && <> · <strong style={{ color: '#fbbf24' }}>{preview.duplicateCount}</strong> duplicates will be skipped</>}
            </div>
            <button className="text-xs" style={{ color: '#555' }} onClick={() => setPreview(null)}>← Back</button>
          </div>

          {/* Preview table — cards on mobile, table on desktop */}
          <div className="rounded-xl border overflow-hidden mb-5" style={{ borderColor: '#2a2a2a' }}>
            {/* Mobile cards */}
            <div className="md:hidden divide-y" style={{ borderColor: '#111' }}>
              {preview.leads.slice(0, 20).map((l, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-mono font-medium truncate" style={{ color: '#c0c0c0' }}>{l.handle}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#555' }}>{l.subscribers} · {l.email || l.website || '—'}</div>
                  </div>
                  <span className="text-[10px] font-bold shrink-0" style={{ color: FIT_COLORS[l.fit_score] || '#888' }}>
                    {(l.fit_score || '').replace(' FIT','')}
                  </span>
                </div>
              ))}
              {preview.leads.length > 20 && (
                <div className="px-4 py-2 text-center text-xs" style={{ color: '#444' }}>+{preview.leads.length - 20} more…</div>
              )}
            </div>
            {/* Desktop table */}
            <table className="hidden md:table w-full text-xs">
              <thead>
                <tr style={{ background: '#141414', color: '#555' }}>
                  {['Handle','Subscribers','Fit','Contact'].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-semibold uppercase tracking-wider border-b" style={{ borderColor: '#1e1e1e' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.leads.slice(0, 20).map((l, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: '#111' }}>
                    <td className="px-3 py-2 font-mono font-medium" style={{ color: '#c0c0c0' }}>{l.handle}</td>
                    <td className="px-3 py-2" style={{ color: '#888' }}>{l.subscribers || '—'}</td>
                    <td className="px-3 py-2 font-bold" style={{ color: FIT_COLORS[l.fit_score] || '#888', fontSize: 10 }}>{l.fit_score}</td>
                    <td className="px-3 py-2" style={{ color: '#555' }}>{l.email || l.website || '—'}</td>
                  </tr>
                ))}
                {preview.leads.length > 20 && (
                  <tr><td colSpan={4} className="px-3 py-2 text-center" style={{ color: '#444' }}>+{preview.leads.length - 20} more…</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Sticky confirm button on mobile */}
          <div className="sticky bottom-0 pb-2">
            <button
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: importing ? '#2a2a2a' : '#4ade80', color: importing ? '#555' : '#000' }}
              onClick={confirmImport}
              disabled={importing}
            >
              {importing ? 'Importing…' : `✓ Import ${preview.leads.length} Leads`}
            </button>
          </div>
        </div>
      )}

      {/* Manual (also used as review after screenshot extraction) */}
      {tab === 'Manual' && (
        <div className="rounded-xl border p-5" style={{ background: '#141414', borderColor: '#2a2a2a' }}>
          {extracted && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-xs"
              style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', color: '#4ade80' }}>
              ✨ Pre-filled from screenshot — edit anything before saving
            </div>
          )}
          <div className="flex flex-col gap-4">
            {[
              { key: 'handle',       label: '@Handle *',       placeholder: '@nateherk' },
              { key: 'channel_name', label: 'Channel Name',    placeholder: 'Nate Herk | AI Automation' },
              { key: 'subscribers',  label: 'Subscribers',     placeholder: '694K' },
              { key: 'email',        label: 'Email',           placeholder: 'hello@example.com' },
              { key: 'instagram',    label: 'Instagram',       placeholder: '@nateherk' },
              { key: 'twitter',      label: 'Twitter / X',     placeholder: '@nateherk' },
              { key: 'linkedin',     label: 'LinkedIn',        placeholder: 'linkedin.com/in/...' },
              { key: 'website',      label: 'Website',         placeholder: 'nateherk.com' },
              { key: 'notes',        label: 'Notes / Niche',   placeholder: 'Business/AI niche, solo creator' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>{f.label}</label>
                <input
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', color: '#e8e8e8', fontSize: 16 }}
                  placeholder={f.placeholder}
                  value={manual[f.key]}
                  onChange={e => setManual(p => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>Fit Score</label>
              <select
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', color: '#e8e8e8', fontSize: 16 }}
                value={manual.fit_score}
                onChange={e => setManual(p => ({ ...p, fit_score: e.target.value }))}
              >
                {['HIGH FIT','MODERATE FIT','LOW FIT'].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <button
            className="mt-5 w-full py-3 rounded-xl font-semibold text-sm"
            style={{ background: '#4ade80', color: '#000' }}
            onClick={importManual}
            disabled={importing}
          >
            {importing ? 'Saving…' : '✓ Add Lead'}
          </button>
        </div>
      )}


      {error && (
        <div className="mt-4 px-4 py-3 rounded-lg text-sm" style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
          ⚠ {error}
        </div>
      )}
    </div>
  )
}
