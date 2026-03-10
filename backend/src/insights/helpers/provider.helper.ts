import { BadRequestException } from '@nestjs/common';
import { InsightsProviderName } from '../types/insights-provider.type';

const ALLOWED_PROVIDERS: InsightsProviderName[] = [
  'openai',
  'anthropic',
  'grok',
  'gemini',
];

export function normalizeProvider(
  provider?: string | null,
): InsightsProviderName | undefined {
  if (!provider) return undefined;

  const value = provider.trim().toLowerCase();

  if (ALLOWED_PROVIDERS.includes(value as InsightsProviderName)) {
    return value as InsightsProviderName;
  }

  throw new BadRequestException(
    `Unsupported provider "${provider}". Allowed values: ${ALLOWED_PROVIDERS.join(', ')}`,
  );
}
