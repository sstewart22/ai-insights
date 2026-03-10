export interface InsightsProviderResult {
  text: string;
  model: string;
  provider: string;
}

export interface InsightsProvider {
  extract(prompt: string): Promise<InsightsProviderResult>;
}
