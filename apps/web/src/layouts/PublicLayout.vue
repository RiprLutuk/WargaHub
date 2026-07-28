<script setup lang="ts">
import { ArrowRight, CheckCircle2, ChevronDown, Lock, Menu, PhoneCall, ShieldCheck, User, X } from 'lucide-vue-next';
import { getActivePinia } from 'pinia';
import { computed, onMounted, ref } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import BrandMark from '../components/BrandMark.vue';
import { useSessionStore } from '../stores/session';

const menuOpen = ref(false);
const openGroup = ref<string | null>(null);

const session = computed(() => (getActivePinia() ? useSessionStore() : null));

onMounted(() => {
  session.value?.ensureSession();
});

function toggleGroup(name: string) {
  openGroup.value = openGroup.value === name ? null : name;
}

function closeAll() {
  menuOpen.value = false;
  openGroup.value = null;
}
</script>

<template>
  <a class="skip-link" href="#konten-utama">Lewati ke konten utama</a>
  <div class="public-shell">
    <header class="site-header">
      <div class="container header-inner">
        <RouterLink to="/" aria-label="WargaHub, kembali ke beranda" @click="closeAll">
          <BrandMark />
        </RouterLink>

        <button class="menu-button" type="button" :aria-expanded="menuOpen" aria-controls="public-navigation" @click="menuOpen = !menuOpen">
          <X v-if="menuOpen" :size="22" aria-hidden="true" />
          <Menu v-else :size="22" aria-hidden="true" />
          <span class="sr-only">{{ menuOpen ? 'Tutup menu' : 'Buka menu' }}</span>
        </button>

        <nav id="public-navigation" :class="{ open: menuOpen }" aria-label="Navigasi utama">
          <!-- Dropdown Group 1: Informasi Publik -->
          <div class="nav-dropdown" :class="{ active: openGroup === 'info' }">
            <button class="dropdown-trigger" type="button" :aria-expanded="openGroup === 'info'" @click="toggleGroup('info')">
              <span>Informasi</span> <ChevronDown :size="14" class="arrow-icon" />
            </button>
            <div class="dropdown-menu">
              <RouterLink to="/pengumuman" @click="closeAll">Pengumuman Resmi</RouterLink>
              <RouterLink to="/struktur" @click="closeAll">Struktur Pengurus RT/RW</RouterLink>
              <RouterLink to="/laporan" @click="closeAll">Status Laporan Publik</RouterLink>
              <RouterLink to="/agenda" @click="closeAll">Agenda & Kegiatan</RouterLink>
              <RouterLink to="/dokumen" @click="closeAll">Dokumen Publik</RouterLink>
            </div>
          </div>

          <!-- Dropdown Group 2: Lingkungan & Fasilitas -->
          <div class="nav-dropdown" :class="{ active: openGroup === 'lingkungan' }">
            <button class="dropdown-trigger" type="button" :aria-expanded="openGroup === 'lingkungan'" @click="toggleGroup('lingkungan')">
              <span>Lingkungan & Fasilitas</span> <ChevronDown :size="14" class="arrow-icon" />
            </button>
            <div class="dropdown-menu">
              <RouterLink to="/transparansi" @click="closeAll">Transparansi Keuangan</RouterLink>
              <RouterLink to="/fasilitas" @click="closeAll">Fasilitas & Inventaris</RouterLink>
              <RouterLink to="/program" @click="closeAll">Program Pembangunan</RouterLink>
              <RouterLink to="/umkm" @click="closeAll">Direktori UMKM Warga</RouterLink>
            </div>
          </div>

          <RouterLink to="/kontak" class="nav-link" @click="closeAll">Kontak</RouterLink>
          <RouterLink class="nav-link emergency-link" to="/darurat" @click="closeAll">
            <span class="emergency-beacon" aria-hidden="true">
              <span class="beacon-ring" />
              <span class="beacon-dot" />
            </span>
            <PhoneCall :size="14" aria-hidden="true" />
            <span>Darurat</span>
          </RouterLink>

          <!-- Dynamic User Portal Button -->
          <RouterLink
            v-if="session?.isAuthenticated && session?.user"
            class="button button-sm user-portal-btn"
            :to="session.isAdmin ? '/admin' : '/app'"
            @click="closeAll"
          >
            <User :size="15" aria-hidden="true" />
            <span>Portal {{ session.user.name }}</span>
            <ArrowRight :size="14" aria-hidden="true" />
          </RouterLink>

          <RouterLink v-else class="button button-sm" to="/login" @click="closeAll">
            Portal warga <ArrowRight :size="15" aria-hidden="true" />
          </RouterLink>
        </nav>
      </div>
    </header>

    <main id="konten-utama" tabindex="-1">
      <RouterView />
    </main>

    <footer class="site-footer">
      <div class="container footer-stack">
        <!-- Top Status Banner -->
        <div class="footer-status-bar">
          <div class="status-indicator">
            <span class="status-dot" />
            <span>Sistem Informasi RT/RW Aktif & Terbuka</span>
          </div>
          <div class="footer-quick-contacts">
            <RouterLink to="/darurat" class="footer-emergency-chip">
              <PhoneCall :size="13" />
              <span>Posko Siaga Darurat</span>
            </RouterLink>
          </div>
        </div>

        <!-- Main Footer Grid -->
        <div class="footer-main-grid">
          <!-- Col 1: Brand & Identity -->
          <div class="footer-brand-col">
            <BrandMark inverse />
            <p class="brand-desc">
              Platform digital gotong-royong lingkungan. Menyajikan pengumuman resmi, transparansi kas, dan layanan warga tanpa menambah beban percakapan sosial.
            </p>
            <div class="community-tags">
              <span>#TransparansiKas</span>
              <span>#GotongRoyong</span>
              <span>#PrivatSeperlunya</span>
            </div>
          </div>

          <!-- Col 2: Navigation Groups -->
          <div class="footer-nav-col">
            <div class="footer-nav-group">
              <h4>Informasi & Pengaduan</h4>
              <ul>
                <li><RouterLink to="/pengumuman">Pengumuman Resmi</RouterLink></li>
                <li><RouterLink to="/struktur">Struktur Pengurus RT/RW</RouterLink></li>
                <li><RouterLink to="/laporan">Status Laporan Publik</RouterLink></li>
                <li><RouterLink to="/agenda">Agenda & Kegiatan Warga</RouterLink></li>
                <li><RouterLink to="/dokumen">Dokumen Publik</RouterLink></li>
              </ul>
            </div>
            <div class="footer-nav-group">
              <h4>Fasilitas & Lingkungan</h4>
              <ul>
                <li><RouterLink to="/transparansi">Transparansi Keuangan Kas</RouterLink></li>
                <li><RouterLink to="/fasilitas">Fasilitas & Peminjaman</RouterLink></li>
                <li><RouterLink to="/program">Program Pembangunan</RouterLink></li>
                <li><RouterLink to="/umkm">Direktori UMKM Warga</RouterLink></li>
                <li><RouterLink to="/verifikasi">Verifikasi Surat</RouterLink></li>
              </ul>
            </div>
          </div>

          <!-- Col 3: Portal Access Card -->
          <div class="footer-portal-card">
            <div class="portal-card-header">
              <ShieldCheck :size="20" class="shield-icon" />
              <span>Portal Penghuni & Pengurus</span>
            </div>
            <p>Akses tagihan rumah, konfirmasi jadwal ronda, dan pengajuan layanan lingkungan secara privat.</p>
            <RouterLink
              v-if="session?.isAuthenticated && session?.user"
              class="portal-action-btn"
              :to="session.isAdmin ? '/admin' : '/app'"
            >
              <span>Buka Portal {{ session.user.name }}</span>
              <ArrowRight :size="15" />
            </RouterLink>
            <RouterLink v-else class="portal-action-btn" to="/login">
              <span>Masuk Portal Warga</span>
              <ArrowRight :size="15" />
            </RouterLink>
          </div>
        </div>

        <!-- Footer Bottom Bar -->
        <div class="footer-bottom-bar">
          <div class="bottom-copy">
            © 2026 WargaHub · Rukun dalam Satu Ruang Lingkungan RT/RW
          </div>
          <div class="bottom-badges">
            <span class="badge-item"><Lock :size="12" /> Data Terenkripsi</span>
            <span class="badge-item"><CheckCircle2 :size="12" /> Sistem Siaga 24/7</span>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.public-shell {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
}
.site-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
}
.header-inner {
  display: flex;
  min-height: 4.6rem;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}
.menu-button {
  display: none;
  width: 2.75rem;
  height: 2.75rem;
  place-items: center;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-md);
  background: var(--paper);
  color: var(--ink-950);
  cursor: pointer;
}
nav {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}
nav a:not(.button), .nav-link:not(.button) {
  color: var(--ink-800);
  font-weight: 500;
  font-size: 0.92rem;
  text-decoration: none !important;
  padding: 0.4rem 0.65rem;
  border-radius: 0.5rem;
  transition: color 0.15s, background 0.15s;
}
nav a:not(.button):hover,
nav a:not(.button).router-link-active {
  color: var(--teal-700);
  background: var(--teal-50);
  text-decoration: none !important;
}

/* Emergency Badge & Beacon Pulse */
nav .emergency-link {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.52rem 0.95rem;
  border-radius: 0.75rem !important;
  background: rgba(225, 29, 72, 0.08);
  border: 1px solid rgba(225, 29, 72, 0.28);
  color: #e11d48 !important;
  font-weight: 600;
  text-decoration: none !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

nav .emergency-link:hover,
nav .emergency-link.router-link-active {
  background: #e11d48 !important;
  color: #ffffff !important;
  box-shadow: 0 4px 14px rgba(225, 29, 72, 0.35);
  transform: translateY(-1px);
}

nav .emergency-beacon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.55rem;
  height: 0.55rem;
  flex-shrink: 0;
}

.beacon-ring {
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: rgba(225, 29, 72, 0.6);
  animation: beacon-ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.beacon-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: #e11d48;
  position: relative;
  z-index: 2;
}

nav .emergency-link:hover .beacon-ring,
nav .emergency-link:hover .beacon-dot,
nav .emergency-link.router-link-active .beacon-ring,
nav .emergency-link.router-link-active .beacon-dot {
  background: #ffffff;
}

@keyframes beacon-ping {
  0% {
    transform: scale(0.9);
    opacity: 0.8;
  }
  75%, 100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

/* Nav Dropdown Styles */
.nav-dropdown {
  position: relative;
}

.dropdown-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.65rem;
  border: 0;
  border-radius: 0.5rem;
  background: transparent;
  color: var(--ink-800);
  font-weight: 500;
  font-size: 0.92rem;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.dropdown-trigger:hover,
.nav-dropdown.active .dropdown-trigger {
  color: var(--teal-700);
  background: var(--teal-50);
}

.arrow-icon {
  transition: transform 0.2s ease;
}

.nav-dropdown.active .arrow-icon {
  transform: rotate(180deg);
}

.dropdown-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 14rem;
  padding: 0.5rem;
  border-radius: var(--radius-md);
  background: #ffffff;
  border: 1px solid var(--line-strong);
  box-shadow: var(--shadow-md);
  z-index: 50;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.35rem;
}

.nav-dropdown.active .dropdown-menu {
  display: flex;
}

.dropdown-menu a {
  padding: 0.6rem 0.85rem;
  border-radius: 0.5rem;
  color: var(--ink-800);
  font-size: 0.88rem;
  font-weight: 500;
  text-decoration: none !important;
  transition: background 0.15s, color 0.15s;
}

.dropdown-menu a:hover,
.dropdown-menu a.router-link-active {
  background: var(--teal-50);
  color: var(--teal-800);
  text-decoration: none !important;
}

nav .button {
  color: #ffffff !important;
  background: linear-gradient(135deg, var(--teal-700), var(--teal-800)) !important;
  box-shadow: 0 4px 14px rgba(15, 118, 110, 0.25) !important;
  padding: 0.55rem 1.1rem !important;
  border-radius: 0.75rem !important;
  text-decoration: none !important;
}
nav .button *, nav .button svg {
  color: #ffffff !important;
}
nav .button:hover {
  color: #ffffff !important;
  background: linear-gradient(135deg, var(--teal-600), var(--teal-700)) !important;
}

main {
  flex: 1;
}

/* Redesigned Innovative Civic Footer */
.site-footer {
  margin-top: 5rem;
  padding-block: 4.5rem 2.5rem;
  background: linear-gradient(180deg, #09201b 0%, #04120f 100%);
  color: #e2e8f0;
  border-top: 1px solid rgba(20, 184, 166, 0.18);
}

.footer-stack {
  display: flex;
  flex-direction: column;
  gap: 3.5rem;
}

/* Status Bar */
.footer-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1.4rem;
  border-radius: var(--radius-lg);
  background: rgba(15, 118, 110, 0.14);
  border: 1px solid rgba(20, 184, 166, 0.22);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  font-weight: 500;
  color: #5eead4;
}

.status-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
}

.footer-emergency-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  background: rgba(225, 29, 72, 0.15);
  border: 1px solid rgba(225, 29, 72, 0.32);
  color: #f43f5e !important;
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none !important;
  transition: all 0.15s ease;
}

.footer-emergency-chip:hover {
  background: #e11d48;
  color: #ffffff !important;
}

/* Main Grid */
.footer-main-grid {
  display: grid;
  grid-template-columns: 1.5fr 2fr 1.3fr;
  gap: 3rem;
  align-items: start;
}

.footer-brand-col {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.brand-desc {
  color: #94a3b8;
  font-size: 0.92rem;
  line-height: 1.65;
  margin: 0;
}

.community-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.5rem;
}

.community-tags span {
  padding: 0.25rem 0.6rem;
  border-radius: 0.4rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  font-size: 0.75rem;
  font-weight: 500;
}

/* Nav Col */
.footer-nav-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.footer-nav-group h4 {
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #2dd4bf;
  margin-bottom: 1.2rem;
}

.footer-nav-group ul {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.footer-nav-group a {
  color: #cbd5e1;
  font-size: 0.9rem;
  font-weight: 500;
  text-decoration: none !important;
  transition: color 0.15s ease, transform 0.15s ease;
  display: inline-block;
}

.footer-nav-group a:hover {
  color: #ffffff;
  transform: translateX(3px);
}

/* Portal Card */
.footer-portal-card {
  padding: 1.6rem;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, rgba(15, 118, 110, 0.22) 0%, rgba(6, 78, 59, 0.35) 100%);
  border: 1px solid rgba(45, 212, 191, 0.25);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22);
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.portal-card-header {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  color: #5eead4;
  font-weight: 600;
  font-size: 0.95rem;
}

.shield-icon {
  color: #2dd4bf;
}

.footer-portal-card p {
  color: #94a3b8;
  font-size: 0.86rem;
  margin: 0;
  line-height: 1.55;
}

.portal-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.15rem;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
  color: #ffffff !important;
  font-weight: 600;
  font-size: 0.88rem;
  text-decoration: none !important;
  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);
  transition: all 0.2s ease;
}

.portal-action-btn:hover {
  background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
  box-shadow: 0 6px 20px rgba(20, 184, 166, 0.45);
  transform: translateY(-1px);
}

/* Bottom Bar */
.footer-bottom-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: #64748b;
  font-size: 0.82rem;
}

.bottom-badges {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.badge-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: #94a3b8;
  font-weight: 500;
}

@media (max-width: 960px) {
  .footer-main-grid {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }
  .footer-status-bar, .footer-bottom-bar {
    flex-direction: column;
    align-items: flex-start;
  }
}
@media (max-width: 880px) {
  .menu-button {
    display: grid;
  }
  nav {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    padding: 1.25rem;
    background: #ffffff;
    border-bottom: 1px solid var(--line-strong);
    flex-direction: column;
    align-items: stretch;
    gap: 0.35rem;
    padding: 1rem;
    box-shadow: var(--shadow-lg);
  }
  nav.open {
    display: flex;
  }
  .dropdown-menu {
    position: static;
    width: 100%;
    min-width: 0;
    box-shadow: none;
    border: 0;
    padding: 0.35rem 0 0.45rem 0.75rem;
    background: var(--cream-50);
  }
  .nav-dropdown,
  .dropdown-trigger,
  nav .nav-link,
  nav .button {
    width: 100%;
  }
  .dropdown-trigger {
    justify-content: space-between;
    padding: 0.9rem 1rem;
    border-radius: 0.75rem;
    font-size: 1rem;
  }
  nav .nav-link {
    padding: 0.9rem 1rem;
    font-size: 1rem;
  }
  .dropdown-menu a {
    display: block;
    padding: 0.7rem 0.85rem;
    font-size: 0.94rem;
  }
  nav .button {
    justify-content: center;
    margin-top: 0.35rem;
  }
}
</style>
