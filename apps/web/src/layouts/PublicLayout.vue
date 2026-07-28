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
          <strong>Informasi Publik</strong>
          <RouterLink to="/pengumuman">Pengumuman</RouterLink>
          <RouterLink to="/laporan">Laporan Publik</RouterLink>
          <RouterLink to="/agenda">Agenda Warga</RouterLink>
          <RouterLink to="/transparansi">Transparansi Keuangan</RouterLink>
          <RouterLink to="/fasilitas">Fasilitas Publik</RouterLink>
          <RouterLink to="/program">Program Lingkungan</RouterLink>
          <RouterLink to="/umkm">Direktori UMKM</RouterLink>
          <RouterLink to="/dokumen">Dokumen Publik</RouterLink>
        </div>
        <div>
          <strong>Bantuan & Layanan</strong>
          <RouterLink to="/kontak">Hubungi pengurus</RouterLink>
          <RouterLink to="/darurat">Nomor darurat</RouterLink>
          <RouterLink v-if="session?.isAuthenticated" :to="session.isAdmin ? '/admin' : '/app'">Portal {{ session.user?.name ?? 'warga' }}</RouterLink>
          <RouterLink v-else to="/login">Masuk portal warga</RouterLink>
        </div>
      </div>
      <div class="container footer-bottom">
        <span>WargaHub · Perangkat lunak komunitas terbuka</span>
        <span>Privasi warga selalu diutamakan</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.public-shell { min-height: 100vh; }
.site-header { position: sticky; z-index: 30; top: 0; border-bottom: 1px solid rgb(189 203 197 / 0.72); background: rgb(251 248 241 / 0.93); backdrop-filter: blur(18px); }
.header-inner { display: flex; min-height: 4.75rem; align-items: center; justify-content: space-between; gap: 1rem; }
.header-inner > a { text-decoration: none; }
nav { display: flex; align-items: center; gap: 0.35rem; }

/* Dropdown Menu Styles */
.nav-dropdown { position: relative; }
.dropdown-trigger { display: inline-flex; min-height: 2.75rem; align-items: center; gap: .35rem; padding: 0.5rem 0.75rem; border: 0; border-radius: 0.65rem; background: transparent; color: var(--ink-800); font-size: 0.88rem; font-weight: 750; cursor: pointer; }
.dropdown-trigger:hover, .nav-dropdown.active .dropdown-trigger { background: var(--teal-100); color: var(--teal-800); }
.arrow-icon { transition: transform .2s; }
.nav-dropdown.active .arrow-icon { transform: rotate(180deg); }

.dropdown-menu { position: absolute; top: calc(100% + .4rem); left: 0; display: none; min-width: 13.5rem; flex-direction: column; gap: .2rem; padding: .5rem; border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--paper); box-shadow: var(--shadow-lg); }
.nav-dropdown:hover .dropdown-menu, .nav-dropdown.active .dropdown-menu { display: flex; }
.dropdown-menu a { display: flex; min-height: 2.4rem; align-items: center; padding: .4rem .65rem; border-radius: .55rem; color: var(--ink-800); font-size: .83rem; font-weight: 700; text-decoration: none; }
.dropdown-menu a:hover { background: var(--teal-50); color: var(--teal-800); }

nav > a:not(.button) { display: inline-flex; min-height: 2.75rem; align-items: center; padding: 0.5rem 0.75rem; border-radius: 0.65rem; color: var(--ink-800); font-size: 0.88rem; font-weight: 750; text-decoration: none; }
nav > a:not(.button):hover, nav > a.router-link-exact-active:not(.button) { background: var(--teal-100); color: var(--teal-800); }
nav .emergency-link { gap: 0.35rem; color: var(--coral-700) !important; }
.user-portal-btn { gap: 0.4rem; max-width: 14rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.menu-button { display: none; width: 2.75rem; height: 2.75rem; place-items: center; border: 1px solid var(--line); border-radius: 0.7rem; background: var(--paper); color: var(--ink-950); }

.site-footer { padding-block: 3.2rem 1.2rem; background: var(--ink-950); color: white; }
.footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 3rem; }
.footer-grid p { max-width: 34rem; margin: 1.1rem 0 0; color: rgb(255 255 255 / .7); }
.footer-grid > div:not(:first-child) { display: grid; align-content: start; gap: 0.55rem; }
.footer-grid a { width: fit-content; color: rgb(255 255 255 / .72); text-decoration: none; }
.footer-grid a:hover { color: white; text-decoration: underline; }
.footer-bottom { display: flex; justify-content: space-between; gap: 1rem; margin-top: 3rem; padding-top: 1rem; border-top: 1px solid rgb(255 255 255 / .12); color: rgb(255 255 255 / .55); font-size: .78rem; }

@media (max-width: 860px) {
  .menu-button { display: grid; }
  nav { position: absolute; inset: calc(100% + 1px) 0 auto; display: none; align-items: stretch; padding: 0.75rem; border-bottom: 1px solid var(--line); background: var(--cream-50); box-shadow: var(--shadow-lg); }
  nav.open { display: grid; }
  .nav-dropdown { display: grid; }
  .dropdown-menu { position: static; display: none; width: 100%; box-shadow: none; border: 0; background: var(--cream-100); padding-left: 1rem; }
  .nav-dropdown.active .dropdown-menu { display: flex; }
  nav > a { justify-content: flex-start; }
  .footer-grid { grid-template-columns: 1fr 1fr; }
  .footer-grid > div:first-child { grid-column: 1 / -1; }
}
@media (max-width: 520px) {
  .footer-grid { grid-template-columns: 1fr; }
  .footer-grid > div:first-child { grid-column: auto; }
  .footer-bottom { align-items: flex-start; flex-direction: column; }
}
</style>
