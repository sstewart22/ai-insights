<template>
  <div class="settings-page">
    <div class="settings-grid">
      <section class="settings-card">
        <h2>Security</h2>
        <TwoFactorSetup />
        <ResetPassword />
      </section>

      <section v-if="canSeeDevTools || canSeeAdminTools" class="settings-card">
        <h2>Administration</h2>
        <CreateUserAdmin />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import TwoFactorSetup from "./TwoFactorSetup.vue";
import ResetPassword from "./ResetPassword.vue";
import CreateUserAdmin from "./CreateUserAdmin.vue";
import UploadDocumentAdmin from "./UploadDocumentAdmin.vue";
import { useAccess } from "../composables/useAccess";

const { canSeeDevTools, canSeeAdminTools } = useAccess();
</script>

<style scoped>
.settings-page {
  display: block;
}

.settings-grid {
  display: grid;
  gap: 20px;
}

.settings-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
}
</style>
