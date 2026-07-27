<script setup lang="ts">
import { CalendarDays, MapPin } from 'lucide-vue-next';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { adaptPublicEvents } from '../../lib/view-models';

const events = useResource(async () => adaptPublicEvents(await api.get<unknown>('/public/events')));
</script>

<template>
  <div class="container page-stack">
    <header class="page-heading"><span class="eyebrow">Simpan tanggalnya</span><h1>Agenda lingkungan</h1><p>Jadwal publik kegiatan, layanan, dan pertemuan warga dalam zona waktu Asia/Jakarta.</p></header>
    <StatePanel v-if="events.loading.value" state="loading" />
    <StatePanel v-else-if="events.error.value" state="error" :message="events.error.value" @retry="events.reload" />
    <EmptyState v-else-if="!events.data.value?.length" title="Belum ada agenda" />
    <ol v-else class="timeline">
      <li v-for="item in events.data.value" :key="item.id">
        <span class="timeline-mark" aria-hidden="true"><CalendarDays :size="19" /></span>
        <article class="card card-body"><span class="event-type">{{ item.type }}</span><h2>{{ item.title }}</h2><div class="event-details"><time :datetime="item.date">{{ formatDateTime(item.date) }}</time><span><MapPin :size="15" aria-hidden="true" /> {{ item.location }}</span></div></article>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.timeline { display: grid; max-width: 50rem; gap: 0; margin: 0; padding: 0; list-style: none; }
.timeline li { position: relative; display: grid; grid-template-columns: 3.4rem 1fr; padding-bottom: 1rem; }
.timeline li:not(:last-child)::before { position: absolute; top: 2.8rem; bottom: -.2rem; left: 1.35rem; width: 2px; background: var(--teal-100); content: ''; }
.timeline-mark { z-index: 1; display: grid; width: 2.75rem; height: 2.75rem; place-items: center; border-radius: 50%; background: var(--teal-700); color: white; }
.event-type { color: var(--teal-700); font-size: .72rem; font-weight: 850; letter-spacing: .07em; text-transform: uppercase; }
article h2 { margin: .35rem 0 .65rem; font-size: 1.25rem; }
.event-details { display: flex; flex-wrap: wrap; gap: .5rem 1rem; color: var(--ink-650); font-size: .87rem; }
.event-details span { display: inline-flex; align-items: center; gap: .25rem; }
</style>
