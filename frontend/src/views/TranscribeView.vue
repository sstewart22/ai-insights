<template>
  <div style="padding: 16px; max-width: 900px">
    <h2>Transcribe Call Recording</h2>

    <input type="file" accept="audio/*" @change="onPick" />
    <button :disabled="!file || loading" @click="upload">Transcribe</button>

    <p v-if="loading">Transcribing...</p>

    <pre v-if="resultText" style="white-space: pre-wrap; margin-top: 16px">
  {{ resultText }}
      </pre
    >
  </div>
</template>

<script setup lang="ts">
import axios from "axios";
import { ref } from "vue";

const file = ref<File | null>(null);
const loading = ref(false);
const resultText = ref("");

function onPick(e: Event) {
  const input = e.target as HTMLInputElement;
  file.value = input.files?.[0] ?? null;
  resultText.value = "";
}

async function upload() {
  if (!file.value) return;
  loading.value = true;
  try {
    const form = new FormData();
    form.append("file", file.value);

    const res = await axios.post("/uiapi/transcription/call", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    // transcript.text is typical
    resultText.value = res.data.text ?? JSON.stringify(res.data, null, 2);
  } finally {
    loading.value = false;
  }
}
</script>
