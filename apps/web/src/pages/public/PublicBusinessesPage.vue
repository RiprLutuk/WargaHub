<script setup lang="ts">
import { ArrowUpRight, CheckCircle2, MessageCircle, Phone, Search, ShoppingBag, Store } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import EmptyState from '../../components/EmptyState.vue';
import PublicPageShell from '../../components/PublicPageShell.vue';
import StatePanel from '../../components/StatePanel.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';

interface PublicBusiness {
  id: string;
  name: string;
  category: string;
  description: string;
  phone: string;
  operatingHours?: string | null;
  verified?: boolean;
}

const search = ref('');
const route = useRoute();
const router = useRouter();
const selectedCategory = ref(String(route.query.kategori ?? 'SEMUA'));
search.value = String(route.query.cari ?? '');
const businesses = useResource(() => api.get<PublicBusiness[]>('/public/businesses'));

const categories = computed(() => ['SEMUA', ...new Set(businesses.data.value?.map((b) => b.category) ?? [])]);

const filteredBusinesses = computed(() => {
  const list = businesses.data.value ?? [];
  return list.filter((b) => {
    const matchesCat = selectedCategory.value === 'SEMUA' || b.category === selectedCategory.value;
    const term = search.value.trim().toLowerCase();
    const matchesSearch = !term || `${b.name} ${b.description} ${b.category}`.toLowerCase().includes(term);
    return matchesCat && matchesSearch;
  });
});

function formatWaLink(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  const normalized = clean.startsWith('0') ? `62${clean.slice(1)}` : clean;
  return `https://wa.me/${normalized}?text=${encodeURIComponent('Halo, saya warga RT/RW ingin bertanya mengenai usaha/jasa Anda.')}`;
}

watch([search, selectedCategory], ([nextSearch, nextCategory]) => {
  const query = {
    ...route.query,
    cari: nextSearch.trim() || undefined,
    kategori: nextCategory !== 'SEMUA' ? nextCategory : undefined,
  };
  router.replace({ query });
});

watch(() => route.query, (query) => {
  const nextCategory = String(query.kategori ?? 'SEMUA');
  const nextSearch = String(query.cari ?? '');
  if (selectedCategory.value !== nextCategory) selectedCategory.value = nextCategory;
  if (search.value !== nextSearch) search.value = nextSearch;
}, { deep: true });
</script>

<template>
  <PublicPageShell>
    <!-- Header Section -->
    <header class="page-header">
      <div class="header-badge">
        <Store :size="14" class="badge-icon" />
        <span>Ekonomi & Usaha Lokal Warga</span>
      </div>
      <h1>Direktori UMKM & Jasa Warga</h1>
      <p class="header-desc">
        Dukung perekonomian tetangga di sekitar lingkungan RT/RW. Beli kebutuhan harian dan gunakan jasa warga lokal secara langsung.
      </p>
    </header>

    <!-- State Panels -->
    <StatePanel v-if="businesses.loading.value" state="loading" />
    <StatePanel v-else-if="businesses.error.value" state="error" :message="businesses.error.value" @retry="businesses.reload" />
    <EmptyState v-else-if="!businesses.data.value?.length" title="Belum ada UMKM terdaftar" message="Belum ada direktori usaha warga yang terdaftar saat ini." />

    <template v-else>
      <!-- Search & Category Filters -->
      <div class="controls-row">
        <div class="search-field">
          <Search :size="18" class="search-icon" />
          <input v-model="search" type="search" placeholder="Cari nama usaha, layanan, atau katering..." />
        </div>

        <nav class="category-pills" aria-label="Filter kategori UMKM">
          <button
            v-for="cat in categories"
            :key="cat"
            type="button"
            class="pill-btn"
            :class="{ active: selectedCategory === cat }"
            @click="selectedCategory = cat"
          >
            {{ cat === 'SEMUA' ? 'Semua Usaha' : cat }}
          </button>
        </nav>
      </div>

      <!-- Business Cards Grid -->
      <div v-if="!filteredBusinesses.length" class="empty-search">
        <p>Tidak ada usaha yang sesuai dengan pencarian "{{ search }}".</p>
      </div>

      <div v-else class="biz-grid">
        <article v-for="b in filteredBusinesses" :key="b.id" class="biz-card">
          <div class="card-header">
            <div class="icon-avatar">
              <ShoppingBag :size="22" />
            </div>
            <div class="header-tags">
              <span class="category-chip">{{ b.category }}</span>
              <span class="verified-badge" v-if="b.verified !== false">
                <CheckCircle2 :size="13" /> Warga Terverifikasi
              </span>
            </div>
          </div>

          <div class="card-body">
            <h2 class="biz-title">{{ b.name }}</h2>
            <p class="biz-desc">{{ b.description }}</p>
            <p v-if="b.operatingHours" class="operating-hours">Jam operasional: {{ b.operatingHours }}</p>
          </div>

          <div class="card-footer">
            <span class="phone-num"><Phone :size="14" /> {{ b.phone }}</span>
            <a :href="formatWaLink(b.phone)" target="_blank" rel="noopener noreferrer" class="wa-btn">
              <MessageCircle :size="15" /> Chat WA <ArrowUpRight :size="14" />
            </a>
          </div>
        </article>
      </div>
    </template>
  </PublicPageShell>
</template>

<style scoped>

.page-header {
  margin-bottom: 2rem;
  max-width: 56rem;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  background: var(--teal-50);
  border: 1px solid var(--teal-200);
  color: var(--teal-800);
  font-size: 0.74rem;
  font-weight: 800;
  margin-bottom: 1rem;
}

.badge-icon {
  color: var(--teal-600);
}

.page-header h1 {
  font-size: clamp(2rem, 4vw, 2.8rem);
  font-weight: 650;
  line-height: 1.12;
  color: var(--ink-950);
  margin-bottom: 0.6rem;
  letter-spacing: -0.02em;
}

.header-desc {
  max-width: 52rem;
  font-size: 1rem;
  line-height: 1.55;
  color: var(--ink-650);
  margin: 0;
}
.header-badge { padding: 0; border: 0; border-radius: 0; background: transparent; color: var(--teal-700); letter-spacing: .08em; text-transform: uppercase; }
.header-badge::before { width: 1.6rem; height: 2px; margin-right: .1rem; border-radius: 2px; background: var(--amber-500); content: ''; }
.header-badge svg { display: none; }

/* Controls & Filter Row */
.controls-row {
  display: grid;
  gap: 1.2rem;
  margin-bottom: 1.6rem;
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

/* Grid Layout */
.biz-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.biz-card {
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
  border-radius: 1.15rem;
  border: 1px solid var(--line);
  background: var(--paper);
  box-shadow: var(--shadow-sm);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.biz-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: var(--teal-300);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.2rem;
}

.icon-avatar {
  display: grid;
  width: 3.15rem;
  height: 3.15rem;
  place-items: center;
  border-radius: 0.9rem;
  background: var(--teal-50);
  color: var(--teal-700);
  border: 1px solid var(--teal-100);
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
  background: var(--teal-50);
  color: var(--teal-800);
  font-size: 0.66rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.verified-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.22rem 0.6rem;
  border-radius: 999px;
  background: var(--teal-50);
  border: 1px solid var(--teal-100);
  color: var(--teal-800);
  font-size: 0.7rem;
  font-weight: 650;
}

.card-body {
  margin-bottom: 0.9rem;
}

.biz-title {
  font-size: 1.12rem;
  font-weight: 650;
  line-height: 1.3;
  color: var(--ink-950);
  margin: 0 0 0.5rem;
}

.biz-desc {
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--ink-650);
  margin: 0 0 0.6rem;
}

.operating-hours {
  font-size: 0.78rem;
  color: var(--ink-500);
  font-weight: 700;
  margin: 0;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.75rem;
  border-top: 1px solid var(--line);
  margin-top: 0.8rem;
}

.phone-num {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.82rem;
  font-weight: 650;
  color: var(--ink-750);
}

.wa-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.75rem;
  border-radius: 0.7rem;
  background: var(--teal-700);
  color: white;
  font-size: 0.8rem;
  font-weight: 650;
  text-decoration: none;
  transition: background 0.2s ease, transform 0.2s ease;
}

.wa-btn:hover {
  background: var(--teal-800);
  transform: translateY(-1px);
}

.empty-search {
  padding: 3rem;
  text-align: center;
  color: var(--ink-600);
  border-radius: var(--radius-lg);
  border: 1px dashed var(--line);
}

@media (max-width: 700px) {
  .category-pills { flex-wrap: nowrap; margin-inline: -.625rem; padding-inline: .625rem; overflow-x: auto; scrollbar-width: none; }
  .category-pills::-webkit-scrollbar { display: none; }
  .pill-btn { flex: 0 0 auto; white-space: nowrap; }
  .biz-grid { display: flex; gap: 1rem; margin-inline: 0; padding: .2rem .25rem .35rem; overflow-x: auto; scroll-padding-inline: .25rem; scroll-snap-type: x mandatory; scrollbar-width: none; }
  .biz-grid::-webkit-scrollbar { display: none; }
  .biz-card { flex: 0 0 min(84vw, 20rem); scroll-snap-align: start; }
}

@media (min-width: 701px) and (max-width: 1050px) {
  .biz-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
