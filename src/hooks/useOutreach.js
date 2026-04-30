/* src/hooks/useOutreach.js — outreach_log CRUD */
import { outreachDB } from '../lib/db'

export function useOutreach() {
  const logOutreach = async ({ lead_id, channel_used, subject_line, message_body, hook_style, groq_model, followup_days_1 }) => {
    const now = new Date()
    const fu1Due = new Date(now)
    fu1Due.setDate(fu1Due.getDate() + (followup_days_1 || 4))

    return outreachDB.create({
      lead_id, channel_used, subject_line, message_body, hook_style, groq_model,
      sequence_num: 1,
      follow_up_1_due: fu1Due.toISOString().split('T')[0],
      contacted_at: now.toISOString(),
    })
  }

  const getOutreachForLead = (lead_id) => outreachDB.getForLead(lead_id)

  const markFollowUpSent = async (logId, fuNum, followup_days_2) => {
    const now = new Date()
    const patch = fuNum === 1
      ? { follow_up_1_sent: now.toISOString() }
      : { follow_up_2_sent: now.toISOString() }

    if (fuNum === 1 && followup_days_2) {
      const fu2Due = new Date(now)
      fu2Due.setDate(fu2Due.getDate() + followup_days_2)
      patch.follow_up_2_due = fu2Due.toISOString().split('T')[0]
    }
    await outreachDB.update(logId, patch)
  }

  const markReply = (logId) => outreachDB.update(logId, {
    reply_received: true,
    reply_at: new Date().toISOString(),
    outcome: 'open',
  })

  const setOutcome = (logId, outcome) => outreachDB.update(logId, { outcome })

  return { logOutreach, getOutreachForLead, markFollowUpSent, markReply, setOutcome }
}
