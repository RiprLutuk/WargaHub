<script setup lang="ts">
import { ArrowRight, Building2, Camera, CheckCircle2, Clock, Dumbbell, Home, Info, Maximize2, MoveDown, MoveLeft, MoveRight, MoveUp, Package, ShieldCheck, Sparkles, Video, X } from 'lucide-vue-next';
import { getActivePinia } from 'pinia';
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import { formatRupiah } from '../../lib/format';
import { useSessionStore } from '../../stores/session';

interface PublicFacility {
  id: string;
  name: string;
  category: string;
  description: string;
  capacity?: number | null;
  fee: number;
  deposit: number;
  requiresApproval?: boolean;
}

const props = defineProps<{ defaultTab?: string }>();
const route = useRoute();
const router = useRouter();
const session = computed(() => (getActivePinia() ? useSessionStore() : null));

const getInitialTab = (): 'FACILITIES' | 'CCTV' => {
  if (props.defaultTab?.toUpperCase() === 'CCTV') return 'CCTV';
  if (route.path.endsWith('/cctv')) return 'CCTV';
  if ((route.query.tab as string)?.toUpperCase() === 'CCTV') return 'CCTV';
  return 'FACILITIES';
};

const activeTab = ref<'FACILITIES' | 'CCTV'>(getInitialTab());
const selectedCategory = ref('SEMUA');
const facilities = useResource(() => api.get<PublicFacility[]>('/public/facilities'));
const activeCctvModal = ref<any | null>(null);

watch(() => [route.path, route.query.tab], () => {
  activeTab.value = getInitialTab();
});

function switchTab(tab: 'FACILITIES' | 'CCTV') {
  activeTab.value = tab;
  if (tab === 'CCTV') {
    router.replace({ path: '/fasilitas/cctv' });
  } else {
    router.replace({ path: '/fasilitas' });
  }
}

function handleExpandCctv(cam: any) {
  if (session.value?.isAuthenticated) {
    activeCctvModal.value = cam;
  } else {
    router.push({ path: '/login', query: { redirect: '/fasilitas/cctv' } });
  }
}

const portalTarget = computed(() => (session.value?.isAuthenticated ? '/app/fasilitas' : '/login'));

const categories = computed(() => ['SEMUA', ...new Set(facilities.data.value?.map((f) => f.category) ?? [])]);

const filteredFacilities = computed(() => {
  const list = facilities.data.value ?? [];
  if (selectedCategory.value === 'SEMUA') return list;
  return list.filter((f) => f.category === selectedCategory.value);
});

function getFacilityIcon(category: string) {
  const cat = category.toLowerCase();
  if (cat.includes('gedung') || cat.includes('ruang')) return Building2;
  if (cat.includes('olahraga')) return Dumbbell;
  if (cat.includes('inventaris') || cat.includes('tenda')) return Package;
  return Home;
}

const cctvFeeds = [
  {
    id: 'cctv-1',
    name: 'CCTV 01 — Gerbang Utama RT 04',
    location: 'Akses Keluar-Masuk Utama Warga',
    status: 'ONLINE',
    quality: '1080p Full HD',
    fps: '60 FPS',
    thumbnail: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  },
  {
    id: 'cctv-2',
    name: 'CCTV 02 — Pos Ronda Central',
    location: 'Pusat Keamanan & Siskamling',
    status: 'ONLINE',
    quality: '1080p Full HD',
    fps: '60 FPS',
    thumbnail: 'linear-gradient(135deg, #064e3b 0%, #0f172a 100%)',
  },
  {
    id: 'cctv-3',
    name: 'CCTV 03 — Taman Warga & Area Bermain',
    location: 'Fasilitas Terbuka & Balai Pertemuan',
    status: 'ONLINE',
    quality: '1080p Full HD',
    fps: '60 FPS',
    thumbnail: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
  },
  {
    id: 'cctv-4',
    name: 'CCTV 04 — Pertigaan Utama Blok B',
    location: 'Simpang Perlintasan Kendaraan Warga',
    status: 'ONLINE',
    quality: '1080p Full HD',
    fps: '60 FPS',
    thumbnail: 'linear-gradient(135deg, #312e81 0%, #0f172a 100%)',
  },
];
</script>

<template>
  <div class="container public-page-shell">
    <!-- Header Section -->
    <header class="page-header">
      <div class="header-badge">
        <Sparkles :size="14" class="badge-icon" />
        <span>Fasilitas & Pemantauan Lingkungan</span>
      </div>
      <h1>Fasilitas & Pemantauan CCTV</h1>
      <p class="header-desc">
        Aset bersama, peminjaman balai warga & inventaris hajatan, serta akses live pemantauan CCTV area publik untuk keamanan warga 24/7.
      </p>

      <!-- Main Navigation Tabs -->
      <div class="main-tabs">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'FACILITIES' }"
          @click="switchTab('FACILITIES')"
        >
          <Building2 :size="16" />
          <span>Fasilitas & Inventaris</span>
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: activeTab === 'CCTV' }"
          @click="switchTab('CCTV')"
        >
          <Camera :size="16" />
          <span>CCTV Lingkungan (Live)</span>
        </button>
      </div>
    </header>

    <!-- Tab 1: Facilities & Inventory -->
    <div v-if="activeTab === 'FACILITIES'">
      <!-- State Panels -->
      <StatePanel v-if="facilities.loading.value" state="loading" />
      <StatePanel v-else-if="facilities.error.value" state="error" :message="facilities.error.value" @retry="facilities.reload" />
      <EmptyState v-else-if="!facilities.data.value?.length" title="Belum ada fasilitas dipublikasikan" message="Pengurus belum menambahkan daftar fasilitas publik." />

      <template v-else>
        <!-- Category Filter Pills -->
        <nav class="category-pills" aria-label="Filter kategori fasilitas">
          <button
            v-for="cat in categories"
            :key="cat"
            type="button"
            class="pill-btn"
            :class="{ active: selectedCategory === cat }"
            @click="selectedCategory = cat"
          >
            {{ cat === 'SEMUA' ? 'Semua Fasilitas' : cat }}
          </button>
        </nav>

        <!-- Facility Cards Grid -->
        <div class="facilities-grid">
          <article v-for="item in filteredFacilities" :key="item.id" class="facility-card">
            <div class="card-header">
              <div class="icon-avatar">
                <component :is="getFacilityIcon(item.category)" :size="22" />
              </div>
              <div class="header-tags">
                <span class="category-chip">{{ item.category }}</span>
                <span class="status-chip free" v-if="item.fee === 0">
                  <CheckCircle2 :size="13" /> Gratis Warga
                </span>
                <span class="status-chip rental" v-else>
                  Sewa Bersama
                </span>
              </div>
            </div>

            <div class="card-body">
              <h2 class="facility-title">{{ item.name }}</h2>
              <p class="facility-desc">{{ item.description }}</p>
            </div>

            <div class="card-specs">
              <div class="spec-item">
                <span class="spec-label">Biaya Penggunaan</span>
                <span class="spec-value highlight">{{ item.fee > 0 ? formatRupiah(item.fee) : 'Gratis' }}</span>
              </div>
              <div class="spec-item" v-if="item.deposit > 0">
                <span class="spec-label">Deposit Jaminan</span>
                <span class="spec-value">{{ formatRupiah(item.deposit) }}</span>
              </div>
              <div class="spec-item" v-if="item.capacity">
                <span class="spec-label">Kapasitas Maksimal</span>
                <span class="spec-value">{{ item.capacity }} Orang</span>
              </div>
            </div>

            <div class="card-footer">
              <div class="approval-note">
                <Clock :size="14" />
                <span>Perlu reservasi via portal</span>
              </div>
              <RouterLink :to="portalTarget" class="book-link">
                Pinjam <ArrowRight :size="15" />
              </RouterLink>
            </div>
          </article>
        </div>
      </template>
    </div>

    <!-- Tab 2: CCTV Monitoring -->
    <div v-else class="cctv-section">
      <div class="cctv-info-banner">
        <ShieldCheck :size="22" class="shield-icon" />
        <div>
          <h3>Pemantauan CCTV Lingkungan 24 Jam</h3>
          <p>Akses siaran langsung CCTV titik publik dipasang untuk menjaga ketertiban, memantau keamanan pos ronda, dan keselamatan warga. Sesi warga terdaftar dapat membuka mode Layar Penuh HD.</p>
        </div>
      </div>

      <div class="cctv-grid">
        <article v-for="cam in cctvFeeds" :key="cam.id" class="cctv-card">
          <div class="cctv-screen" :style="{ background: cam.thumbnail }">
            <div class="screen-overlay">
              <span class="live-tag"><span class="pulse-dot" /> LIVE</span>
              <span class="hd-tag">{{ cam.quality }}</span>
            </div>
            <div class="cam-watermark">
              <Video :size="28" />
              <span>{{ cam.name }}</span>
            </div>
          </div>
          <div class="cctv-details">
            <h2>{{ cam.name }}</h2>
            <p>{{ cam.location }}</p>
            <div class="cctv-status-row">
              <span class="status-online">● Stream Siaga Normal</span>
              <button type="button" class="expand-btn" @click="handleExpandCctv(cam)">
                Buka Layar Penuh <Maximize2 :size="13" />
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>

    <!-- Fullscreen CCTV Stream Modal for Authenticated Residents -->
    <Teleport to="body">
      <div v-if="activeCctvModal" class="cctv-modal-overlay" @click.self="activeCctvModal = null">
        <div class="cctv-modal-card">
          <header class="modal-header">
            <div class="modal-title-wrap">
              <span class="live-badge"><span class="pulse-dot" /> STREAM LIVE 1080P</span>
              <h2>{{ activeCctvModal.name }}</h2>
            </div>
            <button type="button" class="close-modal-btn" aria-label="Tutup Layar Penuh" @click="activeCctvModal = null">
              <X :size="22" />
            </button>
          </header>

          <div class="modal-video-viewport" :style="{ background: activeCctvModal.thumbnail }">
            <div class="viewport-hud">
              <div class="hud-top">
                <span>REC ● {{ new Date().toLocaleTimeString('id-ID') }}</span>
                <span>{{ activeCctvModal.quality }} · {{ activeCctvModal.fps }}</span>
              </div>
              <div class="hud-center">
                <Video :size="48" class="hud-cam-icon" />
                <span>Siaran Langsung Terenkripsi RT/RW</span>
              </div>
              <div class="hud-bottom">
                <span>{{ activeCctvModal.location }}</span>
                <span class="ptz-active">PTZ ACTIVE</span>
              </div>
            </div>
          </div>

          <footer class="modal-footer">
            <div class="ptz-controls">
              <span class="ptz-label">Kontrol PTZ (Kamera):</span>
              <button type="button" class="ptz-btn" title="Geser Atas"><MoveUp :size="15" /></button>
              <button type="button" class="ptz-btn" title="Geser Bawah"><MoveDown :size="15" /></button>
              <button type="button" class="ptz-btn" title="Geser Kiri"><MoveLeft :size="15" /></button>
              <button type="button" class="ptz-btn" title="Geser Kanan"><MoveRight :size="15" /></button>
            </div>
            <div class="modal-actions">
              <RouterLink to="/app/fasilitas" class="button button-sm">
                Lihat di Portal Warga →
              </RouterLink>
            </div>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.public-page-shell {
  padding-block: clamp(3rem, 6vw, 5.5rem);
}

.page-header {
  margin-bottom: 2.8rem;
  max-width: 52rem;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.38rem 0.85rem;
  border-radius: 999px;
  background: var(--teal-50);
  border: 1px solid var(--teal-200);
  color: var(--teal-800);
  font-size: 0.8rem;
  font-weight: 800;
  margin-bottom: 1rem;
}

.badge-icon {
  color: var(--teal-600);
}

.page-header h1 {
  font-size: clamp(2.2rem, 4.5vw, 3.2rem);
  font-weight: 850;
  line-height: 1.15;
  color: var(--ink-950);
  margin-bottom: 0.85rem;
  letter-spacing: -0.02em;
}

.header-desc {
  font-size: 1.1rem;
  line-height: 1.65;
  color: var(--ink-650);
  margin: 0 0 1.5rem;
}

/* Navigation Tabs */
.main-tabs {
  display: flex;
  gap: 0.8rem;
  margin-top: 1.5rem;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  border-radius: 0.75rem;
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--ink-700);
  font-size: 0.92rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  border-color: var(--teal-500);
  background: var(--teal-50);
  color: var(--teal-800);
}

.tab-btn.active {
  background: var(--teal-700);
  border-color: var(--teal-700);
  color: white;
  box-shadow: 0 4px 14px rgba(15, 118, 110, 0.25);
}

/* Category Filter Pills */
.category-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 2.2rem;
}

.pill-btn {
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--ink-700);
  font-size: 0.88rem;
  font-weight: 750;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pill-btn:hover {
  border-color: var(--teal-400);
  background: var(--cream-50);
  color: var(--teal-800);
}

.pill-btn.active {
  background: var(--teal-700);
  border-color: var(--teal-700);
  color: white;
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.2);
}

/* Facilities Grid Layout */
.facilities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
  gap: 1.6rem;
}

.facility-card {
  display: flex;
  flex-direction: column;
  padding: 1.8rem;
  border-radius: var(--radius-xl);
  border: 1px solid #cbd5e1;
  background: #ffffff;
  box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.03);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.facility-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px -4px rgba(15, 118, 110, 0.12), 0 4px 12px -2px rgba(15, 23, 42, 0.05);
  border-color: var(--teal-300, #99f6e4);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.icon-avatar {
  display: grid;
  width: 3.4rem;
  height: 3.4rem;
  place-items: center;
  border-radius: 1.1rem;
  background: linear-gradient(135deg, var(--teal-100), var(--teal-50));
  color: var(--teal-700);
  border: 1px solid var(--teal-200);
}

.header-tags {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
}

.category-chip {
  padding: 0.22rem 0.6rem;
  border-radius: 0.45rem;
  background: var(--cream-100);
  color: var(--ink-750);
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.22rem 0.6rem;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 800;
}

.status-chip.free {
  background: var(--success-100);
  color: var(--success-800);
}

.status-chip.rental {
  background: var(--amber-100);
  color: var(--amber-800);
}

.card-body {
  margin-bottom: 1.4rem;
}

.facility-title {
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.3;
  color: var(--ink-950);
  margin: 0 0 0.5rem;
}

.facility-desc {
  font-size: 0.94rem;
  line-height: 1.6;
  color: var(--ink-650);
  margin: 0;
}

.card-specs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.8rem;
  padding: 1rem 1.1rem;
  border-radius: var(--radius-md);
  background: var(--cream-50);
  border: 1px solid var(--line);
  margin-top: auto;
  margin-bottom: 1.25rem;
}

.spec-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.spec-label {
  font-size: 0.72rem;
  font-weight: 750;
  color: var(--ink-500);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.spec-value {
  font-size: 0.95rem;
  font-weight: 850;
  color: var(--ink-900);
}

.spec-value.highlight {
  color: var(--teal-700);
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.9rem;
  border-top: 1px solid var(--line);
}

.approval-note {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: var(--ink-500);
  font-weight: 700;
}

.book-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.86rem;
  font-weight: 800;
  color: var(--teal-700);
  text-decoration: none;
  transition: transform 0.2s ease;
}

.book-link:hover {
  transform: translateX(3px);
  color: var(--teal-800);
}

/* CCTV Section */
.cctv-section {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.cctv-info-banner {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.4rem 1.6rem;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--teal-50) 0%, #ecfdf5 100%);
  border: 1px solid var(--teal-200);
  color: var(--ink-900);
}

.cctv-info-banner h3 {
  margin: 0 0 0.3rem;
  font-size: 1.1rem;
  color: var(--teal-900);
}

.cctv-info-banner p {
  margin: 0;
  color: var(--ink-650);
  font-size: 0.94rem;
  line-height: 1.6;
}

.cctv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
  gap: 1.6rem;
}

.cctv-card {
  border-radius: var(--radius-xl);
  border: 1px solid #cbd5e1;
  background: #ffffff;
  box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.cctv-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px -4px rgba(15, 118, 110, 0.12);
  border-color: var(--teal-300, #99f6e4);
}

.cctv-screen {
  position: relative;
  height: 12rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1rem;
  color: white;
}

.screen-overlay {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.live-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.6rem;
  border-radius: 0.4rem;
  background: rgba(225, 29, 72, 0.9);
  color: white;
  font-size: 0.72rem;
  font-weight: 850;
}

.pulse-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: white;
  animation: pulse-cctv 1.5s infinite;
}

@keyframes pulse-cctv {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.hd-tag {
  padding: 0.2rem 0.5rem;
  border-radius: 0.35rem;
  background: rgba(0, 0, 0, 0.6);
  font-size: 0.7rem;
  font-weight: 800;
}

.cam-watermark {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.85rem;
  font-weight: 750;
}

.cctv-details {
  padding: 1.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.cctv-details h2 {
  font-size: 1.15rem;
  margin: 0;
  color: var(--ink-950);
}

.cctv-details p {
  margin: 0 0 1rem;
  font-size: 0.88rem;
  color: var(--ink-600);
}

.cctv-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.8rem;
  border-top: 1px dashed var(--line);
}

.status-online {
  font-size: 0.8rem;
  font-weight: 850;
  color: var(--success-700);
}

.expand-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: transparent;
  border: 0;
  padding: 0;
  font-size: 0.84rem;
  font-weight: 800;
  color: var(--teal-700);
  cursor: pointer;
  transition: color 0.15s;
}

.expand-btn:hover {
  color: var(--teal-800);
}

/* CCTV Modal Overlay */
.cctv-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  padding: 1.5rem;
}

.cctv-modal-card {
  width: min(100%, 56rem);
  border-radius: var(--radius-xl);
  background: #0f172a;
  color: white;
  box-shadow: var(--shadow-lg);
  border: 1px solid rgba(255, 255, 255, 0.12);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.live-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.72rem;
  font-weight: 850;
  color: #f43f5e;
}

.modal-title-wrap h2 {
  font-size: 1.3rem;
  margin: 0;
  color: white;
}

.close-modal-btn {
  background: transparent;
  border: 0;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: 0.4rem;
  border-radius: 0.5rem;
  transition: color 0.15s, background 0.15s;
}

.close-modal-btn:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

.modal-video-viewport {
  height: clamp(18rem, 40vh, 28rem);
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1.2rem;
}

.viewport-hud {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  font-family: monospace;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.85);
}

.hud-top, .hud-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hud-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.hud-cam-icon {
  color: #2dd4bf;
}

.ptz-active {
  color: #34d399;
  font-weight: bold;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: #091222;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.ptz-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ptz-label {
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 700;
}

.ptz-btn {
  display: grid;
  width: 2.2rem;
  height: 2.2rem;
  place-items: center;
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: white;
  cursor: pointer;
  transition: background 0.15s;
}

.ptz-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
