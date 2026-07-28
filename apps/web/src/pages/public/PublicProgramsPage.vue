<script setup lang="ts">
import { Calendar, HardHat } from 'lucide-vue-next';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import { formatDate, formatRupiah } from '../../lib/format';

interface PublicProgram {
  id: string;
  title: string;
  description: string;
  targetBudget: number;
  currentBudget: number;
  status: string;
  startDate: string;
  endDate: string;
}

const programs = useResource(() => api.get<PublicProgram[]>('/public/programs'));
</script>

<template>
  <div class="container public-page-container">
    <header class="page-heading">
      <span class="eyebrow">Pembangunan Lingkungan</span>
      <h1>Program & proyek warga</h1>
      <p>Inisiatif fisik dan sosial yang sedang berjalan di lingkungan RT/RW secara terbuka dan terukur.</p>
    </header>

    <StatePanel v-if="programs.loading.value" state="loading" />
    <StatePanel v-else-if="programs.error.value" state="error" :message="programs.error.value" @retry="programs.reload" />
    <EmptyState v-else-if="!programs.data.value?.length" title="Belum ada program publikasi" message="Belum ada program lingkungan yang dipublikasikan saat ini." />

    <div v-else class="program-grid">
      <article v-for="item in programs.data.value" :key="item.id" class="card program-card">
        <div class="card-top">
          <span class="icon-box"><HardHat :size="24" /></span>
          <div class="header-info">
            <h2>{{ item.title }}</h2>
            <p><Calendar :size="14" /> {{ formatDate(item.startDate) }} — {{ formatDate(item.endDate) }}</p>
          </div>
          <StatusBadge :status="item.status === 'PUBLISHED' ? 'IN_PROGRESS' : item.status" />
        </div>

        <p class="program-desc">{{ item.description }}</p>

        <div v-if="item.targetBudget > 0" class="budget-tracker">
          <div class="budget-info">
            <span>Terkumpul: <strong>{{ formatRupiah(item.currentBudget ?? 0) }}</strong></span>
            <span>Target: <strong>{{ formatRupiah(item.targetBudget) }}</strong></span>
          </div>
          <div class="progress-bar">
            <i :style="{ width: `${Math.min(100, ((item.currentBudget / item.targetBudget) * 100))}%` }" />
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.public-page-container { padding-block: clamp(3rem, 6vw, 5.5rem); }
.page-heading { margin-bottom: 3rem; }
.page-heading .eyebrow { margin-bottom: .6rem; }
.page-heading h1 { margin-bottom: .75rem; font-size: clamp(2.2rem, 5vw, 3.4rem); line-height: 1.16; }
.page-heading p { max-width: 48rem; margin: 0; color: var(--ink-650); font-size: 1.1rem; line-height: 1.6; }
.program-grid { display: grid; gap: 1.4rem; }
.program-card { display: grid; gap: 1.2rem; padding: 1.8rem; border-radius: var(--radius-lg); }
.card-top { display: flex; align-items: flex-start; gap: 1.2rem; }
.icon-box { display: grid; width: 3.4rem; height: 3.4rem; flex: none; place-items: center; border-radius: 1rem; background: var(--amber-100); color: var(--amber-700); }
.header-info { flex: 1; display: grid; gap: .25rem; }
.card-top h2 { margin: 0; font-size: 1.35rem; line-height: 1.3; }
.card-top p { display: flex; align-items: center; gap: .4rem; margin: 0; color: var(--ink-500); font-size: .84rem; }
.program-desc { margin: 0; color: var(--ink-650); font-size: .95rem; line-height: 1.6; }
.budget-tracker { display: grid; gap: .6rem; padding: 1.1rem; border-radius: var(--radius-md); background: var(--cream-50); border: 1px solid var(--line); }
.budget-info { display: flex; justify-content: space-between; font-size: .84rem; color: var(--ink-700); }
.progress-bar { height: .55rem; overflow: hidden; border-radius: 999px; background: var(--cream-100); }
.progress-bar i { display: block; height: 100%; border-radius: inherit; background: var(--teal-600); transition: width .3s; }
</style>
