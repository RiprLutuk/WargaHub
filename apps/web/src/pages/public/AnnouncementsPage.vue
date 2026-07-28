<script setup lang="ts">
import { Search } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import SmartSelect from '../../components/SmartSelect.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import type { Announcement } from '../../lib/demo';
import { formatDate } from '../../lib/format';

const search = ref('');
const category = ref('SEMUA');
const announcements = useResource(() => api.get<Announcement[]>('/public/announcements'));
const categories = computed(() => ['SEMUA', ...new Set(announcements.data.value?.map((item) => item.category) ?? [])]);
const categoryOptions = computed(() => categories.value.map((item) => ({ value: item, label: item === 'SEMUA' ? 'Semua kategori' : item })));
const filtered = computed(() => (announcements.data.value ?? []).filter((item) => {
  const matchesCategory = category.value === 'SEMUA' || item.category === category.value;
  const term = search.value.trim().toLocaleLowerCase('id-ID');
  return matchesCategory && (!term || `${item.title} ${item.summary}`.toLocaleLowerCase('id-ID').includes(term));
}));
</script>

<template>
  <div class="container page-stack">
    <header class="page-heading">
      <span class="eyebrow">Sumber resmi</span>
      <h1>Pengumuman lingkungan</h1>
      <p>Informasi penting tersusun rapi dan dapat dicari kembali kapan pun Anda membutuhkannya.</p>
    </header>

    <div class="filter-bar" role="search">
      <label class="search-box"><Search :size="18" aria-hidden="true" /><span class="sr-only">Cari pengumuman</span><input v-model="search" type="search" placeholder="Cari judul atau isi pengumuman" /></label>
      <label class="field"><span class="sr-only">Filter kategori</span><SmartSelect v-model="category" :options="categoryOptions" search-placeholder="Cari kategori…" /></label>
    </div>

    <StatePanel v-if="announcements.loading.value" state="loading" />
    <StatePanel v-else-if="announcements.error.value" state="error" :message="announcements.error.value" @retry="announcements.reload" />
    <EmptyState v-else-if="!filtered.length" title="Pengumuman tidak ditemukan" description="Coba kata kunci atau kategori lain." />

    <div v-else class="announcement-list">
      <article v-for="item in filtered" :id="item.id" :key="item.id" class="card card-body announcement-row">
        <div>
          <div class="meta"><span>{{ item.category }}</span><time :datetime="item.publishedAt">{{ formatDate(item.publishedAt) }}</time></div>
          <h2>{{ item.title }}</h2>
          <p>{{ item.summary }}</p>
        </div>
        <span v-if="item.urgency !== 'NORMAL'" class="priority">Penting</span>
      </article>
    </div>
  </div>
</template>

<style scoped>
.filter-bar { display: grid; grid-template-columns: 1fr minmax(12rem, .3fr); gap: clamp(.8rem, 2vw, 1.5rem); padding: 1rem; border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--paper); }
.search-box { display: flex; align-items: center; gap: .55rem; padding-inline: .85rem; border: 1px solid var(--line-strong); border-radius: .72rem; background: white; color: var(--ink-500); }
.search-box:focus-within { border-color: var(--teal-600); box-shadow: 0 0 0 3px var(--teal-100); }
.search-box input { width: 100%; min-height: 2.8rem; border: 0; outline: 0; background: transparent; }
.announcement-list { display: grid; gap: 1.2rem; }
.announcement-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5rem; padding: 1.6rem 1.8rem; border-radius: var(--radius-lg); scroll-margin-top: 6rem; }
.announcement-row h2 { margin-bottom: .45rem; font-size: 1.3rem; line-height: 1.3; }
.announcement-row p { max-width: 52rem; margin-bottom: 0; color: var(--ink-650); font-size: .95rem; line-height: 1.55; }
.meta { display: flex; gap: .8rem; margin-bottom: .55rem; color: var(--ink-650); font-size: .76rem; font-weight: 750; }
.priority { flex: none; padding: .35rem .65rem; border-radius: 999px; background: var(--amber-100); color: var(--amber-700); font-size: .72rem; font-weight: 850; }
@media (max-width: 620px) { .filter-bar { grid-template-columns: 1fr; } .announcement-row { flex-direction: column; } }
</style>
