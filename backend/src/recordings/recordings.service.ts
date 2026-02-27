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

function sniffAudioExt(buf: Buffer): 'wav' | 'mp3' | 'mp4' | 'unknown' {
  // WAV: "RIFF....WAVE"
  if (buf.length >= 12) {
    const riff = buf.toString('ascii', 0, 4);
    const wave = buf.toString('ascii', 8, 12);
    if (riff === 'RIFF' && wave === 'WAVE') return 'wav';
  }

  // MP3: "ID3" tag or frame sync 0xFF 0xFB (common)
  if (buf.length >= 3 && buf.toString('ascii', 0, 3) === 'ID3') return 'mp3';
  if (buf.length >= 2 && buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)
    return 'mp3';

  // MP4/M4A: "ftyp" at offset 4
  if (buf.length >= 8 && buf.toString('ascii', 4, 8) === 'ftyp') return 'mp4';

  return 'unknown';
}

function pickFilename(url: string, buf: Buffer) {
  const ext = sniffAudioExt(buf);
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').pop() || 'recording';
    // If URL already has an extension, keep it *only if* it matches sniffed type
    const hasDot = last.includes('.');
    const urlExt = hasDot ? last.split('.').pop()!.toLowerCase() : '';
    const sniffExt = ext === 'mp4' ? 'm4a' : ext;

    if (
      sniffExt !== 'unknown' &&
      urlExt &&
      ['wav', 'mp3', 'm4a', 'mp4'].includes(urlExt)
    ) {
      // If URL extension matches sniffed type, keep it
      if (
        (sniffExt === 'm4a' && (urlExt === 'm4a' || urlExt === 'mp4')) ||
        urlExt === sniffExt
      ) {
        return last;
      }
    }

    // Otherwise, force a safe filename by sniffed type
    if (sniffExt !== 'unknown') return `recording.${sniffExt}`;

    // fallback
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
  ) {}

  async list(opts: { status?: any; limit: number }) {
    const where = opts.status ? { status: opts.status } : {};
    return this.recordingsRepo.find({
      where,
      order: { createdAt: 'ASC' },
      take: opts.limit,
    });
  }

  async createRecording(recordingUrl: string, provider: string) {
    if (!recordingUrl?.trim())
      throw new BadRequestException('recordingUrl is required');

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

    // Basic sanity checks
    const head = buffer.subarray(0, 16).toString('hex');
    if (buffer.length < 1024) {
      // Often indicates an HTML error page or redirect landing page
      const preview = buffer.toString('utf8', 0, Math.min(buffer.length, 300));
      throw new BadRequestException(
        `Downloaded file too small (${buffer.length} bytes). content-type=${contentType}. content-length=${contentLength}. head(hex)=${head}. preview=${preview}`,
      );
    }

    // If we accidentally downloaded HTML
    const textStart = buffer.toString('utf8', 0, 20).toLowerCase();
    if (textStart.includes('<!doctype') || textStart.includes('<html')) {
      const preview = buffer.toString('utf8', 0, 300);
      throw new BadRequestException(
        `Downloaded HTML instead of audio. content-type=${contentType}. head(hex)=${head}. preview=${preview}`,
      );
    }

    // Log a one-liner (optional)
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

    // mark in-progress
    await this.recordingsRepo.update(rec.id, {
      status: 'transcribing',
      lastError: null,
    });

    try {
      const audio = await this.downloadAudio(rec.recordingUrl || '');

      const file = await toFile(audio.buffer, audio.filename);
      const transcript = await this.client.audio.transcriptions.create({
        model: 'gpt-4o-transcribe',
        //model: 'gpt-4o-transcribe',
        file,
      });

      // upsert transcript (unique by recordingId)
      await this.transcriptsRepo.upsert(
        {
          recordingId: rec.id,
          text: transcript.text ?? '',
          model: 'gpt-4o-transcribe',
        },
        ['recordingId'],
      );

      await this.recordingsRepo.update(rec.id, {
        status: 'transcribed',
        lastError: null,
      });

      return { recordingId: rec.id, text: transcript.text ?? '' };
    } catch (e: any) {
      await this.recordingsRepo.update(rec.id, {
        status: 'error',
        lastError: e?.message ?? String(e),
      });
      throw e;
    }
  }

  async generateInsightsById(recordingId: string) {
    const rec = await this.recordingsRepo.findOne({
      where: { id: recordingId },
    });
    if (!rec) throw new NotFoundException('Recording not found');

    const transcript = await this.transcriptsRepo.findOne({
      where: { recordingId },
    });
    if (!transcript?.text?.trim())
      throw new BadRequestException('No transcript found for this recording');

    try {
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
"""${transcript.text}"""
`.trim();

      const resp = await this.client.responses.create({
        model: 'gpt-4o-mini',
        input: prompt,
        temperature: 0.1,
      });

      const jsonText = (resp.output_text ?? '').trim();
      if (!jsonText) throw new Error('Empty insights response');

      await this.insightsRepo.upsert(
        { recordingId, json: jsonText, extractorVersion: 'v1' },
        ['recordingId'],
      );

      await this.recordingsRepo.update(recordingId, {
        status: 'insights_done',
        lastError: null,
      });

      return { recordingId, json: jsonText };
    } catch (e: any) {
      await this.recordingsRepo.update(recordingId, {
        status: 'error',
        lastError: e?.message ?? String(e),
      });
      throw e;
    }
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
      json: i.json,
      extractorVersion: i.extractorVersion,
      createdAt: i.createdAt,
    };
  }

  // 1) Summary counts
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

  // 2) Batch transcribe
  async batchTranscribe(limit: number) {
    const n = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 10;

    const items = await this.recordingsRepo.find({
      where: { status: 'pending_transcription' as any },
      order: { createdAt: 'ASC' },
      take: n,
    });

    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const r of items) {
      try {
        await this.transcribeRecordingById(r.id);
        results.push({ id: r.id, ok: true });
      } catch (e: any) {
        results.push({ id: r.id, ok: false, error: e?.message ?? String(e) });
        // transcribeRecordingById already sets status=error + lastError
      }
    }

    return { requested: n, found: items.length, results };
  }

  // 3) Batch insights
  async batchInsights(limit: number) {
    const n = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 10;

    // Only do ones that are transcribed (and not already insights_done)
    const items = await this.recordingsRepo.find({
      where: { status: In(['transcribed'] as any) },
      order: { createdAt: 'ASC' },
      take: n,
    });

    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const r of items) {
      try {
        await this.generateInsightsById(r.id);
        results.push({ id: r.id, ok: true });
      } catch (e: any) {
        results.push({ id: r.id, ok: false, error: e?.message ?? String(e) });
        // generateInsightsById already sets status=error + lastError
      }
    }

    return { requested: n, found: items.length, results };
  }
}
