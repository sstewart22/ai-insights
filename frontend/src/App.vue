<template>
  <div class="app-shell">
    <div class="app-shell-inner">
      <div class="app-header app-header--nav">
        <div class="app-header-row">
          <!-- LEFT: logo + title -->
          <div class="app-brand">
            <img class="app-logo" :src="logoUrl" alt="Auto Ignite" />
            <div>
              <h1 class="app-title">Insights</h1>
              <div class="app-subtitle">
                Prototype for transcription, insights extraction, and batch
                processing.
              </div>
            </div>
          </div>

          <div class="tabbar">
            <button
              class="tab"
              :class="{ 'tab--active': tab === 'manual' }"
              @click="tab = 'manual'"
            >
              Manual Lab
            </button>

            <button
              class="tab"
              :class="{ 'tab--active': tab === 'db' }"
              @click="tab = 'db'"
            >
              DB Queue
            </button>

            <button
              class="tab"
              :class="{ 'tab--active': tab === 'batch' }"
              @click="tab = 'batch'"
            >
              Batch Dashboard
            </button>
          </div>
        </div>
      </div>

      <div class="app-content">
        <ManualLab v-if="tab === 'manual'" />
        <DbQueue v-else-if="tab === 'db'" />
        <BatchDashboard v-else />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import ManualLab from "./components/ManualLab.vue";
import DbQueue from "./components/DbQueue.vue";
import BatchDashboard from "./components/BatchDashboard.vue";

import logoUrl from "./assets/ai-icon.png";

const tab = ref<"manual" | "db" | "batch">("manual");
</script>
