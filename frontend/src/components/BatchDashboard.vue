<script setup lang="ts">
import axios from "axios";
import { computed, onMounted, ref } from "vue";
import { InsightsProvider } from "@/enums/api";
import { RecordingPath } from "@/enums/recording-paths";

type SectionKey = "summary" | "actions" | "lastRun";

const open = ref<Record<SectionKey, boolean>>({
  summary: true,
  actions: true,
  lastRun: false,
});

const toggle = (key: SectionKey) => {
  open.value[key] = !open.value[key];
};

const isOpen = (key: SectionKey) => open.value[key];

const limit = ref(10);
const insightsProvider = ref<InsightsProvider>(InsightsProvider.OpenAI);

const loadingSummary = ref(false);
const summary = ref<{ total: number; byStatus: Record<string, number> } | null>(
  null
);

const runningTranscribe = ref(false);
const runningInsights = ref(false);
const running = computed(
  () => runningTranscribe.value || runningInsights.value
);

const lastRunPretty = ref("");
const error = ref("");

const copyState = ref<"idle" | "copied" | "error">("idle");
const copyBtnLabel = computed(() => {
  if (copyState.value === "copied") return "Copied";
  if (copyState.value === "error") return "Copy failed";
  return "Copy result";
});

async function copyResult() {
  copyState.value = "idle";
  try {
    const text = lastRunPretty.value || "";
    if (!text) return;

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      copyState.value = "copied";
      window.setTimeout(() => (copyState.value = "idle"), 1400);
      return;
    }

    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "true");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);

    copyState.value = ok ? "copied" : "error";
    window.setTimeout(() => (copyState.value = "idle"), 1400);
  } catch {
    copyState.value = "error";
    window.setTimeout(() => (copyState.value = "idle"), 1400);
  }
}

async function loadSummary() {
  loadingSummary.value = true;
  error.value = "";
  try {
    const res = await axios.get(RecordingPath.summary);
    summary.value = res.data;
  } catch (e: any) {
    error.value =
      e?.response?.data?.message || e?.message || "Failed to load summary";
  } finally {
    loadingSummary.value = false;
  }
}

async function runBatchTranscribe() {
  runningTranscribe.value = true;
  error.value = "";
  lastRunPretty.value = "";

  try {
    const res = await axios.post(RecordingPath.batchTranscribe, null, {
      params: { limit: limit.value },
    });

    lastRunPretty.value = JSON.stringify(res.data, null, 2);
    await loadSummary();
    open.value.lastRun = true;
  } catch (e: any) {
    error.value =
      e?.response?.data?.message || e?.message || "Batch transcribe failed";
    await loadSummary();
  } finally {
    runningTranscribe.value = false;
  }
}

async function runBatchInsights() {
  runningInsights.value = true;
  error.value = "";
  lastRunPretty.value = "";

  try {
    const res = await axios.post(
      RecordingPath.batchInsights,
      { provider: insightsProvider.value },
      { params: { limit: limit.value } }
    );

    lastRunPretty.value = JSON.stringify(res.data, null, 2);
    await loadSummary();
    open.value.lastRun = true;
  } catch (e: any) {
    error.value =
      e?.response?.data?.message || e?.message || "Batch insights failed";
    await loadSummary();
  } finally {
    runningInsights.value = false;
  }
}

const total = computed(() => summary.value?.total ?? 0);
const byStatusEntries = computed(() =>
  Object.entries(summary.value?.byStatus ?? {})
);

function badgeClass(status: string) {
  if (status === "insights_done") return "chip chip--success";
  if (status === "transcribed") return "chip chip--info";
  if (status === "pending_transcription") return "chip chip--warning";
  if (status === "error") return "chip chip--danger";
  return "chip";
}

onMounted(loadSummary);
</script>

<template>
  <div>
    <div>
      <!-- Hero -->
      <div class="hero">
        <div class="hero-row">
          <div class="hero-left">
            <div class="hero-kicker">Insights Processing</div>
            <h1 class="hero-title">Batch Dashboard</h1>
            <div class="hero-subtitle">
              Monitor queue status and run batch actions to transcribe and
              generate insights.
            </div>
          </div>

          <div class="hero-right">
            <span class="chip chip--primary">
              Total: <strong style="margin-left: 6px">{{ total }}</strong>
            </span>
            <span class="chip chip--secondary">
              Batch: <strong style="margin-left: 6px">{{ limit }}</strong>
            </span>
          </div>
        </div>
      </div>

      <!-- Tiles -->
      <div class="grid">
        <!-- Summary tile -->
        <div class="tile" @click="toggle('summary')">
          <div class="tile-head">
            <div class="tile-icon">Σ</div>
            <div class="tile-text">
              <div class="tile-title">Queue Summary</div>
              <div class="tile-desc">Counts by status</div>
            </div>
            <div class="spacer" />
            <div class="chev" :class="{ open: isOpen('summary') }"></div>
          </div>

          <div v-show="isOpen('summary')" class="tile-body" @click.stop>
            <div class="muted">
              Shows current counts from
              <span class="mono">call_recordings.status</span>.
            </div>

            <div class="toolbar">
              <button
                class="btn btn--ghost"
                :disabled="loadingSummary"
                @click="loadSummary"
              >
                {{ loadingSummary ? "Refreshing..." : "Refresh" }}
              </button>
            </div>

            <div v-if="summary" class="stats">
              <div class="stat">
                <div class="stat-label">Total</div>
                <div class="stat-value">{{ summary.total }}</div>
              </div>

              <div
                v-for="[status, count] in byStatusEntries"
                :key="status"
                class="stat"
              >
                <div class="stat-label">
                  <span :class="badgeClass(status)">{{ status }}</span>
                </div>
                <div class="stat-value">{{ count }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions tile -->
        <div class="tile tile-accent" @click="toggle('actions')">
          <div class="tile-head">
            <div class="tile-icon">⚡</div>
            <div class="tile-text">
              <div class="tile-title">Batch Actions</div>
              <div class="tile-desc">Run next N transcribe/insights</div>
            </div>
            <div class="spacer" />
            <div class="chev" :class="{ open: isOpen('actions') }"></div>
          </div>

          <div v-show="isOpen('actions')" class="tile-body" @click.stop>
            <div class="muted">
              Processes records sequentially (safe for prototype). Choose batch
              size and run.
            </div>

            <div class="actions-row">
              <label class="label">Batch size</label>
              <select v-model.number="limit" class="select">
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="30">30</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
            </div>

            <div class="actions-row">
              <label class="label">Insights Provider</label>
              <select v-model="insightsProvider" class="select">
                <option :value="InsightsProvider.OpenAI">OpenAI</option>
                <option :value="InsightsProvider.Anthropic">Anthropic</option>
                <option :value="InsightsProvider.Grok">Grok</option>
                <option :value="InsightsProvider.Gemini">Gemini</option>
              </select>
            </div>

            <div class="actions-row">
              <button
                class="btn btn--primary"
                :disabled="running"
                @click="runBatchTranscribe"
              >
                {{
                  runningTranscribe
                    ? "Transcribing..."
                    : `Transcribe next ${limit}`
                }}
              </button>

              <button
                class="btn btn--secondary"
                :disabled="running"
                @click="runBatchInsights"
              >
                {{
                  runningInsights ? "Generating..." : `Insights next ${limit}`
                }}
              </button>

              <button
                class="btn btn--ghost"
                :disabled="running"
                @click="loadSummary"
              >
                Refresh summary
              </button>
            </div>

            <div v-if="running" class="hint">
              Running… check backend logs for per-record failures (they’ll be
              stored in
              <span class="mono">lastError</span>).
            </div>
          </div>
        </div>

        <!-- Last run tile -->
        <div class="tile" @click="toggle('lastRun')">
          <div class="tile-head">
            <div class="tile-icon">⎘</div>
            <div class="tile-text">
              <div class="tile-title">Last Batch Result</div>
              <div class="tile-desc">Inspect the returned payload</div>
            </div>
            <div class="spacer" />
            <div class="chev" :class="{ open: isOpen('lastRun') }"></div>
          </div>

          <div v-show="isOpen('lastRun')" class="tile-body" @click.stop>
            <div class="muted">
              Useful for debugging failures quickly (copy/paste into notes or
              tickets).
            </div>

            <div class="toolbar">
              <button
                class="btn btn--ghost btn--sm"
                :disabled="!lastRunPretty"
                @click="copyResult"
              >
                {{ copyBtnLabel }}
              </button>
            </div>

            <div v-if="lastRunPretty" class="prompt-box">
              <pre>{{ lastRunPretty }}</pre>
            </div>
            <div v-else class="hint">No batch run yet.</div>
          </div>
        </div>

        <!-- Error (full width) -->
        <div v-if="error" class="error-tile">
          <div class="error-title">Error</div>
          <div class="error-text">{{ error }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
