<script setup lang="ts">
import { ArrowRight, ChevronDown, Menu, Phone, User, X } from 'lucide-vue-next';
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

          <RouterLink to="/kontak" @click="closeAll">Kontak</RouterLink>
          <RouterLink class="emergency-link" to="/darurat" @click="closeAll">Darurat</RouterLink>

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
  background: var(--paper);
  border-bottom: 1px solid var(--line);
}
.header-inner {
  display: flex;
  min-height: 4.5rem;
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
  color: var(--ink-900);
}
nav {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}
nav a {
  color: var(--ink-700);
  font-weight: 700;
  font-size: 0.9rem;
}
nav a:hover,
nav a.router-link-active {
  color: var(--teal-700);
}
nav .emergency-link {
  color: var(--rose-700);
}

/* Nav Dropdown Styles */
.nav-dropdown {
  position: relative;
}

.dropdown-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.2rem;
  border: 0;
  background: transparent;
  color: var(--ink-700);
  font-weight: 700;
  font-size: 0.9rem;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.2s;
}

.dropdown-trigger:hover,
.nav-dropdown.active .dropdown-trigger {
  color: var(--teal-700);
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
  min-width: 13.5rem;
  padding: 0.5rem;
  border-radius: var(--radius-md);
  background: var(--paper);
  border: 1px solid var(--line-strong);
  box-shadow: var(--shadow-md);
  z-index: 50;
  flex-direction: column;
  gap: 0.2rem;
}

.nav-dropdown.active .dropdown-menu {
  display: flex;
}

.dropdown-menu a {
  padding: 0.55rem 0.8rem;
  border-radius: 0.4rem;
  color: var(--ink-800);
  font-size: 0.85rem;
  font-weight: 700;
  transition: background 0.15s, color 0.15s;
}

.dropdown-menu a:hover,
.dropdown-menu a.router-link-active {
  background: var(--teal-50);
  color: var(--teal-800);
}

.user-portal-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: var(--teal-700);
  color: white !important;
  font-weight: 800;
}

.user-portal-btn:hover {
  background: var(--teal-800);
}

main {
  flex: 1;
}
.site-footer {
  margin-top: 4rem;
  padding-block: 3.5rem;
  background: var(--ink-950);
  color: var(--ink-100);
}
.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 2rem;
}
.footer-grid p {
  max-width: 24rem;
  margin-top: 1rem;
  color: var(--ink-400);
}
.footer-grid h3 {
  margin-bottom: 1rem;
  font-size: 0.9rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--teal-300);
}
.footer-grid ul {
  display: grid;
  gap: 0.6rem;
  padding: 0;
  list-style: none;
}
.footer-grid a {
  color: var(--ink-300);
}
.footer-grid a:hover {
  color: white;
}
@media (max-width: 820px) {
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
    background: var(--paper);
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
  .footer-grid {
    grid-template-columns: 1fr;
  }
}
</style>
