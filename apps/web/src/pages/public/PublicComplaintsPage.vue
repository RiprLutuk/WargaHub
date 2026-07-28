<script setup lang="ts">
import { ArrowRight, ClipboardList, MapPin, Search, ShieldCheck, Sparkles } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
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
</script>

<template>
  <div class="container public-page-shell">
    <!-- Header Section -->
    <header class="page-header">
      <div class="header-badge">
        <ShieldCheck :size="14" class="badge-icon" />
        <span>Transparansi & Pelacakan Publik</span>
      </div>
      <h1>Status Laporan & Pengaduan</h1>
      <p class="header-desc">
        Pelacakan penanganan pengaduan fasilitas umum dan masalah lingkungan secara transparan. Identitas pribadi pelapor selalu dilindungi.
      </p>
    </header>

    <!-- State Panels -->
    <StatePanel v-if="complaints.loading.value" state="loading" />
    <StatePanel v-else-if="complaints.error.value" state="error" :message="complaints.error.value" @retry="complaints.reload" />
    <EmptyState v-else-if="!complaints.data.value?.length" title="Belum ada laporan publik" message="Belum ada laporan pengaduan publik yang dipublikasikan saat ini." />

    <template v-else>
      <!-- Controls & Filter Bar -->
      <div class="controls-row">
        <div class="search-field">
          <Search :size="18" class="search-icon" />
          <input v-model="search" type="search" placeholder="Cari nomor tiket, judul laporan, atau fasilitas..." />
        </div>

        <nav class="category-pills" aria-label="Filter kategori laporan">
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
        </nav>
      </div>

      <!-- Complaint Cards Grid -->
      <div v-if="!filteredComplaints.length" class="empty-search">
        <p>Tidak ada laporan yang sesuai dengan pencarian "{{ search }}".</p>
      </div>

      <div v-else class="complaint-list">
        <article v-for="item in filteredComplaints" :key="item.id" class="complaint-card">
          <div class="card-left">
            <div class="tags-row">
              <span class="ticket-tag">#{{ item.ticketNumber }}</span>
              <span class="category-chip">{{ item.category }}</span>
              <span class="sanitized-chip"><ShieldCheck :size="12" /> Pelapor Diberahsiakan</span>
            </div>

            <h2 class="complaint-title">{{ item.title }}</h2>
            <p class="complaint-desc">{{ item.description }}</p>

            <div class="card-meta">
              <span v-if="item.location" class="meta-item"><MapPin :size="14" /> {{ item.location }}</span>
              <span class="meta-item">Dilaporkan: {{ formatDate(item.createdAt) }}</span>
            </div>
          </div>

          <div class="card-right">
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
  margin-bottom: 2.8rem;
  max-width: 50rem;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.38rem 0.85rem;
  border-radius: 999px;
  background: var(--teal-50);
  border: 1px solid var(--teal-200);
  color: var(--teal-800);
  font-size: 0.8rem;
  font-weight: 800;
  margin-bottom: 1rem;
}

.badge-icon {
  color: var(--teal-600);
}

.page-header h1 {
  font-size: clamp(2.2rem, 4.5vw, 3.2rem);
  font-weight: 850;
  line-height: 1.15;
  color: var(--ink-950);
  margin-bottom: 0.85rem;
  letter-spacing: -0.02em;
}

.header-desc {
  font-size: 1.1rem;
  line-height: 1.65;
  color: var(--ink-650);
  margin: 0;
}

/* Controls & Filter Bar */
.controls-row {
  display: grid;
  gap: 1.2rem;
  margin-bottom: 2.2rem;
}

.search-field {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.75rem 1.1rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--line-strong);
  background: var(--paper);
  box-shadow: var(--shadow-sm);
  max-width: 32rem;
}

.search-field:focus-within {
  border-color: var(--teal-600);
  box-shadow: 0 0 0 3px var(--teal-100);
}

.search-icon {
  color: var(--ink-400);
}

.search-field input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 0.95rem;
  color: var(--ink-900);
}

.category-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
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
  border-color: var(--teal-400);
  background: var(--cream-50);
  color: var(--teal-800);
}

.pill-btn.active {
  background: var(--teal-700);
  border-color: var(--teal-700);
  color: white;
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.2);
}

/* Complaint List */
.complaint-list {
  display: grid;
  gap: 1.4rem;
}

.complaint-card {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.8rem 2rem;
  border-radius: var(--radius-xl);
  border: 1px solid var(--line);
  background: var(--paper);
  box-shadow: var(--shadow-sm);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.complaint-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
  border-color: var(--teal-300);
}

.card-left {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: min(100%, 20rem);
  gap: 0.55rem;
}

.tags-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.ticket-tag {
  color: var(--teal-700);
  font-size: 0.78rem;
  font-weight: 850;
  letter-spacing: 0.04em;
}

.category-chip {
  padding: 0.2rem 0.6rem;
  border-radius: 0.45rem;
  background: var(--cream-100);
  color: var(--ink-800);
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.sanitized-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: var(--teal-50);
  color: var(--teal-800);
  font-size: 0.72rem;
  font-weight: 800;
}

.complaint-title {
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.3;
  color: var(--ink-950);
  margin: 0.2rem 0 0.1rem;
}

.complaint-desc {
  font-size: 0.96rem;
  line-height: 1.6;
  color: var(--ink-650);
  margin: 0 0 0.4rem;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1.2rem;
  margin-top: 0.4rem;
  font-size: 0.84rem;
  color: var(--ink-500);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--ink-700);
  font-weight: 750;
}

.card-right {
  display: flex;
  align-items: flex-start;
  padding-top: 0.2rem;
}

.empty-search {
  padding: 3rem;
  text-align: center;
  color: var(--ink-600);
  border-radius: var(--radius-lg);
  border: 1px dashed var(--line);
}
</style>
