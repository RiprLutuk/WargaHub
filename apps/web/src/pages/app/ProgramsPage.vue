<script setup lang="ts">
import { Calendar, CheckCircle2, HardHat, HeartHandshake, MapPin, Target, Wallet } from 'lucide-vue-next';
import { computed } from 'vue';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import { formatDate, formatRupiah } from '../../lib/format';

interface ProgramView {
  id: string;
  title: string;
  description: string;
  budget: number;
  spent: number;
  status: string;
  startsAt: string;
  endsAt: string;
}

const programs = useResource(() => api.get<ProgramView[]>('/programs'));
</script>

<template>
  <div class="portal-page">
    <header class="portal-page-heading">
      <div>
        <span class="eyebrow">Pembangunan & Inisiatif Lingkungan</span>
        <h1>Program lingkungan</h1>
        <p>Pantau kemajuan renovasi fasilitas, pembangunan pos ronda, perbaikan saluran air, dan inisiatif sosial warga.</p>
      </div>
    </header>

    <div class="notice">
      <HardHat :size="20" />
      <span>Setiap anggaran dan pengeluaran proyek dilaporkan secara terbuka untuk menjamin transparansi publik.</span>
    </div>

    <StatePanel v-if="programs.loading.value" state="loading" />
    <StatePanel v-else-if="programs.error.value" state="error" :message="programs.error.value" @retry="programs.reload" />
    <EmptyState v-else-if="!programs.data.value?.length" title="Belum ada program aktif" message="Pengurus belum memublikasikan program pembangunan atau renovasi baru." />

    <div v-else class="program-grid">
      <article v-for="item in programs.data.value" :key="item.id" class="card program-card">
        <div class="card-header">
          <span class="program-icon"><HardHat :size="22" /></span>
          <div>
            <h2>{{ item.title }}</h2>
            <p><Calendar :size="13" /> {{ formatDate(item.startsAt) }} — {{ formatDate(item.endsAt) }}</p>
          </div>
          <StatusBadge :status="item.status === 'PUBLISHED' ? 'IN_PROGRESS' : item.status" />
        </div>

        <p class="program-desc">{{ item.description }}</p>

        <div class="budget-tracker">
          <div class="budget-info">
            <span>Terkumpul: <strong>{{ formatRupiah(item.spent ?? 0) }}</strong></span>
            <span>Target: <strong>{{ formatRupiah(item.budget ?? 0) }}</strong></span>
          </div>
          <div class="progress-bar">
            <i :style="{ width: `${item.budget ? Math.min(100, ((item.spent / item.budget) * 100)) : 0}%` }" />
          </div>
        </div>

        <div class="card-footer">
          <button class="button button-secondary button-sm" type="button">Lihat Laporan Progres</button>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.portal-page { display: grid; max-width: var(--content); gap: 1.2rem; margin-inline: auto; }
.portal-page-heading h1 { margin-bottom: .45rem; font-size: clamp(2rem, 4.5vw, 3rem); }
.portal-page-heading p { max-width: 46rem; margin: 0; color: var(--ink-650); }
.program-grid { display: grid; gap: 1rem; }
.program-card { display: grid; gap: 1rem; padding: 1.3rem; }
.card-header { display: flex; align-items: flex-start; gap: 1rem; }
.program-icon { display: grid; width: 2.9rem; height: 2.9rem; flex: none; place-items: center; border-radius: .85rem; background: var(--amber-100); color: var(--amber-700); }
.card-header h2 { margin: 0; font-size: 1.25rem; }
.card-header p { display: flex; align-items: center; gap: .3rem; margin: .2rem 0 0; color: var(--ink-500); font-size: .78rem; }
.program-desc { margin: 0; color: var(--ink-650); font-size: .88rem; line-height: 1.45; }
.budget-tracker { display: grid; gap: .4rem; padding: .9rem; border-radius: var(--radius-md); background: var(--cream-50); }
.budget-info { display: flex; justify-content: space-between; font-size: .8rem; color: var(--ink-700); }
.progress-bar { height: .5rem; overflow: hidden; border-radius: 999px; background: var(--cream-100); }
.progress-bar i { display: block; height: 100%; border-radius: inherit; background: var(--teal-600); transition: width .3s; }
.card-footer { display: flex; justify-content: flex-end; }
</style>
