<script setup lang="ts">
import { computed, ref } from "vue";
import { toast } from "vue3-toastify";
import { createUser } from "@/services/user.service";

const loading = ref(false);

const form = ref({
  email: "",
  displayName: "",
  password: "",
});

const canSubmit = computed(() => {
  return (
    form.value.email.trim().length > 0 &&
    form.value.displayName.trim().length > 0 &&
    form.value.password.trim().length > 0
  );
});

function resetForm() {
  form.value = {
    email: "",
    displayName: "",
    password: "",
  };
}

async function submit() {
  if (!canSubmit.value) return;

  loading.value = true;

  try {
    await createUser({
      email: form.value.email.trim(),
      displayName: form.value.displayName.trim(),
      password: form.value.password,
    });

    toast.success("User created", {
      theme: "colored",
      autoClose: 2500,
      position: "top-right",
    });

    resetForm();
  } catch (e: any) {
    toast.error(e?.message ?? "Failed to create user", {
      theme: "colored",
      autoClose: 5000,
      position: "top-right",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="panel">
    <div class="panel-header">
      <div>
        <h3 class="panel-title">Create user</h3>
        <p class="panel-subtitle">
          Create a new user account with email, display name, and password.
        </p>
      </div>
    </div>

    <div class="form-grid">
      <v-text-field
        v-model="form.email"
        label="Email"
        variant="outlined"
        density="comfortable"
        hide-details="auto"
      />

      <v-text-field
        v-model="form.displayName"
        label="Display name"
        variant="outlined"
        density="comfortable"
        hide-details="auto"
      />

      <v-text-field
        v-model="form.password"
        label="Password"
        type="password"
        variant="outlined"
        density="comfortable"
        hide-details="auto"
      />
    </div>

    <div class="panel-actions">
      <v-btn variant="text" :disabled="loading" @click="resetForm">
        Clear
      </v-btn>

      <v-btn
        color="primary"
        variant="flat"
        :loading="loading"
        :disabled="!canSubmit"
        @click="submit"
      >
        Create user
      </v-btn>
    </div>
  </section>
</template>

<style scoped>
.panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
}

.panel-header {
  margin-bottom: 18px;
}

.panel-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #122033;
}

.panel-subtitle {
  margin: 6px 0 0;
  color: #5b6b80;
  font-size: 0.95rem;
  line-height: 1.45;
}

.form-grid {
  display: grid;
  gap: 14px;
}

.panel-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}
</style>
