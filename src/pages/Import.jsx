/* src/pages/Import.jsx — PDF / CSV / Manual import wizard */
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeads } from '../hooks/useLeads'
import { parseLeadScoutPDF, parseLeadScoutCSV } from '../lib/pdfParser'

const TABS = ['PDF', 'CSV', 'Manual']

const FIT_COLORS = { 'HIGH FIT': '#4ade80', 'MODERATE FIT': '#fbbf24', 'LOW FIT': '#f87171' }

export default function Import() {
  const navigate   = useNavigate()
  const { importLeads } = useLeads()

  const [tab, setTab]           = useState('PDF')
  const [parsing, setParsing]   = useState(false)
  const [preview, setPreview]   = useState(null)
  const [error, setError]       = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult]     = useState(null)
  const fileRef = useRef()

  // Manual form state
  const [manual, setManual] = useState({ handle: '', channel_name: '', subscribers: '', fit_score: 'MODERATE FIT', email: '', notes: '' })

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
        subscribers:   manual.subscribers || '',
        fit_score:     manual.fit_score,
        email:         manual.email || null,
        notes:         manual.notes || null,
        contact_status: 'unknown',
        status:        'unreviewed',
      }
      const res = await importLeads([lead], { source: 'manual', lead_count: 1 })
      setResult(res)
    } catch (e) {
      setError(e.message)
    }
    setImporting(false)
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
    <div className="max-w-2xl mx-auto py-8 px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Import Leads</h1>
        <p className="text-sm" style={{ color: '#6b6b6b' }}>Import from LeadScout PDF, CSV, or add manually</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit" style={{ background: '#141414', border: '1px solid #2a2a2a' }}>
        {TABS.map(t => (
          <button
            key={t}
            className="px-4 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              background: tab === t ? '#2a2a2a' : 'transparent',
              color:      tab === t ? '#e8e8e8' : '#6b6b6b',
            }}
            onClick={() => { setTab(t); setPreview(null); setError('') }}
          >
            {t === 'PDF' ? '📄 PDF' : t === 'CSV' ? '📊 CSV' : '✏️ Manual'}
          </button>
        ))}
      </div>

      {/* PDF / CSV upload */}
      {(tab === 'PDF' || tab === 'CSV') && !preview && (
        <div>
          <div
            className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors"
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

          <div className="rounded-xl border overflow-hidden mb-5" style={{ borderColor: '#2a2a2a' }}>
            <table className="w-full text-xs">
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

          <button
            className="px-6 py-2.5 rounded-lg font-semibold text-sm transition-all"
            style={{ background: importing ? '#2a2a2a' : '#4ade80', color: importing ? '#555' : '#000' }}
            onClick={confirmImport}
            disabled={importing}
          >
            {importing ? 'Importing…' : `✓ Import ${preview.leads.length} Leads`}
          </button>
        </div>
      )}

      {/* Manual */}
      {tab === 'Manual' && (
        <div className="rounded-xl border p-5" style={{ background: '#141414', borderColor: '#2a2a2a' }}>
          <div className="flex flex-col gap-4">
            {[
              { key: 'handle',       label: '@Handle *',          placeholder: '@nateherk' },
              { key: 'channel_name', label: 'Channel Name',       placeholder: 'Nate Herk | AI Automation' },
              { key: 'subscribers',  label: 'Subscribers',        placeholder: '694K' },
              { key: 'email',        label: 'Email (if known)',    placeholder: 'hello@example.com' },
              { key: 'notes',        label: 'Notes',              placeholder: 'Business/AI niche, solo creator' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>{f.label}</label>
                <input
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', color: '#e8e8e8' }}
                  placeholder={f.placeholder}
                  value={manual[f.key]}
                  onChange={e => setManual(p => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>Fit Score</label>
              <select
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: '#1c1c1c', border: '1px solid #2a2a2a', color: '#e8e8e8' }}
                value={manual.fit_score}
                onChange={e => setManual(p => ({ ...p, fit_score: e.target.value }))}
              >
                {['HIGH FIT','MODERATE FIT','LOW FIT'].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <button
            className="mt-4 px-6 py-2.5 rounded-lg font-semibold text-sm"
            style={{ background: '#4ade80', color: '#000' }}
            onClick={importManual}
            disabled={importing}
          >
            {importing ? 'Saving…' : 'Add Lead'}
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
