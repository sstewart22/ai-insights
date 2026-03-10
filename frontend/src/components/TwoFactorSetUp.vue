<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import api from "@/services/api";
import { useAccess } from "@/composables/useAccess";

const { canSeeDevTools } = useAccess();

const qrDataUrl = ref<string | null>(null);
const manualKey = ref<string | null>(null);
const code = ref("");
const enabled = ref(false);
const confirmedAt = ref<string | null>(null);
const error = ref("");
const busy = ref(false);

const snackbar = ref(false);
const snackbarText = ref("");

function showSnack(msg: string) {
  snackbarText.value = msg;
  snackbar.value = true;
}

const codeClean = computed(() =>
  String(code.value || "")
    .replace(/\s+/g, "")
    .slice(0, 6)
);

const statusText = computed(() =>
  enabled.value ? "2FA enabled" : "2FA not enabled"
);

const statusColor = computed(() => (enabled.value ? "success" : "error"));

const showToken = ref(false);
const accessToken = computed(() => localStorage.getItem("accessToken") || "");

async function copyToken() {
  const token = localStorage.getItem("accessToken") || "";
  if (!token) {
    showSnack("No access token found");
    return;
  }

  try {
    await navigator.clipboard.writeText(token);
    showSnack("Copied to clipboard");
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = token;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showSnack("Copied to clipboard");
    } catch {
      showSnack("Copy failed");
    }
  }
}

async function loadStatus() {
  error.value = "";

  try {
    const { data } = await api.get("/uiapi/auth/2fa/status");
    enabled.value = !!data.enabled;
    confirmedAt.value = data.confirmedAt ?? null;

    if (enabled.value) {
      qrDataUrl.value = null;
      manualKey.value = null;
    }
  } catch (e: any) {
    error.value =
      e?.response?.data?.message || e?.message || "Failed to load 2FA status";
  }
}

async function startSetup() {
  error.value = "";
  busy.value = true;

  try {
    const { data } = await api.post("/uiapi/auth/2fa/setup");

    qrDataUrl.value = data.qrDataUrl ?? null;
    manualKey.value = data.secret ?? null;
    enabled.value = false;
    confirmedAt.value = null;
    code.value = "";
  } catch (e: any) {
    error.value =
      e?.response?.data?.message || e?.message || "Failed to start 2FA setup";
  } finally {
    busy.value = false;
  }
}

async function confirm() {
  error.value = "";
  busy.value = true;

  try {
    await api.post("/uiapi/auth/2fa/confirm", {
      code: codeClean.value,
    });

    await loadStatus();
    code.value = "";
  } catch (e: any) {
    error.value =
      e?.response?.data?.message || e?.message || "Failed to confirm 2FA";
  } finally {
    busy.value = false;
  }
}

async function disable2fa() {
  error.value = "";

  if (codeClean.value.length !== 6) {
    error.value = "Enter your 6-digit code to disable 2FA.";
    return;
  }

  busy.value = true;

  try {
    await api.post("/uiapi/auth/2fa/disable", {
      code: codeClean.value,
    });

    qrDataUrl.value = null;
    manualKey.value = null;
    code.value = "";
    await loadStatus();
  } catch (e: any) {
    error.value =
      e?.response?.data?.message || e?.message || "Failed to disable 2FA";
  } finally {
    busy.value = false;
  }
}

async function reset2fa() {
  error.value = "";

  if (codeClean.value.length !== 6) {
    error.value = "Enter your 6-digit code to reset 2FA.";
    return;
  }

  busy.value = true;

  try {
    const { data } = await api.post("/uiapi/auth/2fa/reset", {
      code: codeClean.value,
    });

    qrDataUrl.value = data.qrDataUrl ?? null;
    manualKey.value = data.secret ?? null;
    enabled.value = false;
    confirmedAt.value = null;
    code.value = "";
  } catch (e: any) {
    error.value =
      e?.response?.data?.message || e?.message || "Failed to reset 2FA";
  } finally {
    busy.value = false;
  }
}

onMounted(loadStatus);
</script>

<template>
  <v-theme-provider theme="light" with-background>
    <v-card
      style="
        margin: 12px 0;
        padding: 12px;
        border: 1px solid #ccd0de;
        border-radius: 10px;
      "
    >
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center ga-2">
          <span>Authenticator App (2FA)</span>
        </div>
      </v-card-title>

      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center ga-2">
          <v-chip size="small" :color="statusColor" variant="tonal">
            {{ statusText }}
          </v-chip>
        </div>

        <div class="d-flex ga-2 flex-wrap justify-end">
          <v-btn
            v-if="!enabled"
            color="primary"
            variant="tonal"
            :loading="busy"
            @click="startSetup"
          >
            Enable 2FA
          </v-btn>

          <template v-else>
            <v-btn
              color="error"
              variant="outlined"
              :loading="busy"
              @click="disable2fa"
            >
              Disable 2FA
            </v-btn>

            <v-btn
              color="error"
              variant="outlined"
              :loading="busy"
              @click="reset2fa"
            >
              Reset / Re-enrol
            </v-btn>
          </template>
        </div>
      </v-card-title>

      <v-card-text class="pt-0">
        <div
          v-if="enabled && confirmedAt"
          class="text-body-2 text-medium-emphasis mb-3"
        >
          Enabled since {{ new Date(confirmedAt).toLocaleString() }}
        </div>

        <v-text-field
          v-model="code"
          label="6-digit code"
          placeholder="123456"
          variant="outlined"
          density="compact"
          maxlength="6"
          :disabled="busy"
          inputmode="numeric"
          autocomplete="one-time-code"
          hide-details="auto"
        />

        <div v-if="qrDataUrl" class="mt-4">
          <v-alert type="info" variant="tonal" class="mb-3">
            Scan this QR code with Microsoft Authenticator (or similar).
          </v-alert>

          <div class="d-flex flex-column flex-sm-row ga-4 align-start">
            <v-img
              :src="qrDataUrl"
              max-width="260"
              aspect-ratio="1"
              class="rounded-lg"
            />

            <div class="flex-grow-1">
              <v-text-field
                :model-value="manualKey ?? ''"
                label="Manual key"
                variant="outlined"
                density="compact"
                readonly
              />

              <v-btn
                color="primary"
                variant="tonal"
                class="mt-2"
                :loading="busy"
                :disabled="codeClean.length !== 6"
                @click="confirm"
              >
                Confirm
              </v-btn>
            </div>
          </div>
        </div>

        <v-alert v-if="error" type="error" variant="tonal" class="mt-4">
          {{ error }}
        </v-alert>
      </v-card-text>
    </v-card>

    <v-card
      v-if="canSeeDevTools"
      style="
        margin: 12px 0;
        padding: 12px;
        border: 1px solid #ccd0de;
        border-radius: 10px;
      "
    >
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Dev tools</span>

        <div class="d-flex ga-2">
          <v-btn
            variant="tonal"
            :disabled="busy || !accessToken"
            @click="copyToken"
          >
            Copy access token
          </v-btn>

          <v-btn
            color="primary"
            variant="tonal"
            :disabled="busy || !accessToken"
            @click="showToken = !showToken"
          >
            {{ showToken ? "Hide token" : "Show token" }}
          </v-btn>
        </div>
      </v-card-title>

      <v-card-text v-if="showToken && accessToken">
        <pre class="token-pre">{{ accessToken }}</pre>
      </v-card-text>
    </v-card>

    <v-snackbar v-model="snackbar" :timeout="2000">
      {{ snackbarText }}
    </v-snackbar>
  </v-theme-provider>
</template>

<style scoped>
.token-pre {
  margin: 0;
  padding: 10px;
  background: #f8f9ff;
  border-radius: 8px;
  overflow: auto;
}
</style>
