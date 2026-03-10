<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1 class="auth-title">Two-factor verification</h1>
      <p class="auth-subtitle">
        Enter the 6-digit code from your authenticator app to continue.
      </p>

      <form class="auth-form" @submit.prevent="submit">
        <label class="auth-field">
          <span>Authentication code</span>
          <input
            v-model.trim="code"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            placeholder="123456"
            maxlength="8"
            :disabled="submitting"
          />
        </label>

        <p v-if="error" class="auth-error">{{ error }}</p>

        <div class="auth-actions">
          <button
            class="auth-button auth-button--secondary"
            type="button"
            :disabled="submitting"
            @click="$emit('cancel')"
          >
            Back
          </button>

          <button class="auth-button" type="submit" :disabled="submitting">
            {{ submitting ? "Verifying..." : "Verify" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAuth } from "../../composables/useAuth";

const props = defineProps<{
  twoFactorToken: string;
}>();

const emit = defineEmits<{
  (
    e: "verified",
    payload: { user: { id: string; name?: string; email?: string } }
  ): void;
  (e: "cancel"): void;
}>();

const { verify2fa } = useAuth();

const code = ref("");
const error = ref("");
const submitting = ref(false);

async function submit() {
  error.value = "";

  if (!code.value) {
    error.value = "Enter your authentication code.";
    return;
  }

  submitting.value = true;

  try {
    const result = await verify2fa(props.twoFactorToken, code.value);
    emit("verified", { user: result.user });
  } catch (err: any) {
    error.value = err?.message || "Verification failed.";
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #f4f7fb;
}

.auth-card {
  width: 100%;
  max-width: 460px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 16px 50px rgba(16, 24, 40, 0.08);
  padding: 28px;
  border: 1px solid #e7ecf3;
}

.auth-title {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
  color: #122033;
}

.auth-subtitle {
  margin: 8px 0 24px;
  color: #5b6b80;
  font-size: 0.95rem;
  line-height: 1.45;
}

.auth-form {
  display: grid;
  gap: 16px;
}

.auth-field {
  display: grid;
  gap: 6px;
}

.auth-field span {
  font-size: 0.92rem;
  font-weight: 600;
  color: #304256;
}

.auth-field input {
  width: 100%;
  border: 1px solid #d3dce7;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 1.1rem;
  letter-spacing: 0.12em;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.auth-field input:focus {
  border-color: #4c7cf0;
  box-shadow: 0 0 0 4px rgba(76, 124, 240, 0.12);
}

.auth-error {
  margin: 0;
  color: #b42318;
  background: #fef3f2;
  border: 1px solid #fecdca;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 0.92rem;
}

.auth-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.auth-button {
  border: 0;
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 1rem;
  font-weight: 700;
  background: #1f6feb;
  color: white;
  cursor: pointer;
}

.auth-button--secondary {
  background: #e9eef6;
  color: #243447;
}

.auth-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
