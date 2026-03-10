import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';

import { CallRecording } from '../db/entities/call-recording.entity';
import { CallTranscript } from '../db/entities/call-transcript.entity';
import { CallInsight } from '../db/entities/call-insight.entity';

import { TranscriptionDeepgramService } from '../transcription/transcriptionDeepgram.service';
import { InsightsService } from '../insights/insights.service';
import { InsightsProviderName } from '../insights/types/insights-provider.type';

function sniffAudioExt(buf: Buffer): 'wav' | 'mp3' | 'mp4' | 'unknown' {
  if (buf.length >= 12) {
    const riff = buf.toString('ascii', 0, 4);
    const wave = buf.toString('ascii', 8, 12);
    if (riff === 'RIFF' && wave === 'WAVE') return 'wav';
  }

  if (buf.length >= 3 && buf.toString('ascii', 0, 3) === 'ID3') return 'mp3';
  if (buf.length >= 2 && buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) {
    return 'mp3';
  }

  if (buf.length >= 8 && buf.toString('ascii', 4, 8) === 'ftyp') return 'mp4';

  return 'unknown';
}

function pickFilename(url: string, buf: Buffer) {
  const ext = sniffAudioExt(buf);
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').pop() || 'recording';
    const hasDot = last.includes('.');
    const urlExt = hasDot ? last.split('.').pop()!.toLowerCase() : '';
    const sniffExt = ext === 'mp4' ? 'm4a' : ext;

    if (
      sniffExt !== 'unknown' &&
      urlExt &&
      ['wav', 'mp3', 'm4a', 'mp4'].includes(urlExt)
    ) {
      if (
        (sniffExt === 'm4a' && (urlExt === 'm4a' || urlExt === 'mp4')) ||
        urlExt === sniffExt
      ) {
        return last;
      }
    }

    if (sniffExt !== 'unknown') return `recording.${sniffExt}`;

    return hasDot ? last : 'recording.bin';
  } catch {
    const ext2 = ext === 'mp4' ? 'm4a' : ext;
    return ext2 === 'unknown' ? 'recording.bin' : `recording.${ext2}`;
  }
}

@Injectable()
export class RecordingsService {
  private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  constructor(
    @InjectRepository(CallRecording)
    private recordingsRepo: Repository<CallRecording>,
    @InjectRepository(CallTranscript)
    private transcriptsRepo: Repository<CallTranscript>,
    @InjectRepository(CallInsight)
    private insightsRepo: Repository<CallInsight>,
    private readonly deepgram: TranscriptionDeepgramService,
    private readonly insights: InsightsService,
  ) {}

  private formatDeepgramTurns(turns: Array<{ speaker: number; text: string }>) {
    return turns
      .map((t) => `Speaker ${t.speaker}: ${t.text}`.trim())
      .filter(Boolean)
      .join('\n');
  }

  async list(opts: { status?: string; limit: number }) {
    let where: any = {};

    if (opts.status === 'incomplete') {
      where = {
        status: In([
          'pending_transcription',
          'transcribing',
          'transcribed',
          'error',
        ] as any),
      };
    } else if (opts.status) {
      where = { status: opts.status };
    }

    return this.recordingsRepo.find({
      where,
      order: { createdAt: 'ASC' },
      take: opts.limit,
    });
  }

  async createRecording(recordingUrl: string, provider: string) {
    if (!recordingUrl?.trim()) {
      throw new BadRequestException('recordingUrl is required');
    }

    const rec = this.recordingsRepo.create({
      provider,
      recordingUrl: recordingUrl.trim(),
      status: 'pending_transcription',
      lastError: null,
    });

    return this.recordingsRepo.save(rec);
  }

  private async downloadAudio(
    url: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    if (!/^https?:\/\//i.test(url)) {
      throw new BadRequestException(
        'recordingUrl must be an http(s) URL for this prototype.',
      );
    }

    const res = await fetch(url, { redirect: 'follow' });

    const contentType = res.headers.get('content-type') ?? 'unknown';
    const contentLength = res.headers.get('content-length') ?? 'unknown';

    if (!res.ok) {
      const preview = await res.text().catch(() => '');
      throw new BadRequestException(
        `Failed to download audio. HTTP ${res.status}. content-type=${contentType}. preview=${preview.slice(0, 200)}`,
      );
    }

    const ab = await res.arrayBuffer();
    const buffer = Buffer.from(ab);

    const head = buffer.subarray(0, 16).toString('hex');
    if (buffer.length < 1024) {
      const preview = buffer.toString('utf8', 0, Math.min(buffer.length, 300));
      throw new BadRequestException(
        `Downloaded file too small (${buffer.length} bytes). content-type=${contentType}. content-length=${contentLength}. head(hex)=${head}. preview=${preview}`,
      );
    }

    const textStart = buffer.toString('utf8', 0, 20).toLowerCase();
    if (textStart.includes('<!doctype') || textStart.includes('<html')) {
      const preview = buffer.toString('utf8', 0, 300);
      throw new BadRequestException(
        `Downloaded HTML instead of audio. content-type=${contentType}. head(hex)=${head}. preview=${preview}`,
      );
    }

    console.log(
      `[downloadAudio] ok status=${res.status} bytes=${buffer.length} type=${contentType} head=${head}`,
    );

    const filename = pickFilename(url, buffer);
    console.log(
      `[downloadAudio] ok status=${res.status} bytes=${buffer.length} type=${contentType} filename=${filename} head=${head}`,
    );

    return { buffer, filename };
  }

  async transcribeRecordingById(recordingId: string) {
    const rec = await this.recordingsRepo.findOne({
      where: { id: recordingId },
    });
    if (!rec) throw new NotFoundException('Recording not found');

    const provider = (rec.provider || 'openai').toLowerCase();

    await this.recordingsRepo.update(rec.id, {
      status: 'transcribing',
      lastError: null,
    });

    try {
      let text = '';
      let model = '';

      if (provider === 'deepgram') {
        const dg = await this.deepgram.transcribeUrl(rec.recordingUrl || '');

        if (Array.isArray(dg.turns) && dg.turns.length) {
          text = this.formatDeepgramTurns(dg.turns);
        } else {
          text = dg.text ?? '';
        }

        model = 'deepgram:nova-2-phonecall';
      } else if (provider === 'openai' || provider === 'manual') {
        const audio = await this.downloadAudio(rec.recordingUrl || '');
        const file = await toFile(audio.buffer, audio.filename);

        const transcript = await this.client.audio.transcriptions.create({
          model: 'gpt-4o-transcribe',
          file,
        });

        text = transcript.text ?? '';
        model = 'openai:gpt-4o-transcribe';
      } else {
        throw new BadRequestException(`Unsupported provider: ${rec.provider}`);
      }

      await this.transcriptsRepo.upsert(
        {
          recordingId: rec.id,
          text,
          model,
        },
        ['recordingId'],
      );

      await this.recordingsRepo.update(rec.id, {
        status: 'transcribed',
        lastError: null,
      });

      return { recordingId: rec.id, provider, text, model };
    } catch (e: any) {
      await this.recordingsRepo.update(rec.id, {
        status: 'error',
        lastError: e?.message ?? String(e),
      });
      throw e;
    }
  }

  async generateInsights(recordingId: string, provider?: InsightsProviderName) {
    const rec = await this.recordingsRepo.findOne({
      where: { id: recordingId },
    });
    if (!rec) throw new NotFoundException('Recording not found');

    const transcript = await this.transcriptsRepo.findOne({
      where: { recordingId },
    });
    if (!transcript?.text?.trim()) {
      throw new BadRequestException('No transcript found for this recording');
    }

    try {
      const result = await this.insights.extractInsightsV2(
        transcript.text,
        provider,
      );

      const { rawJsonText, parsed, providerUsed, model } = result;

      await this.insightsRepo.upsert(
        {
          recordingId,
          providerUsed,
          model,
          json: rawJsonText,
          extractorVersion: 'v2',

          summary_short: parsed.summary_short ?? null,
          summary_detailed: parsed.summary_detailed ?? null,
          primary_intent: parsed.primary_intent ?? null,
          resolution_status: parsed.resolution_status ?? null,
          sentiment_overall:
            typeof parsed.sentiment_overall === 'number'
              ? parsed.sentiment_overall
              : null,

          contact_disposition: parsed.contact_disposition ?? null,
          conversation_type: parsed.conversation_type ?? null,
          topics_json: JSON.stringify(parsed.topics ?? []),

          interest_level: parsed.customer_signals?.interest_level ?? null,
          objections_json: JSON.stringify(
            parsed.customer_signals?.objections ?? [],
          ),

          dealer_contact_required:
            parsed.dealer_related?.dealer_contact_required ?? null,
          dealer_name_if_mentioned:
            parsed.dealer_related?.dealer_name_if_mentioned ?? null,

          risk_flags_json: JSON.stringify(parsed.risk_flags ?? []),
          action_items_json: JSON.stringify(parsed.action_items ?? []),
          agent_coaching_json: JSON.stringify(parsed.agent_coaching ?? {}),
          data_quality_json: JSON.stringify(parsed.data_quality ?? {}),
        } as any,
        ['recordingId'],
      );

      await this.recordingsRepo.update(recordingId, {
        status: 'insights_done',
        lastError: null,
      });

      return {
        recordingId,
        providerUsed,
        model,
        rawJsonText,
        parsed,
      };
    } catch (e: any) {
      await this.recordingsRepo.update(recordingId, {
        status: 'error',
        lastError: e?.message ?? String(e),
      });
      throw e;
    }
  }

  async generateInsightsById(
    recordingId: string,
    provider?: InsightsProviderName,
  ) {
    return this.generateInsights(recordingId, provider);
  }

  async getTranscript(recordingId: string) {
    const t = await this.transcriptsRepo.findOne({ where: { recordingId } });
    if (!t) return null;

    return {
      id: t.id,
      recordingId: t.recordingId,
      text: t.text,
      model: t.model,
      createdAt: t.createdAt,
    };
  }

  async getInsight(recordingId: string) {
    const i = await this.insightsRepo.findOne({ where: { recordingId } });
    if (!i) return null;

    return {
      id: i.id,
      recordingId: i.recordingId,
      providerUsed: i.providerUsed,
      model: i.model,
      json: i.json,
      extractorVersion: i.extractorVersion,
      createdAt: i.createdAt,
    };
  }

  async summaryByStatus() {
    const rows = await this.recordingsRepo
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(1)', 'count')
      .groupBy('r.status')
      .getRawMany<{ status: string; count: string }>();

    const byStatus: Record<string, number> = {};
    for (const r of rows) byStatus[r.status] = parseInt(r.count, 10);

    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    return { total, byStatus };
  }

  async batchTranscribe(limit: number) {
    const n = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 10;

    const items = await this.recordingsRepo.find({
      where: { status: 'pending_transcription' as any },
      order: { createdAt: 'ASC' },
      take: n,
    });

    const results: Array<{
      id: string;
      ok: boolean;
      error?: string;
      provider?: string;
      model?: string;
    }> = [];

    for (const r of items) {
      try {
        const result = await this.transcribeRecordingById(r.id);
        results.push({
          id: r.id,
          ok: true,
          provider: result.provider,
          model: result.model,
        });
      } catch (e: any) {
        results.push({ id: r.id, ok: false, error: e?.message ?? String(e) });
      }
    }

    return { requested: n, found: items.length, results };
  }

  async batchInsights(limit: number, provider?: InsightsProviderName) {
    const n = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 10;

    const selectedProvider =
      provider ??
      (process.env.INSIGHTS_PROVIDER as InsightsProviderName | undefined) ??
      'openai';

    const items = await this.recordingsRepo.find({
      where: { status: In(['transcribed'] as any) },
      order: { createdAt: 'ASC' },
      take: n,
    });

    const results: Array<{
      id: string;
      ok: boolean;
      providerUsed?: string;
      model?: string;
      error?: string;
    }> = [];

    for (const r of items) {
      try {
        const result = await this.generateInsights(r.id, selectedProvider);
        results.push({
          id: r.id,
          ok: true,
          providerUsed: result.providerUsed,
          model: result.model,
        });
      } catch (e: any) {
        results.push({ id: r.id, ok: false, error: e?.message ?? String(e) });
      }
    }

    return {
      requested: n,
      found: items.length,
      providerUsed: selectedProvider,
      results,
    };
  }
}
