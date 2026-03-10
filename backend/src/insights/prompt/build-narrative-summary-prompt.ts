export function buildNarrativeSummaryPrompt(metrics: unknown): string {
  return `
  You are writing an exec narrative for a contact-centre manager in UK automotive finance.
  
  You are given aggregated metrics for a time window plus example calls.
  
  Return ONLY valid JSON with this schema:
  {
    "headline": string,
    "period_summary": string,
    "what_stood_out": string[],
    "operational_funnel": Array<{ "stage": string, "detail": string }>,
    "top_drivers": Array<{ "driver": string, "evidence": string }>,
    "risks_and_compliance": Array<{ "risk": string, "evidence": string, "suggested_action": string }>,
    "recommended_actions": Array<{ "action": string, "priority": "high"|"medium"|"low", "owner": "ops"|"agent"|"product"|"engineering"|"unknown" }>,
    "notes_on_data_quality": string[]
  }
  
  Rules:
  - Use ONLY the provided data; do not invent numbers.
  - Be specific: call out connect rate issues, common conversation types, interest levels, and dealer follow-up volume if present.
  - Reference examples only using the fields provided (recordingId snippets / summaries).
  - Keep concise.
  - Return JSON only. No markdown. No explanation.
  
  DATA (JSON):
  ${JSON.stringify(metrics, null, 2)}
  `.trim();
}
