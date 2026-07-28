<script setup lang="ts">
import { ArrowRight, HardHat, ShieldAlert, Sparkles, TrendingUp } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useRoute, useRouter } from 'vue-router';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import { formatDate, formatRupiah } from '../../lib/format';

interface PublicProgram {
  id: string;
  title: string;
  category?: string;
  description: string;
  targetBudget?: number | string;
  currentBudget?: number | string;
  budget?: number | string;
  spent?: number | string;
  status: string;
  startDate?: string;
  endDate?: string;
  startsAt?: string;
  endsAt?: string;
}

const route = useRoute();
const router = useRouter();
const filterStatus = ref(String(route.query.status ?? 'SEMUA'));
const programs = useResource(() => api.get<PublicProgram[]>('/public/programs'));

watch(filterStatus, (status) => {
  router.replace({ query: { ...route.query, status: status !== 'SEMUA' ? status : undefined } });
});

watch(() => route.query.status, (status) => {
  const next = String(status ?? 'SEMUA');
  if (filterStatus.value !== next) filterStatus.value = next;
});

const filteredPrograms = computed(() => {
  const list = programs.data.value ?? [];
  if (filterStatus.value === 'SEMUA') return list;
  if (filterStatus.value === 'COMPLETED') return list.filter((p) => ['COMPLETED', 'RESOLVED', 'CLOSED'].includes(p.status.toUpperCase()));
  if (filterStatus.value === 'IN_PROGRESS') return list.filter((p) => ['IN_PROGRESS', 'PUBLISHED', 'ASSIGNED'].includes(p.status.toUpperCase()));
  return list.filter((p) => p.status === filterStatus.value);
});

function parseNum(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return Number.parseFloat(val) || 0;
  return 0;
}

function getTargetBudget(item: PublicProgram): number {
  return parseNum(item.targetBudget ?? item.budget);
}

function getCurrentBudget(item: PublicProgram): number {
  return parseNum(item.currentBudget ?? item.spent);
}

function getStartDate(item: PublicProgram): string {
  return item.startDate ?? item.startsAt ?? new Date().toISOString();
}

function getEndDate(item: PublicProgram): string {
  return item.endDate ?? item.endsAt ?? new Date().toISOString();
}

function calculatePercentage(item: PublicProgram): number {
  const target = getTargetBudget(item);
  const current = getCurrentBudget(item);
  if (!target || target <= 0) return 100;
  return Math.min(100, Math.round((current / target) * 100));
}

function getDisplayStatus(item: PublicProgram): 'IN_PROGRESS' | 'RESOLVED' {
  const status = item.status.toUpperCase();
  return ['COMPLETED', 'RESOLVED', 'CLOSED'].includes(status) ? 'RESOLVED' : 'IN_PROGRESS';
}
</script>

<template>
  <div class="container public-page-shell">
    <!-- Header Section -->
    <header class="page-header">
      <div class="header-badge">
        <HardHat :size="14" class="badge-icon" />
        <span>Inisiatif Pembangunan & Kesehatan RT/RW</span>
      </div>
      <h1>Program & Proyek Warga</h1>
      <p class="header-desc">
        Rencana pembangunan fasilitas, posyandu balita & lansia, revitalisasi lingkungan, dan proyek fisik yang dikerjakan secara terbuka demi kemajuan bersama.
      </p>
    </header>

    <!-- State Panels -->
    <StatePanel v-if="programs.loading.value" state="loading" />
    <StatePanel v-else-if="programs.error.value" state="error" :message="programs.error.value" @retry="programs.reload" />
    <EmptyState v-else-if="!programs.data.value?.length" title="Belum ada program publikasi" message="Belum ada program lingkungan yang dipublikasikan saat ini." />

    <template v-else>
      <!-- Filter Status Pills -->
      <nav class="filter-pills" aria-label="Filter status program">
        <button
          type="button"
          class="pill-btn"
          :class="{ active: filterStatus === 'SEMUA' }"
          @click="filterStatus = 'SEMUA'"
        >
          Semua Program & Proyek
        </button>
        <button
          type="button"
          class="pill-btn"
          :class="{ active: filterStatus === 'IN_PROGRESS' }"
          @click="filterStatus = 'IN_PROGRESS'"
        >
          Sedang Berjalan
        </button>
        <button
          type="button"
          class="pill-btn"
          :class="{ active: filterStatus === 'COMPLETED' }"
          @click="filterStatus = 'COMPLETED'"
        >
          Selesai Terlaksana
        </button>
      </nav>

      <!-- Program List Grid -->
      <div class="program-list">
        <article v-for="item in filteredPrograms" :key="item.id" class="program-card">
          <div class="program-heading">
            <h2 class="program-title">{{ item.title }}</h2>
            <StatusBadge :status="getDisplayStatus(item)" />
          </div>
          <p class="program-desc">{{ item.description }}</p>
          <div class="program-progress" :class="{ complete: calculatePercentage(item) >= 100 }">
            <strong>{{ calculatePercentage(item) }}%</strong>
            <span>Realisasi dana</span>
            <div class="progress-track"><div class="progress-fill" :style="{ width: `${calculatePercentage(item)}%` }" /></div>
          </div>
          <div class="program-metrics">
            <div><span>Dana terkumpul</span><strong>{{ formatRupiah(getCurrentBudget(item)) }}</strong></div>
            <div><span>Target anggaran</span><strong>{{ formatRupiah(getTargetBudget(item)) }}</strong></div>
            <div><span>Periode</span><strong>{{ formatDate(getStartDate(item)) }} — {{ formatDate(getEndDate(item)) }}</strong></div>
          </div>
        </article>
      </div>
    </template>
  </div>
</template>

<style scoped>
.public-page-shell { padding-block: clamp(2rem, 4vw, 3.5rem); }

.page-header {
  margin-bottom: 1.25rem;
  max-width: 56rem;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.38rem 0.85rem;
  border-radius: 999px;
  background: var(--amber-50);
  border: 1px solid var(--amber-200);
  color: var(--amber-800);
  font-size: 0.8rem;
  font-weight: 800;
  margin-bottom: 1rem;
}

.badge-icon {
  color: var(--amber-600);
}

.page-header h1 {
  font-size: clamp(2rem, 4vw, 2.8rem);
  font-weight: 850;
  line-height: 1.15;
  color: var(--ink-950);
  margin-bottom: 0.6rem;
  letter-spacing: -0.02em;
}

.header-desc {
  font-size: 1rem;
  line-height: 1.55;
  color: var(--ink-650);
  margin: 0;
}
.header-badge { padding: 0; border: 0; border-radius: 0; background: transparent; color: var(--teal-700); letter-spacing: .08em; text-transform: uppercase; }
.header-badge::before { width: 1.6rem; height: 2px; margin-right: .1rem; border-radius: 2px; background: var(--amber-500); content: ''; }
.header-badge svg { display: none; }

/* Filter Pills */
.filter-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 2.2rem;
}

.pill-btn {
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--ink-700);
  font-size: 0.88rem;
  font-weight: 750;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pill-btn:hover {
  border-color: var(--amber-400);
  background: var(--cream-50);
  color: var(--amber-800);
}

.pill-btn.active {
  background: var(--amber-700);
  border-color: var(--amber-700);
  color: white;
  box-shadow: 0 4px 12px rgba(180, 83, 9, 0.25);
}

/* Program List */
.program-list {
  display: grid;
  gap: 1.6rem;
}

.program-card {
  padding: 2rem;
  border-radius: var(--radius-xl);
  border: 1px solid var(--line);
  background: var(--paper);
  box-shadow: var(--shadow-sm);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.program-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: .65rem;
}

.program-heading .program-title {
  flex: 1;
}

.program-progress {
  display: grid;
  gap: .35rem;
  margin-top: .9rem;
}

.program-progress strong {
  color: var(--amber-700);
  font-size: 1.15rem;
}

.program-progress > span {
  color: var(--ink-500);
  font-size: .75rem;
}

.program-progress.complete strong { color: var(--success-700); }
.program-progress .progress-fill { background: linear-gradient(90deg, var(--amber-500), var(--amber-600)); }
.program-progress.complete .progress-fill { background: linear-gradient(90deg, var(--teal-600), var(--success-700)); }

.program-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: .8rem;
  margin-top: 1rem;
  padding-top: .9rem;
  border-top: 1px solid var(--line);
}

.program-metrics div { display: grid; gap: .2rem; min-width: 0; }
.program-metrics span { color: var(--ink-500); font-size: .7rem; }
.program-metrics strong { color: var(--ink-800); font-size: .88rem; overflow-wrap: anywhere; }

.program-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  border-color: var(--amber-300);
}

.card-header-row {
  display: flex;
  gap: 1.2rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.icon-avatar {
  display: grid;
  width: 3.5rem;
  height: 3.5rem;
  flex: none;
  place-items: center;
  border-radius: 1.1rem;
  background: linear-gradient(135deg, var(--amber-100), var(--cream-100));
  color: var(--amber-700);
  border: 1px solid var(--amber-200);
}

.header-content {
  flex: 1;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.4rem;
}

.dates {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.83rem;
  color: var(--ink-500);
  font-weight: 700;
}

.program-title {
  font-size: 1.4rem;
  font-weight: 800;
  line-height: 1.3;
  color: var(--ink-950);
  margin: 0;
}

.program-desc {
  font-size: 0.98rem;
  line-height: 1.65;
  color: var(--ink-650);
  margin: 0 0 1.5rem;
}

/* Budget Box */
.budget-box {
  display: grid;
  gap: 0.75rem;
  padding: 1.25rem 1.4rem;
  border-radius: var(--radius-lg);
  background: var(--cream-50);
  border: 1px solid var(--line);
}

.budget-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.budget-col {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.budget-col.align-right {
  align-items: flex-end;
}

.budget-col .label {
  font-size: 0.76rem;
  font-weight: 750;
  color: var(--ink-500);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.budget-col .amount {
  font-size: 1.15rem;
  font-weight: 850;
  color: var(--ink-900);
}

.budget-col .amount.primary {
  color: var(--teal-700);
}

.progress-track {
  height: 0.65rem;
  border-radius: 999px;
  background: var(--cream-150, #ede5d5);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--teal-600), var(--teal-500));
  transition: width 0.4s ease;
}

.progress-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.83rem;
  color: var(--ink-700);
}

.success-note {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--success-700);
  font-weight: 800;
}

@media (max-width: 850px) {
  .filter-pills { flex-wrap: nowrap; margin-inline: -.625rem; padding-inline: .625rem; overflow-x: auto; scrollbar-width: none; }
  .filter-pills::-webkit-scrollbar { display: none; }
  .filter-pills .pill-btn { flex: 0 0 auto; white-space: nowrap; }
  .program-list { display: flex; gap: 1rem; margin-inline: 0; padding: .2rem .25rem .35rem; overflow-x: auto; scroll-padding-inline: .25rem; scroll-snap-type: x mandatory; scrollbar-width: none; }
  .program-list::-webkit-scrollbar { display: none; }
  .program-card { flex: 0 0 min(88vw, 38rem); scroll-snap-align: start; padding: 1rem; border-radius: 1rem; }
  .program-heading { align-items: flex-start; flex-direction: column; gap: .45rem; }
  .program-heading .program-title { width: 100%; }
  .program-metrics { grid-template-columns: 1fr 1fr; gap: .7rem; }
  .program-metrics div:last-child { grid-column: 1 / -1; }
  .program-metrics strong { font-size: .8rem; }
  .card-header-row { display: grid !important; grid-template-columns: 1fr; gap: 0; margin-bottom: .8rem; }
  .icon-avatar { width: 2.8rem; height: 2.8rem; margin: 0 0 .7rem; border-radius: .8rem; }
  .header-content { width: 100%; min-width: 0; }
  .meta-row { align-items: center; justify-content: flex-start; flex-direction: row; flex-wrap: wrap; gap: .4rem .6rem; margin-bottom: .35rem; }
  .dates { gap: .25rem; font-size: .68rem; }
  :deep(.meta-row .status-badge) { padding: .25rem .4rem; font-size: .68rem; }
  .program-title { font-size: 1.08rem; line-height: 1.25; }
  .program-desc { font-size: .86rem; line-height: 1.5; margin-bottom: 1rem; }
  .budget-box { gap: .65rem; padding: .9rem; border-radius: .85rem; }
  .budget-header { display: grid; grid-template-columns: 1fr 1fr; align-items: start; gap: .6rem; }
  .budget-col.align-right { align-items: flex-start; text-align: left; }
  .budget-col .label { font-size: .62rem; line-height: 1.3; }
  .budget-col .amount { font-size: .98rem; }
  .progress-track { height: .5rem; }
  .progress-footer { align-items: flex-start; flex-direction: column; gap: .35rem; font-size: .74rem; }
}
</style>
