<script setup lang="ts">
import axios from "axios";
import { computed, onMounted, ref, watch } from "vue";
import { ApiPath } from "@/enums/api";
import { toPrettyInsights } from "@/utils/insights-response";
import InteractionDetailDrawer from "./InteractionDetailDrawer.vue";

// ── Filters ──────────────────────────────────────────────────────────────────
const campaignOptions = ref<string[]>([]);
const agentOptions = ref<string[]>([]);
const outcomeOptions = ref<string[]>([]);
const excludeOutcomes = ref<string[]>([]);

const COMMON_EXCLUSIONS = [
  "npcb", "noanswer", "agam", "test chat", "test chat - client",
  "customer end chat", "customer ended chat", "customer ended chat - no interaction",
];

const commonExclusionsAvailable = computed(() =>
  outcomeOptions.value.filter((o) =>
    COMMON_EXCLUSIONS.some((ce) => o.toLowerCase() === ce),
  ),
);

const allCommonExcluded = computed(() =>
  commonExclusionsAvailable.value.length > 0 &&
  commonExclusionsAvailable.value.every((o) => excludeOutcomes.value.includes(o)),
);

function toggleCommonExclusions() {
  if (allCommonExcluded.value) {
    excludeOutcomes.value = excludeOutcomes.value.filter(
      (o) => !commonExclusionsAvailable.value.includes(o),
    );
  } else {
    const toAdd = commonExclusionsAvailable.value.filter(
      (o) => !excludeOutcomes.value.includes(o),
    );
    excludeOutcomes.value = [...excludeOutcomes.value, ...toAdd];
  }
}

function isoStartOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}
function isoEndOfDayExclusive(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() + 1);
  return x.toISOString();
}

const now = new Date();
const from = ref(isoStartOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)));
const to = ref(isoEndOfDayExclusive(now));

const fromDateStr = computed({
  get: () => from.value.slice(0, 10),
  set: (v: string) => { from.value = isoStartOfDay(new Date(v + "T12:00:00")); },
});
const toDateStr = computed({
  get: () => {
    const d = new Date(to.value);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  },
  set: (v: string) => { to.value = isoEndOfDayExclusive(new Date(v + "T12:00:00")); },
});

type InteractionFilter = "all" | "calls" | "chats";
const interactionFilter = ref<InteractionFilter>("chats");
const campaign = ref("");
const agent = ref("");

const sharedParams = computed(() => ({
  from: from.value,
  to: to.value,
  filterKey: interactionFilter.value,
  ...(campaign.value && { campaign: campaign.value }),
  ...(agent.value && { agent: agent.value }),
  ...(excludeOutcomes.value.length && { excludeOutcomes: excludeOutcomes.value.join(',') }),
}));

// ── Data state ───────────────────────────────────────────────────────────────
const loading = ref(false);
const error = ref("");

const csData = ref<any>(null);
const opportunityData = ref<any>(null);

// Interest level drill-down
const expandedInterest = ref<string | null>(null);
const interestInteractions = ref<any[]>([]);
const loadingInterest = ref(false);

// Competitor drill-down
const expandedCompetitor = ref<string | null>(null);
const competitorInteractions = ref<any[]>([]);
const loadingCompetitor = ref(false);

// Opportunity drill-down
const expandedOpportunityReason = ref<string | null>(null);
const opportunityInteractions = ref<any[]>([]);
const loadingOpportunityReason = ref(false);

// Detail drawer
const detailId = ref<string | null>(null);

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null) {
  if (!iso) return "n/a";
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function badgeClass(level: string) {
  if (level === "high") return "chip chip--success";
  if (level === "medium") return "chip chip--info";
  if (level === "low") return "chip chip--warning";
  return "chip chip--secondary";
}

function opportunityReasonLabel(r: string) {
  const labels: Record<string, string> = {
    existing_policy: "Existing Policy",
    recent_policy_lapse: "Recent Policy (60 days)",
    renewal_enquiry: "Renewal Enquiry",
    cancellation_enquiry: "Cancellation Enquiry",
    policy_update: "Policy/Account Update",
    opt_out: "Opt Out Request",
    breakdown_report: "Breakdown Report",
    phone_line_complaint: "Phone Line Complaint",
    myrac_enquiry: "MyRAC Enquiry",
  };
  return labels[r] || r.replace(/_/g, " ");
}

// ── API calls ────────────────────────────────────────────────────────────────
async function loadFilterOptions() {
  try {
    const res = await axios.get(ApiPath.InsightsSummaryFilters, {
      params: { filterKey: interactionFilter.value },
    });
    campaignOptions.value = res.data.campaigns ?? [];
    agentOptions.value = res.data.agents ?? [];
    outcomeOptions.value = res.data.outcomes ?? [];
    if (campaign.value && !campaignOptions.value.includes(campaign.value)) campaign.value = "";
    if (agent.value && !agentOptions.value.includes(agent.value)) agent.value = "";
    excludeOutcomes.value = excludeOutcomes.value.filter((o) => outcomeOptions.value.includes(o));
  } catch { /* non-critical */ }
}

watch(interactionFilter, () => { loadFilterOptions(); });

async function loadAll() {
  loading.value = true;
  error.value = "";
  expandedInterest.value = null;
  expandedCompetitor.value = null;
  expandedOpportunityReason.value = null;
  detailId.value = null;

  try {
    const [csRes, oppRes] = await Promise.all([
      axios.get(ApiPath.InsightsSummaryClientServices, { params: sharedParams.value }),
      axios.get(ApiPath.OpsOpportunity, { params: sharedParams.value }).catch(() => ({ data: null })),
    ]);
    csData.value = csRes.data;
    opportunityData.value = oppRes.data;
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || "Failed to load";
  } finally {
    loading.value = false;
  }
}

async function toggleInterest(level: string) {
  if (expandedInterest.value === level) {
    expandedInterest.value = null;
    return;
  }
  expandedInterest.value = level;
  loadingInterest.value = true;
  try {
    const res = await axios.get(ApiPath.OpsInteractionsByInterestLevel, {
      params: { ...sharedParams.value, interestLevel: level, limit: 200 },
    });
    interestInteractions.value = res.data;
  } catch { interestInteractions.value = []; }
  finally { loadingInterest.value = false; }
}

async function toggleCompetitor(competitor: string) {
  if (expandedCompetitor.value === competitor) {
    expandedCompetitor.value = null;
    return;
  }
  expandedCompetitor.value = competitor;
  loadingCompetitor.value = true;
  try {
    const res = await axios.get(ApiPath.OpsInteractionsByCompetitor, {
      params: { ...sharedParams.value, competitor, limit: 200 },
    });
    competitorInteractions.value = res.data;
  } catch { competitorInteractions.value = []; }
  finally { loadingCompetitor.value = false; }
}

async function toggleOpportunityReason(reason: string) {
  if (expandedOpportunityReason.value === reason) {
    expandedOpportunityReason.value = null;
    return;
  }
  expandedOpportunityReason.value = reason;
  loadingOpportunityReason.value = true;
  try {
    const res = await axios.get(ApiPath.OpsInteractionsByOpportunityReason, {
      params: { ...sharedParams.value, reason, limit: 200 },
    });
    opportunityInteractions.value = res.data;
  } catch { opportunityInteractions.value = []; }
  finally { loadingOpportunityReason.value = false; }
}

function openDetail(recordingId: string) {
  detailId.value = recordingId;
}

function closeDetail() {
  detailId.value = null;
}

function selectCampaign(campaignName: string) {
  campaign.value = campaignName;
  loadAll();
}

function clearCampaign() {
  campaign.value = "";
  loadAll();
}

// ── Narrative generation ─────────────────────────────────────────────────────
const narrativeProvider = ref("openai");
const loadingNarrative = ref(false);
const narrativeResult = ref("");
const narrativeError = ref("");

async function generateNarrative() {
  loadingNarrative.value = true;
  narrativeError.value = "";
  narrativeResult.value = "";
  const narrativeType = interactionFilter.value === "chats" ? "chats_client_services" : "calls_client_services";
  try {
    const res = await axios.post(ApiPath.InsightsSummaryNarrative, null, {
      params: {
        ...sharedParams.value,
        provider: narrativeProvider.value,
        narrativeType,
      },
    });
    narrativeResult.value = toPrettyInsights(res.data?.narrative ?? res.data);
  } catch (e: any) {
    narrativeError.value = e?.response?.data?.message || e?.message || "Failed to generate narrative";
  } finally {
    loadingNarrative.value = false;
  }
}

onMounted(async () => {
  await loadFilterOptions();
  await loadAll();
});
</script>

<template>
  <div class="cs-root">
    <!-- Hero -->
    <div class="hero">
      <div class="hero-row">
        <div class="hero-left">
          <h1 class="hero-title">Client Services Dashboard</h1>
          <div class="hero-subtitle">Lead generation, market intelligence, competitor activity and sales opportunity classification.</div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="tile tile--accent">
      <div class="tile-head">
        <div class="tile-icon">&#9881;</div>
        <div class="tile-text">
          <div class="tile-title">Filters</div>
          <div class="tile-desc">Select date range, channel and optionally filter by campaign or agent</div>
        </div>
      </div>
      <div class="tile-body">
        <div class="filters-row">
          <div class="filter-group">
            <label class="label">From</label>
            <input type="date" v-model="fromDateStr" class="input input--date" />
          </div>
          <div class="filter-group">
            <label class="label">To</label>
            <input type="date" v-model="toDateStr" class="input input--date" />
          </div>
          <div class="filter-group">
            <label class="label">Channel</label>
            <select v-model="interactionFilter" class="select select--sm">
              <option value="calls">Calls only</option>
              <option value="chats">Chats only</option>
              <option value="all">All</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="label">Campaign</label>
            <select v-model="campaign" class="select select--sm">
              <option value="">All</option>
              <option v-for="c in campaignOptions" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="label">Agent</label>
            <select v-model="agent" class="select select--sm">
              <option value="">All</option>
              <option v-for="a in agentOptions" :key="a" :value="a">{{ a }}</option>
            </select>
          </div>
          <div v-if="outcomeOptions.length" class="filter-group">
            <label class="label">Exclude Outcomes</label>
            <div class="exclude-outcomes-wrap">
              <button
                v-if="commonExclusionsAvailable.length"
                class="btn-quick-exclude"
                :class="{ 'btn-quick-exclude--active': allCommonExcluded }"
                @click="toggleCommonExclusions"
              >
                {{ allCommonExcluded ? "&#10003; Common excluded" : "Exclude test/abandoned" }}
              </button>
              <select v-model="excludeOutcomes" multiple class="select select--sm select--multi">
                <optgroup v-if="commonExclusionsAvailable.length" label="Commonly excluded">
                  <option v-for="o in commonExclusionsAvailable" :key="'c-' + o" :value="o">{{ o }}</option>
                </optgroup>
                <optgroup label="All outcomes">
                  <option v-for="o in outcomeOptions" :key="o" :value="o">{{ o }}</option>
                </optgroup>
              </select>
            </div>
          </div>
          <button class="btn btn--primary" style="margin-top: 18px" :disabled="loading" @click="loadAll">
            {{ loading ? "Loading..." : "Load" }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="error" class="error-tile" style="margin-top: 10px">
      <div class="error-title">Error</div>
      <div class="error-text">{{ error }}</div>
    </div>

    <template v-if="csData">
      <!-- Overview strip -->
      <div class="stats-strip">
        <div class="stat">
          <div class="stat-label">Total Interactions</div>
          <div class="stat-value">{{ csData.totals.total }}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Dealer Leads</div>
          <div class="stat-value chip chip--success">{{ csData.totals.leads }}</div>
        </div>
        <div class="stat">
          <div class="stat-label">In-Market</div>
          <div class="stat-value chip chip--info">{{ csData.totals.in_market }}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Lost Sales</div>
          <div class="stat-value chip chip--danger">{{ csData.totals.lost_sales }}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Bought Elsewhere</div>
          <div class="stat-value chip chip--warning">{{ csData.totals.purchased_elsewhere }}</div>
        </div>
        <template v-if="opportunityData && opportunityData.classified > 0">
          <div class="stat">
            <div class="stat-label">Opportunity Rate</div>
            <div class="stat-value chip chip--success">{{ Math.round(opportunityData.opportunities / opportunityData.classified * 100) }}%</div>
          </div>
        </template>
      </div>

      <!-- Campaign comparison banner -->
      <div v-if="campaign" class="campaign-banner" style="margin-top: 14px">
        <div class="campaign-banner-text">
          Filtering by campaign: <strong>{{ campaign }}</strong>
        </div>
        <button class="btn btn--sm" @click="clearCampaign">Clear campaign filter</button>
      </div>

      <!-- Campaigns in Dataset -->
      <div v-if="campaignOptions.length && !campaign" class="tile" style="margin-top: 14px">
        <div class="tile-head">
          <div class="tile-icon">&#128203;</div>
          <div class="tile-text">
            <div class="tile-title">Campaigns in Dataset</div>
            <div class="tile-desc">Click a campaign to filter the dashboard</div>
          </div>
        </div>
        <div class="tile-body">
          <div class="campaigns-grid">
            <div
              v-for="c in campaignOptions"
              :key="c"
              class="campaign-card"
              @click="selectCampaign(c)"
            >
              <div class="campaign-card-name">{{ c }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sales Opportunity Classification -->
      <div
        v-if="opportunityData && opportunityData.classified > 0"
        class="tile"
        style="margin-top: 14px"
      >
        <div class="tile-head">
          <div class="tile-icon">&#128176;</div>
          <div class="tile-text">
            <div class="tile-title">Sales Opportunity Classification</div>
            <div class="tile-desc">Breakdown of records classified as opportunities vs not — click a reason to view individual records</div>
          </div>
        </div>
        <div class="tile-body">
          <!-- Summary strip -->
          <div class="opp-summary-strip">
            <div class="opp-stat">
              <div class="opp-stat-value">{{ opportunityData.classified }}</div>
              <div class="opp-stat-label">Classified</div>
            </div>
            <div class="opp-stat opp-stat--opportunity">
              <div class="opp-stat-value">{{ opportunityData.opportunities }}</div>
              <div class="opp-stat-label">Opportunities</div>
            </div>
            <div class="opp-stat opp-stat--not">
              <div class="opp-stat-value">{{ opportunityData.not_opportunities }}</div>
              <div class="opp-stat-label">Not Opportunities</div>
            </div>
            <div class="opp-stat">
              <div class="opp-stat-value">{{ Math.round(opportunityData.opportunities / opportunityData.classified * 100) }}%</div>
              <div class="opp-stat-label">Opportunity Rate</div>
            </div>
          </div>

          <!-- Opportunity row -->
          <div v-if="opportunityData.opportunities > 0">
            <div class="metric-row metric-row--clickable" @click="toggleOpportunityReason('__opportunity')">
              <div class="metric-left">
                <span class="chip chip--success" style="font-size: 12px">Opportunity to Sell</span>
              </div>
              <div class="metric-right">
                <span class="count-pill">{{ opportunityData.opportunities }}</span>
                <span class="expand-icon">{{ expandedOpportunityReason === '__opportunity' ? '&#9650;' : '&#9660;' }}</span>
              </div>
            </div>
            <div v-if="expandedOpportunityReason === '__opportunity'" class="drill-panel">
              <div v-if="loadingOpportunityReason" class="hint">Loading interactions...</div>
              <div v-else-if="!opportunityInteractions.length" class="hint">No interactions found.</div>
              <div
                v-else
                v-for="ix in opportunityInteractions"
                :key="ix.recordingId"
                class="drill-row"
                @click="openDetail(ix.recordingId)"
              >
                <div class="drill-row-top">
                  <span class="chip chip--success" style="font-size: 11px">Opportunity</span>
                  <span v-if="ix.agent" class="chip chip--secondary" style="font-size: 11px">{{ ix.agent }}</span>
                  <span v-if="ix.outcome" class="chip chip--secondary" style="font-size: 11px">{{ ix.outcome }}</span>
                  <span class="mono" style="font-size: 11px; opacity: 0.6">{{ fmtDate(ix.interactionDateTime) }}</span>
                </div>
                <div class="drill-row-summary">{{ ix.summary_short || "(no summary)" }}</div>
              </div>
            </div>
          </div>

          <!-- Reason breakdown -->
          <div
            v-for="r in opportunityData.reason_breakdown"
            :key="r.reason"
          >
            <div class="metric-row metric-row--clickable" @click="toggleOpportunityReason(r.reason)">
              <div class="metric-left">
                <span class="chip chip--danger" style="font-size: 12px">{{ opportunityReasonLabel(r.reason) }}</span>
              </div>
              <div class="metric-right">
                <span class="count-pill">{{ r.count }}</span>
                <span class="expand-icon">{{ expandedOpportunityReason === r.reason ? '&#9650;' : '&#9660;' }}</span>
              </div>
            </div>
            <div v-if="expandedOpportunityReason === r.reason" class="drill-panel">
              <div v-if="loadingOpportunityReason" class="hint">Loading interactions...</div>
              <div v-else-if="!opportunityInteractions.length" class="hint">No interactions found.</div>
              <div
                v-else
                v-for="ix in opportunityInteractions"
                :key="ix.recordingId"
                class="drill-row"
                @click="openDetail(ix.recordingId)"
              >
                <div class="drill-row-top">
                  <span class="chip chip--danger" style="font-size: 11px">{{ opportunityReasonLabel(ix.not_opportunity_reason || r.reason) }}</span>
                  <span v-if="ix.agent" class="chip chip--secondary" style="font-size: 11px">{{ ix.agent }}</span>
                  <span v-if="ix.outcome" class="chip chip--secondary" style="font-size: 11px">{{ ix.outcome }}</span>
                  <span class="mono" style="font-size: 11px; opacity: 0.6">{{ fmtDate(ix.interactionDateTime) }}</span>
                </div>
                <div class="drill-row-summary">{{ ix.summary_short || "(no summary)" }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Client Services Metrics -->
      <div class="grid grid-2" style="margin-top: 14px">
        <!-- Customer Interest -->
        <div class="tile">
          <div class="tile-head">
            <div class="tile-icon">&#128200;</div>
            <div class="tile-text">
              <div class="tile-title">Customer Interest</div>
              <div class="tile-desc">Click an interest level to see individual interactions</div>
            </div>
          </div>
          <div class="tile-body">
            <div class="hint" v-if="!csData.by_interest.length">No data.</div>
            <div
              v-for="r in csData.by_interest"
              :key="r.interest_level"
            >
              <div class="metric-row metric-row--clickable" @click="toggleInterest(r.interest_level)">
                <div class="metric-left">
                  <span :class="badgeClass(r.interest_level)">{{ r.interest_level }}</span>
                </div>
                <div class="metric-right">
                  <span class="count-pill">{{ r.count }}</span>
                  <span class="expand-icon">{{ expandedInterest === r.interest_level ? '&#9650;' : '&#9660;' }}</span>
                </div>
              </div>
              <div v-if="expandedInterest === r.interest_level" class="drill-panel">
                <div v-if="loadingInterest" class="hint">Loading interactions...</div>
                <div v-else-if="!interestInteractions.length" class="hint">No interactions found.</div>
                <div
                  v-else
                  v-for="ix in interestInteractions"
                  :key="ix.recordingId"
                  class="drill-row"
                  @click="openDetail(ix.recordingId)"
                >
                  <div class="drill-row-top">
                    <span :class="badgeClass(ix.interest_level || r.interest_level)" style="font-size: 11px">{{ ix.interest_level || r.interest_level }}</span>
                    <span v-if="ix.agent" class="chip chip--secondary" style="font-size: 11px">{{ ix.agent }}</span>
                    <span v-if="ix.campaign" class="chip chip--secondary" style="font-size: 11px">{{ ix.campaign }}</span>
                    <span v-if="ix.outcome" class="chip chip--secondary" style="font-size: 11px">{{ ix.outcome }}</span>
                    <span class="mono" style="font-size: 11px; opacity: 0.6">{{ fmtDate(ix.interactionDateTime) }}</span>
                  </div>
                  <div class="drill-row-summary">{{ ix.summary_short || "(no summary)" }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Competitor Purchases & Objections -->
        <div class="tile">
          <div class="tile-head">
            <div class="tile-icon">&#9878;</div>
            <div class="tile-text">
              <div class="tile-title">Competitor Purchases &amp; Objections</div>
              <div class="tile-desc">Click a competitor to see individual interactions</div>
            </div>
          </div>
          <div class="tile-body">
            <div class="hint" v-if="!csData.top_competitors.length">No data.</div>
            <div
              v-for="c in csData.top_competitors"
              :key="c.competitor"
              style="margin-bottom: 10px"
            >
              <div class="metric-row metric-row--clickable" @click="toggleCompetitor(c.competitor)">
                <div class="metric-left">
                  <span class="chip chip--warning">{{ c.competitor }}</span>
                </div>
                <div class="metric-right">
                  <span class="count-pill">{{ c.count }}</span>
                  <span class="expand-icon">{{ expandedCompetitor === c.competitor ? '&#9650;' : '&#9660;' }}</span>
                </div>
              </div>
              <div
                v-if="c.top_objections && c.top_objections.length && expandedCompetitor !== c.competitor"
                style="padding-left: 12px; margin-top: 3px"
              >
                <div
                  v-for="o in c.top_objections"
                  :key="o.objection"
                  style="font-size: 12px; display: flex; justify-content: space-between; margin-bottom: 2px; color: var(--muted)"
                >
                  <span>{{ o.objection }}</span>
                  <span class="count-pill" style="font-size: 11px; margin-left: 8px">{{ o.count }}</span>
                </div>
              </div>
              <div v-if="expandedCompetitor === c.competitor" class="drill-panel">
                <div v-if="loadingCompetitor" class="hint">Loading interactions...</div>
                <div v-else-if="!competitorInteractions.length" class="hint">No interactions found.</div>
                <div
                  v-else
                  v-for="ix in competitorInteractions"
                  :key="ix.recordingId"
                  class="drill-row"
                  @click="openDetail(ix.recordingId)"
                >
                  <div class="drill-row-top">
                    <span class="chip chip--warning" style="font-size: 11px">{{ ix.competitor_purchased || c.competitor }}</span>
                    <span v-if="ix.agent" class="chip chip--secondary" style="font-size: 11px">{{ ix.agent }}</span>
                    <span v-if="ix.campaign" class="chip chip--secondary" style="font-size: 11px">{{ ix.campaign }}</span>
                    <span v-if="ix.outcome" class="chip chip--secondary" style="font-size: 11px">{{ ix.outcome }}</span>
                    <span class="mono" style="font-size: 11px; opacity: 0.6">{{ fmtDate(ix.interactionDateTime) }}</span>
                  </div>
                  <div class="drill-row-summary">{{ ix.summary_short || "(no summary)" }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Dealer Follow-ups -->
      <div v-if="csData.top_dealers.length" class="tile" style="margin-top: 14px">
        <div class="tile-head">
          <div class="tile-icon">&#127970;</div>
          <div class="tile-text">
            <div class="tile-title">Top Dealer Follow-ups</div>
            <div class="tile-desc">Dealers with the most lead follow-ups</div>
          </div>
        </div>
        <div class="tile-body">
          <div
            v-for="d in csData.top_dealers"
            :key="d.dealer_name"
            class="metric-row"
          >
            <div class="metric-left">
              <span class="chip chip--info">{{ d.dealer_name }}</span>
            </div>
            <div class="metric-right">
              <span class="count-pill">{{ d.count }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Lost Sales -->
      <div v-if="csData.recent_lost_sales.length" class="tile" style="margin-top: 14px">
        <div class="tile-head">
          <div class="tile-icon">&#9888;</div>
          <div class="tile-text">
            <div class="tile-title">Recent Lost Sales</div>
            <div class="tile-desc">Click to view full interaction detail</div>
          </div>
        </div>
        <div class="tile-body">
          <div
            v-for="x in csData.recent_lost_sales"
            :key="x.recordingId"
            class="drill-row"
            @click="openDetail(x.recordingId)"
          >
            <div class="drill-row-top">
              <span class="chip chip--danger" style="font-size: 11px">lost sale</span>
              <span v-if="x.competitor_purchased" class="chip chip--warning" style="font-size: 11px">{{ x.competitor_purchased }}</span>
              <span class="chip chip--secondary" style="font-size: 11px">{{ x.campaign_detected || "unknown" }}</span>
              <span class="mono" style="font-size: 11px; opacity: 0.6">{{ fmtDate(x.interactionDateTime) }}</span>
            </div>
            <div class="drill-row-summary">{{ x.summary_short || "(no summary)" }}</div>
          </div>
        </div>
      </div>
    </template>

    <!-- Generate Narrative -->
    <div v-if="csData" class="tile" style="margin-top: 14px">
      <div class="tile-head">
        <div class="tile-icon">&#128221;</div>
        <div class="tile-text">
          <div class="tile-title">Generate Narrative</div>
          <div class="tile-desc">AI-generated executive briefing based on current filters</div>
        </div>
      </div>
      <div class="tile-body">
        <div style="display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 14px">
          <div class="filter-group">
            <label class="label">Provider</label>
            <select v-model="narrativeProvider" class="select select--sm">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="grok">Grok</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>
          <button class="btn btn--primary" :disabled="loadingNarrative" @click="generateNarrative">
            {{ loadingNarrative ? "Generating..." : "Generate Narrative" }}
          </button>
        </div>
        <div v-if="narrativeError" class="error-tile">{{ narrativeError }}</div>
        <div v-if="narrativeResult" class="narrative-box"><pre class="narrative-pre">{{ narrativeResult }}</pre></div>
        <div v-else-if="!loadingNarrative" class="hint">Click Generate to create an AI briefing from the current client services data.</div>
      </div>
    </div>

    <InteractionDetailDrawer :recording-id="detailId" @close="closeDetail" />
  </div>
</template>

<style scoped>
.cs-root {
  position: relative;
}

/* ── Campaigns grid ─────────────────────────────────────────────────────────── */
.campaigns-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

.campaign-card {
  padding: 10px 14px;
  border-radius: var(--radius-md, 6px);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.15s;
  background: var(--surface);
}

.campaign-card:hover {
  border-color: var(--brand, #6366f1);
  background: color-mix(in srgb, var(--brand, #6366f1) 6%, var(--surface));
  box-shadow: 0 0 0 1px var(--brand, #6366f1);
}

.campaign-card-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
}

/* ── Campaign comparison banner ───────────────────────────────────────────── */
.campaign-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--brand, #6366f1) 10%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--brand, #6366f1) 30%, transparent);
}

.campaign-banner-text {
  font-size: 13px;
  color: var(--ink);
}

.btn--sm {
  font-size: 12px;
  padding: 4px 12px;
  border-radius: var(--radius-md, 6px);
  background: var(--surface);
  border: 1px solid var(--border);
  cursor: pointer;
  color: var(--ink);
  transition: background 0.15s;
}

.btn--sm:hover {
  background: var(--surface-soft, #f0f0f0);
}

/* ── Opportunity summary strip ──────────────────────────────────────────────── */
.opp-summary-strip {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding: 12px 14px;
  background: var(--surface-soft, #f8f8f8);
  border-radius: var(--radius-md, 6px);
  border: 1px solid var(--border);
}

.opp-stat {
  text-align: center;
  min-width: 80px;
}

.opp-stat-value {
  font-size: 20px;
  font-weight: 800;
  color: var(--ink);
}

.opp-stat-label {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.opp-stat--opportunity .opp-stat-value {
  color: var(--success, #22c55e);
}

.opp-stat--not .opp-stat-value {
  color: var(--danger, #ef4444);
}

/* ── Stats strip ──────────────────────────────────────────────────────────── */
.stats-strip {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 14px;
  padding: 14px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

/* ── Exclude outcomes ─────────────────────────────────────────────────────── */
.exclude-outcomes-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.btn-quick-exclude {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: var(--radius-md, 6px);
  border: 1px dashed var(--border);
  background: var(--surface);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.btn-quick-exclude:hover {
  border-color: var(--brand, #6366f1);
  color: var(--brand, #6366f1);
}

.btn-quick-exclude--active {
  border-style: solid;
  border-color: var(--brand, #6366f1);
  background: color-mix(in srgb, var(--brand, #6366f1) 10%, var(--surface));
  color: var(--brand, #6366f1);
}

/* ── Clickable metric rows ──────────────────────────────────────────────────── */
.metric-row--clickable {
  cursor: pointer;
  border-radius: var(--radius-md, 6px);
  padding: 4px 6px;
  margin: -4px -6px;
  transition: background 0.15s;
}

.metric-row--clickable:hover {
  background: var(--surface-soft, rgba(0, 0, 0, 0.03));
}

.expand-icon {
  font-size: 10px;
  color: var(--muted);
  margin-left: 8px;
}

/* ── Drill-down panel ────────────────────────────────────────────────────── */
.drill-panel {
  padding: 8px 0 8px 12px;
  border-left: 3px solid var(--brand, #6366f1);
  margin: 4px 0 8px 8px;
}

.drill-row {
  padding: 8px 10px;
  border-radius: var(--radius-md, 6px);
  cursor: pointer;
  transition: background 0.15s;
}

.drill-row:hover {
  background: var(--surface-soft, rgba(0, 0, 0, 0.03));
}

.drill-row-top {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.drill-row-summary {
  font-size: 13px;
  color: var(--ink);
  margin-top: 3px;
  line-height: 1.4;
}

/* ── Dimension rows ──────────────────────────────────────────────────────── */
.dim-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.dim-label {
  font-size: 12px;
  min-width: 140px;
  text-transform: capitalize;
  color: var(--ink);
}

.dim-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dim-bar-track {
  background: var(--surface-2, #e0e0e0);
  border-radius: 3px;
  height: 7px;
  overflow: hidden;
}

.dim-bar {
  height: 100%;
  transition: width 0.4s ease;
  border-radius: 3px;
}

.dim-chip {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 700;
}

/* ── Score bucket chips ─────────────────────────────────────────────────── */
.bucket-chip--below5 {
  background: color-mix(in srgb, #ef4444 15%, transparent);
  color: #dc2626;
  border: 1px solid color-mix(in srgb, #ef4444 40%, transparent);
}

.bucket-chip--5to7 {
  background: color-mix(in srgb, #f97316 12%, transparent);
  color: #ea580c;
  border: 1px solid color-mix(in srgb, #f97316 35%, transparent);
}

.bucket-chip--7to9 {
  background: color-mix(in srgb, #0ea5e9 12%, transparent);
  color: #0284c7;
  border: 1px solid color-mix(in srgb, #0ea5e9 35%, transparent);
}

.bucket-chip--9plus {
  background: color-mix(in srgb, #10b981 12%, transparent);
  color: #059669;
  border: 1px solid color-mix(in srgb, #10b981 35%, transparent);
}

/* ── QA scoring in detail drawer ──────────────────────────────────────────── */
.qa-section {
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.qa-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.qa-section-title {
  font-size: 12px;
  font-weight: 800;
  text-transform: capitalize;
  color: var(--ink);
}

.qa-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
  flex-wrap: wrap;
}

.qa-label {
  font-size: 12px;
  min-width: 140px;
  text-transform: capitalize;
  color: var(--ink);
}

.qa-rationale {
  font-size: 11px;
  color: var(--muted);
  flex: 1;
  min-width: 120px;
}

/* ── Drawer ────────────────────────────────────────────────────────────────── */
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 999;
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: min(1400px, 95vw);
  height: 100vh;
  background: var(--surface, #fff);
  border-left: 1px solid var(--border);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: linear-gradient(135deg, #1a3a5c 0%, #2b6cb0 100%);
  color: #fff;
  flex-shrink: 0;
}

.drawer-header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.drawer-title {
  font-size: 15px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 0.02em;
}

.drawer-header-sub {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.75);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-header-sep {
  margin: 0 5px;
  opacity: 0.5;
}

.drawer-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.drawer-header-score {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  height: 28px;
  padding: 0 10px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 800;
  color: #fff;
}

.drawer-close {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #fff;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  line-height: 1;
}

.drawer-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.drawer-columns {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  height: 100%;
}

.drawer-col {
  overflow-y: auto;
  min-height: 0;
  border-right: 1px solid var(--border);
}

.drawer-col:last-child {
  border-right: none;
}

@media (max-width: 900px) {
  .drawer-columns {
    grid-template-columns: 1fr;
  }
  .drawer-col {
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
  .drawer-col:last-child {
    border-bottom: none;
  }
}

.drawer-section {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.drawer-section-title {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--brand, #6366f1);
  margin-bottom: 10px;
}

.drawer-meta-grid {
  display: grid;
  grid-template-columns: auto 1fr auto 1fr;
  gap: 5px 10px;
  align-items: baseline;
}

.drawer-meta-grid > div {
  display: contents;
}

.drawer-value {
  font-size: 13px;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.drawer-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink);
}

/* ── Chat bubbles ──────────────────────────────────────────────────────────── */
.chat-thread {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 4px;
}

.chat-msg { display: flex; }
.chat-msg--agent { justify-content: flex-start; }
.chat-msg--customer { justify-content: flex-end; }

.chat-bubble {
  max-width: 80%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
}

.chat-bubble--agent {
  background: var(--surface-soft, #f1f5f9);
  color: var(--ink);
  border-bottom-left-radius: 4px;
}

.chat-bubble--customer {
  background: var(--brand, #6366f1);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.chat-sender { font-size: 11px; font-weight: 700; margin-bottom: 2px; opacity: 0.7; }
.chat-content { margin-bottom: 4px; }
.chat-time { font-size: 10px; opacity: 0.5; text-align: right; }

.drawer-transcript {
  margin: 0;
  font-size: 12px;
  font-family: ui-monospace, "Courier New", monospace;
  color: var(--ink);
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--surface-soft, #f8f8f8);
  padding: 12px;
  border-radius: var(--radius-md, 6px);
  line-height: 1.6;
}

/* ── Narrative ─────────────────────────────────────────────────────────────── */
.narrative-box {
  background: var(--surface-soft, #f8f8f8);
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 6px);
  padding: 16px;
  max-height: 500px;
  overflow-y: auto;
}

.narrative-pre {
  margin: 0;
  font-size: 12px;
  font-family: ui-monospace, "Courier New", monospace;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  color: var(--ink);
}

/* ── Drawer transition ──────────────────────────────────────────────────────── */
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.25s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}
</style>
