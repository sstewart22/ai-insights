import api from "@/services/api";

export type PromptInteractionType = "call" | "chat" | "shared";

export type PromptKind =
  | "base"
  | "campaign_section"
  | "opportunity_section"
  | "operations_section"
  | "operations_schema"
  | "qa_section"
  | "qa_schema"
  | "objection_section"
  | "objection_schema"
  | "other";

export interface PromptTemplate {
  id: string;
  key: string;
  interactionType: PromptInteractionType;
  kind: PromptKind;
  campaign: string | null;
  label: string;
  notes: string | null;
  body: string;
  version: number;
  isActive: boolean;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromptHistoryRow {
  id: string;
  promptTemplateId: string;
  key: string;
  version: number;
  body: string;
  label: string;
  notes: string | null;
  updatedById: string | null;
  createdAt: string;
}

export async function listPrompts(filters?: {
  interactionType?: PromptInteractionType | "";
  campaign?: string;
  kind?: PromptKind | "";
}) {
  const params: Record<string, string> = {};
  if (filters?.interactionType) params.interactionType = filters.interactionType;
  if (filters?.campaign) params.campaign = filters.campaign;
  if (filters?.kind) params.kind = filters.kind;
  const { data } = await api.get<PromptTemplate[]>("/uiapi/prompts", { params });
  return data;
}

export async function getPrompt(id: string) {
  const { data } = await api.get<PromptTemplate>(`/uiapi/prompts/${id}`);
  return data;
}

export async function createPrompt(payload: {
  key: string;
  interactionType: PromptInteractionType;
  kind: PromptKind;
  campaign?: string | null;
  label: string;
  notes?: string | null;
  body: string;
  isActive?: boolean;
}) {
  const { data } = await api.post<PromptTemplate>("/uiapi/prompts", payload);
  return data;
}

export async function updatePrompt(
  id: string,
  payload: Partial<{
    interactionType: PromptInteractionType;
    kind: PromptKind;
    campaign: string | null;
    label: string;
    notes: string | null;
    body: string;
    isActive: boolean;
  }>,
) {
  const { data } = await api.patch<PromptTemplate>(
    `/uiapi/prompts/${id}`,
    payload,
  );
  return data;
}

export async function deletePrompt(id: string) {
  const { data } = await api.delete<{ ok: boolean }>(`/uiapi/prompts/${id}`);
  return data;
}

export async function getPromptHistory(id: string) {
  const { data } = await api.get<PromptHistoryRow[]>(
    `/uiapi/prompts/${id}/history`,
  );
  return data;
}

export async function previewPrompt(payload: {
  interactionType: "call" | "chat";
  campaign?: string | null;
  transcript?: string;
}) {
  const { data } = await api.post<{ body: string }>(
    "/uiapi/prompts/preview",
    payload,
  );
  return data;
}
