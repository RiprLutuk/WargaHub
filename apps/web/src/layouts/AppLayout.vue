<script setup lang="ts">
import { Bell, ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen, Settings, ShieldCheck } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { RouterLink, RouterView, useRouter } from 'vue-router';
import AppSidebar from '../components/AppSidebar.vue';
import BrandMark from '../components/BrandMark.vue';
import { useResource } from '../composables/useResource';
import { api } from '../lib/api';
import { adaptHouseholds } from '../lib/view-models';
import { useSessionStore } from '../stores/session';

const session = useSessionStore();
const router = useRouter();
const profileOpen = ref(false);
const firstName = computed(() => session.user?.name.split(' ')[0] ?? 'Warga');
const households = useResource(async () => adaptHouseholds(await api.get<unknown>('/households')));
const activeHousehold = computed(() => households.data.value?.[0] ?? null);

const isSidebarCollapsed = ref(localStorage.getItem('wargahub_app_sidebar_collapsed') === 'true');

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
  localStorage.setItem('wargahub_app_sidebar_collapsed', String(isSidebarCollapsed.value));
}

async function logout() {
  await session.logout();
  await router.push('/login');
}
</script>

<template>
  <a class="skip-link" href="#portal-content">Lewati ke konten utama</a>
  <div class="portal-shell" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <aside class="portal-sidebar" :class="{ collapsed: isSidebarCollapsed }">
      <div class="sidebar-top">
        <RouterLink class="sidebar-brand" to="/app"><BrandMark :compact="isSidebarCollapsed" /></RouterLink>
        <button type="button" class="sidebar-toggle-btn" :title="isSidebarCollapsed ? 'Buka Sidebar' : 'Sembunyikan Sidebar'" @click="toggleSidebar">
          <PanelLeftOpen v-if="isSidebarCollapsed" :size="18" />
          <PanelLeftClose v-else :size="18" />
        </button>
      </div>

      <div v-if="!isSidebarCollapsed" class="home-context">
        <span>Rumah aktif</span>
        <strong>{{ activeHousehold?.code ?? 'Rumah terhubung' }}</strong>
        <small v-if="activeHousehold?.address">{{ activeHousehold.address }}</small>
      </div>

      <AppSidebar :permissions="session.permissions" variant="app" :collapsed="isSidebarCollapsed" />

      <RouterLink v-if="session.isAdmin" class="admin-switch" to="/admin" :title="isSidebarCollapsed ? 'Buka CMS pengurus' : undefined">
        <ShieldCheck :size="17" />
        <span v-if="!isSidebarCollapsed">Buka CMS pengurus</span>
      </RouterLink>
    </aside>

    <div class="portal-main">
      <header class="portal-topbar">
        <div class="topbar-left">
          <div>
            <span>Halo, {{ firstName }}</span>
            <small>Semoga harimu berjalan ringan.</small>
          </div>
        </div>
        <div class="topbar-actions">
          <RouterLink class="icon-button" to="/app/notifikasi" aria-label="Buka notifikasi">
            <Bell :size="19" />
            <span class="notification-dot" />
          </RouterLink>
          <div class="profile-menu">
            <button class="avatar-button" type="button" :aria-expanded="profileOpen" @click="profileOpen = !profileOpen">
              <span>{{ firstName.slice(0, 1) }}</span>
              <ChevronDown :size="15" />
            </button>
            <div v-if="profileOpen" class="profile-popover">
              <strong>{{ session.user?.name }}</strong>
              <small>{{ session.user?.email }}</small>
              <RouterLink to="/app/pengaturan"><Settings :size="15" /> Pengaturan akun</RouterLink>
              <button type="button" @click="logout"><LogOut :size="15" /> Keluar</button>
            </div>
          </div>
        </div>
      </header>
      <main id="portal-content" tabindex="-1"><RouterView /></main>
    </div>

    <div class="mobile-nav"><AppSidebar :permissions="session.permissions" variant="app" /></div>
  </div>
</template>

<style scoped>
.portal-shell {
  display: grid;
  min-height: 100vh;
  grid-template-columns: 17rem minmax(0, 1fr);
  background: var(--surface, #f8fafc);
  transition: grid-template-columns 0.25s ease;
}

.portal-shell.sidebar-collapsed {
  grid-template-columns: 4.5rem minmax(0, 1fr);
}

.portal-sidebar {
  position: sticky;
  top: 0;
  display: flex;
  height: 100vh;
  flex-direction: column;
  gap: 1.1rem;
  padding: 1.1rem 1rem;
  border-right: 1px solid var(--line);
  background: var(--paper);
  overflow-y: auto;
  transition: padding 0.2s ease;
}

.portal-sidebar.collapsed {
  padding: 1.1rem 0.5rem;
  align-items: center;
}

.sidebar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.sidebar-brand {
  text-decoration: none;
}

.sidebar-toggle-btn {
  display: grid;
  width: 2.2rem;
  height: 2.2rem;
  place-items: center;
  border-radius: 0.55rem;
  border: 1px solid var(--line);
  background: var(--cream-50);
  color: var(--ink-700);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.sidebar-toggle-btn:hover {
  background: var(--cream-100);
  border-color: var(--teal-500);
  color: var(--teal-800);
}

.home-context {
  display: grid;
  gap: 0.15rem;
  padding: 0.75rem;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--cream-50);
}

.home-context span {
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--ink-500);
  text-transform: uppercase;
}

.home-context strong {
  font-size: 0.9rem;
  color: var(--ink-950);
}

.home-context small {
  font-size: 0.75rem;
  color: var(--ink-600);
}

.admin-switch {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: auto;
  padding: 0.6rem 0.75rem;
  border-radius: var(--radius-md);
  background: var(--teal-50);
  border: 1px solid var(--teal-200);
  color: var(--teal-800);
  font-size: 0.82rem;
  font-weight: 800;
  text-decoration: none;
}

.admin-switch:hover {
  background: var(--teal-100);
}

.portal-main {
  min-width: 0;
}

.portal-topbar {
  position: sticky;
  z-index: 20;
  top: 0;
  display: flex;
  min-height: 4.5rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem clamp(1rem, 3vw, 2rem);
  border-bottom: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(16px);
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.topbar-left > div {
  display: grid;
}

.portal-topbar span {
  font-size: 1rem;
  font-weight: 850;
  color: var(--ink-950);
}

.portal-topbar small {
  font-size: 0.76rem;
  color: var(--ink-600);
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.icon-button {
  position: relative;
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 0.7rem;
  background: var(--paper);
  color: var(--ink-700);
}

.notification-dot {
  position: absolute;
  top: 0.55rem;
  right: 0.55rem;
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 50%;
  background: var(--coral-600);
}

.profile-menu {
  position: relative;
}

.avatar-button {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper);
  cursor: pointer;
}

.avatar-button span {
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border-radius: 50%;
  background: var(--teal-600);
  color: white;
  font-weight: 850;
  font-size: 0.85rem;
}

.profile-popover {
  position: absolute;
  right: 0;
  top: calc(100% + 0.5rem);
  width: 14rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.85rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--line);
  background: var(--paper);
  box-shadow: var(--shadow-md);
}

.profile-popover strong {
  font-size: 0.88rem;
  color: var(--ink-950);
}

.profile-popover small {
  font-size: 0.75rem;
  color: var(--ink-600);
  margin-bottom: 0.4rem;
}

.profile-popover a, .profile-popover button {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.6rem;
  border: 0;
  border-radius: 0.45rem;
  background: transparent;
  color: var(--ink-800);
  font-size: 0.82rem;
  font-weight: 750;
  text-decoration: none;
  cursor: pointer;
}

.profile-popover a:hover, .profile-popover button:hover {
  background: var(--cream-100);
  color: var(--teal-800);
}

.mobile-nav {
  display: none;
}

#portal-content {
  padding: clamp(1rem, 2.5vw, 2rem);
}

@media (max-width: 900px) {
  .portal-shell {
    grid-template-columns: 1fr;
  }
  .portal-sidebar {
    display: none;
  }
  .mobile-nav {
    display: block;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--paper);
    border-top: 1px solid var(--line);
    z-index: 40;
    padding: 0.5rem;
  }
}
</style>
