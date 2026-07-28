<script setup lang="ts">
import { ArrowRight, CalendarDays, CheckCircle2, Megaphone, ShieldCheck, WalletCards } from 'lucide-vue-next';
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
  <section class="hero">
    <div class="hero-pattern" aria-hidden="true" />
    <div class="container hero-grid">
      <div class="hero-copy">
        <span class="hero-kicker"><CheckCircle2 :size="15" aria-hidden="true" /> Ruang bersama yang lebih ringan & manusiawi</span>
        <h1>WargaHub</h1>
        <p class="hero-lead">Gotong royong tanpa mengorbankan kewarasan.</p>
        <p class="hero-description">Informasi resmi, layanan warga, dan transparansi lingkungan—rapi dalam satu tempat, tanpa menambah tekanan sosial.</p>
        <div class="hero-actions">
          <RouterLink class="button" to="/pengumuman">Lihat informasi terbaru <ArrowRight :size="17" aria-hidden="true" /></RouterLink>

          <!-- Dynamic Hero Secondary Action -->
          <RouterLink
            v-if="session?.isAuthenticated && session?.user"
            class="button button-secondary"
            :to="session.isAdmin ? '/admin' : '/app'"
          >
            Buka Portal {{ session.user.name }}
          </RouterLink>
          <RouterLink v-else class="button button-secondary" to="/login">
            Masuk sebagai warga
          </RouterLink>
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

  <!-- Dynamic Bottom CTA Card -->
  <section class="container invitation">
    <div v-if="session?.isAuthenticated && session?.user">
      <span class="eyebrow">Sesi aktif: {{ session.user.roles?.[0] ?? 'Warga' }}</span>
      <h2>Selamat datang kembali, {{ session.user.name }}!</h2>
      <p>Akses cepat ke tagihan rumah Anda, pengaduan, giliran ronda, dan pengumuman warga.</p>
    </div>
    <div v-else>
      <span class="eyebrow">Khusus penghuni</span>
      <h2>Selesaikan kebutuhan warga tanpa percakapan panjang.</h2>
      <p>Lihat tagihan rumah, laporkan masalah, pilih kontribusi kegiatan, dan kelola jadwal ronda dari portal privat.</p>
    </div>

    <RouterLink
      v-if="session?.isAuthenticated && session?.user"
      class="button button-lg"
      :to="session.isAdmin ? '/admin' : '/app'"
    >
      Buka portal {{ session.user.name }} <ArrowRight :size="17" aria-hidden="true" />
    </RouterLink>
    <RouterLink v-else class="button button-lg" to="/login">
      Buka portal warga <ArrowRight :size="17" aria-hidden="true" />
    </RouterLink>
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
  opacity: .12;
  background-image: linear-gradient(var(--teal-700) 1px, transparent 1px), linear-gradient(90deg, var(--teal-700) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse at 50% 50%, black 40%, transparent 80%);
}
.hero-grid {
  position: relative;
  display: grid;
  min-height: 36rem;
  grid-template-columns: 1.3fr .9fr;
  align-items: center;
  gap: clamp(2rem, 5vw, 4rem);
  padding-block: 4.5rem;
}
.hero-copy { max-width: 43rem; }
.hero-kicker {
  display: inline-flex;
  align-items: center;
  gap: .45rem;
  margin-bottom: 1.2rem;
  padding: .4rem .75rem;
  border: 1px solid var(--teal-100);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--teal-700);
  font-size: .82rem;
  font-weight: 800;
  box-shadow: 0 2px 8px rgba(15, 118, 110, 0.08);
}
.hero h1 { margin-bottom: .25rem; color: var(--ink-950); }
.hero-lead {
  margin-bottom: 1rem;
  color: var(--teal-700);
  font-size: clamp(1.45rem, 3vw, 2.25rem);
  font-weight: 850;
  line-height: 1.2;
}
.hero-description { max-width: 39rem; margin-bottom: 1.8rem; color: var(--ink-650); font-size: 1.08rem; }
.hero-actions, .trust-row { display: flex; flex-wrap: wrap; gap: .85rem; }
.trust-row { margin-top: 1.6rem; color: var(--ink-650); font-size: .85rem; font-weight: 750; }
.trust-row span { display: inline-flex; align-items: center; gap: .4rem; }

.community-card {
  padding: clamp(1.5rem, 3vw, 2.4rem);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-xl);
  background: #ffffff;
  box-shadow: var(--shadow-md);
  margin-block: 1rem;
}
.community-card-top {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin: -0.2rem 0 1.5rem;
  color: var(--success-700);
  font-size: .78rem;
  font-weight: 850;
  letter-spacing: 0.02em;
}
.live-dot {
  width: .6rem;
  height: .6rem;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 4px var(--success-100);
}
.community-card h2 { font-size: 2.1rem; color: var(--ink-950); }
.community-card p { color: var(--ink-650); }
.community-stats { display: grid; grid-template-columns: 1fr 1fr; gap: .85rem; margin: 1.6rem 0; }
.community-stats div { padding: 1rem; border-radius: var(--radius-md); background: var(--teal-50); border: 1px solid var(--teal-100); }
.community-stats dt { color: var(--ink-650); font-size: .75rem; font-weight: 750; }
.community-stats dd { margin: .25rem 0 0; font-size: 1.8rem; font-weight: 850; color: var(--teal-800); }
.community-address { padding-top: 1rem; border-top: 1px solid var(--line); color: var(--ink-650); font-size: .85rem; font-weight: 600; }

.public-section { padding-block: clamp(3.5rem, 8vw, 6.5rem); }
.text-link { display: inline-flex; align-items: center; gap: .35rem; font-weight: 800; color: var(--teal-700); text-decoration: none !important; }
.text-link:hover { color: var(--teal-800); }

.announcement-grid { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 1.25rem; }
.announcement-card {
  display: flex;
  min-height: 17rem;
  flex-direction: column;
  padding: 1.5rem;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
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
.service-card h3 { font-size: 1.2rem; margin-bottom: 0.5rem; }
.service-card p { margin-bottom: 0; color: var(--ink-650); font-size: 0.95rem; }

.invitation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  margin-block: 4.5rem;
  padding: clamp(2rem, 4vw, 3.5rem);
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #f59e0b;
  box-shadow: 0 10px 30px rgba(245, 158, 11, 0.15);
}
.invitation > div { max-width: 44rem; }
.invitation h2 { font-size: clamp(1.8rem, 4vw, 2.7rem); color: #78350f; margin-bottom: 0.5rem; }
.invitation p { margin-bottom: 0; color: #92400e; font-size: 1.05rem; font-weight: 600; }
.button-lg { min-height: 3.1rem; padding: 0.8rem 1.4rem; font-size: 1rem; }

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
