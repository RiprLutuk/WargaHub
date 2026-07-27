<script setup lang="ts">
import { MapPin, PhoneCall, ShieldCheck } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import StatePanel from '../../components/StatePanel.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import { adaptPublicSite } from '../../lib/view-models';

const site = useResource(async () => adaptPublicSite(await api.get<unknown>('/public/site')));
</script>

<template>
  <div class="container page-stack">
    <header class="page-heading"><span class="eyebrow">Kami siap membantu</span><h1>Hubungi pengurus</h1><p>Gunakan formulir ini untuk pertanyaan umum. Pengaduan warga dan hal sensitif sebaiknya dikirim melalui portal privat.</p></header>
    <StatePanel v-if="site.loading.value" state="loading" />
    <StatePanel v-else-if="site.error.value" state="error" :message="site.error.value" @retry="site.reload" />
    <div v-else-if="site.data.value" class="contact-grid">
      <section class="card card-body contact-guide"><ShieldCheck :size="28" aria-hidden="true" /><h2>Perlu menyampaikan pertanyaan?</h2><p>Untuk menjaga konteks dan privasi, warga terverifikasi dapat menghubungi pengurus melalui portal. Informasi darurat tersedia tanpa perlu masuk.</p><div class="contact-actions"><RouterLink class="button" to="/login">Masuk ke portal warga</RouterLink><RouterLink class="button button-secondary" to="/darurat">Buka nomor darurat</RouterLink></div></section>
      <aside class="contact-details"><article><MapPin :size="21" /><div><h2>Sekretariat warga</h2><p>{{ site.data.value.address }}</p></div></article><article><PhoneCall :size="21" /><div><h2>Kontak darurat lingkungan</h2><p><a :href="`tel:${site.data.value.emergencyPhone}`">{{ site.data.value.emergencyPhone }}</a></p></div></article><div class="notice notice-warning"><strong>Keadaan darurat?</strong><span>Jangan menunggu balasan pengurus. Buka halaman nomor darurat.</span></div></aside>
    </div>
  </div>
</template>

<style scoped>
.contact-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(17rem, .8fr); gap: 1.2rem; }
.contact-details { display: grid; align-content: start; gap: .8rem; }
.contact-details article { display: flex; gap: .8rem; padding: 1rem; border-bottom: 1px solid var(--line); }
.contact-details article > svg { flex: none; color: var(--teal-700); }
.contact-details h2 { margin-bottom: .25rem; font-size: 1rem; }
.contact-details p { margin: 0; color: var(--ink-650); }
.contact-details .notice { display: grid; }
.contact-guide { align-content: start; }
.contact-guide > svg { color: var(--teal-700); }
.contact-guide p { max-width: 42rem; color: var(--ink-650); }
.contact-actions { display: flex; flex-wrap: wrap; gap: .6rem; margin-top: .5rem; }
.contact-details a { color: var(--teal-700); font-weight: 800; }
@media (max-width: 720px) { .contact-grid { grid-template-columns: 1fr; } }
</style>
