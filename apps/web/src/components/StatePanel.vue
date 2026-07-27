<script setup lang="ts">
import { AlertCircle, RefreshCcw, WifiOff } from 'lucide-vue-next';

defineProps<{ state: 'loading' | 'error' | 'offline'; message?: string }>();
defineEmits<{ retry: [] }>();
</script>

<template>
  <div v-if="state === 'loading'" class="loading-grid" role="status" aria-label="Memuat informasi">
    <span v-for="index in 3" :key="index" class="skeleton loading-card" />
  </div>
  <div v-else class="state-panel" :class="`state-${state}`" role="alert">
    <component :is="state === 'offline' ? WifiOff : AlertCircle" :size="24" aria-hidden="true" />
    <div>
      <h3>{{ state === 'offline' ? 'Anda sedang offline' : 'Informasi belum dapat dimuat' }}</h3>
      <p>{{ message ?? 'Periksa koneksi, lalu coba beberapa saat lagi.' }}</p>
      <button class="button button-secondary button-sm" type="button" @click="$emit('retry')">
        <RefreshCcw :size="16" aria-hidden="true" /> Coba lagi
      </button>
    </div>
  </div>
</template>

<style scoped>
.loading-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 1rem; }
.loading-card { height: 11rem; border: 1px solid var(--line); }
.state-panel { display: flex; align-items: flex-start; gap: 0.85rem; padding: 1.2rem; border: 1px solid var(--coral-100); border-radius: var(--radius-lg); background: #fff3f0; color: var(--coral-700); }
.state-panel h3 { margin-bottom: 0.25rem; }
.state-panel p { margin-bottom: 0.8rem; }
.state-offline { border-color: var(--amber-100); background: #fff8e8; color: var(--amber-700); }
</style>
