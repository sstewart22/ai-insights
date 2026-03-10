import { InsightsProvider } from './insights-provider.interface';
import { OpenAIProvider } from './openai.provider';
import { AnthropicProvider } from './anthropic.provider';
import { GrokProvider } from './grok.provider';
import { GeminiProvider } from './gemini.provider';
import { InsightsProviderName } from '../types/insights-provider.type';

export function createProvider(
  provider?: InsightsProviderName,
): InsightsProvider {
  const selected =
    provider ??
    (process.env.INSIGHTS_PROVIDER as InsightsProviderName | undefined) ??
    'openai';

  switch (selected) {
    case 'anthropic':
      return new AnthropicProvider();
    case 'grok':
      return new GrokProvider();
    case 'gemini':
      return new GeminiProvider();
    case 'openai':
    default:
      return new OpenAIProvider();
  }
}
