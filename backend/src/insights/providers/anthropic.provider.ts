import Anthropic from '@anthropic-ai/sdk';
import {
  InsightsProvider,
  InsightsProviderResult,
} from './insights-provider.interface';

export class AnthropicProvider implements InsightsProvider {
  private client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  private readonly model = 'claude-haiku-4-5';

  async extract(prompt: string): Promise<InsightsProviderResult> {
    const resp = await this.client.messages.create({
      model: this.model,
      max_tokens: 2000,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }],
    });

    const firstBlock = resp.content[0];
    const text = firstBlock && 'text' in firstBlock ? firstBlock.text : '';

    return {
      text: text.trim(),
      model: this.model,
      provider: 'anthropic',
    };
  }
}
