<script setup lang="ts">
import { ClipboardList, MapPin, Search } from 'lucide-vue-next';
import { ref } from 'vue';
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

const complaints = useResource(() => api.get<PublicComplaint[]>('/public/complaints'));
</script>

<template>
  <div class="container public-page-container">
    <header class="page-heading">
      <span class="eyebrow">Transparansi Operasional Lingkungan</span>
      <h1>Status pengaduan & laporan publik</h1>
      <p>Pelacakan penanganan pengaduan fasilitas umum dan masalah lingkungan yang ditandai publik secara transparan tanpa menampilkan identitas pribadi pelapor.</p>
    </header>

    <StatePanel v-if="complaints.loading.value" state="loading" />
    <StatePanel v-else-if="complaints.error.value" state="error" :message="complaints.error.value" @retry="complaints.reload" />
    <EmptyState v-else-if="!complaints.data.value?.length" title="Belum ada laporan publik" message="Belum ada laporan pengaduan publik yang dipublikasikan saat ini." />

    <div v-else class="complaint-list">
      <article v-for="item in complaints.data.value" :key="item.id" class="card complaint-card">
        <div class="card-left">
          <div class="tags-row">
            <span class="ticket-tag">Tiket: #{{ item.ticketNumber }}</span>
            <span class="cat-tag">{{ item.category }}</span>
          </div>
          <h2>{{ item.title }}</h2>
          <p>{{ item.description }}</p>
          <div class="card-meta">
            <span v-if="item.location" class="location"><MapPin :size="14" /> {{ item.location }}</span>
            <span class="date">Dilaporkan: {{ formatDate(item.createdAt) }}</span>
          </div>
        </div>

        <div class="card-right">
          <StatusBadge :status="item.status" />
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.public-page-container { padding-block: clamp(3rem, 6vw, 5.5rem); }
.page-heading { margin-bottom: 3rem; }
.page-heading .eyebrow { margin-bottom: .6rem; }
.page-heading h1 { margin-bottom: .75rem; font-size: clamp(2.2rem, 5vw, 3.4rem); line-height: 1.16; }
.page-heading p { max-width: 48rem; margin: 0; color: var(--ink-650); font-size: 1.1rem; line-height: 1.6; }
.complaint-list { display: grid; gap: 1.25rem; }
.complaint-card { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 1.5rem; padding: 1.6rem 1.8rem; border-radius: var(--radius-lg); }
.card-left { display: grid; flex: 1; min-width: min(100%, 20rem); gap: .5rem; }
.tags-row { display: flex; align-items: center; gap: .6rem; }
.ticket-tag { color: var(--teal-700); font-size: .76rem; font-weight: 850; letter-spacing: .04em; }
.cat-tag { width: fit-content; padding: .2rem .55rem; border-radius: .45rem; background: var(--cream-100); color: var(--ink-800); font-size: .72rem; font-weight: 800; text-transform: uppercase; }
.complaint-card h2 { margin: .25rem 0 .15rem; font-size: 1.3rem; line-height: 1.3; }
.complaint-card p { margin: 0 0 .5rem; color: var(--ink-650); font-size: .95rem; line-height: 1.55; }
.card-meta { display: flex; flex-wrap: wrap; gap: 1.2rem; margin-top: .4rem; font-size: .82rem; color: var(--ink-500); }
.location { display: inline-flex; align-items: center; gap: .3rem; color: var(--ink-700); font-weight: 750; }
.card-right { display: flex; align-items: flex-start; padding-top: .2rem; }
</style>
