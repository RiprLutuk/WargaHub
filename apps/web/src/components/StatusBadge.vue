<script setup lang="ts">
import { AlertCircle, Check, Clock3, CircleDot, X } from 'lucide-vue-next';
import { computed } from 'vue';

const props = withDefaults(defineProps<{ status: string; label?: string }>(), { label: '' });

const statuses: Record<string, { label: string; tone: string; icon: typeof Clock3 }> = {
  OPEN: { label: 'Belum dibayar', tone: 'warning', icon: AlertCircle },
  PARTIALLY_PAID: { label: 'Dibayar sebagian', tone: 'info', icon: CircleDot },
  PENDING_VERIFICATION: { label: 'Menunggu pemeriksaan', tone: 'warning', icon: Clock3 },
  PAID: { label: 'Lunas', tone: 'success', icon: Check },
  VERIFIED: { label: 'Terverifikasi', tone: 'success', icon: Check },
  ASSIGNED: { label: 'Sudah ditugaskan', tone: 'info', icon: CircleDot },
  IN_PROGRESS: { label: 'Sedang ditangani', tone: 'info', icon: Clock3 },
  RESOLVED: { label: 'Selesai', tone: 'success', icon: Check },
  CLOSED: { label: 'Ditutup', tone: 'neutral', icon: Check },
  REJECTED: { label: 'Ditolak', tone: 'danger', icon: X },
  TERJADWAL: { label: 'Terjadwal', tone: 'info', icon: Clock3 },
  SCHEDULED: { label: 'Terjadwal', tone: 'info', icon: Clock3 },
  SWAP_PENDING: { label: 'Menunggu pertukaran', tone: 'warning', icon: Clock3 },
  REQUESTED: { label: 'Permintaan dikirim', tone: 'warning', icon: Clock3 },
  PUBLISHED: { label: 'Terbit', tone: 'success', icon: Check },
  DRAFT: { label: 'Draf', tone: 'neutral', icon: CircleDot },
};

const definition = computed(() => statuses[props.status] ?? {
  label: props.label || props.status.replaceAll('_', ' ').toLocaleLowerCase('id-ID'),
  tone: 'neutral',
  icon: CircleDot,
});
</script>

<template>
  <span class="status-badge" :class="`tone-${definition.tone}`" role="status" :aria-label="`Status: ${definition.label}`">
    <component :is="definition.icon" :size="13" stroke-width="2.5" aria-hidden="true" />
    {{ label || definition.label }}
  </span>
</template>

<style scoped>
.status-badge { display: inline-flex; width: fit-content; align-items: center; gap: 0.3rem; padding: 0.3rem 0.5rem; border-radius: 999px; background: #edf0ee; color: var(--ink-650); font-size: 0.72rem; font-weight: 800; line-height: 1.15; white-space: nowrap; }
.tone-success { background: var(--success-100); color: var(--success-700); }
.tone-warning { background: var(--amber-100); color: var(--amber-700); }
.tone-info { background: var(--blue-100); color: var(--blue-700); }
.tone-danger { background: var(--coral-100); color: var(--coral-700); }
</style>
