/* ──────────────────────────────────────────────────────────────
   src/lib/pdfParser.js
   LeadScout PDF → leads[] using pdfjs-dist (client-side)
   ADR §05 integration contract — validates footer, maps columns
   ────────────────────────────────────────────────────────────── */

const EMAIL_RE = /[\w.-]+@[\w.-]+\.\w+/
const URL_RE   = /https?:\/\/[\w.\/-]+/

export async function parseLeadScoutPDF(file) {
  // Lazy-load pdfjs only on /import route
  const pdfjsLib = await import('pdfjs-dist')
  // Use legacy build worker to avoid ESM worker issues in Vite
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  // Extract all text with positional info
  let fullText = ''
  const pages = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map(i => i.str).join(' ')
    pages.push(pageText)
    fullText += pageText + '\n'
  }

  // Validate this is a LeadScout PDF
  if (!fullText.includes('LeadScout · Exported')) {
    throw new Error('This does not appear to be a LeadScout PDF. The footer "LeadScout · Exported" was not found.')
  }

  // Extract export date from header
  const dateMatch = fullText.match(/Generated:\s*([\d\s\w:,]+?)(?:·|Model)/)
  const exportDate = dateMatch ? dateMatch[1].trim() : new Date().toISOString().split('T')[0]

  // Extract table rows — look for @handle patterns
  const leads = []
  const seenHandles = new Set()

  // Parse line by line looking for table rows
  // LeadScout PDF table: Date | Language | Channel | Subscribers | Contact | Fit Assessment
  const allLines = fullText.split(/\s{3,}|\n/).map(l => l.trim()).filter(Boolean)

  // Find @handles and reconstruct rows
  const handleRE = /@[\w.-]+/g
  const subsRE   = /\b([\d.,]+[KMBkmb])\b/
  const fitRE    = /(HIGH FIT|MODERATE FIT|LOW FIT)/i

  // Walk through text items to find rows
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i]
    const handleMatch = line.match(/@([\w.-]+)/)
    if (!handleMatch) continue

    const handle = `@${handleMatch[1].toLowerCase()}`
    if (seenHandles.has(handle)) continue
    seenHandles.add(handle)

    // Look ahead for subscriber count and fit score
    let subscribers = ''
    let fitScore    = ''
    let fitReason   = ''
    let contactInfo = 'Not found'
    let channelName = ''
    let channelUrl  = `https://www.youtube.com/${handle}`

    // Scan surrounding lines for data
    const window = allLines.slice(Math.max(0, i - 3), i + 8).join(' ')

    const subsMatch = window.match(subsRE)
    if (subsMatch) subscribers = subsMatch[1].toUpperCase()

    const fitMatch = window.match(fitRE)
    if (fitMatch) {
      fitScore = fitMatch[1].toUpperCase()
      // Grab text after fit score as reason
      const afterFit = window.slice(window.indexOf(fitMatch[0]) + fitMatch[0].length).trim()
      fitReason = afterFit.slice(0, 120).trim()
    }

    const emailMatch = window.match(EMAIL_RE)
    const urlMatch   = window.match(URL_RE)
    if (emailMatch)    contactInfo = emailMatch[0]
    else if (urlMatch) contactInfo = urlMatch[0]

    // Channel name: text before the handle in the same line
    const beforeHandle = line.slice(0, line.indexOf(handle)).trim()
    if (beforeHandle && !beforeHandle.match(/date|language|channel/i)) {
      channelName = beforeHandle
    }

    leads.push({
      handle,
      channel_name:   channelName || handle,
      channel_url:    channelUrl,
      subscribers:    subscribers || '',
      fit_score:      normalizeFit(fitScore),
      fit_reason:     fitReason,
      email:          emailMatch ? emailMatch[0] : null,
      website:        (!emailMatch && urlMatch) ? urlMatch[0] : null,
      contact_status: 'unknown',
      status:         'unreviewed',
      notes:          contactInfo !== 'Not found' && !emailMatch && !urlMatch
                      ? `Contact: ${contactInfo}` : null,
    })
  }

  return {
    leads,
    duplicateCount: 0,
    exportDate,
    source: 'leadscout_pdf',
    filename: file.name,
  }
}

// CSV parser — maps headers case-insensitively
export function parseLeadScoutCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return { leads: [], duplicateCount: 0 }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
  const fieldMap = {
    date: ['date'],
    language: ['language', 'lang'],
    channel: ['channel', 'handle', '@handle'],
    subscribers: ['subscribers', 'subs', 'subscriber_count'],
    contact_info: ['contact_info', 'contact', 'email', 'website'],
    fit_assessment: ['fit_assessment', 'fit', 'fit_score'],
  }

  function findCol(field) {
    return fieldMap[field].map(n => headers.indexOf(n)).find(i => i >= 0) ?? -1
  }

  const cols = {
    channel:    findCol('channel'),
    subscribers: findCol('subscribers'),
    contact:    findCol('contact_info'),
    fit:        findCol('fit_assessment'),
  }

  const leads = []
  const seen  = new Set()

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''))
    if (!cells[cols.channel]) continue

    const raw    = cells[cols.channel]
    const handle = raw.startsWith('@') ? raw.toLowerCase() : `@${raw.toLowerCase()}`
    if (seen.has(handle)) continue
    seen.add(handle)

    const fitRaw = cols.fit >= 0 ? cells[cols.fit] : ''
    const contactRaw = cols.contact >= 0 ? cells[cols.contact] : ''

    leads.push({
      handle,
      channel_name:   handle,
      channel_url:    `https://www.youtube.com/${handle}`,
      subscribers:    cols.subscribers >= 0 ? cells[cols.subscribers] : '',
      fit_score:      normalizeFit(fitRaw),
      fit_reason:     '',
      email:          contactRaw.match(EMAIL_RE) ? contactRaw : null,
      website:        contactRaw.match(URL_RE) ? contactRaw : null,
      contact_status: 'unknown',
      status:         'unreviewed',
    })
  }

  return { leads, duplicateCount: 0, source: 'csv' }
}

function normalizeFit(raw) {
  const s = (raw || '').toUpperCase()
  if (s.includes('HIGH'))     return 'HIGH FIT'
  if (s.includes('MODERATE')) return 'MODERATE FIT'
  if (s.includes('LOW'))      return 'LOW FIT'
  return 'MODERATE FIT'
}
