<script setup lang="ts">
import axios from "axios";
import { computed, onMounted, ref } from "vue";

type SectionKey = "range" | "metrics" | "narrative" | "history" | "raw";

const open = ref<Record<SectionKey, boolean>>({
  range: true,
  metrics: true,
  narrative: false,
  history: false,
  raw: false,
});

const toggle = (key: SectionKey) => {
  open.value[key] = !open.value[key];
};
const isOpen = (key: SectionKey) => open.value[key];

const loadingMetrics = ref(false);
const loadingNarrative = ref(false);
const error = ref("");

const metrics = ref<any>(null);
const narrativePretty = ref("");
const rawPretty = ref("");

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

// Default window: last 7 days
const now = new Date();
const from = ref(
  isoStartOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000))
);
const to = ref(isoEndOfDayExclusive(now));

const totalCalls = computed(() => metrics.value?.totals?.total_calls ?? 0);
const avgSentiment = computed(
  () => metrics.value?.totals?.avg_sentiment ?? null
);

const byResolution = computed(() => metrics.value?.by_resolution ?? []);
const topIntents = computed(() => metrics.value?.top_intents ?? []);
const worstSentiment = computed(
  () => metrics.value?.examples?.worst_sentiment ?? []
);

const byContact = computed(() => metrics.value?.by_contact ?? []);
const byConversationType = computed(
  () => metrics.value?.by_conversation_type ?? []
);
const byInterest = computed(() => metrics.value?.by_interest ?? []);
const dealerContact = computed(
  () => metrics.value?.dealer_contact_required ?? null
);

const bestSentiment = computed(
  () => metrics.value?.examples?.best_sentiment ?? []
);
const dealerFollowups = computed(
  () => metrics.value?.examples?.dealer_followups ?? []
);

function badgeClass(status: string) {
  const s = (status || "").toLowerCase();

  // recording pipeline statuses (existing)
  if (s === "insights_done") return "chip--success";
  if (s === "transcribed") return "chip--info";
  if (s === "pending_transcription") return "chip--warning";
  if (s === "error") return "chip--danger";

  // resolution_status
  if (s === "resolved") return "chip--success";
  if (s === "unresolved") return "chip--warning";
  if (s === "escalated") return "chip--danger";
  if (s === "follow_up_required") return "chip--info";

  // contact disposition
  if (s === "connected_correct_party") return "chip--success";
  if (s === "connected_wrong_party") return "chip--warning";
  if (s === "no_answer") return "chip--secondary";
  if (s === "voicemail") return "chip--info";
  if (s === "busy") return "chip--warning";
  if (s === "call_dropped") return "chip--warning";
  if (s === "invalid_number") return "chip--danger";

  // interest levels
  if (s === "high") return "chip--success";
  if (s === "medium") return "chip--info";
  if (s === "low") return "chip--warning";

  return "chip--secondary";
}

function sentimentChip(v: number | null) {
  if (typeof v !== "number") return "chip";
  if (v <= -0.3) return "chip chip--danger";
  if (v >= 0.3) return "chip chip--success";
  return "chip chip--secondary";
}

async function loadMetrics() {
  loadingMetrics.value = true;
  error.value = "";
  narrativePretty.value = "";
  rawPretty.value = "";

  try {
    const res = await axios.get("/uiapi/insights/summary", {
      params: { from: from.value, to: to.value },
    });

    metrics.value = res.data;
    rawPretty.value = JSON.stringify(res.data, null, 2);
  } catch (e: any) {
    error.value =
      e?.response?.data?.message ||
      e?.message ||
      "Failed to load summary metrics";
  } finally {
    loadingMetrics.value = false;
  }
}

async function generateNarrative() {
  loadingNarrative.value = true;
  error.value = "";
  narrativePretty.value = "";

  try {
    const res = await axios.post("/uiapi/insights/summary/narrative", null, {
      params: { from: from.value, to: to.value },
    });

    // backend returns { narrative: jsonText, metrics, window } per our earlier shape
    const raw = res.data?.narrative ?? res.data;

    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      narrativePretty.value = JSON.stringify(parsed, null, 2);
    } catch {
      narrativePretty.value =
        typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
    }

    // if backend returns metrics too, refresh local
    if (res.data?.metrics) {
      metrics.value = res.data.metrics;
      rawPretty.value = JSON.stringify(res.data.metrics, null, 2);
    }

    open.value.narrative = true;

    await loadHistory();
    open.value.history = true;
  } catch (e: any) {
    error.value =
      e?.response?.data?.message ||
      e?.message ||
      "Failed to generate narrative";
  } finally {
    loadingNarrative.value = false;
  }
}

const historyLimit = ref(20);
const loadingHistory = ref(false);
const history = ref<Array<any>>([]);
const selectedHistoryId = ref<string | null>(null);

const selectedHistory = computed(() => {
  if (!selectedHistoryId.value) return null;
  return history.value.find((h) => h.id === selectedHistoryId.value) ?? null;
});

async function loadHistory() {
  loadingHistory.value = true;
  error.value = "";
  try {
    const res = await axios.get("/uiapi/insights/summary/narratives", {
      params: { limit: historyLimit.value, filterKey: "all" },
    });
    history.value = Array.isArray(res.data) ? res.data : [];
    if (!selectedHistoryId.value && history.value.length) {
      selectedHistoryId.value = history.value[0].id;
    }
  } catch (e: any) {
    error.value =
      e?.response?.data?.message ||
      e?.message ||
      "Failed to load narrative history";
  } finally {
    loadingHistory.value = false;
  }
}

onMounted(async () => {
  await loadMetrics();
  await loadHistory();
});
</script>

<template>
  <div>
    <!-- Hero -->
    <div class="hero">
      <div class="hero-row">
        <div class="hero-left">
          <div class="hero-kicker">Reporting</div>
          <h1 class="hero-title">Summary Dashboard</h1>
          <div class="hero-subtitle">
            View metrics and generate an executive narrative summary over a date
            range.
          </div>
        </div>

        <div class="hero-right chip-row">
          <span class="chip chip--primary">
            Total: <strong style="margin-left: 6px">{{ totalCalls }}</strong>
          </span>
          <span class="chip" :class="sentimentChip(avgSentiment)">
            Avg sentiment:
            <strong style="margin-left: 6px">
              {{
                typeof avgSentiment === "number"
                  ? avgSentiment.toFixed(2)
                  : "n/a"
              }}
            </strong>
          </span>
        </div>
      </div>
    </div>

    <div class="grid">
      <!-- Range tile -->
      <div class="tile tile--accent" @click="toggle('range')">
        <div class="tile-head">
          <div class="tile-icon">🗓</div>
          <div class="tile-text">
            <div class="tile-title">Date Range</div>
            <div class="tile-desc">Choose time window for the summary</div>
          </div>
          <div class="spacer" />
          <div class="chev" :class="{ open: isOpen('range') }"></div>
        </div>

        <div v-show="isOpen('range')" class="tile-body" @click.stop>
          <div class="muted">
            Uses <span class="mono">call_recordings.createdAt</span> between
            <span class="mono">from</span> (inclusive) and
            <span class="mono">to</span> (exclusive).
          </div>

          <div class="actions-row" style="margin-top: 10px; flex-wrap: wrap">
            <label class="label">From (ISO)</label>
            <input v-model="from" class="input" style="min-width: 340px" />

            <label class="label">To (ISO)</label>
            <input v-model="to" class="input" style="min-width: 340px" />

            <button
              class="btn btn--primary"
              :disabled="loadingMetrics"
              @click="loadMetrics"
            >
              {{ loadingMetrics ? "Loading..." : "Load Metrics" }}
            </button>

            <button
              class="btn btn--secondary"
              :disabled="loadingNarrative || loadingMetrics || !metrics"
              @click="generateNarrative"
            >
              {{ loadingNarrative ? "Generating..." : "Generate Narrative" }}
            </button>
          </div>

          <div v-if="error" class="error-tile" style="margin-top: 10px">
            <div class="error-title">Error</div>
            <div class="error-text">{{ error }}</div>
          </div>
        </div>
      </div>

      <!-- Metrics tile -->
      <div class="tile" @click="toggle('metrics')">
        <div class="tile-head">
          <div class="tile-icon">Σ</div>
          <div class="tile-text">
            <div class="tile-title">Metrics</div>
            <div class="tile-desc">Resolution, intents, examples</div>
          </div>
          <div class="spacer" />
          <div class="chev" :class="{ open: isOpen('metrics') }"></div>
        </div>

        <div v-show="isOpen('metrics')" class="tile-body" @click.stop>
          <div v-if="!metrics" class="hint">Load metrics to see results.</div>

          <div v-else class="stats">
            <div class="stat">
              <div class="stat-label">Total calls</div>
              <div class="stat-value">{{ totalCalls }}</div>
            </div>

            <div class="stat">
              <div class="stat-label">Avg sentiment</div>
              <div class="stat-value">
                {{
                  typeof avgSentiment === "number"
                    ? avgSentiment.toFixed(2)
                    : "n/a"
                }}
              </div>
            </div>
          </div>

          <div v-if="metrics" class="grid grid-2" style="margin-top: 12px">
            <div class="subcard">
              <div class="tile-title" style="font-size: 14px">
                By Resolution
              </div>
              <div class="hint" v-if="!byResolution.length">No data.</div>

              <div
                v-for="r in byResolution"
                :key="r.resolution_status"
                class="metric-row"
              >
                <div class="metric-left">
                  <!-- coloured chip always -->
                  <span class="chip" :class="badgeClass(r.resolution_status)">
                    {{ r.resolution_status }}
                  </span>
                </div>
                <div class="metric-right">
                  <span class="count-pill">{{ r.count }}</span>
                </div>
              </div>
            </div>

            <div class="subcard">
              <div class="tile-title" style="font-size: 14px">Top Intents</div>
              <div class="hint" v-if="!topIntents.length">No data.</div>

              <div
                v-for="r in topIntents"
                :key="r.primary_intent"
                class="metric-row"
              >
                <div class="metric-left">
                  <span class="chip chip--secondary">intent</span>
                  <div class="metric-title">{{ r.primary_intent }}</div>
                </div>
                <div class="metric-right">
                  <span class="count-pill">{{ r.count }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="metrics" class="grid grid-2" style="margin-top: 12px">
            <!-- Contact disposition -->
            <div class="subcard">
              <div class="tile-title" style="font-size: 14px">
                Contact Outcomes
              </div>
              <div class="hint" v-if="!byContact.length">No data.</div>

              <div
                v-for="r in byContact"
                :key="r.contact_disposition"
                class="metric-row"
              >
                <div class="metric-left">
                  <span class="chip" :class="badgeClass(r.contact_disposition)">
                    {{ r.contact_disposition }}
                  </span>
                </div>
                <div class="metric-right">
                  <span class="count-pill">{{ r.count }}</span>
                </div>
              </div>
            </div>

            <!-- Conversation type -->
            <div class="subcard">
              <div class="tile-title" style="font-size: 14px">
                Conversation Type
              </div>
              <div class="hint" v-if="!byConversationType.length">No data.</div>

              <div
                v-for="r in byConversationType"
                :key="r.conversation_type"
                class="metric-row"
              >
                <div class="metric-left">
                  <span class="chip" :class="badgeClass(r.conversation_type)">
                    {{ r.conversation_type }}
                  </span>
                </div>
                <div class="metric-right">
                  <span class="count-pill">{{ r.count }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="metrics" class="grid grid-2" style="margin-top: 12px">
            <!-- Interest -->
            <div class="subcard">
              <div class="tile-title" style="font-size: 14px">
                Customer Interest
              </div>
              <div class="hint" v-if="!byInterest.length">No data.</div>

              <div
                v-for="r in byInterest"
                :key="r.interest_level"
                class="metric-row"
              >
                <div class="metric-left">
                  <span class="chip" :class="badgeClass(r.interest_level)">
                    {{ r.interest_level }}
                  </span>
                </div>
                <div class="metric-right">
                  <span class="count-pill">{{ r.count }}</span>
                </div>
              </div>
            </div>

            <!-- Dealer contact required -->
            <div class="subcard">
              <div class="tile-title" style="font-size: 14px">
                Dealer Follow-up
              </div>

              <div
                v-if="dealerContact"
                class="stats stats--compact"
                style="margin-top: 8px"
              >
                <div class="stat">
                  <div class="stat-label">
                    <span class="chip chip--info">dealer_contact_required</span>
                  </div>
                  <div class="stat-value">
                    {{ dealerContact.count_true }} / {{ dealerContact.total }}
                  </div>
                </div>
              </div>
              <div v-else class="hint">No data.</div>
            </div>
          </div>

          <div v-if="metrics" class="subcard" style="margin-top: 12px">
            <div class="tile-title" style="font-size: 14px">
              Worst Sentiment Examples
            </div>
            <div class="hint" v-if="!worstSentiment.length">No examples.</div>

            <div
              v-for="x in worstSentiment"
              :key="x.recordingId"
              class="list-row"
              style="margin-top: 8px"
            >
              <div class="row-top">
                <span class="chip" :class="sentimentChip(x.sentiment_overall)">
                  sentiment:
                  {{
                    typeof x.sentiment_overall === "number"
                      ? x.sentiment_overall.toFixed(2)
                      : "n/a"
                  }}
                </span>

                <div class="row-top chip-row">
                  <span
                    class="chip"
                    :class="badgeClass(x.resolution_status || 'unknown')"
                  >
                    {{ x.resolution_status || "unknown" }}
                  </span>
                </div>
                <span class="mono" style="opacity: 0.75">{{
                  String(x.recordingId).slice(0, 8)
                }}</span>
              </div>
              <div class="muted">{{ x.primary_intent || "unknown" }}</div>
              <div class="url-text">
                {{ x.summary_short || "(no short summary)" }}
              </div>
            </div>
          </div>

          <!-- Best sentiment -->
          <div v-if="metrics" class="subcard" style="margin-top: 12px">
            <div class="tile-title" style="font-size: 14px">
              Best Sentiment Examples
            </div>
            <div class="hint" v-if="!bestSentiment.length">No examples.</div>

            <div
              v-for="x in bestSentiment"
              :key="x.recordingId"
              class="list-row"
              style="margin-top: 8px"
            >
              <div class="row-top">
                <span class="chip" :class="sentimentChip(x.sentiment_overall)">
                  sentiment:
                  {{
                    typeof x.sentiment_overall === "number"
                      ? x.sentiment_overall.toFixed(2)
                      : "n/a"
                  }}
                </span>

                <span
                  class="chip"
                  :class="badgeClass(x.resolution_status || 'unknown')"
                >
                  {{ x.resolution_status || "unknown" }}
                </span>

                <span class="mono" style="opacity: 0.75">{{
                  String(x.recordingId).slice(0, 8)
                }}</span>
              </div>

              <div class="muted">{{ x.primary_intent || "unknown" }}</div>
              <div class="url-text">
                {{ x.summary_short || "(no short summary)" }}
              </div>
            </div>
          </div>

          <!-- Dealer follow-up examples -->
          <div v-if="metrics" class="subcard" style="margin-top: 12px">
            <div class="tile-title" style="font-size: 14px">
              Dealer Follow-up Examples
            </div>
            <div class="hint" v-if="!dealerFollowups.length">No examples.</div>

            <div
              v-for="x in dealerFollowups"
              :key="x.recordingId"
              class="list-row"
              style="margin-top: 8px"
            >
              <div class="row-top">
                <span class="chip chip--info">dealer</span>
                <span class="mono">{{
                  x.dealer_name_if_mentioned || "unknown"
                }}</span>
                <span class="mono" style="opacity: 0.75">{{
                  String(x.recordingId).slice(0, 8)
                }}</span>
              </div>

              <div class="muted">{{ x.primary_intent || "unknown" }}</div>
              <div class="url-text">
                {{ x.summary_short || "(no short summary)" }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Narrative tile -->
      <div class="tile" @click="toggle('narrative')">
        <div class="tile-head">
          <div class="tile-icon">🧠</div>
          <div class="tile-text">
            <div class="tile-title">Narrative</div>
            <div class="tile-desc">LLM-generated executive summary</div>
          </div>
          <div class="spacer" />
          <div class="chev" :class="{ open: isOpen('narrative') }"></div>
        </div>

        <div v-show="isOpen('narrative')" class="tile-body" @click.stop>
          <div class="muted">
            Generates a narrative summary from aggregates (not raw transcripts).
          </div>

          <div
            v-if="narrativePretty"
            class="prompt-box"
            style="margin-top: 10px"
          >
            <pre class="pre">{{ narrativePretty }}</pre>
          </div>
          <div v-else class="hint" style="margin-top: 10px">
            Click “Generate Narrative” in the Date Range tile.
          </div>
        </div>
      </div>

      <!-- History tile -->
      <div class="tile" @click="toggle('history')">
        <div class="tile-head">
          <div class="tile-icon">🕘</div>
          <div class="tile-text">
            <div class="tile-title">Historical Narratives</div>
            <div class="tile-desc">Previously generated summaries</div>
          </div>
          <div class="spacer" />
          <div class="chev" :class="{ open: isOpen('history') }"></div>
        </div>

        <div v-show="isOpen('history')" class="tile-body" @click.stop>
          <div class="muted">
            Loads the latest saved narratives (cached outputs).
          </div>

          <div class="actions-row" style="margin-top: 10px; flex-wrap: wrap">
            <label class="label">Limit</label>
            <select v-model.number="historyLimit" class="select">
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>

            <button
              class="btn btn--ghost"
              :disabled="loadingHistory"
              @click="loadHistory"
            >
              {{ loadingHistory ? "Loading..." : "Refresh history" }}
            </button>
          </div>

          <div
            v-if="!history.length && !loadingHistory"
            class="hint"
            style="margin-top: 10px"
          >
            No narratives saved yet. Generate one to see it here.
          </div>

          <div v-if="history.length" class="split" style="margin-top: 12px">
            <!-- Left list -->
            <div class="panel panel--scroll" style="max-height: 320px">
              <div
                v-for="h in history"
                :key="h.id"
                class="list-row"
                :class="{ 'list-row--selected': selectedHistoryId === h.id }"
                @click="selectedHistoryId = h.id"
              >
                <div class="row-top">
                  <span class="chip chip--secondary">{{ h.filterKey }}</span>
                  <span class="mono" style="opacity: 0.75">{{
                    String(h.id).slice(0, 8)
                  }}</span>
                </div>
                <div class="muted mono">{{ h.from }} → {{ h.to }}</div>
                <div class="muted" style="margin-top: 4px">
                  created: <span class="mono">{{ h.createdAt }}</span>
                </div>
              </div>
            </div>

            <!-- Right details -->
            <div class="panel">
              <div v-if="selectedHistory">
                <div class="row-top">
                  <div class="tile-title">Selected Narrative</div>
                  <span class="chip">{{
                    selectedHistory.model || "model?"
                  }}</span>
                </div>

                <div class="hint" style="margin-top: 8px">
                  Window:
                  <span class="mono">{{ selectedHistory.from }}</span> to
                  <span class="mono">{{ selectedHistory.to }}</span>
                </div>

                <div class="prompt-box" style="margin-top: 10px">
                  <pre class="pre">{{ selectedHistory.narrative }}</pre>
                </div>
              </div>

              <div v-else class="hint">Select a narrative on the left.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Raw payload tile -->
      <div class="tile" @click="toggle('raw')">
        <div class="tile-head">
          <div class="tile-icon">⎘</div>
          <div class="tile-text">
            <div class="tile-title">Raw Payload</div>
            <div class="tile-desc">Inspect JSON returned from /summary</div>
          </div>
          <div class="spacer" />
          <div class="chev" :class="{ open: isOpen('raw') }"></div>
        </div>

        <div v-show="isOpen('raw')" class="tile-body" @click.stop>
          <div v-if="rawPretty" class="prompt-box">
            <pre class="pre">{{ rawPretty }}</pre>
          </div>
          <div v-else class="hint">Load metrics to see raw JSON.</div>
        </div>
      </div>
    </div>
  </div>
</template>
