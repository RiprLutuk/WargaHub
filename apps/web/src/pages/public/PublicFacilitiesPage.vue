<script setup lang="ts">
import { ArrowRight, Building2, CheckCircle2, Clock, Dumbbell, Home, Info, Package, Sparkles } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import { formatRupiah } from '../../lib/format';

interface PublicFacility {
  id: string;
  name: string;
  category: string;
  description: string;
  capacity?: number | null;
  fee: number;
  deposit: number;
  requiresApproval?: boolean;
}

const selectedCategory = ref('SEMUA');
const facilities = useResource(() => api.get<PublicFacility[]>('/public/facilities'));

const categories = computed(() => ['SEMUA', ...new Set(facilities.data.value?.map((f) => f.category) ?? [])]);

const filteredFacilities = computed(() => {
  const list = facilities.data.value ?? [];
  if (selectedCategory.value === 'SEMUA') return list;
  return list.filter((f) => f.category === selectedCategory.value);
});

function getFacilityIcon(category: string) {
  const cat = category.toLowerCase();
  if (cat.includes('gedung') || cat.includes('ruang')) return Building2;
  if (cat.includes('olahraga')) return Dumbbell;
  if (cat.includes('inventaris') || cat.includes('tenda')) return Package;
  return Home;
}
</script>

<template>
  <div class="container public-page-shell">
    <!-- Header Section -->
    <header class="page-header">
      <div class="header-badge">
        <Sparkles :size="14" class="badge-icon" />
        <span>Fasilitas & Inventaris RT/RW</span>
      </div>
      <h1>Aset & Fasilitas Bersama</h1>
      <p class="header-desc">
        Pemanfaatan balai warga, lapangan olahraga, serta peralatan hajatan dan pertemuan yang dikelola secara transparan dan tertib untuk seluruh warga.
      </p>
    </header>

    <!-- State Panels -->
    <StatePanel v-if="facilities.loading.value" state="loading" />
    <StatePanel v-else-if="facilities.error.value" state="error" :message="facilities.error.value" @retry="facilities.reload" />
    <EmptyState v-else-if="!facilities.data.value?.length" title="Belum ada fasilitas dipublikasikan" message="Pengurus belum menambahkan daftar fasilitas publik." />

    <template v-else>
      <!-- Category Filter Pills -->
      <nav class="category-pills" aria-label="Filter kategori fasilitas">
        <button
          v-for="cat in categories"
          :key="cat"
          type="button"
          class="pill-btn"
          :class="{ active: selectedCategory === cat }"
          @click="selectedCategory = cat"
        >
          {{ cat === 'SEMUA' ? 'Semua Fasilitas' : cat }}
        </button>
      </nav>

      <!-- Facility Cards Grid -->
      <div class="facilities-grid">
        <article v-for="item in filteredFacilities" :key="item.id" class="facility-card">
          <div class="card-header">
            <div class="icon-avatar">
              <component :is="getFacilityIcon(item.category)" :size="22" />
            </div>
            <div class="header-tags">
              <span class="category-chip">{{ item.category }}</span>
              <span class="status-chip free" v-if="item.fee === 0">
                <CheckCircle2 :size="13" /> Gratis Warga
              </span>
              <span class="status-chip rental" v-else>
                Sewa Bersama
              </span>
            </div>
          </div>

          <div class="card-body">
            <h2 class="facility-title">{{ item.name }}</h2>
            <p class="facility-desc">{{ item.description }}</p>
          </div>

          <div class="card-specs">
            <div class="spec-item">
              <span class="spec-label">Biaya Penggunaan</span>
              <span class="spec-value highlight">{{ item.fee > 0 ? formatRupiah(item.fee) : 'Gratis' }}</span>
            </div>
            <div class="spec-item" v-if="item.deposit > 0">
              <span class="spec-label">Deposit Jaminan</span>
              <span class="spec-value">{{ formatRupiah(item.deposit) }}</span>
            </div>
            <div class="spec-item" v-if="item.capacity">
              <span class="spec-label">Kapasitas Maksimal</span>
              <span class="spec-value">{{ item.capacity }} Orang</span>
            </div>
          </div>

          <div class="card-footer">
            <div class="approval-note">
              <Clock :size="14" />
              <span>Perlu reservasi via portal</span>
            </div>
            <RouterLink to="/login" class="book-link">
              Pinjam <ArrowRight :size="15" />
            </RouterLink>
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

/* Category Filter Pills */
.category-pills {
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

/* Grid Layout */
.facilities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
  gap: 1.6rem;
}

.facility-card {
  display: flex;
  flex-direction: column;
  padding: 1.8rem;
  border-radius: var(--radius-xl);
  border: 1px solid var(--line);
  background: var(--paper);
  box-shadow: var(--shadow-sm);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.facility-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: var(--teal-300);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.icon-avatar {
  display: grid;
  width: 3.4rem;
  height: 3.4rem;
  place-items: center;
  border-radius: 1.1rem;
  background: linear-gradient(135deg, var(--teal-100), var(--teal-50));
  color: var(--teal-700);
  border: 1px solid var(--teal-200);
}

.header-tags {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
}

.category-chip {
  padding: 0.22rem 0.6rem;
  border-radius: 0.45rem;
  background: var(--cream-100);
  color: var(--ink-750);
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.22rem 0.6rem;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 800;
}

.status-chip.free {
  background: var(--success-100);
  color: var(--success-800);
}

.status-chip.rental {
  background: var(--amber-100);
  color: var(--amber-800);
}

.card-body {
  margin-bottom: 1.4rem;
}

.facility-title {
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.3;
  color: var(--ink-950);
  margin: 0 0 0.5rem;
}

.facility-desc {
  font-size: 0.94rem;
  line-height: 1.6;
  color: var(--ink-650);
  margin: 0;
}

.card-specs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.8rem;
  padding: 1rem 1.1rem;
  border-radius: var(--radius-md);
  background: var(--cream-50);
  border: 1px solid var(--line);
  margin-top: auto;
  margin-bottom: 1.25rem;
}

.spec-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.spec-label {
  font-size: 0.72rem;
  font-weight: 750;
  color: var(--ink-500);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.spec-value {
  font-size: 0.95rem;
  font-weight: 850;
  color: var(--ink-900);
}

.spec-value.highlight {
  color: var(--teal-700);
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.9rem;
  border-top: 1px solid var(--line);
}

.approval-note {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: var(--ink-500);
  font-weight: 700;
}

.book-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.86rem;
  font-weight: 800;
  color: var(--teal-700);
  text-decoration: none;
  transition: transform 0.2s ease;
}

.book-link:hover {
  transform: translateX(3px);
  color: var(--teal-800);
}
</style>
