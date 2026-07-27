<script setup lang="ts">
import { Calendar, Check, Megaphone, Pin, Search, X } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import type { Announcement } from '../../lib/demo';
import { formatDate } from '../../lib/format';

const announcements = useResource(() => api.get<Announcement[]>('/announcements'));
const selected = ref<Announcement | null>(null);
const search = ref('');
const filterUrgency = ref<string>('ALL');

const filteredAnnouncements = computed(() => {
  return (announcements.data.value ?? []).filter((item) => {
    const matchSearch = `${item.title} ${item.summary} ${item.category}`.toLowerCase().includes(search.value.toLowerCase());
    const matchUrgency = filterUrgency.value === 'ALL' || item.urgency === filterUrgency.value;
    return matchSearch && matchUrgency;
  });
});

function openDetail(item: Announcement) {
  selected.value = item;
}

function closeDetail() {
  selected.value = null;
}
</script>

<template>
  <div class="portal-page">
    <header class="portal-page-heading">
      <div>
        <span class="eyebrow">Informasi untuk penghuni</span>
        <h1>Pengumuman warga</h1>
        <p>Pengumuman resmi lingkungan hanya dapat dibaca oleh akun warga yang sudah terverifikasi.</p>
      </div>
    </header>

    <div class="toolbar">
      <label class="search-box">
        <Search :size="16" />
        <span class="sr-only">Cari pengumuman</span>
        <input v-model="search" type="search" placeholder="Cari pengumuman, kerja bakti, edaran..." />
      </label>

      <div class="filter-chips">
        <button type="button" class="chip" :class="{ active: filterUrgency === 'ALL' }" @click="filterUrgency = 'ALL'">Semua</button>
        <button type="button" class="chip" :class="{ active: filterUrgency === 'EMERGENCY' }" @click="filterUrgency = 'EMERGENCY'">Darurat</button>
        <button type="button" class="chip" :class="{ active: filterUrgency === 'IMPORTANT' }" @click="filterUrgency = 'IMPORTANT'">Penting</button>
        <button type="button" class="chip" :class="{ active: filterUrgency === 'NORMAL' }" @click="filterUrgency = 'NORMAL'">Normal</button>
      </div>
    </div>

    <StatePanel v-if="announcements.loading.value" state="loading" />
    <StatePanel v-else-if="announcements.error.value" state="error" :message="announcements.error.value" @retry="announcements.reload" />
    <EmptyState v-else-if="!filteredAnnouncements.length" title="Belum ada pengumuman" message="Tidak ada pengumuman yang sesuai kriteria pencarian Anda." />

    <div v-else class="announcement-list">
      <article
        v-for="item in filteredAnnouncements"
        :key="item.id"
        class="card announcement-card"
        :class="{ emergency: item.urgency === 'EMERGENCY', important: item.urgency === 'IMPORTANT' }"
        @click="openDetail(item)"
      >
        <span class="icon-wrap" :class="item.urgency.toLowerCase()">
          <Megaphone :size="20" />
        </span>

        <div class="announcement-body">
          <div class="card-meta">
            <span class="category-tag">{{ item.category }}</span>
            <span class="date-tag"><Calendar :size="13" /> {{ formatDate(item.publishedAt) }}</span>
            <span v-if="item.urgency !== 'NORMAL'" class="pinned-badge"><Pin :size="12" /> Penting</span>
          </div>

          <h2>{{ item.title }}</h2>
          <p>{{ item.summary }}</p>

          <span class="read-more">Baca selengkapnya →</span>
        </div>
      </article>
    </div>

    <!-- Announcement Detail Drawer / Panel -->
    <div v-if="selected" class="detail-modal" role="dialog" aria-modal="true">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <span class="category-tag">{{ selected.category }} · {{ formatDate(selected.publishedAt) }}</span>
            <h2>{{ selected.title }}</h2>
          </div>
          <button type="button" class="close-btn" aria-label="Tutup detail" @click="closeDetail"><X :size="20" /></button>
        </div>

        <div class="modal-body">
          <p class="summary-lead">{{ selected.summary }}</p>
        </div>

        <div class="modal-footer">
          <button type="button" class="button button-secondary" @click="closeDetail">Tutup pengumuman</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.portal-page { display: grid; max-width: 78rem; gap: 1.2rem; margin-inline: auto; }
.portal-page-heading h1 { margin-bottom: .45rem; font-size: clamp(2rem, 4.5vw, 3rem); }
.portal-page-heading p { max-width: 44rem; margin: 0; color: var(--ink-650); }
.toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .8rem; }
.search-box { display: flex; min-width: 18rem; flex: 1; align-items: center; gap: .5rem; padding-inline: .75rem; border: 1px solid var(--line-strong); border-radius: .7rem; background: var(--paper); color: var(--ink-500); }
.search-box input { width: 100%; min-height: 2.6rem; border: 0; outline: 0; background: transparent; }
.filter-chips { display: flex; gap: .35rem; }
.chip { padding: .4rem .75rem; border: 1px solid var(--line); border-radius: 999px; background: var(--paper); color: var(--ink-650); font-size: .75rem; font-weight: 750; cursor: pointer; }
.chip.active { border-color: var(--teal-600); background: var(--teal-100); color: var(--teal-800); }
.announcement-list { display: grid; gap: .8rem; }
.announcement-card { display: flex; gap: 1.1rem; padding: 1.2rem; cursor: pointer; transition: transform .15s, box-shadow .15s; }
.announcement-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.announcement-card.emergency { border-left: 4px solid var(--coral-500); }
.announcement-card.important { border-left: 4px solid var(--amber-500); }
.icon-wrap { display: grid; width: 2.9rem; height: 2.9rem; flex: none; place-items: center; border-radius: .85rem; background: var(--amber-100); color: var(--amber-700); }
.icon-wrap.emergency { background: var(--coral-100); color: var(--coral-700); }
.icon-wrap.important { background: var(--amber-100); color: var(--amber-700); }
.announcement-body { display: grid; flex: 1; gap: .3rem; }
.card-meta { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; color: var(--ink-500); font-size: .74rem; }
.category-tag { color: var(--teal-700); font-weight: 850; text-transform: uppercase; }
.date-tag { display: inline-flex; align-items: center; gap: .25rem; }
.pinned-badge { display: inline-flex; align-items: center; gap: .2rem; padding: .08rem .4rem; border-radius: .3rem; background: var(--amber-100); color: var(--amber-800); font-size: .65rem; font-weight: 800; }
.announcement-body h2 { margin: 0; font-size: 1.1rem; }
.announcement-body p { margin: 0; color: var(--ink-650); font-size: .86rem; line-height: 1.45; }
.read-more { margin-top: .4rem; color: var(--teal-700); font-size: .78rem; font-weight: 850; }
.detail-modal { position: fixed; z-index: 50; inset: 0; display: grid; place-items: center; padding: 1rem; background: rgba(16, 43, 39, 0.4); backdrop-filter: blur(4px); }
.modal-card { width: min(100%, 38rem); max-height: 90vh; padding: 1.5rem; overflow-y: auto; border-radius: var(--radius-lg); background: var(--paper); box-shadow: var(--shadow-lg); }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
.modal-header h2 { margin-top: .3rem; font-size: 1.4rem; }
.close-btn { display: grid; width: 2.5rem; height: 2.5rem; flex: none; place-items: center; border: 1px solid var(--line); border-radius: .6rem; background: white; cursor: pointer; }
.summary-lead { color: var(--ink-700); font-size: 1rem; font-weight: 650; line-height: 1.5; }
.divider { height: 1px; margin-block: 1rem; background: var(--line); }
.full-content { color: var(--ink-800); font-size: .92rem; line-height: 1.6; white-space: pre-wrap; }
.modal-footer { display: flex; justify-content: flex-end; margin-top: 1.5rem; }
@media (max-width: 600px) { .announcement-card { flex-direction: column; } }
</style>
