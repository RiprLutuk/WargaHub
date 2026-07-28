<script setup lang="ts">
import { ArrowRight, CalendarDays, CheckCircle2, Megaphone, ShieldCheck, WalletCards } from 'lucide-vue-next';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import StatePanel from '../../components/StatePanel.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import type { Announcement } from '../../lib/demo';
import { formatDate } from '../../lib/format';
import { adaptPublicSite } from '../../lib/view-models';

const site = useResource(async () => adaptPublicSite(await api.get<unknown>('/public/site')));
const announcements = useResource(() => api.get<Announcement[]>('/public/announcements'));
const visibleAnnouncements = computed(() => announcements.data.value?.slice(0, 3) ?? []);
</script>

<template>
  <section class="hero">
    <div class="hero-pattern" aria-hidden="true" />
    <div class="container hero-grid">
      <div class="hero-copy">
        <span class="hero-kicker"><CheckCircle2 :size="15" aria-hidden="true" /> Ruang bersama yang lebih ringan</span>
        <h1>WargaHub</h1>
        <p class="hero-lead">Gotong royong tanpa mengorbankan kewarasan.</p>
        <p class="hero-description">Informasi resmi, layanan warga, dan transparansi lingkungan—rapi dalam satu tempat, tanpa menambah tekanan sosial.</p>
        <div class="hero-actions">
          <RouterLink class="button" to="/pengumuman">Lihat informasi terbaru <ArrowRight :size="17" aria-hidden="true" /></RouterLink>
          <RouterLink class="button button-secondary" to="/login">Masuk sebagai warga</RouterLink>
        </div>
        <div class="trust-row" aria-label="Prinsip WargaHub">
          <span><ShieldCheck :size="17" aria-hidden="true" /> Privat seperlunya</span>
          <span><CheckCircle2 :size="17" aria-hidden="true" /> Tanpa ranking warga</span>
        </div>
      </div>

      <aside class="community-card" aria-label="Ringkasan lingkungan">
        <div class="community-card-top">
          <span class="live-dot" />
          <span>Sumber informasi resmi</span>
        </div>
        <StatePanel v-if="site.loading.value" state="loading" />
        <StatePanel v-else-if="site.error.value" state="error" :message="site.error.value" @retry="site.reload" />
        <template v-else-if="site.data.value">
          <span class="eyebrow">Lingkungan kita</span>
          <h2>{{ site.data.value.name }}</h2>
          <p>{{ site.data.value.description }}</p>
          <dl v-if="site.data.value.households !== null || site.data.value.activePrograms !== null" class="community-stats">
            <div v-if="site.data.value.households !== null"><dt>Rumah terdaftar</dt><dd>{{ site.data.value.households }}</dd></div>
            <div v-if="site.data.value.activePrograms !== null"><dt>Program aktif</dt><dd>{{ site.data.value.activePrograms }}</dd></div>
          </dl>
          <div class="community-address">{{ site.data.value.address }}</div>
        </template>
      </aside>
    </div>
  </section>

  <section class="container public-section" aria-labelledby="announcement-heading">
    <div class="section-heading">
      <div>
        <span class="eyebrow">Yang perlu diketahui</span>
        <h2 id="announcement-heading">Pengumuman terbaru</h2>
      </div>
      <RouterLink class="text-link" to="/pengumuman">Lihat semua <ArrowRight :size="16" aria-hidden="true" /></RouterLink>
    </div>
    <StatePanel v-if="announcements.loading.value" state="loading" />
    <StatePanel v-else-if="announcements.error.value" state="error" :message="announcements.error.value" @retry="announcements.reload" />
    <div v-else class="announcement-grid">
      <article v-for="(item, index) in visibleAnnouncements" :key="item.id" class="announcement-card" :class="{ featured: index === 0 }">
        <div class="announcement-meta"><span>{{ item.category }}</span><time :datetime="item.publishedAt">{{ formatDate(item.publishedAt) }}</time></div>
        <h3>{{ item.title }}</h3>
        <p>{{ item.summary }}</p>
        <RouterLink :to="`/pengumuman#${item.id}`" :aria-label="`Baca pengumuman ${item.title}`">Baca selengkapnya <ArrowRight :size="15" aria-hidden="true" /></RouterLink>
      </article>
    </div>
  </section>

  <section class="service-band">
    <div class="container">
      <div class="section-heading">
        <div><span class="eyebrow">Satu pintu layanan</span><h2>Lebih jelas, lebih manusiawi</h2></div>
        <p>Warga dapat berkontribusi sesuai kapasitasnya—hadir, membantu dari rumah, memberi barang, atau mengajukan dispensasi.</p>
      </div>
      <div class="service-grid">
        <article><span><Megaphone :size="22" /></span><h3>Informasi terstruktur</h3><p>Pengumuman resmi tidak lagi tenggelam di antara ratusan pesan.</p></article>
        <article><span><WalletCards :size="22" /></span><h3>Keuangan transparan</h3><p>Ringkasan kas mudah diperiksa tanpa membuka data pribadi warga.</p></article>
        <article><span><CalendarDays :size="22" /></span><h3>Partisipasi fleksibel</h3><p>Atur jadwal dan pilih kontribusi yang realistis untuk keadaan Anda.</p></article>
      </div>
    </div>
  </section>

  <section class="container invitation">
    <div>
      <span class="eyebrow">Khusus penghuni</span>
      <h2>Selesaikan kebutuhan warga tanpa percakapan panjang.</h2>
      <p>Lihat tagihan rumah, laporkan masalah, pilih kontribusi kegiatan, dan kelola jadwal ronda dari portal privat.</p>
    </div>
    <RouterLink class="button" to="/login">Buka portal warga <ArrowRight :size="17" aria-hidden="true" /></RouterLink>
  </section>
</template>

<style scoped>
.hero { position: relative; overflow: hidden; border-bottom: 1px solid var(--line); background: radial-gradient(circle at 80% 10%, rgb(217 238 232 / .9), transparent 30rem), linear-gradient(150deg, var(--cream-50), #fffaf0); }
.hero-pattern { position: absolute; inset: 0; opacity: .16; background-image: linear-gradient(var(--teal-700) 1px, transparent 1px), linear-gradient(90deg, var(--teal-700) 1px, transparent 1px); background-size: 44px 44px; mask-image: linear-gradient(90deg, transparent, black 70%); }
.hero-grid { position: relative; display: grid; min-height: 41rem; grid-template-columns: 1.35fr .85fr; align-items: center; gap: clamp(2rem, 6vw, 6rem); padding-block: 5rem; }
.hero-copy { max-width: 43rem; }
.hero-kicker { display: inline-flex; align-items: center; gap: .4rem; margin-bottom: 1.1rem; padding: .38rem .62rem; border: 1px solid var(--teal-100); border-radius: 999px; background: rgb(255 253 248 / .72); color: var(--teal-700); font-size: .77rem; font-weight: 800; }
.hero h1 { margin-bottom: .25rem; color: var(--ink-950); }
.hero-lead { margin-bottom: 1rem; color: var(--teal-700); font-family: var(--font-display); font-size: clamp(1.45rem, 3vw, 2.25rem); line-height: 1.18; }
.hero-description { max-width: 39rem; margin-bottom: 1.6rem; color: var(--ink-650); font-size: 1.08rem; }
.hero-actions, .trust-row { display: flex; flex-wrap: wrap; gap: .75rem; }
.trust-row { margin-top: 1.5rem; color: var(--ink-650); font-size: .82rem; font-weight: 700; }
.trust-row span { display: inline-flex; align-items: center; gap: .35rem; }
.community-card { padding: clamp(1.25rem, 3vw, 2rem); border: 1px solid rgb(255 255 255 / .65); border-radius: var(--radius-xl); background: rgb(255 253 248 / .9); box-shadow: var(--shadow-lg); backdrop-filter: blur(20px); transform: rotate(1.25deg); }
.community-card-top { display: flex; align-items: center; gap: .45rem; margin: -0.3rem 0 2rem; color: var(--success-700); font-size: .75rem; font-weight: 800; }
.live-dot { width: .55rem; height: .55rem; border-radius: 50%; background: #3ca66e; box-shadow: 0 0 0 4px var(--success-100); }
.community-card h2 { font-family: var(--font-display); font-size: 2rem; }
.community-card p { color: var(--ink-650); }
.community-stats { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; margin: 1.6rem 0; }
.community-stats div { padding: .9rem; border-radius: var(--radius-md); background: var(--teal-50); }
.community-stats dt { color: var(--ink-650); font-size: .72rem; }
.community-stats dd { margin: .2rem 0 0; font-family: var(--font-display); font-size: 1.7rem; font-weight: 700; }
.community-address { padding-top: 1rem; border-top: 1px solid var(--line); color: var(--ink-650); font-size: .82rem; }
.public-section { padding-block: clamp(3.5rem, 8vw, 6.5rem); }
.text-link { display: inline-flex; align-items: center; gap: .35rem; font-weight: 750; text-decoration: none; }
.announcement-grid { display: grid; grid-template-columns: 1.15fr 1fr 1fr; gap: 1rem; }
.announcement-card { display: flex; min-height: 16rem; flex-direction: column; padding: 1.35rem; border: 1px solid var(--line); border-radius: var(--radius-lg); background: var(--paper); box-shadow: var(--shadow-sm); }
.announcement-card.featured { background: var(--ink-950); color: white; }
.announcement-meta { display: flex; justify-content: space-between; gap: .5rem; margin-bottom: 1.3rem; color: var(--ink-650); font-size: .68rem; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
.featured .announcement-meta { color: rgb(255 255 255 / .64); }
.announcement-card h3 { font-size: 1.25rem; }
.announcement-card p { color: var(--ink-650); }
.featured p { color: rgb(255 255 255 / .72); }
.announcement-card a { display: inline-flex; align-items: center; gap: .25rem; margin-top: auto; font-weight: 750; text-decoration: none; }
.featured a { color: var(--amber-500); }
.service-band { padding-block: clamp(3.5rem, 8vw, 6rem); background: var(--cream-100); }
.service-band .section-heading > p { max-width: 35rem; color: var(--ink-650); }
.service-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.service-grid article { padding: 1.5rem; border-top: 3px solid var(--teal-700); background: var(--paper); box-shadow: var(--shadow-sm); }
.service-grid article > span { display: grid; width: 2.7rem; height: 2.7rem; margin-bottom: 1rem; place-items: center; border-radius: .8rem; background: var(--teal-100); color: var(--teal-700); }
.service-grid p { margin-bottom: 0; color: var(--ink-650); }
.invitation { display: flex; align-items: center; justify-content: space-between; gap: 2rem; margin-block: 4.5rem; padding: clamp(1.5rem, 4vw, 3.2rem); border-radius: var(--radius-xl); background: var(--amber-100); }
.invitation > div { max-width: 44rem; }
.invitation h2 { font-family: var(--font-display); font-size: clamp(1.8rem, 4vw, 2.8rem); }
.invitation p { margin-bottom: 0; color: var(--ink-650); }
@media (max-width: 900px) {
  .hero-grid { min-height: auto; grid-template-columns: 1fr; padding-block: 3.5rem; }
  .community-card { max-width: 37rem; transform: none; }
  .announcement-grid { grid-template-columns: 1fr 1fr; }
  .announcement-card.featured { grid-column: 1 / -1; }
}
@media (max-width: 650px) {
  .hero-grid { padding-block: 2.5rem; }
  .hero-actions .button { width: 100%; }
  .announcement-grid, .service-grid { grid-template-columns: 1fr; }
  .announcement-card.featured { grid-column: auto; }
  .invitation { align-items: stretch; flex-direction: column; }
}
</style>
