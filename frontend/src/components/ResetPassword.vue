<script setup lang="ts">
import { ref } from "vue";
import { toast } from "vue3-toastify";
import { changeMyPassword } from "@/services/auth.service";

const current = ref("");
const pw1 = ref("");
const pw2 = ref("");
const saving = ref(false);

const revealCurrent = ref(false);
const revealNew = ref(false);
const revealConfirm = ref(false);

async function submit() {
  const newPw = String(pw1.value ?? "");

  if (!newPw || newPw.length < 8) {
    toast.error("New password must be at least 8 characters", {
      theme: "colored",
    });
    return;
  }
  if (pw1.value !== pw2.value) {
    toast.error("Passwords do not match", { theme: "colored" });
    return;
  }

  saving.value = true;
  try {
    await changeMyPassword({
      currentPassword: current.value,
      newPassword: pw1.value,
    });

    toast.success("Password updated", { theme: "colored", autoClose: 2500 });
    current.value = "";
    pw1.value = "";
    pw2.value = "";
  } catch (e: any) {
    // ✅ fixed: was "err" before
    if (e?.code === "AUTH_REDIRECT") return;
    toast.error(e?.message ?? String(e), { theme: "colored", autoClose: 5000 });
  } finally {
    saving.value = false;
  }
}

function pressToReveal(which: "current" | "new" | "confirm", on: boolean) {
  if (which === "current") revealCurrent.value = on;
  if (which === "new") revealNew.value = on;
  if (which === "confirm") revealConfirm.value = on;
}
</script>

<template>
  <v-theme-provider theme="light" with-background>
    <!-- matches your 2FA card style -->
    <v-card class="settings-card">
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Change password</span>

        <v-btn
          color="primary"
          variant="tonal"
          :loading="saving"
          @click="submit"
        >
          Update password
        </v-btn>
      </v-card-title>

      <v-card-text class="pt-0">
        <div class="d-flex flex-column ga-3">
          <v-text-field
            v-model="current"
            :type="revealCurrent ? 'text' : 'password'"
            label="Current password"
            variant="outlined"
            autocomplete="current-password"
            hide-details="auto"
          >
            <template #append-inner>
              <v-icon
                :icon="revealCurrent ? 'mdi-eye-off' : 'mdi-eye'"
                class="cursor-pointer"
                @pointerdown.prevent="pressToReveal('current', true)"
                @pointerup.prevent="pressToReveal('current', false)"
                @pointercancel.prevent="pressToReveal('current', false)"
                @mouseleave="pressToReveal('current', false)"
              />
            </template>
          </v-text-field>

          <v-text-field
            v-model="pw1"
            :type="revealNew ? 'text' : 'password'"
            label="New password"
            variant="outlined"
            autocomplete="new-password"
            hide-details="auto"
          >
            <template #append-inner>
              <v-icon
                :icon="revealNew ? 'mdi-eye-off' : 'mdi-eye'"
                class="cursor-pointer"
                @pointerdown.prevent="pressToReveal('new', true)"
                @pointerup.prevent="pressToReveal('new', false)"
                @pointercancel.prevent="pressToReveal('new', false)"
                @mouseleave="pressToReveal('new', false)"
              />
            </template>
          </v-text-field>

          <v-text-field
            v-model="pw2"
            :type="revealConfirm ? 'text' : 'password'"
            label="Confirm new password"
            variant="outlined"
            autocomplete="new-password"
            hide-details="auto"
          >
            <template #append-inner>
              <v-icon
                :icon="revealConfirm ? 'mdi-eye-off' : 'mdi-eye'"
                class="cursor-pointer"
                @pointerdown.prevent="pressToReveal('confirm', true)"
                @pointerup.prevent="pressToReveal('confirm', false)"
                @pointercancel.prevent="pressToReveal('confirm', false)"
                @mouseleave="pressToReveal('confirm', false)"
              />
            </template>
          </v-text-field>
        </div>
      </v-card-text>
    </v-card>
  </v-theme-provider>
</template>

<style scoped>
.settings-card {
  margin: 12px 0;
  padding: 12px;
  border: 1px solid #ccd0de;
  border-radius: 10px;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
