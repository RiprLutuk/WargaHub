<script setup lang="ts">
import { Download, FileText } from 'lucide-vue-next';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { adaptPublicDocuments } from '../../lib/view-models';

const documents = useResource(async () => adaptPublicDocuments(await api.get<unknown>('/documents')));
</script>

<template>
  <div class="portal-page">
    <header>
      <span class="eyebrow">Arsip internal</span>
      <h1>Dokumen warga</h1>
      <p>Dokumen ini bersifat internal. Jangan teruskan tautan atau isi dokumen tanpa izin.</p>
    </header>
    <StatePanel v-if="documents.loading.value" state="loading" />
    <StatePanel v-else-if="documents.error.value" state="error" :message="documents.error.value" @retry="documents.reload" />
    <EmptyState v-else-if="!documents.data.value?.length" title="Belum ada dokumen internal" />
    <div v-else class="items">
      <article v-for="item in documents.data.value" :key="item.id" class="card card-body">
        <span class="doc-icon"><FileText :size="20" /></span>
        <div>
          <small>{{ item.category }}</small>
          <h2>{{ item.title }}</h2>
          <p>{{ formatDate(item.updatedAt) }} · {{ item.size }}</p>
        </div>
        <a v-if="item.downloadUrl" class="button button-secondary button-sm" :href="item.downloadUrl" target="_blank" rel="noopener" :aria-label="`Unduh ${item.title}`">
          <Download :size="15" /> Unduh
        </a>
        <span v-else class="muted small">Belum ada file</span>
      </article>
    </div>
  </div>
</template>

<style scoped>
.portal-page { display: grid; max-width: 78rem; gap: 1.2rem; margin-inline: auto; }
header h1 { margin-bottom: .45rem; font-size: clamp(2rem, 4.5vw, 3rem); }
header p { color: var(--ink-650); }
.items { display: grid; gap: .65rem; }
.items article { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: .8rem; }
.doc-icon { display: grid; width: 2.7rem; height: 2.7rem; place-items: center; border-radius: .75rem; background: var(--teal-100); color: var(--teal-700); }
small { color: var(--teal-700); font-weight: 800; }
h2 { margin: .1rem 0; font-size: 1rem; }
p { margin: 0; color: var(--ink-650); font-size: .8rem; }
@media (max-width: 520px) { .items article { grid-template-columns: auto 1fr; } .items .button { grid-column: 1 / -1; } }
</style>
