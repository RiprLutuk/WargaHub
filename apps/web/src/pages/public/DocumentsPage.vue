<script setup lang="ts">
import { Download, FileText } from 'lucide-vue-next';
import EmptyState from '../../components/EmptyState.vue';
import PublicPageShell from '../../components/PublicPageShell.vue';
import StatePanel from '../../components/StatePanel.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { adaptPublicDocuments } from '../../lib/view-models';

const documents = useResource(async () => adaptPublicDocuments(await api.get<unknown>('/public/documents')));
</script>

<template>
  <PublicPageShell>
    <header class="page-heading">
      <span class="eyebrow">Arsip publik</span>
      <h1>Dokumen lingkungan</h1>
      <p>Peraturan, jadwal layanan, notulen, dan laporan yang memang ditujukan untuk akses publik.</p>
    </header>

    <StatePanel v-if="documents.loading.value" state="loading" />
    <StatePanel v-else-if="documents.error.value" state="error" :message="documents.error.value" @retry="documents.reload" />
    <EmptyState v-else-if="!documents.data.value?.length" title="Belum ada dokumen publik" />

    <div v-else class="document-list">
      <article v-for="item in documents.data.value" :key="item.id" class="card document-row">
        <span class="file-icon" aria-hidden="true"><FileText :size="22" /></span>
        <div class="doc-info">
          <span class="category">{{ item.category }}</span>
          <h2>{{ item.title }}</h2>
          <p>{{ item.publishedAt ? `Diterbitkan ${formatDate(item.publishedAt)}` : 'Tanggal publikasi tidak tersedia' }}</p>
        </div>
        <a v-if="item.downloadUrl" class="button button-secondary button-sm" :href="item.downloadUrl" :aria-label="`Unduh ${item.title}`"><Download :size="16" aria-hidden="true" /> Unduh file</a>
        <span v-else class="muted small">Tanpa lampiran</span>
      </article>
    </div>
  </PublicPageShell>
</template>

<style scoped>
.page-heading { margin-bottom: 1.25rem; }
.page-heading .eyebrow { margin-bottom: .6rem; }
.page-heading h1 { margin-bottom: .6rem; font-size: clamp(2rem, 4vw, 2.8rem); line-height: 1.15; }
.page-heading p { max-width: 52rem; margin: 0; color: var(--ink-650); font-size: 1rem; line-height: 1.55; }
.document-list { display: grid; gap: 1.2rem; }
.document-row { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 1.4rem; padding: 1.5rem 1.8rem; border-radius: var(--radius-lg); }
.file-icon { display: grid; width: 3.2rem; height: 3.2rem; place-items: center; border-radius: 1rem; background: var(--teal-100); color: var(--teal-700); }
.doc-info { display: grid; gap: .2rem; }
.category { color: var(--teal-700); font-size: .74rem; font-weight: 850; letter-spacing: .06em; text-transform: uppercase; }
h2 { margin: .1rem 0; font-size: 1.25rem; line-height: 1.3; }
p { margin: 0; color: var(--ink-650); font-size: .88rem; }
@media (max-width: 570px) { .document-row { grid-template-columns: auto 1fr; } .document-row .button { grid-column: 1 / -1; } }
</style>
