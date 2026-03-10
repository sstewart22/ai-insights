import { BadRequestException, Injectable } from '@nestjs/common';
import { createProvider } from './providers/provider.factory';
import { buildInsightsPrompt } from './prompt/build-insights-prompt';
import { InsightsProviderName } from './types/insights-provider.type';

export type ExtractedInsightsV2 = {
  contact_disposition: string;
  conversation_type: string;
  summary_short: string;
  summary_detailed: string;
  primary_intent: string;
  topics: string[];
  resolution_status: string;
  sentiment_overall: number;
  customer_signals: {
    interest_level: string;
    objections: string[];
    decision_timeline: string | null;
    next_step_agreed: string | null;
  };
  action_items: Array<{
    description: string;
    owner: 'agent' | 'customer' | 'dealer' | 'unknown';
    due_date_if_mentioned: string | null;
  }>;
  dealer_related: {
    dealer_contact_required: boolean;
    dealer_name_if_mentioned: string | null;
  };
  agent_coaching: {
    did_well: string[];
    needs_improvement: string[];
    good_quotes: string[];
    bad_quotes: string[];
  };
  key_entities: Array<{ type: string; value: string }>;
  risk_flags: string[];
  data_quality: {
    is_too_short: boolean;
    is_unclear: boolean;
    overlapping_speech: boolean;
    notes: string;
  };
};

function cleanJsonText(text: string): string {
  let cleaned = text.trim();

  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/, '');
  }

  return cleaned.trim();
}

@Injectable()
export class InsightsService {
  async extractInsightsV2(
    transcript: string,
    provider?: InsightsProviderName,
  ): Promise<{
    providerUsed: string;
    model: string;
    rawJsonText: string;
    parsed: ExtractedInsightsV2;
  }> {
    const prompt = buildInsightsPrompt(transcript);
    const llmProvider = createProvider(provider);

    const result = await llmProvider.extract(prompt);
    const rawJsonText = result.text;

    if (!rawJsonText) throw new Error('Empty insights response');

    const cleanedJsonText = cleanJsonText(rawJsonText);

    let parsed: ExtractedInsightsV2;
    try {
      parsed = JSON.parse(cleanedJsonText);
    } catch {
      console.error('[extractInsightsV2] invalid JSON from model', {
        providerUsed: result.provider,
        model: result.model,
        rawPreview: rawJsonText.slice(0, 4000),
      });

      throw new BadRequestException('Insights model did not return valid JSON');
    }

    return {
      providerUsed: result.provider,
      model: result.model,
      rawJsonText,
      parsed,
    };
  }
}
