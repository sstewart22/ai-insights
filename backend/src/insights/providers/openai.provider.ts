import OpenAI from 'openai';
import {
  InsightsProvider,
  InsightsProviderResult,
} from './insights-provider.interface';

export class OpenAIProvider implements InsightsProvider {
  private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  private readonly model = 'gpt-4o-mini';

  async extract(prompt: string): Promise<InsightsProviderResult> {
    const resp = await this.client.responses.create({
      model: this.model,
      input: prompt,
      temperature: 0.1,
    });

    return {
      text: (resp.output_text ?? '').trim(),
      model: this.model,
      provider: 'openai',
    };
  }
}
