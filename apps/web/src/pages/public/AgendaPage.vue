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
  <div class="container public-page-container">
    <header class="page-heading">
      <span class="eyebrow">Simpan tanggalnya</span>
      <h1>Agenda lingkungan</h1>
      <p>Jadwal publik kegiatan, layanan, dan pertemuan warga dalam zona waktu Asia/Jakarta.</p>
    </header>

    <StatePanel v-if="events.loading.value" state="loading" />
    <StatePanel v-else-if="events.error.value" state="error" :message="events.error.value" @retry="events.reload" />
    <EmptyState v-else-if="!events.data.value?.length" title="Belum ada agenda" />

    <ol v-else class="timeline">
      <li v-for="item in events.data.value" :key="item.id">
        <span class="timeline-mark" aria-hidden="true"><CalendarDays :size="20" /></span>
        <article class="card agenda-card">
          <span class="event-type">{{ item.type }}</span>
          <h2>{{ item.title }}</h2>
          <div class="event-details">
            <time :datetime="item.date">{{ formatDateTime(item.date) }}</time>
            <span><MapPin :size="15" aria-hidden="true" /> {{ item.location }}</span>
          </div>
        </article>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.public-page-container { padding-block: clamp(3rem, 6vw, 5.5rem); }
.page-heading { margin-bottom: 3rem; }
.page-heading .eyebrow { margin-bottom: .6rem; }
.page-heading h1 { margin-bottom: .75rem; font-size: clamp(2.2rem, 5vw, 3.4rem); line-height: 1.16; }
.page-heading p { max-width: 48rem; margin: 0; color: var(--ink-650); font-size: 1.1rem; line-height: 1.6; }
.timeline { display: grid; max-width: 52rem; gap: .5rem; margin: 0; padding: 0; list-style: none; }
.timeline li { position: relative; display: grid; grid-template-columns: 3.6rem 1fr; padding-bottom: 1.6rem; }
.timeline li:not(:last-child)::before { position: absolute; top: 3.2rem; bottom: -.2rem; left: 1.45rem; width: 2px; background: var(--teal-100); content: ''; }
.timeline-mark { z-index: 1; display: grid; width: 3rem; height: 3rem; place-items: center; border-radius: 50%; background: var(--teal-700); color: white; }
.agenda-card { padding: 1.5rem 1.8rem; border-radius: var(--radius-lg); }
.event-type { color: var(--teal-700); font-size: .74rem; font-weight: 850; letter-spacing: .06em; text-transform: uppercase; }
article h2 { margin: .4rem 0 .75rem; font-size: 1.3rem; line-height: 1.3; }
.event-details { display: flex; flex-wrap: wrap; gap: .6rem 1.4rem; color: var(--ink-650); font-size: .9rem; }
.event-details span { display: inline-flex; align-items: center; gap: .3rem; }
</style>
