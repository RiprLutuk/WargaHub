<script setup lang="ts">
import { ArrowRight, CalendarDays, CheckCircle2, Megaphone, ShieldCheck, Video, WalletCards } from 'lucide-vue-next';
import { getActivePinia } from 'pinia';
import { computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import StatePanel from '../../components/StatePanel.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import type { Announcement } from '../../lib/demo';
import { formatDate } from '../../lib/format';
import { adaptPublicSite } from '../../lib/view-models';
import { useSessionStore } from '../../stores/session';

const session = computed(() => (getActivePinia() ? useSessionStore() : null));
const site = useResource(async () => adaptPublicSite(await api.get<unknown>('/public/site')));
const announcements = useResource(() => api.get<Announcement[]>('/public/announcements'));
const visibleAnnouncements = computed(() => announcements.data.value?.slice(0, 3) ?? []);

onMounted(() => {
  session.value?.ensureSession();
});
</script>

<template>
  <section class="hero" aria-labelledby="hero-title">
    <div class="container hero-grid">
      <div class="hero-content">
        <span class="eyebrow">Pengumuman & Layanan Digital Warga</span>
        <h1 id="hero-title" class="display-title">{{ site.data.value?.name ?? 'WargaHub' }}</h1>
        <p class="hero-lead">
          {{ site.data.value?.description ?? 'Platform gotong-royong warga.' }} Kertas kerja kas terbuka, pengaduan terstruktur, dan pembagian peran yang manusiawi tanpa grup percakapan yang bising.
        </p>

        <div class="hero-actions">
          <RouterLink
            v-if="session?.isAuthenticated && session?.user"
            class="button button-lg"
            :to="session.isAdmin ? '/admin' : '/app'"
          >
            Buka portal {{ session.user.name.split(' ')[0] }} <ArrowRight :size="17" aria-hidden="true" />
          </RouterLink>
          <RouterLink v-else class="button button-lg" to="/login">
            Masuk portal warga <ArrowRight :size="17" aria-hidden="true" />
          </RouterLink>
          <RouterLink class="button button-secondary button-lg" to="/transparansi">Lihat transparansi kas</RouterLink>
        </div>
      </div>

      <aside class="hero-sidebar" aria-label="Informasi lingkungan singkat">
        <div class="community-card">
          <span class="card-kicker">Prinsip dasar</span>
          <h2>Tenang, transparan, dan tidak memaksa.</h2>
          <ul>
            <li>Privasi warga terjaga dan data tidak dijual.</li>
            <li>Pengumuman resmi tidak tertumpuk di obrolan grup.</li>
            <li>Iuran dan tagihan tercatat terbuka untuk audit.</li>
          </ul>
        </div>

        <template v-if="site.data.value">
          <div class="meta-strip card">
            <div><small>Lingkungan</small><strong>{{ site.data.value.shortName }}</strong></div>
            <div><small>Alamat</small><strong>{{ site.data.value.address }}</strong></div>
            <div><small>Kontak Siaga</small><strong>{{ site.data.value.emergencyPhone }}</strong></div>
          </div>
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
        <div class="announcement-meta">
          <span class="category-pill">{{ item.category }}</span>
          <time :datetime="item.publishedAt">{{ formatDate(item.publishedAt) }}</time>
        </div>
        <h3>{{ item.title }}</h3>
        <p>{{ item.summary }}</p>
        <RouterLink :to="`/pengumuman#${item.id}`" class="read-more-link" :aria-label="`Baca pengumuman ${item.title}`">
          <span>Baca selengkapnya</span> <ArrowRight :size="15" aria-hidden="true" />
        </RouterLink>
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
        <article class="service-card">
          <span class="icon-box"><Megaphone :size="24" /></span>
          <h3>Informasi terstruktur</h3>
          <p>Pengumuman resmi tidak lagi tenggelam di antara ratusan pesan.</p>
        </article>
        <article class="service-card">
          <span class="icon-box"><WalletCards :size="24" /></span>
          <h3>Keuangan transparan</h3>
          <p>Ringkasan kas mudah diperiksa tanpa membuka data pribadi warga.</p>
        </article>
        <article class="service-card">
          <span class="icon-box"><CalendarDays :size="24" /></span>
          <h3>Partisipasi fleksibel</h3>
          <p>Atur jadwal dan pilih kontribusi yang realistis untuk keadaan Anda.</p>
        </article>
      </div>
    </div>
  </section>

  <!-- Dynamic Premium Bottom CTA Card -->
  <section class="container invitation-section">
    <div class="cta-banner">
      <div class="cta-content">
        <div v-if="session?.isAuthenticated && session?.user" class="cta-text-group">
          <span class="cta-badge">
            <i class="beacon-pulse" />
            Portal Layanan Aktif: {{ session.user.roles?.[0] ?? 'Warga' }}
          </span>
          <h2>Selamat datang kembali, {{ session.user.name }}!</h2>
          <p>Akses privat untuk iuran rumah, pengaduan, jadwal ronda, dan pengumuman lingkungan.</p>
          <div class="cta-pills">
            <span><CheckCircle2 :size="14" /> Tagihan Iuran</span>
            <span><CheckCircle2 :size="14" /> Jadwal Ronda</span>
            <span><CheckCircle2 :size="14" /> CCTV Live 1080p</span>
          </div>
        </div>
        <div v-else class="cta-text-group">
          <span class="cta-badge">
            <i class="beacon-pulse" />
            Layanan Digital RT/RW Terpadu
          </span>
          <h2>Selesaikan kebutuhan warga tanpa percakapan panjang.</h2>
          <p>Lihat iuran rumah, laporkan masalah, pilih kontribusi kegiatan, dan kelola jadwal ronda dari portal privat.</p>
          <div class="cta-pills">
            <span><CheckCircle2 :size="14" /> Transparansi Kas</span>
            <span><CheckCircle2 :size="14" /> Layanan Surat Digital</span>
            <span><CheckCircle2 :size="14" /> CCTV Lingkungan</span>
          </div>
        </div>

        <div class="cta-actions">
          <RouterLink
            v-if="session?.isAuthenticated && session?.user"
            class="cta-primary-btn"
            :to="session.isAdmin ? '/admin' : '/app'"
          >
            <span>Buka Portal {{ session.user.name.split(' ')[0] }}</span>
            <ArrowRight :size="17" aria-hidden="true" />
          </RouterLink>
          <RouterLink v-else class="cta-primary-btn" to="/login">
            <span>Masuk Portal Warga</span>
            <ArrowRight :size="17" aria-hidden="true" />
          </RouterLink>

          <RouterLink to="/fasilitas/cctv" class="cta-secondary-btn">
            <Video :size="16" />
            <span>Pantau CCTV Live</span>
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--line);
  background: radial-gradient(ellipse at 85% 15%, rgba(20, 184, 166, 0.16) 0%, transparent 35rem),
              linear-gradient(170deg, #f0fdf4 0%, #ffffff 50%, #f8faf9 100%);
}
.hero-pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(11, 120, 108, 0.07) 1px, transparent 1px);
  background-size: 24px 24px;
  pointer-events: none;
}
.hero-grid {
  display: grid;
  min-height: auto;
  grid-template-columns: 1.15fr 0.85fr;
  align-items: start;
  gap: clamp(2rem, 5vw, 4rem);
  padding-block: clamp(4rem, 6vw, 5.5rem);
}
.hero-content { display: grid; gap: 0.8rem; }
.display-title { font-size: clamp(2.8rem, 5.5vw, 4.5rem); }
.hero-lead { max-width: 38rem; color: var(--ink-650); font-size: 1.12rem; line-height: 1.6; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 0.85rem; margin-top: 0.8rem; }
.text-link { display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 600; font-size: 0.92rem; }

.hero-sidebar { display: grid; gap: 1rem; }
.community-card {
  display: grid;
  gap: 0.6rem;
  padding: 1.75rem;
  border-radius: var(--radius-xl);
  background: #ffffff;
  border: 1px solid var(--line);
  box-shadow: var(--shadow-sm);
  transform: rotate(-1deg);
  transition: transform 0.25s ease;
}
.community-card:hover { transform: rotate(0deg) translateY(-2px); }
.card-kicker { font-size: 0.75rem; font-weight: 600; color: var(--teal-700); text-transform: uppercase; letter-spacing: 0.05em; }
.community-card h2 { font-size: 1.25rem; margin: 0; font-weight: 500; }
.community-card ul { margin: 0; padding-left: 1.1rem; color: var(--ink-650); font-size: 0.9rem; display: grid; gap: 0.4rem; }

.meta-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  padding: 0.9rem 1.1rem;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
}
.meta-strip small { display: block; color: var(--ink-500); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
.meta-strip strong { display: block; color: var(--ink-950); font-size: 0.88rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }

.public-section { padding-block: clamp(3rem, 6vw, 5rem); }
.announcement-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.25rem; align-items: start; }
.announcement-card {
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--line);
  background: #ffffff;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
.announcement-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(16, 43, 39, 0.06);
  border-color: rgba(13, 148, 136, 0.25);
}
.announcement-card.featured {
  background: linear-gradient(135deg, #064e3b 0%, #022c22 100%);
  color: #ffffff;
  border: 1px solid rgba(16, 185, 129, 0.25);
  box-shadow: 0 12px 30px rgba(6, 78, 59, 0.2);
}
.announcement-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .5rem;
  margin-bottom: 1.3rem;
  font-size: .75rem;
  font-weight: 600;
  letter-spacing: .04em;
  text-transform: uppercase;
}
.category-pill {
  padding: 0.25rem 0.6rem;
  border-radius: 0.4rem;
  background: var(--teal-50);
  color: var(--teal-800);
}
.featured .category-pill {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.4);
}
.announcement-meta time { color: var(--ink-500); }
.featured .announcement-meta time { color: rgba(255, 255, 255, 0.7); }

.announcement-card h3 { font-size: 1.25rem; font-weight: 500; margin-bottom: 0.6rem; color: var(--ink-950); }
.featured h3 { color: #ffffff; font-weight: 500; }

.announcement-card p { color: var(--ink-650); font-size: 0.95rem; }
.featured p { color: rgba(255, 255, 255, 0.85); }

.read-more-link {
  display: inline-flex;
  align-items: center;
  gap: .35rem;
  margin-top: auto;
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--teal-700);
  text-decoration: none !important;
}
.featured .read-more-link { color: #fbbf24; }
.read-more-link:hover { color: var(--teal-800); }
.featured .read-more-link:hover { color: #fef08a; }

.service-band { padding-block: clamp(3.5rem, 8vw, 6rem); background: #f1f5f9; border-y: 1px solid var(--line); }
.service-band .section-heading > p { max-width: 35rem; color: var(--ink-650); font-size: 1.05rem; }
.service-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }
.service-card {
  padding: 1.75rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--line);
  background: #ffffff;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.service-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}
.icon-box {
  display: grid;
  width: 3rem;
  height: 3rem;
  margin-bottom: 1.2rem;
  place-items: center;
  border-radius: 0.85rem;
  background: linear-gradient(135deg, var(--teal-50), var(--teal-100));
  color: var(--teal-700);
  box-shadow: 0 4px 10px rgba(15, 118, 110, 0.1);
}
.service-card h3 { font-size: 1.2rem; font-weight: 500; margin-bottom: 0.5rem; }
.service-card p { margin-bottom: 0; color: var(--ink-650); font-size: 0.95rem; }

/* Dynamic Premium CTA Banner */
.invitation-section {
  margin-block: clamp(2.5rem, 6vw, 4rem);
}
.cta-banner {
  position: relative;
  overflow: hidden;
  padding: clamp(1.5rem, 4vw, 2.6rem);
  border: 1px solid var(--teal-100);
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, #f7fcfb 0%, #edf8f5 100%);
  box-shadow: 0 10px 28px rgba(16, 43, 39, 0.07);
  color: var(--ink-950);
}
.cta-banner::before {
  content: '';
  position: absolute;
  inset: auto -5rem -8rem auto;
  width: 18rem;
  height: 18rem;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(20, 184, 166, 0.13) 0%, transparent 70%);
  pointer-events: none;
}
.cta-content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2.5rem;
}
.cta-text-group { max-width: 44rem; }
.cta-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.28rem 0.65rem;
  border-radius: 999px;
  background: var(--paper);
  border: 1px solid var(--teal-100);
  color: var(--teal-800);
  font-size: 0.76rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}
.beacon-pulse {
  display: inline-block;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--teal-600);
  box-shadow: 0 0 8px rgba(13, 148, 136, 0.4);
}
.cta-banner h2 {
  max-width: 38rem;
  font-size: clamp(1.5rem, 3vw, 2.15rem);
  font-weight: 500;
  color: var(--ink-950);
  margin-bottom: 0.55rem;
  line-height: 1.2;
}
.cta-banner p {
  max-width: 39rem;
  color: var(--ink-650);
  font-size: 0.98rem;
  margin-bottom: 1.25rem;
  line-height: 1.55;
}
.cta-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}
.cta-pills span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.65rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--teal-100);
  color: var(--ink-800);
  font-size: 0.8rem;
  font-weight: 600;
}
.cta-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: none;
}
.cta-primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  min-width: 12rem;
  padding: 0.75rem 1.2rem;
  border-radius: 0.85rem;
  background: var(--teal-700);
  color: #ffffff !important;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none !important;
  box-shadow: 0 8px 20px rgba(15, 118, 110, 0.25);
  transition: all 0.2s ease;
}
.cta-primary-btn:hover {
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(15, 118, 110, 0.35);
}
.cta-secondary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.7rem 1.2rem;
  border-radius: 0.85rem;
  background: var(--paper);
  border: 1px solid var(--line-strong);
  color: var(--ink-800) !important;
  font-size: 0.86rem;
  font-weight: 600;
  text-decoration: none !important;
  transition: all 0.15s ease;
}
.cta-secondary-btn:hover {
  background: var(--teal-50);
  border-color: var(--teal-300);
}

@media (max-width: 900px) {
  .hero-grid { min-height: auto; grid-template-columns: 1fr; padding-block: 3.5rem; }
  .community-card { max-width: 37rem; transform: none; }
  .announcement-grid { grid-template-columns: 1fr 1fr; }
  .announcement-card.featured { grid-column: 1 / -1; }
  .cta-content { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
  .cta-actions { width: 100%; flex-direction: row; }
  .cta-primary-btn, .cta-secondary-btn { flex: 1; text-align: center; justify-content: center; }
}
@media (min-width: 651px) and (max-width: 1100px) {
  .hero-grid { grid-template-columns: 1fr; gap: 2rem; padding-block: 3.5rem; }
  .hero-sidebar { grid-template-columns: minmax(0, 1.15fr) minmax(17rem, .85fr); align-items: start; }
  .announcement-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .announcement-card.featured { grid-column: span 2; }
  .service-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .service-card:last-child { grid-column: span 2; }
}
/* Tablet and small laptop widths: keep cards readable instead of forcing
   three narrow columns with large equal-height gaps. */
@media (min-width: 1101px) and (max-width: 1300px) {
  .announcement-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .announcement-card.featured { grid-column: span 2; }
  .service-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .service-card:last-child { grid-column: span 2; }
}
@media (max-width: 650px) {
  .hero-grid { padding-block: 2.5rem; }
  .hero-actions .button { width: 100%; }
  .announcement-grid, .service-grid { display: flex; gap: 1rem; margin-inline: 0; padding: .2rem .25rem .35rem; overflow-x: auto; scroll-padding-inline: .25rem; scroll-snap-type: x mandatory; scrollbar-width: none; }
  .announcement-grid::-webkit-scrollbar, .service-grid::-webkit-scrollbar { display: none; }
  .announcement-card, .service-card { flex: 0 0 min(84vw, 20rem); scroll-snap-align: start; }
  .announcement-card.featured { grid-column: auto; }
  .cta-actions { flex-direction: column; }
}
</style>
