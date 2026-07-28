<script setup lang="ts">
import { ArrowRight, ChevronDown, Menu, PhoneCall, User, X } from 'lucide-vue-next';
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
      <div class="container footer-grid">
        <div>
          <BrandMark inverse />
          <p>Informasi resmi lingkungan yang terbuka, privat seperlunya, dan tidak melelahkan secara sosial.</p>
        </div>
        <div>
          <h3>Layanan Publik</h3>
          <ul>
            <li><RouterLink to="/pengumuman">Pengumuman</RouterLink></li>
            <li><RouterLink to="/struktur">Struktur Pengurus</RouterLink></li>
            <li><RouterLink to="/laporan">Status Laporan</RouterLink></li>
            <li><RouterLink to="/agenda">Agenda Warga</RouterLink></li>
            <li><RouterLink to="/transparansi">Transparansi Keuangan</RouterLink></li>
            <li><RouterLink to="/dokumen">Dokumen Publik</RouterLink></li>
          </ul>
        </div>
        <div>
          <h3>Akses Pengurus</h3>
          <ul>
            <li><RouterLink to="/login">Masuk Portal Admin</RouterLink></li>
            <li><RouterLink to="/darurat">Panggilan Darurat</RouterLink></li>
          </ul>
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
  font-weight: 750;
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
  padding: 0.42rem 0.8rem;
  border-radius: 999px;
  background: rgba(225, 29, 72, 0.08);
  border: 1px solid rgba(225, 29, 72, 0.28);
  color: #e11d48 !important;
  font-weight: 850;
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
}

.beacon-ring {
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  background: #e11d48;
  opacity: 0.75;
  animation: beacon-ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.beacon-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #e11d48;
}

nav .emergency-link:hover .beacon-ring,
nav .emergency-link:hover .beacon-dot,
nav .emergency-link.router-link-active .beacon-ring,
nav .emergency-link.router-link-active .beacon-dot {
  background: #ffffff;
}

@keyframes beacon-ping {
  0% {
    transform: scale(0.8);
    opacity: 0.9;
  }
  75%, 100% {
    transform: scale(2.4);
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
  font-weight: 750;
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
  font-weight: 750;
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
.site-footer {
  margin-top: 4rem;
  padding-block: 4rem;
  background: #091e1a;
  color: #e2e8f0;
}
.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 2.5rem;
}
.footer-grid p {
  max-width: 24rem;
  margin-top: 1rem;
  color: #94a3b8;
  font-size: 0.95rem;
}
.footer-grid h3 {
  margin-bottom: 1.1rem;
  font-size: 0.88rem;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #5eead4;
}
.footer-grid ul {
  display: grid;
  gap: 0.75rem;
  padding: 0;
  list-style: none;
}
.footer-grid a {
  color: #cbd5e1;
  font-weight: 600;
  text-decoration: none !important;
  transition: color 0.15s;
}
.footer-grid a:hover {
  color: #ffffff;
  text-decoration: none !important;
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
    box-shadow: var(--shadow-lg);
  }
  nav.open {
    display: flex;
  }
  .dropdown-menu {
    position: static;
    box-shadow: none;
    border: 0;
    padding-left: 1rem;
    background: var(--cream-50);
  }
}
</style>
