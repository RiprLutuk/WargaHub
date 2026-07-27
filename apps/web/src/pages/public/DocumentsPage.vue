<script setup lang="ts">
import { Download, FileText } from 'lucide-vue-next';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { adaptPublicDocuments } from '../../lib/view-models';

const documents = useResource(async () => adaptPublicDocuments(await api.get<unknown>('/public/documents')));
</script>

<template>
  <div class="container page-stack">
    <header class="page-heading"><span class="eyebrow">Arsip publik</span><h1>Dokumen lingkungan</h1><p>Peraturan, jadwal layanan, notulen, dan laporan yang memang ditujukan untuk akses publik.</p></header>
    <StatePanel v-if="documents.loading.value" state="loading" />
    <StatePanel v-else-if="documents.error.value" state="error" :message="documents.error.value" @retry="documents.reload" />
    <EmptyState v-else-if="!documents.data.value?.length" title="Belum ada dokumen publik" />
    <div v-else class="document-list">
      <article v-for="item in documents.data.value" :key="item.id" class="card card-body document-row"><span class="file-icon" aria-hidden="true"><FileText :size="21" /></span><div><span class="category">{{ item.category }}</span><h2>{{ item.title }}</h2><p>{{ item.publishedAt ? `Diterbitkan ${formatDate(item.publishedAt)}` : 'Tanggal publikasi tidak tersedia' }}</p></div><a v-if="item.downloadUrl" class="button button-secondary button-sm" :href="item.downloadUrl" :aria-label="`Unduh ${item.title}`"><Download :size="16" aria-hidden="true" /> Unduh</a><span v-else class="muted small">Tanpa lampiran</span></article>
    </div>
  </div>
</template>

<style scoped>
.document-list { display: grid; gap: .7rem; }
.document-row { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 1rem; }
.file-icon { display: grid; width: 2.8rem; height: 2.8rem; place-items: center; border-radius: .8rem; background: var(--teal-100); color: var(--teal-700); }
.category { color: var(--teal-700); font-size: .7rem; font-weight: 850; letter-spacing: .07em; text-transform: uppercase; }
h2 { margin: .15rem 0; font-size: 1.05rem; }
p { margin: 0; color: var(--ink-650); font-size: .8rem; }
@media (max-width: 570px) { .document-row { grid-template-columns: auto 1fr; } .document-row .button { grid-column: 1 / -1; } }
</style>
