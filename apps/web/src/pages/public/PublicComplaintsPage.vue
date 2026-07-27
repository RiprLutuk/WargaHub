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

const search = ref('');
const complaints = useResource(() => api.get<PublicComplaint[]>('/public/complaints'));
</script>

<template>
  <div class="container section">
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
          <span class="ticket-tag">Tiket: #{{ item.ticketNumber }}</span>
          <span class="cat-tag">{{ item.category }}</span>
          <h2>{{ item.title }}</h2>
          <p>{{ item.description }}</p>
          <div class="card-meta">
            <span v-if="item.location" class="location"><MapPin :size="13" /> {{ item.location }}</span>
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
.page-heading { margin-bottom: 2rem; }
.page-heading h1 { margin-bottom: .45rem; font-size: clamp(2.2rem, 5vw, 3.2rem); }
.page-heading p { max-width: 44rem; margin: 0; color: var(--ink-650); }
.complaint-list { display: grid; gap: 1rem; }
.complaint-card { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 1.2rem; padding: 1.4rem; }
.card-left { display: grid; flex: 1; min-width: min(100%, 20rem); gap: .35rem; }
.ticket-tag { color: var(--teal-700); font-size: .72rem; font-weight: 850; letter-spacing: .05em; }
.cat-tag { width: fit-content; padding: .15rem .45rem; border-radius: .4rem; background: var(--cream-100); color: var(--ink-800); font-size: .7rem; font-weight: 800; text-transform: uppercase; }
.complaint-card h2 { margin: .2rem 0; font-size: 1.2rem; }
.complaint-card p { margin: 0 0 .4rem; color: var(--ink-650); font-size: .88rem; line-height: 1.45; }
.card-meta { display: flex; flex-wrap: wrap; gap: .8rem; font-size: .78rem; color: var(--ink-500); }
.location { display: inline-flex; align-items: center; gap: .25rem; color: var(--ink-700); font-weight: 750; }
.card-right { display: flex; align-items: flex-start; }
</style>
