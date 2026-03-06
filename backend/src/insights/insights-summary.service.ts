import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';

import { CallInsight } from '../db/entities/call-insight.entity';
import { CallRecording } from '../db/entities/call-recording.entity';
import { InsightSummary } from '../db/entities/insight-summary.entity';

@Injectable()
export class InsightsSummaryService {
  private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  constructor(
    @InjectRepository(CallInsight)
    private insightsRepo: Repository<CallInsight>,
    @InjectRepository(CallRecording)
    private recordingsRepo: Repository<CallRecording>,
    @InjectRepository(InsightSummary)
    private summariesRepo: Repository<InsightSummary>,
  ) {}

  async getMetricsSummary(from: Date, to: Date) {
    // total + avg sentiment
    const totals = await this.insightsRepo
      .createQueryBuilder('ci')
      .innerJoin(CallRecording, 'cr', 'cr.id = ci.recordingId')
      .select('COUNT(1)', 'total_calls')
      .addSelect('AVG(ci.sentiment_overall)', 'avg_sentiment')
      .where('cr.createdAt >= :from AND cr.createdAt < :to', { from, to })
      .getRawOne<{ total_calls: string; avg_sentiment: number | null }>();

    // by resolution
    const byResolution = await this.insightsRepo
      .createQueryBuilder('ci')
      .innerJoin(CallRecording, 'cr', 'cr.id = ci.recordingId')
      .select("COALESCE(ci.resolution_status, 'unknown')", 'resolution_status')
      .addSelect('COUNT(1)', 'count')
      .where('cr.createdAt >= :from AND cr.createdAt < :to', { from, to })
      .groupBy("COALESCE(ci.resolution_status, 'unknown')")
      .orderBy('count', 'DESC')
      .getRawMany<{ resolution_status: string; count: string }>();

    // top intents
    const topIntents = await this.insightsRepo
      .createQueryBuilder('ci')
      .innerJoin(CallRecording, 'cr', 'cr.id = ci.recordingId')
      .select("COALESCE(ci.primary_intent, 'unknown')", 'primary_intent')
      .addSelect('COUNT(1)', 'count')
      .where('cr.createdAt >= :from AND cr.createdAt < :to', { from, to })
      .groupBy("COALESCE(ci.primary_intent, 'unknown')")
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany<{ primary_intent: string; count: string }>();

    // examples: worst sentiment (handy for narrative context)
    const worstSentiment = await this.insightsRepo
      .createQueryBuilder('ci')
      .innerJoin(CallRecording, 'cr', 'cr.id = ci.recordingId')
      .select([
        'ci.recordingId AS recordingId',
        'ci.summary_short AS summary_short',
        'ci.primary_intent AS primary_intent',
        'ci.resolution_status AS resolution_status',
        'ci.sentiment_overall AS sentiment_overall',
      ])
      .where('cr.createdAt >= :from AND cr.createdAt < :to', { from, to })
      .andWhere('ci.sentiment_overall IS NOT NULL')
      .orderBy('ci.sentiment_overall', 'ASC')
      .limit(5)
      .getRawMany();

    // by contact disposition
    const byContact = await this.insightsRepo
      .createQueryBuilder('ci')
      .innerJoin(CallRecording, 'cr', 'cr.id = ci.recordingId')
      .select(
        "COALESCE(ci.contact_disposition, 'unknown')",
        'contact_disposition',
      )
      .addSelect('COUNT(1)', 'count')
      .where('cr.createdAt >= :from AND cr.createdAt < :to', { from, to })
      .groupBy("COALESCE(ci.contact_disposition, 'unknown')")
      .orderBy('count', 'DESC')
      .getRawMany<{ contact_disposition: string; count: string }>();

    // by conversation type
    const byConversationType = await this.insightsRepo
      .createQueryBuilder('ci')
      .innerJoin(CallRecording, 'cr', 'cr.id = ci.recordingId')
      .select("COALESCE(ci.conversation_type, 'unknown')", 'conversation_type')
      .addSelect('COUNT(1)', 'count')
      .where('cr.createdAt >= :from AND cr.createdAt < :to', { from, to })
      .groupBy("COALESCE(ci.conversation_type, 'unknown')")
      .orderBy('count', 'DESC')
      .getRawMany<{ conversation_type: string; count: string }>();

    const byInterest = await this.insightsRepo
      .createQueryBuilder('ci')
      .innerJoin(CallRecording, 'cr', 'cr.id = ci.recordingId')
      .select("COALESCE(ci.interest_level, 'unknown')", 'interest_level')
      .addSelect('COUNT(1)', 'count')
      .where('cr.createdAt >= :from AND cr.createdAt < :to', { from, to })
      .groupBy("COALESCE(ci.interest_level, 'unknown')")
      .orderBy('count', 'DESC')
      .getRawMany<{ interest_level: string; count: string }>();

    const dealerContactRequired = await this.insightsRepo
      .createQueryBuilder('ci')
      .innerJoin(CallRecording, 'cr', 'cr.id = ci.recordingId')
      .select(
        'SUM(CASE WHEN ci.dealer_contact_required = 1 THEN 1 ELSE 0 END)',
        'count_true',
      )
      .addSelect('COUNT(1)', 'total')
      .where('cr.createdAt >= :from AND cr.createdAt < :to', { from, to })
      .getRawOne<{ count_true: string; total: string }>();

    const bestSentiment = await this.insightsRepo
      .createQueryBuilder('ci')
      .innerJoin(CallRecording, 'cr', 'cr.id = ci.recordingId')
      .select([
        'ci.recordingId AS recordingId',
        'ci.summary_short AS summary_short',
        'ci.primary_intent AS primary_intent',
        'ci.resolution_status AS resolution_status',
        'ci.sentiment_overall AS sentiment_overall',
      ])
      .where('cr.createdAt >= :from AND cr.createdAt < :to', { from, to })
      .andWhere('ci.sentiment_overall IS NOT NULL')
      .orderBy('ci.sentiment_overall', 'DESC')
      .limit(5)
      .getRawMany();

    const dealerFollowups = await this.insightsRepo
      .createQueryBuilder('ci')
      .innerJoin(CallRecording, 'cr', 'cr.id = ci.recordingId')
      .select([
        'ci.recordingId AS recordingId',
        'ci.summary_short AS summary_short',
        'ci.primary_intent AS primary_intent',
        'ci.dealer_name_if_mentioned AS dealer_name_if_mentioned',
      ])
      .where('cr.createdAt >= :from AND cr.createdAt < :to', { from, to })
      .andWhere('ci.dealer_contact_required = 1')
      .orderBy('cr.createdAt', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      window: { from: from.toISOString(), to: to.toISOString() },
      totals: {
        total_calls: parseInt(totals?.total_calls ?? '0', 10),
        avg_sentiment: totals?.avg_sentiment ?? null,
      },
      by_resolution: byResolution.map((r) => ({
        resolution_status: r.resolution_status,
        count: parseInt(r.count, 10),
      })),
      top_intents: topIntents.map((r) => ({
        primary_intent: r.primary_intent,
        count: parseInt(r.count, 10),
      })),
      by_contact: byContact.map((r) => ({
        contact_disposition: r.contact_disposition,
        count: parseInt(r.count, 10),
      })),
      by_conversation_type: byConversationType.map((r) => ({
        conversation_type: r.conversation_type,
        count: parseInt(r.count, 10),
      })),
      by_interest: byInterest.map((r) => ({
        interest_level: r.interest_level,
        count: parseInt(r.count, 10),
      })),
      dealer_contact_required: {
        count_true: parseInt(dealerContactRequired?.count_true ?? '0', 10),
        total: parseInt(dealerContactRequired?.total ?? '0', 10),
      },
      examples: {
        worst_sentiment: worstSentiment,
        best_sentiment: bestSentiment,
        dealer_followups: dealerFollowups,
      },
      // risk_flags + action_items_by_owner are best done via OPENJSON raw SQL (next section)
    };
  }

  async getNarrativeSummary(from: Date, to: Date, filterKey = 'all') {
    const cached = await this.summariesRepo.findOne({
      where: { fromUtc: from, toUtc: to, filterKey },
      order: { createdAt: 'DESC' },
    });

    if (cached) {
      return {
        window: {
          from: cached.fromUtc.toISOString(),
          to: cached.toUtc.toISOString(),
        },
        filterKey: cached.filterKey,
        narrative: cached.narrativeJson,
        metrics: cached.metricsJson ? JSON.parse(cached.metricsJson) : null,
        cached: true,
        createdAt: cached.createdAt,
        model: cached.model,
      };
    }

    const metrics = await this.getMetricsSummary(from, to);

    const prompt = `
You are writing an exec narrative for a contact-centre manager in UK automotive finance.

You are given aggregated metrics for a time window plus example calls.

Return ONLY valid JSON with this schema:
{
  "headline": string,
  "period_summary": string,
  "what_stood_out": string[],
  "operational_funnel": Array<{ "stage": string, "detail": string }>,
  "top_drivers": Array<{ "driver": string, "evidence": string }>,
  "risks_and_compliance": Array<{ "risk": string, "evidence": string, "suggested_action": string }>,
  "recommended_actions": Array<{ "action": string, "priority": "high"|"medium"|"low", "owner": "ops"|"agent"|"product"|"engineering"|"unknown" }>,
  "notes_on_data_quality": string[]
}

Rules:
- Use ONLY the provided data; do not invent numbers.
- Be specific: call out connect rate issues, common conversation types, interest levels, and dealer follow-up volume if present.
- Reference examples only using the fields provided (recordingId snippets / summaries).
- Keep concise.

DATA (JSON):
${JSON.stringify(metrics, null, 2)}
`.trim();

    const model = 'gpt-4o-mini';
    const resp = await this.client.responses.create({
      model,
      input: prompt,
      temperature: 0.1,
    });

    const jsonText = (resp.output_text ?? '').trim();
    if (!jsonText) throw new Error('Empty narrative response');

    await this.summariesRepo.upsert(
      {
        fromUtc: from,
        toUtc: to,
        filterKey,
        metricsJson: JSON.stringify(metrics),
        narrativeJson: jsonText,
        model,
      },
      ['fromUtc', 'toUtc', 'filterKey'],
    );

    // Optionally validate JSON here
    return {
      window: metrics.window,
      narrative: jsonText,
      metrics,
    };
  }

  async listNarratives(opts: { limit: number; filterKey: string }) {
    const rows = await this.summariesRepo.find({
      where: { filterKey: opts.filterKey },
      order: { createdAt: 'DESC' },
      take: opts.limit,
    });

    return rows.map((r) => ({
      id: r.id,
      from: r.fromUtc.toISOString(),
      to: r.toUtc.toISOString(),
      filterKey: r.filterKey,
      createdAt: r.createdAt.toISOString(),
      model: r.model,
      narrative: r.narrativeJson,
      metrics: r.metricsJson ? JSON.parse(r.metricsJson) : null,
    }));
  }
}
