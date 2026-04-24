import api from "@/services/api";

export interface InteractionSearchResult {
  id: string;
  interactionId: string | null;
  interactionTpsId: string | null;
  interactionType: string | null;
  campaign: string | null;
  agent: string | null;
  interactionDateTime: string | null;
  outcome: string | null;
  summaryShort: string | null;
}

export interface InteractionDetail {
  interaction: {
    id: string;
    agent: string | null;
    campaign: string | null;
    interactionType: string | null;
    interactionDateTime: string | null;
    status: string;
    interactionId: string | null;
    interactionTpsId: string | null;
    interactionSource: string | null;
    recordingUrl: string | null;
    outcome: string | null;
  };
  transcript: { text: string; model: string | null } | null;
  insight: {
    summary_short: string | null;
    summary_detailed: string | null;
    sentiment_overall: number | null;
    overall_score: number | null;
    contact_disposition: string | null;
    conversation_type: string | null;
    interest_level: string | null;
    campaign_detected: string | null;
    decision_timeline: string | null;
    next_step_agreed: string | null;
  } | null;
}

export async function searchInteractions(q: string) {
  const { data } = await api.get<InteractionSearchResult[]>(
    "/uiapi/insights/interactions/search",
    { params: { q } },
  );
  return data;
}

export async function getInteractionDetail(id: string) {
  const { data } = await api.get<InteractionDetail>(
    `/uiapi/insights/ops/interaction-detail/${id}`,
  );
  return data;
}
