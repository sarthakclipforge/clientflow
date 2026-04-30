/* ──────────────────────────────────────────────────────────────
   src/lib/groq.js
   Groq API — direct browser calls (Option B)
   ────────────────────────────────────────────────────────────── */

const GROQ_BASE = 'https://api.groq.com/openai/v1'

export const MODEL_PREFERENCES = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama3-70b-8192',
  'mixtral-8x7b-32768',
  'llama3-8b-8192',
  'gemma2-9b-it',
]

export const MODEL_DISPLAY = {
  'llama-3.3-70b-versatile': 'Llama 3.3 70B',
  'llama-3.1-70b-versatile': 'Llama 3.1 70B',
  'llama3-70b-8192':         'Llama 3 70B',
  'mixtral-8x7b-32768':      'Mixtral 8×7B',
  'llama3-8b-8192':          'Llama 3 8B',
  'gemma2-9b-it':            'Gemma 2 9B',
}

// ─── Model Auto-Detection ─────────────────────────────────────
export async function detectGroqModel(apiKey) {
  const res = await fetch(`${GROQ_BASE}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const available = (data.data || []).map(m => m.id)
  for (const pref of MODEL_PREFERENCES) {
    if (available.some(id => id === pref || id.startsWith(pref.split('-').slice(0, 3).join('-')))) {
      return pref
    }
  }
  if (available.length > 0) return available[0]
  throw new Error('No models available')
}

// ─── Helper: extract first name from channel name or handle ──
function extractFirstName(lead) {
  // Try channel name first (e.g. "John Smith Codes" → "John")
  if (lead.channel_name) {
    const words = lead.channel_name.trim().split(/\s+/)
    const first = words[0]
    // Skip generic words like "The", "Team", "Official"
    const skip = ['the', 'team', 'official', 'channel', 'studio', 'media']
    if (!skip.includes(first.toLowerCase()) && /^[A-Z][a-z]+/.test(first)) {
      return first
    }
  }
  // Fall back to handle: @glowupwithclaude → Claude (last CamelCase word)
  if (lead.handle) {
    const h = lead.handle.replace(/^@/, '')
    // Split on common separators
    const parts = h.split(/(?=[A-Z])|[_\-\.]|with|by|from|its|the/)
    // Take the last meaningful chunk
    const meaningful = parts.filter(p => p.length > 2)
    const last = meaningful[meaningful.length - 1]
    if (last) return last.charAt(0).toUpperCase() + last.slice(1).toLowerCase()
  }
  return null
}

// ─── Core API Call ────────────────────────────────────────────
async function callGroq(apiKey, model, systemPrompt, userPrompt) {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.75,
      max_tokens: 1500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Groq HTTP ${res.status}`)
  }
  const data = await res.json()
  const raw  = data.choices?.[0]?.message?.content || ''
  return parseGroqJSON(raw)
}

function parseGroqJSON(raw) {
  try { return JSON.parse(raw) } catch {}
  const m = raw.match(/\{[\s\S]*\}/)
  if (m) { try { return JSON.parse(m[0]) } catch {} }
  const a = raw.match(/\[[\s\S]*\]/)
  if (a) { try { return JSON.parse(a[0]) } catch {} }
  throw new Error('Groq returned unparseable response')
}

// ─── System Prompt ────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert cold outreach copywriter for a freelance video editing business.

CRITICAL RULES — follow every single one:
1. ALWAYS start the message with "Hi [FirstName]," on its own line.
2. ALWAYS use the creator's actual first name — never their handle with @, never "there", never skip it.
3. ALWAYS reference the actual latest video title or a specific observation — never say "your recent upload" generically.
4. Subject lines must be specific and intriguing — under 8 words — NOT generic like "video editing help" or "quick question".
5. Use proper line breaks between every section: greeting / body paragraph / CTA / blank line / signature.
6. The signature must be on its own lines, separated from body by a blank line.
7. Never use: "synergy", "leverage", "reach out", "circle back", "hope this finds you well", "I came across", "stumbled upon".
8. Never sound like a template. Sound like a real human who actually watched their content.
9. Return ONLY valid JSON. No markdown, no preamble, no code fences, no explanation.`

// ─── Email Generation ─────────────────────────────────────────
export async function generateEmail(apiKey, model, lead, profile, hookStyle) {
  const firstName = extractFirstName(lead) || lead.channel_name || lead.handle
  const videoTitle = lead.latest_video || null
  const niche = lead.niche || 'YouTube content creator'

  const hookInstructions = {
    Observation: `Hook style: OBSERVATION — open by noting something SPECIFIC about their content (reference the video title directly, or their channel's unique angle). Show you actually watched.`,
    Result:      `Hook style: RESULT — open with a concrete result you've achieved for a similar creator (same niche/size). Lead with the number, then connect it to their situation.`,
    Curiosity:   `Hook style: CURIOSITY — open with a one-line question that relates directly to a challenge their niche faces. Make it feel like you've solved exactly this before.`,
  }

  const userPrompt = `Write a cold outreach email from a freelance video editor to a YouTube creator.

CREATOR INFO:
- First name to use in greeting: ${firstName}
- Channel: ${lead.channel_name || lead.handle} (${lead.handle})
- Niche: ${niche}
- Subscribers: ${lead.subscribers}
- Latest video title: "${videoTitle || 'not provided — use niche context instead'}"
- Why they're a fit: "${lead.fit_reason || 'solo creator'}"
- Notes: "${lead.notes || 'none'}"

EDITOR INFO:
- My name: ${profile.name}
- My service: "${profile.service_desc}"
- My proof/result: "${profile.proof_line}"
- Email signature block: "${profile.email_signature || `${profile.name}`}"

${hookInstructions[hookStyle] || hookInstructions.Observation}

FORMAT RULES (CRITICAL):
- Line 1: "Hi ${firstName}," (exactly this, then blank line)
- Lines 2-3: Hook — 1-2 sentences max, MUST reference "${videoTitle || niche}" specifically
- Line 4: Bridge — 1 sentence connecting their situation to your service
- Line 5: Proof — 1 sentence using the proof/result stat above
- Line 6: CTA — 1 soft question (NOT "let me know if you're interested", NOT "would love to connect")
- Blank line
- Signature block (use email_signature as-is, each element on its own line)

TOTAL BODY: 80-100 words MAX (not counting signature).

For subject lines:
- Must be specific to THIS creator's content or niche
- Under 8 words
- Intriguing but not clickbait
- NOT generic: no "editing help", "quick question", "video services"
- Example good subjects: "Your [video topic] deserved a better cut", "How [similar creator] 3x'd retention", "One edit that changed [niche] creators"

Return JSON ONLY (no markdown, no code fences):
{"subject_variants":["specific subject 1","specific subject 2","specific subject 3"],"body":"Hi ${firstName},\\n\\n[hook]\\n\\n[bridge] [proof] [CTA]\\n\\n[signature on separate lines]"}`

  const result = await callGroq(apiKey, model, SYSTEM_PROMPT, userPrompt)

  // Ensure we always have 3 subject variants
  if (!result.subject_variants || result.subject_variants.length < 3) {
    result.subject_variants = [
      result.subject_variants?.[0] || `Your ${niche} content caught my eye`,
      result.subject_variants?.[1] || `How I helped a ${niche} creator 3x retention`,
      result.subject_variants?.[2] || `Quick thought on "${videoTitle || lead.handle}"`,
    ]
  }

  // Ensure body starts with Hi [name] if Groq forgot
  if (result.body && !result.body.startsWith('Hi ')) {
    result.body = `Hi ${firstName},\n\n${result.body}`
  }

  return result
}

// ─── DM Generation ────────────────────────────────────────────
export async function generateDM(apiKey, model, lead, profile, hookStyle) {
  const firstName = extractFirstName(lead) || lead.channel_name || lead.handle
  const videoTitle = lead.latest_video || null

  const hookInstructions = {
    Observation: `Hook: one specific observation about their latest video ("${videoTitle || 'their content'}") — shows you actually watched.`,
    Result:      `Hook: lead with a concrete result for a similar creator, then connect to them.`,
    Curiosity:   `Hook: one sharp question about a problem their niche faces.`,
  }

  const userPrompt = `Write a cold outreach DM (Instagram or Twitter). Max 3 short sentences.

CREATOR:
- Name to use: ${firstName}
- Handle: ${lead.handle}
- Niche: ${lead.niche || 'YouTube creator'}
- Subscribers: ${lead.subscribers}
- Latest video: "${videoTitle || 'recent upload'}"
- Why they're a fit: "${lead.fit_reason || 'solo creator'}"
- Notes: "${lead.notes || ''}"

EDITOR: ${profile.name} — "${profile.service_desc}" — proof: "${profile.proof_line}"

${hookInstructions[hookStyle] || hookInstructions.Observation}

FORMAT (CRITICAL):
- Start with "Hi ${firstName}," then the hook sentence
- Sentence 2: what you do (one line, specific)
- Sentence 3: soft CTA — "Worth a quick chat?" / "Open to it?" / "Keen to hear your thoughts?"
- NO links, NO portfolio URL in first DM, sound like a real person texting

Return JSON ONLY:
{"message":"Hi ${firstName}, [hook]\\n\\n[what you do]\\n\\n[soft CTA]"}`

  return callGroq(apiKey, model, SYSTEM_PROMPT, userPrompt)
}

// ─── Follow-Up 1 ──────────────────────────────────────────────
export async function generateFU1(apiKey, model, lead, outreachLog, daysSince, channel) {
  const firstName = extractFirstName(lead) || lead.channel_name || lead.handle
  const firstLine = outreachLog?.message_body?.split('\n').find(l => l.trim().length > 10) || ''

  const userPrompt = `Write a follow-up to a cold outreach with no reply after ${daysSince} days.

CREATOR: ${firstName} (${lead.handle}) — ${lead.niche || 'YouTube creator'} — latest video: "${lead.latest_video || ''}"
CHANNEL: ${channel}
ORIGINAL OPENING: "${firstLine}"

RULES:
- Start with "Hi ${firstName},"
- Frame as bumping your own thread — do NOT say "I know you're busy" or guilt-trip
- Add ONE new value: a new specific observation, a relevant insight, or a data point
- Max 2-3 sentences total
- End with a different CTA than the original (more specific / lower commitment)

For email: include a subject line starting with "Re: "

Return JSON ONLY:
{"subject":"Re: [original topic]","body":"Hi ${firstName},\\n\\n[FU text]\\n\\n${profile?.name || 'Your name'}","message":"Hi ${firstName}, [FU text]"}`

  return callGroq(apiKey, model, SYSTEM_PROMPT, userPrompt)
}

// ─── Follow-Up 2 ──────────────────────────────────────────────
export async function generateFU2(apiKey, model, lead, daysTotal) {
  const firstName = extractFirstName(lead) || lead.channel_name || lead.handle

  const userPrompt = `Write a final closing-the-loop message. This is the last touch — no more after this.

CREATOR: ${firstName} (${lead.handle}) — ${lead.niche || 'YouTube creator'}
Original contact: ${daysTotal} days ago.

RULES:
- Start with "Hi ${firstName},"
- 1-2 sentences max
- Acknowledge they're likely not interested or focused elsewhere — zero pressure
- Leave the door open warmly, no guilt
- Example tone: "Hey ${firstName}, figured this probably wasn't the right time — feel free to ping me if that ever changes. No worries either way."

Return JSON ONLY:
{"message":"Hi ${firstName}, [closing line]"}`

  return callGroq(apiKey, model, SYSTEM_PROMPT, userPrompt)
}
