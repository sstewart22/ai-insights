import { BadRequestException } from '@nestjs/common';

export type NarrativeSummary = {
  headline: string;
  period_summary: string;
  what_stood_out: string[];
  operational_funnel: Array<{ stage: string; detail: string }>;
  top_drivers: Array<{ driver: string; evidence: string }>;
  risks_and_compliance: Array<{
    risk: string;
    evidence: string;
    suggested_action: string;
  }>;
  recommended_actions: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    owner: 'ops' | 'agent' | 'product' | 'engineering' | 'unknown';
  }>;
  notes_on_data_quality: string[];
};

export function parseNarrativeSummaryJson(jsonText: string): NarrativeSummary {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new BadRequestException('Narrative model did not return valid JSON');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new BadRequestException('Narrative JSON was not an object');
  }

  const obj = parsed as Record<string, unknown>;

  const requiredString = ['headline', 'period_summary'];
  for (const key of requiredString) {
    if (typeof obj[key] !== 'string') {
      throw new BadRequestException(`Narrative JSON missing string "${key}"`);
    }
  }

  const requiredArray = [
    'what_stood_out',
    'operational_funnel',
    'top_drivers',
    'risks_and_compliance',
    'recommended_actions',
    'notes_on_data_quality',
  ];

  for (const key of requiredArray) {
    if (!Array.isArray(obj[key])) {
      throw new BadRequestException(`Narrative JSON missing array "${key}"`);
    }
  }

  return obj as NarrativeSummary;
}
