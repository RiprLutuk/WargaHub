<script setup lang="ts">
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Droplets,
  Lightbulb,
  MapPin,
  Search,
  ShieldCheck,
  Wrench,
} from 'lucide-vue-next';
import { computed, ref } from 'vue';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';

interface PublicComplaint {
  id: string;
  ticketNumber: string;
  category: string;
  title: string;
  description: string;
  location?: string | null;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const search = ref('');
const selectedCategory = ref('SEMUA');
const complaints = useResource(() => api.get<PublicComplaint[]>('/public/complaints'));

const categories = computed(() => ['SEMUA', ...new Set(complaints.data.value?.map((c) => c.category) ?? [])]);

const filteredComplaints = computed(() => {
  const list = complaints.data.value ?? [];
  return list.filter((c) => {
    const matchesCat = selectedCategory.value === 'SEMUA' || c.category === selectedCategory.value;
    const term = search.value.trim().toLowerCase();
    const matchesSearch = !term || `${c.title} ${c.description} ${c.ticketNumber}`.toLowerCase().includes(term);
    return matchesCat && matchesSearch;
  });
});

function getCategoryIcon(category: string) {
  const cat = category.toLowerCase();
  if (cat.includes('air') || cat.includes('drainase') || cat.includes('saluran')) return Droplets;
  if (cat.includes('lampu') || cat.includes('listrik') || cat.includes('fasilitas')) return Lightbulb;
  if (cat.includes('jalan') || cat.includes('bangunan') || cat.includes('gedung')) return Building2;
  if (cat.includes('perbaikan') || cat.includes('teknis')) return Wrench;
  return AlertCircle;
}
</script>

<template>
  <div class="container public-page-shell">
    <!-- Page Header -->
    <header class="page-header">
      <div class="header-badge">
        <ShieldCheck :size="14" class="badge-icon" />
        <span>Pelacakan Transparan</span>
      </div>
      <h1>Laporan & Pengaduan Publik</h1>
      <p class="header-desc">
        Pantau progres penanganan masalah lingkungan dan fasilitas umum secara terbuka. Identitas pelapor dirahasiakan untuk kenyamanan bersama.
      </p>
    </header>

    <!-- State Panels -->
    <StatePanel v-if="complaints.loading.value" state="loading" />
    <StatePanel v-else-if="complaints.error.value" state="error" :message="complaints.error.value" @retry="complaints.reload" />
    <EmptyState v-else-if="!complaints.data.value?.length" title="Belum ada laporan publik" message="Belum ada laporan pengaduan publik yang dipublikasikan saat ini." />

    <template v-else>
      <!-- Search & Category Controls -->
      <div class="controls-bar">
        <div class="search-input-box">
          <Search :size="18" class="search-icon" />
          <input v-model="search" type="search" placeholder="Cari laporan atau nomor tiket (#TKT)..." />
        </div>

        <div class="category-pills">
          <button
            v-for="cat in categories"
            :key="cat"
            type="button"
            class="pill-btn"
            :class="{ active: selectedCategory === cat }"
            @click="selectedCategory = cat"
          >
            {{ cat === 'SEMUA' ? 'Semua Laporan' : cat }}
          </button>
        </div>
      </div>

      <!-- Complaint Cards List -->
      <div v-if="!filteredComplaints.length" class="empty-search">
        <p>Tidak ada laporan yang cocok dengan "{{ search }}".</p>
      </div>

      <div v-else class="complaints-stack">
        <article v-for="item in filteredComplaints" :key="item.id" class="clean-card">
          <!-- Icon Badge -->
          <div class="card-icon-col">
            <div class="icon-avatar">
              <component :is="getCategoryIcon(item.category)" :size="20" />
            </div>
          </div>

          <!-- Main Content -->
          <div class="card-content-col">
            <div class="card-top-meta">
              <span class="ticket-no">#{{ item.ticketNumber }}</span>
              <span class="cat-label">{{ item.category }}</span>
              <span class="dot-separator">•</span>
              <span class="anon-label"><ShieldCheck :size="12" /> Anonim</span>
            </div>

            <h2 class="card-title">{{ item.title }}</h2>
            <p class="card-desc">{{ item.description }}</p>

            <div class="card-bottom-meta">
              <span v-if="item.location" class="location-tag">
                <MapPin :size="13" /> {{ item.location }}
              </span>
              <span class="date-tag">
                <Clock :size="13" /> {{ formatDate(item.createdAt) }}
              </span>
            </div>
          </div>

          <!-- Status Badge Right -->
          <div class="card-status-col">
            <StatusBadge :status="item.status" />
          </div>
        </article>
      </div>
    </template>
  </div>
</template>

<style scoped>
.public-page-shell {
  padding-block: clamp(3rem, 6vw, 5.5rem);
}

.page-header {
  margin-bottom: 2.5rem;
  max-width: 48rem;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  background: var(--teal-50);
  border: 1px solid var(--teal-200);
  color: var(--teal-800);
  font-size: 0.78rem;
  font-weight: 800;
  margin-bottom: 0.9rem;
}

.badge-icon {
  color: var(--teal-600);
}

.page-header h1 {
  font-size: clamp(2.1rem, 4.2vw, 3rem);
  font-weight: 850;
  line-height: 1.15;
  color: var(--ink-950);
  margin-bottom: 0.75rem;
  letter-spacing: -0.02em;
}

.header-desc {
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--ink-650);
  margin: 0;
}

/* Controls Bar */
.controls-bar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.search-input-box {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.65rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--line-strong);
  background: var(--paper);
  box-shadow: var(--shadow-sm);
  max-width: 30rem;
}

.search-input-box:focus-within {
  border-color: var(--teal-600);
  box-shadow: 0 0 0 3px var(--teal-100);
}

.search-icon {
  color: var(--ink-400);
}

.search-input-box input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 0.92rem;
  color: var(--ink-900);
}

.category-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pill-btn {
  padding: 0.45rem 0.95rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--ink-700);
  font-size: 0.84rem;
  font-weight: 750;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pill-btn:hover {
  border-color: var(--teal-400);
  background: var(--cream-50);
  color: var(--teal-800);
}

.pill-btn.active {
  background: var(--teal-700);
  border-color: var(--teal-700);
  color: white;
  box-shadow: 0 3px 10px rgba(15, 118, 110, 0.2);
}

/* Clean Complaints Stack Layout */
.complaints-stack {
  display: grid;
  gap: 1rem;
}

.clean-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: flex-start;
  gap: 1.25rem;
  padding: 1.4rem 1.6rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--line);
  background: var(--paper);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.clean-card:hover {
  border-color: var(--teal-300);
  box-shadow: var(--shadow-md);
}

.card-icon-col {
  padding-top: 0.1rem;
}

.icon-avatar {
  display: grid;
  width: 2.8rem;
  height: 2.8rem;
  place-items: center;
  border-radius: 0.85rem;
  background: var(--teal-50);
  color: var(--teal-700);
  border: 1px solid var(--teal-150, #d3e7e3);
}

.card-content-col {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.card-top-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.78rem;
  flex-wrap: wrap;
}

.ticket-no {
  font-weight: 850;
  color: var(--teal-700);
  letter-spacing: 0.03em;
}

.cat-label {
  padding: 0.15rem 0.5rem;
  border-radius: 0.35rem;
  background: var(--cream-100);
  color: var(--ink-800);
  font-weight: 800;
  font-size: 0.7rem;
  text-transform: uppercase;
}

.dot-separator {
  color: var(--ink-300);
}

.anon-label {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--ink-500);
  font-weight: 700;
  font-size: 0.75rem;
}

.card-title {
  font-size: 1.2rem;
  font-weight: 800;
  line-height: 1.35;
  color: var(--ink-950);
  margin: 0.1rem 0;
}

.card-desc {
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--ink-650);
  margin: 0 0 0.4rem;
}

.card-bottom-meta {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  font-size: 0.8rem;
  color: var(--ink-500);
  flex-wrap: wrap;
}

.location-tag,
.date-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--ink-600);
  font-weight: 700;
}

.card-status-col {
  padding-top: 0.1rem;
}

.empty-search {
  padding: 3rem;
  text-align: center;
  color: var(--ink-600);
  border-radius: var(--radius-lg);
  border: 1px dashed var(--line);
}

@media (max-width: 640px) {
  .clean-card {
    grid-template-columns: auto 1fr;
  }
  .card-status-col {
    grid-column: 1 / -1;
    justify-self: flex-start;
  }
}
</style>
