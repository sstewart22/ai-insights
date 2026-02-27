<template>
  <div>
    <div>
      <!-- Hero -->
      <div class="hero">
        <div class="hero-row">
          <div class="hero-left">
            <div class="hero-kicker">Recordings</div>
            <h1 class="hero-title">DB Queue</h1>
            <div class="hero-subtitle">
              Add recording URLs to the queue. Select a record, transcribe
              (audio fetched by URL), then generate insights.
            </div>
          </div>

          <div class="hero-right">
            <span class="chip chip--primary">Queue</span>
            <span class="chip chip--secondary">
              Showing:
              <strong style="margin-left: 6px">{{ recordings.length }}</strong>
            </span>
          </div>
        </div>
      </div>

      <!-- Add URL tile -->
      <div class="grid grid-2">
        <div class="tile tile--accent" @click="() => {}">
          <div class="tile-head">
            <div class="tile-icon">＋</div>
            <div class="tile-text">
              <div class="tile-title">Add Recording</div>
              <div class="tile-desc">Paste a downloadable URL</div>
            </div>
            <div class="spacer"></div>
          </div>

          <div class="tile-body" @click.stop>
            <div class="muted">
              Tip: use a direct URL to audio (WAV/MP3/M4A).
            </div>

            <div class="actions-row" style="margin-top: 10px">
              <input
                v-model="newUrl"
                class="input"
                placeholder="https://.../recording.wav"
              />
              <button
                class="btn btn--primary"
                :disabled="!newUrl.trim() || creating"
                @click="createRecording"
              >
                {{ creating ? "Adding..." : "Add URL" }}
              </button>
            </div>
          </div>
        </div>

        <!-- Filter tile -->
        <div class="tile" @click="() => {}">
          <div class="tile-head">
            <div class="tile-icon">⚙</div>
            <div class="tile-text">
              <div class="tile-title">Filter & Refresh</div>
              <div class="tile-desc">Narrow down by status</div>
            </div>
            <div class="spacer"></div>
          </div>

          <div class="tile-body" @click.stop>
            <div class="actions-row">
              <label class="label">Status</label>
              <select v-model="status" class="select">
                <option value="">All</option>
                <option value="pending_transcription">
                  pending_transcription
                </option>
                <option value="transcribing">transcribing</option>
                <option value="transcribed">transcribed</option>
                <option value="insights_done">insights_done</option>
                <option value="error">error</option>
              </select>

              <button
                class="btn btn--ghost"
                :disabled="loading"
                @click="loadRecordings"
              >
                {{ loading ? "Refreshing..." : "Refresh" }}
              </button>
            </div>

            <div v-if="error" class="error-tile" style="margin-top: 10px">
              <div class="error-title">Error</div>
              <div class="error-text">{{ error }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Split: list + details -->
      <div class="split">
        <!-- List panel -->
        <div class="panel panel--scroll">
          <div class="row-top" style="margin-bottom: 10px">
            <div class="tile-title">Recordings</div>
            <span class="chip">{{ status || "all" }}</span>
          </div>

          <div
            v-for="r in recordings"
            :key="r.id"
            class="list-row"
            :class="{ 'list-row--selected': selected?.id === r.id }"
            @click="select(r)"
          >
            <div class="row-top">
              <span class="chip">{{ r.status }}</span>
              <span class="mono" style="opacity: 0.75">{{
                r.id.slice(0, 8)
              }}</span>
            </div>

            <div class="url-text">{{ r.recordingUrl }}</div>

            <div v-if="r.lastError" class="small-danger">
              Error: {{ r.lastError }}
            </div>
          </div>

          <div v-if="!recordings.length && !loading" class="hint">
            No recordings found.
          </div>
        </div>

        <!-- Details panel -->
        <div class="panel">
          <div v-if="selected">
            <div class="row-top">
              <div class="tile-title">Selected</div>
              <span class="chip chip--secondary">{{ selected.status }}</span>
            </div>

            <div class="kv">
              <span>ID</span><span class="mono">{{ selected.id }}</span>
            </div>
            <div class="kv">
              <span>Status</span><span>{{ selected.status }}</span>
            </div>
            <div class="kv">
              <span>URL</span
              ><span class="mono">{{ selected.recordingUrl }}</span>
            </div>

            <div class="actions-row" style="margin-top: 12px">
              <button
                class="btn btn--primary"
                :disabled="busy"
                @click="transcribeSelected"
              >
                Transcribe
              </button>

              <button
                class="btn btn--secondary"
                :disabled="
                  busy ||
                  (selected.status !== 'transcribed' &&
                    selected.status !== 'insights_done')
                "
                @click="insightsSelected"
              >
                Generate Insights
              </button>

              <button
                class="btn btn--ghost"
                :disabled="busy"
                @click="loadDetails(selected.id)"
              >
                Reload details
              </button>
            </div>

            <div v-if="busy" class="hint">Working…</div>

            <div v-if="transcriptText" class="subcard">
              <div class="tile-title" style="font-size: 14px">Transcript</div>
              <div class="prompt-box">
                <pre class="pre">{{ transcriptText }}</pre>
              </div>
            </div>

            <div v-if="insightsPretty" class="subcard">
              <div class="tile-title" style="font-size: 14px">Insights</div>
              <div class="prompt-box">
                <pre class="pre">{{ insightsPretty }}</pre>
              </div>
            </div>
          </div>

          <div v-else class="hint">Select a recording on the left.</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from "axios";
import { onMounted, ref } from "vue";

type Recording = {
  id: string;
  provider: string;
  recordingUrl: string;
  status: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

const newUrl = ref("");
const creating = ref(false);

const status = ref<string>("");
const recordings = ref<Recording[]>([]);
const selected = ref<Recording | null>(null);

const loading = ref(false);
const busy = ref(false);
const error = ref("");

const transcriptText = ref("");
const insightsPretty = ref("");

async function loadRecordings() {
  loading.value = true;
  error.value = "";
  try {
    const qs = new URLSearchParams();
    if (status.value) qs.set("status", status.value);
    qs.set("limit", "100");
    const res = await axios.get(`/uiapi/recordings?${qs.toString()}`);
    recordings.value = res.data;
    // keep selection if still present
    if (selected.value) {
      const still =
        recordings.value.find((r) => r.id === selected.value?.id) ?? null;
      selected.value = still;
    }
  } catch (e: any) {
    error.value =
      e?.response?.data?.message || e?.message || "Failed to load recordings";
  } finally {
    loading.value = false;
  }
}

async function select(r: Recording) {
  selected.value = r;
  await loadDetails(r.id);
}

async function createRecording() {
  creating.value = true;
  error.value = "";
  try {
    await axios.post("/uiapi/recordings", {
      recordingUrl: newUrl.value.trim(),
      provider: "manual",
    });
    newUrl.value = "";
    await loadRecordings();
  } catch (e: any) {
    error.value =
      e?.response?.data?.message || e?.message || "Failed to create recording";
  } finally {
    creating.value = false;
  }
}

async function transcribeSelected() {
  if (!selected.value) return;
  busy.value = true;
  error.value = "";
  transcriptText.value = "";
  insightsPretty.value = "";
  try {
    const res = await axios.post(
      `/uiapi/recordings/${selected.value.id}/transcribe`
    );
    transcriptText.value = res.data?.text ?? "";
    await loadRecordings();
    await loadDetails(selected.value.id);
  } catch (e: any) {
    error.value =
      e?.response?.data?.message || e?.message || "Transcription failed";
    await loadRecordings();
  } finally {
    busy.value = false;
  }
}

async function insightsSelected() {
  if (!selected.value) return;
  busy.value = true;
  error.value = "";
  insightsPretty.value = "";
  try {
    const res = await axios.post(
      `/uiapi/recordings/${selected.value.id}/insights`
    );
    const raw = res.data?.json ?? "";

    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      insightsPretty.value = JSON.stringify(parsed, null, 2);
    } catch {
      insightsPretty.value =
        typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
    }

    await loadRecordings();
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || "Insights failed";
    await loadRecordings();
  } finally {
    busy.value = false;
  }
}

async function loadDetails(recordingId: string) {
  transcriptText.value = "";
  insightsPretty.value = "";
  error.value = "";

  // transcript
  try {
    const t = await axios.get(`/uiapi/recordings/${recordingId}/transcript`);
    transcriptText.value = t.data?.text ?? "";
  } catch {
    // ignore if not found
  }

  // insight
  try {
    const i = await axios.get(`/uiapi/recordings/${recordingId}/insight`);
    const raw = i.data?.json ?? "";
    try {
      insightsPretty.value = JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      insightsPretty.value = raw;
    }
  } catch {
    // ignore if not found
  }
}

onMounted(loadRecordings);
</script>
