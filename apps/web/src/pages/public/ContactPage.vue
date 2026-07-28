<script setup lang="ts">
import { MapPin, PhoneCall, ShieldCheck } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import PublicPageShell from '../../components/PublicPageShell.vue';
import StatePanel from '../../components/StatePanel.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import { adaptPublicSite } from '../../lib/view-models';

const site = useResource(async () => adaptPublicSite(await api.get<unknown>('/public/site')));
</script>

<template>
  <PublicPageShell>
    <header class="page-heading">
      <span class="eyebrow">Kami siap membantu</span>
      <h1>Hubungi pengurus</h1>
      <p>Gunakan layanan ini untuk pertanyaan umum. Pengaduan warga dan hal sensitif sebaiknya dikirim melalui portal privat.</p>
    </header>

    <StatePanel v-if="site.loading.value" state="loading" />
    <StatePanel v-else-if="site.error.value" state="error" :message="site.error.value" @retry="site.reload" />
    <div v-else-if="site.data.value" class="contact-grid">
      <section class="card contact-guide">
        <ShieldCheck :size="32" aria-hidden="true" />
        <h2>Perlu menyampaikan pertanyaan?</h2>
        <p>Untuk menjaga konteks dan privasi, warga terverifikasi dapat menghubungi pengurus melalui portal. Informasi darurat tersedia tanpa perlu masuk.</p>
        <div class="contact-actions">
          <RouterLink class="button" to="/login">Masuk ke portal warga</RouterLink>
          <RouterLink class="button button-secondary" to="/darurat">Buka nomor darurat</RouterLink>
        </div>
      </section>

      <aside class="contact-details">
        <article class="card details-card">
          <MapPin :size="24" />
          <div>
            <h2>Sekretariat warga</h2>
            <p>{{ site.data.value.address }}</p>
          </div>
        </article>

        <article class="card details-card">
          <PhoneCall :size="24" />
          <div>
            <h2>Kontak darurat lingkungan</h2>
            <p><a :href="`tel:${site.data.value.emergencyPhone}`">{{ site.data.value.emergencyPhone }}</a></p>
          </div>
        </article>

        <div class="notice notice-warning">
          <strong>Keadaan darurat?</strong>
          <span>Jangan menunggu balasan pengurus. Buka halaman nomor darurat.</span>
        </div>
      </aside>
    </div>
  </PublicPageShell>
</template>

<style scoped>
.page-heading { margin-bottom: 1.25rem; }
.page-heading .eyebrow { margin-bottom: .6rem; }
.page-heading h1 { margin-bottom: .6rem; font-size: clamp(2rem, 4vw, 2.8rem); line-height: 1.15; }
.page-heading p { max-width: 52rem; margin: 0; color: var(--ink-650); font-size: 1rem; line-height: 1.55; }
.contact-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(18rem, .8fr); gap: 1.5rem; }
.contact-guide { padding: 2rem; border-radius: var(--radius-lg); display: grid; gap: .8rem; align-content: start; }
.contact-guide > svg { color: var(--teal-700); }
.contact-guide h2 { margin: 0; font-size: 1.4rem; }
.contact-guide p { max-width: 42rem; color: var(--ink-650); font-size: .98rem; line-height: 1.6; margin: 0; }
.contact-actions { display: flex; flex-wrap: wrap; gap: .8rem; margin-top: .8rem; }
.contact-details { display: grid; align-content: start; gap: 1rem; }
.details-card { display: flex; gap: 1rem; padding: 1.4rem 1.6rem; border-radius: var(--radius-lg); }
.details-card > svg { flex: none; color: var(--teal-700); margin-top: .1rem; }
.details-card h2 { margin: 0 0 .2rem; font-size: 1.1rem; }
.details-card p { margin: 0; color: var(--ink-650); font-size: .9rem; }
.contact-details .notice { display: grid; padding: 1.2rem; }
.contact-details a { color: var(--teal-700); font-weight: 800; }
@media (max-width: 720px) { .contact-grid { grid-template-columns: 1fr; } }
</style>
