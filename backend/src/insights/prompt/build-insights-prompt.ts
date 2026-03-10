export function buildInsightsPrompt(transcript: string): string {
  return `
  You extract structured insights from contact-centre calls for a UK automotive finance context.
  Calls are usually outbound lead generation for dealers OR follow-ups on sales / satisfaction, but can be other.
  
  Return ONLY valid JSON matching the schema exactly. No markdown, no extra keys.
  
  Important domain requirements:
  - Many calls do NOT reach the intended person. You MUST classify contact_disposition accurately:
    - "no_answer" if it rings out and no voicemail is left.
    - "voicemail" if voicemail/answering machine is reached (even if a message is left).
    - "connected_wrong_party" if someone answers but is not the intended customer/account holder.
    - "connected_correct_party" only if the intended customer/account holder is reached and a real conversation happens.
    - Use "unknown" only if genuinely ambiguous.
  - "conversation_type" should reflect what the call is trying to do (lead_generation / sales_follow_up / satisfaction_check / complaint_handling / service_query / other).
  - Separate resolution_status from internal CRM outcome (NOT in transcript).
  - If contact_disposition is NOT connected_correct_party, keep summary_short minimal and do NOT hallucinate outcomes.
  
  Quality rules:
  - Use the transcript only. Never invent facts.
  - Keep summary_short <= 200 chars.
  - sentiment_overall must be between -1 and 1.
  - Quotes max 12 words each. If none, [].
  - action_items must be concrete and derived from transcript. If none, [].
  
  Schema:
  {
    "contact_disposition": "connected_correct_party" | "connected_wrong_party" | "no_answer" | "voicemail" | "busy" | "call_dropped" | "invalid_number" | "unknown",
    "conversation_type": "lead_generation" | "sales_follow_up" | "satisfaction_check" | "complaint_handling" | "service_query" | "other" | "unknown",
    "summary_short": string,
    "summary_detailed": string,
    "primary_intent": string,
    "topics": string[],
    "resolution_status": "resolved" | "unresolved" | "escalated" | "follow_up_required",
    "sentiment_overall": number,
    "customer_signals": {
      "interest_level": "high" | "medium" | "low" | "unknown",
      "objections": string[],
      "decision_timeline": string | null,
      "next_step_agreed": string | null
    },
    "action_items": Array<{ "description": string, "owner": "agent" | "customer" | "dealer" | "unknown", "due_date_if_mentioned": string | null }>,
    "dealer_related": { "dealer_contact_required": boolean, "dealer_name_if_mentioned": string | null },
    "agent_coaching": { "did_well": string[], "needs_improvement": string[], "good_quotes": string[], "bad_quotes": string[] },
    "key_entities": Array<{ "type": string, "value": string }>,
    "risk_flags": string[],
    "data_quality": { "is_too_short": boolean, "is_unclear": boolean, "overlapping_speech": boolean, "notes": string }
  }
  
  Transcript:
  """${transcript}"""
  `.trim();
}
