<script setup lang="ts">
// Bar visual used throughout the Parity campaign-analysis section.
// When compare data is provided, renders two stacked bars
// (current on top, comparison ghost below) so trends are visible at a glance.
// Otherwise renders a single bar identical to the legacy `.parity-bar-track`.

import { computed } from "vue";

const props = defineProps<{
  current: number | null | undefined;
  total: number | null | undefined;
  color: string;
  compareCurrent?: number | null;
  compareTotal?: number | null;
  // "mini" — used inside the views-row grid where vertical space is tighter
  variant?: "default" | "mini";
}>();

function pct(n: number | null | undefined, total: number | null | undefined): number {
  if (typeof n !== "number" || typeof total !== "number" || !total) return 0;
  return Math.round((n / total) * 100);
}

// Reactive — must be a computed so the bar re-renders when compare data
// loads in / is toggled off.
const hasCompare = computed(
  () => props.compareCurrent != null && props.compareTotal != null,
);

const currentPct = computed(() => pct(props.current, props.total));
const comparePct = computed(() => pct(props.compareCurrent, props.compareTotal));
</script>

<template>
  <span
    v-if="hasCompare"
    class="pb-stack"
    :class="{ 'pb-stack--mini': variant === 'mini' }"
  >
    <span class="pb-track">
      <span
        class="pb-fill pb-fill--current"
        :style="{ width: currentPct + '%', backgroundColor: color }"
      />
    </span>
    <span class="pb-track pb-track--ghost">
      <span
        class="pb-fill pb-fill--ghost"
        :style="{ width: comparePct + '%', background: color }"
      />
    </span>
  </span>
  <span
    v-else
    class="pb-single"
    :class="{ 'pb-single--mini': variant === 'mini' }"
  >
    <span
      class="pb-fill"
      :style="{ width: currentPct + '%', background: color }"
    />
  </span>
</template>

<style scoped>
/* Base wrapper — fills the flex/grid slot. */
.pb-single,
.pb-stack {
  flex: 1;
  min-width: 80px;
  max-width: 360px;
  margin: 0 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-self: center;
}

.pb-single--mini,
.pb-stack--mini {
  margin: 0;
  min-width: 0;
  max-width: none;
  width: 100%;
}

/* Single-bar (no compare) — keeps the legacy 8px chunky bar. */
.pb-single {
  height: 8px;
  background: var(--border);
  border-radius: 4px;
  overflow: hidden;
  display: block;
}

.pb-single--mini {
  height: 6px;
}

/* Compare mode — two distinct bars with breathing room. The taller height
   and explicit border on the ghost track make both bands obviously visible. */
.pb-stack {
  background: transparent;
}

.pb-track {
  height: 9px;
  background: var(--border);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.pb-track--ghost {
  height: 9px;
  background: color-mix(in srgb, var(--border) 70%, transparent);
  border: 1px dashed color-mix(in srgb, var(--ink) 18%, transparent);
  border-radius: 4px;
}

.pb-stack--mini .pb-track,
.pb-stack--mini .pb-track--ghost {
  height: 6px;
  border-radius: 3px;
}

.pb-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width 0.25s ease;
}

.pb-fill--ghost {
  /* Diagonal stripe overlay makes the comparison band visibly distinct from
     the solid current bar even at small sizes. */
  background-image: repeating-linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.35) 0,
    rgba(255, 255, 255, 0.35) 3px,
    transparent 3px,
    transparent 6px
  );
  background-blend-mode: overlay;
  opacity: 0.85;
}
</style>
