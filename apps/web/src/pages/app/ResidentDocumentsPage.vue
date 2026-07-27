<script setup lang="ts">
import { Download, FileText, Filter, Search, ShieldAlert } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { adaptPublicDocuments } from '../../lib/view-models';

const documents = useResource(async () => adaptPublicDocuments(await api.get<unknown>('/documents')));
const search = ref('');
const selectedCategory = ref('ALL');

const categories = computed(() => {
  const set = new Set<string>();
  documents.data.value?.forEach((doc) => {
    if (doc.category) set.add(doc.category);
  });
  return ['ALL', ...Array.from(set)];
});

const filteredDocuments = computed(() => {
  return (documents.data.value ?? []).filter((doc) => {
    const matchSearch = `${doc.title} ${doc.category} ${doc.description}`.toLowerCase().includes(search.value.toLowerCase());
    const matchCategory = selectedCategory.value === 'ALL' || doc.category === selectedCategory.value;
    return matchSearch && matchCategory;
  });
});
</script>

<template>
  <div class="portal-page">
    <header class="portal-page-heading">
      <div>
        <span class="eyebrow">Arsip & Peraturan Lingkungan</span>
        <h1>Dokumen warga</h1>
        <p>Dokumen ini bersifat internal. Harap tidak meneruskan tautan atau mengunduh untuk disebarluaskan tanpa izin pengurus.</p>
      </div>
    </header>

    <div class="notice">
      <ShieldAlert :size="19" />
      <span>Peraturan, tata tertib, dan notulen rapat dilindungi hak cipta warga.</span>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="toolbar">
      <label class="search-box">
        <Search :size="16" />
        <span class="sr-only">Cari dokumen</span>
        <input v-model="search" type="search" placeholder="Cari nama dokumen, kategori, atau notulen..." />
      </label>

      <div class="category-filters" role="tablist">
        <button
          v-for="cat in categories"
          :key="cat"
          type="button"
          class="cat-chip"
          :class="{ active: selectedCategory === cat }"
          @click="selectedCategory = cat"
        >
          <Filter v-if="cat === 'ALL'" :size="13" />
          {{ cat === 'ALL' ? 'Semua Kategori' : cat }}
        </button>
      </div>
    </div>

    <StatePanel v-if="documents.loading.value" state="loading" />
    <StatePanel v-else-if="documents.error.value" state="error" :message="documents.error.value" @retry="documents.reload" />
    <EmptyState v-else-if="!filteredDocuments.length" title="Dokumen tidak ditemukan" message="Tidak ada dokumen internal yang cocok dengan kriteria pencarian Anda." />

    <div v-else class="doc-list">
      <article v-for="item in filteredDocuments" :key="item.id" class="card doc-card">
        <span class="doc-icon"><FileText :size="22" /></span>
        <div class="doc-meta">
          <div class="tags">
            <span class="category-tag">{{ item.category }}</span>
            <span class="badge-tag">PDF</span>
          </div>
          <h2>{{ item.title }}</h2>
          <p>Diperbarui {{ formatDate(item.updatedAt) }} · {{ item.size }}</p>
        </div>
        <a v-if="item.downloadUrl" class="button button-secondary button-sm" :href="item.downloadUrl" target="_blank" rel="noopener" :aria-label="`Unduh ${item.title}`">
          <Download :size="15" /> Unduh Dokumen
        </a>
        <span v-else class="muted-tag">File belum tersedia</span>
      </article>
    </div>
  </div>
</template>

<style scoped>
.portal-page { display: grid; max-width: 78rem; gap: 1.2rem; margin-inline: auto; }
.portal-page-heading h1 { margin-bottom: .45rem; font-size: clamp(2rem, 4.5vw, 3rem); }
.portal-page-heading p { max-width: 46rem; margin: 0; color: var(--ink-650); }
.toolbar { display: flex; flex-wrap: wrap; items-center: center; gap: .8rem; justify-content: space-between; }
.search-box { display: flex; min-width: 18rem; flex: 1; align-items: center; gap: .5rem; padding-inline: .75rem; border: 1px solid var(--line-strong); border-radius: .7rem; background: var(--paper); color: var(--ink-500); }
.search-box input { width: 100%; min-height: 2.6rem; border: 0; outline: 0; background: transparent; }
.category-filters { display: flex; flex-wrap: wrap; gap: .35rem; }
.cat-chip { display: inline-flex; align-items: center; gap: .35rem; padding: .4rem .75rem; border: 1px solid var(--line); border-radius: 999px; background: var(--paper); color: var(--ink-650); font-size: .75rem; font-weight: 750; cursor: pointer; }
.cat-chip.active { border-color: var(--teal-600); background: var(--teal-100); color: var(--teal-800); }
.doc-list { display: grid; gap: .7rem; }
.doc-card { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 1rem; padding: 1.1rem; }
.doc-icon { display: grid; width: 2.8rem; height: 2.8rem; place-items: center; border-radius: .8rem; background: var(--teal-100); color: var(--teal-700); }
.tags { display: flex; items-center: center; gap: .4rem; margin-bottom: .2rem; }
.category-tag { color: var(--teal-700); font-size: .72rem; font-weight: 850; text-transform: uppercase; }
.badge-tag { padding: .05rem .35rem; border-radius: .3rem; background: var(--amber-100); color: var(--amber-700); font-size: .65rem; font-weight: 800; }
.doc-meta h2 { margin: 0 0 .25rem; font-size: 1.05rem; }
.doc-meta p { margin: 0; color: var(--ink-650); font-size: .8rem; }
.muted-tag { color: var(--ink-500); font-size: .78rem; font-weight: 650; }
@media (max-width: 650px) { .doc-card { grid-template-columns: auto 1fr; } .doc-card > a, .doc-card > .muted-tag { grid-column: 1 / -1; justify-self: stretch; text-align: center; } }
</style>
