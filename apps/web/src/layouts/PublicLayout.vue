<script setup lang="ts">
import { ArrowRight, Menu, Phone, X } from 'lucide-vue-next';
import { ref } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import BrandMark from '../components/BrandMark.vue';

const menuOpen = ref(false);
const navItems = [
  { to: '/pengumuman', label: 'Pengumuman' },
  { to: '/agenda', label: 'Agenda' },
  { to: '/transparansi', label: 'Transparansi' },
  { to: '/dokumen', label: 'Dokumen' },
  { to: '/kontak', label: 'Kontak' },
];
</script>

<template>
  <a class="skip-link" href="#konten-utama">Lewati ke konten utama</a>
  <div class="public-shell">
    <header class="site-header">
      <div class="container header-inner">
        <RouterLink to="/" aria-label="WargaHub, kembali ke beranda" @click="menuOpen = false">
          <BrandMark />
        </RouterLink>
        <button class="menu-button" type="button" :aria-expanded="menuOpen" aria-controls="public-navigation" @click="menuOpen = !menuOpen">
          <X v-if="menuOpen" :size="22" aria-hidden="true" />
          <Menu v-else :size="22" aria-hidden="true" />
          <span class="sr-only">{{ menuOpen ? 'Tutup menu' : 'Buka menu' }}</span>
        </button>
        <nav id="public-navigation" :class="{ open: menuOpen }" aria-label="Navigasi utama">
          <RouterLink v-for="item in navItems" :key="item.to" :to="item.to" @click="menuOpen = false">{{ item.label }}</RouterLink>
          <RouterLink class="emergency-link" to="/darurat" @click="menuOpen = false"><Phone :size="15" aria-hidden="true" /> Darurat</RouterLink>
          <RouterLink class="button button-sm" to="/login" @click="menuOpen = false">Portal warga <ArrowRight :size="15" aria-hidden="true" /></RouterLink>
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
          <strong>Informasi</strong>
          <RouterLink to="/pengumuman">Pengumuman</RouterLink>
          <RouterLink to="/transparansi">Transparansi</RouterLink>
          <RouterLink to="/dokumen">Dokumen publik</RouterLink>
        </div>
        <div>
          <strong>Bantuan</strong>
          <RouterLink to="/kontak">Hubungi pengurus</RouterLink>
          <RouterLink to="/darurat">Nomor darurat</RouterLink>
          <RouterLink to="/login">Masuk portal</RouterLink>
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
nav { display: flex; align-items: center; gap: 0.2rem; }
nav > a:not(.button) { display: inline-flex; min-height: 2.75rem; align-items: center; padding: 0.5rem 0.68rem; border-radius: 0.65rem; color: var(--ink-800); font-size: 0.88rem; font-weight: 700; text-decoration: none; }
nav > a:not(.button):hover, nav > a.router-link-exact-active:not(.button) { background: var(--teal-100); color: var(--teal-800); }
nav .emergency-link { gap: 0.35rem; color: var(--coral-700) !important; }
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
