import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class InsightsService {
  private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async extractInsights(transcript: string) {
    const prompt = `
You are an analytics engine that extracts structured call insights.
Return ONLY valid JSON matching this schema exactly.

Schema:
{
  "summary_short": string,
  "summary_detailed": string,
  "primary_intent": string,
  "resolution_status": "resolved" | "unresolved" | "escalated" | "follow_up_required",
  "sentiment_overall": number, 
  "action_items": Array<{ "description": string, "owner": "agent" | "customer" | "unknown", "due_date_if_mentioned": string | null }>,
  "key_entities": Array<{ "type": string, "value": string }>,
  "risk_flags": string[]
}

Rules:
- sentiment_overall must be between -1 and 1.
- If unsure, use "unknown" owner and empty arrays.
- Do not include markdown. Do not include extra keys.

Transcript:
"""${transcript}"""
`.trim();

    const resp = await this.client.responses.create({
      model: 'gpt-4o-mini', // cheap + good for structured extraction; swap if you prefer
      input: prompt,
      temperature: 0.1,
    });

    // responses API returns text across output; simplest is to take output_text
    const text = resp.output_text?.trim() ?? '';
    // If the model obeys, this is JSON. In production you'd validate + retry.
    return { json: text };
  }
}
