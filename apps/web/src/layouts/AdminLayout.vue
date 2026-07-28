<script setup lang="ts">
import { ArrowLeft, Bell, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { RouterLink, RouterView, useRouter } from 'vue-router';
import AppSidebar from '../components/AppSidebar.vue';
import BrandMark from '../components/BrandMark.vue';
import { useResource } from '../composables/useResource';
import { api } from '../lib/api';
import { adaptPublicSite } from '../lib/view-models';
import { useSessionStore } from '../stores/session';

const session = useSessionStore();
const router = useRouter();
const initials = computed(() => session.user?.name.split(' ').map((word) => word[0]).slice(0, 2).join('') ?? 'AD');
const site = useResource(async () => adaptPublicSite(await api.get<unknown>('/public/site')));

const isSidebarCollapsed = ref(localStorage.getItem('wargahub_admin_sidebar_collapsed') === 'true');

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
  localStorage.setItem('wargahub_admin_sidebar_collapsed', String(isSidebarCollapsed.value));
}

async function logout() { await session.logout(); await router.push('/login'); }
</script>

<template>
  <a class="skip-link" href="#admin-content">Lewati ke konten CMS</a>
  <div class="admin-shell" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <aside class="admin-sidebar" :class="{ collapsed: isSidebarCollapsed }">
      <div class="sidebar-top">
        <RouterLink class="admin-brand" to="/admin"><BrandMark inverse :compact="isSidebarCollapsed" /></RouterLink>
        <button type="button" class="sidebar-toggle-btn" :title="isSidebarCollapsed ? 'Buka Sidebar' : 'Sembunyikan Sidebar'" @click="toggleSidebar">
          <PanelLeftOpen v-if="isSidebarCollapsed" :size="18" />
          <PanelLeftClose v-else :size="18" />
        </button>
      </div>

      <div v-if="!isSidebarCollapsed" class="organization">
        <span>Organisasi aktif</span>
        <strong>{{ site.data.value?.name ?? 'Lingkungan terverifikasi' }}</strong>
      </div>

      <AppSidebar :permissions="session.permissions" variant="admin" :collapsed="isSidebarCollapsed" />

      <RouterLink class="back-portal" to="/app" :title="isSidebarCollapsed ? 'Kembali ke portal warga' : undefined">
        <ArrowLeft :size="16" />
        <span v-if="!isSidebarCollapsed">Kembali ke portal warga</span>
      </RouterLink>
    </aside>

    <div class="admin-main">
      <header class="admin-topbar">
        <div class="topbar-left">
          <button type="button" class="topbar-toggle-btn" :title="isSidebarCollapsed ? 'Buka Sidebar' : 'Sembunyikan Sidebar'" @click="toggleSidebar">
            <PanelLeftOpen v-if="isSidebarCollapsed" :size="19" />
            <PanelLeftClose v-else :size="19" />
          </button>
          <div>
            <strong>CMS Pengurus</strong>
            <span>Kelola layanan tanpa membuka privasi warga.</span>
          </div>
        </div>
        <div class="admin-actions">
          <button class="icon-button" type="button" aria-label="Notifikasi operasional"><Bell :size="19" /><i /></button>
          <span class="admin-avatar">{{ initials }}</span>
          <span class="admin-name">{{ session.user?.name }}</span>
          <button class="logout-button" type="button" aria-label="Keluar" @click="logout"><LogOut :size="18" /></button>
        </div>
      </header>
      <main id="admin-content" tabindex="-1"><RouterView /></main>
    </div>
  </div>
</template>

<style scoped>
.admin-shell {
  display: grid;
  min-height: 100vh;
  grid-template-columns: 17rem minmax(0, 1fr);
  background: #f2f4f1;
  transition: grid-template-columns 0.25s ease;
}

.admin-shell.sidebar-collapsed {
  grid-template-columns: 4.5rem minmax(0, 1fr);
}

.admin-sidebar {
  position: sticky;
  top: 0;
  display: flex;
  height: 100vh;
  flex-direction: column;
  gap: 1.1rem;
  padding: 1.1rem 1rem;
  overflow-y: auto;
  background: var(--ink-950);
  color: white;
  transition: padding 0.2s ease;
}

.admin-sidebar.collapsed {
  padding: 1.1rem 0.5rem;
  align-items: center;
}

.sidebar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.admin-brand {
  width: fit-content;
  text-decoration: none;
}

.sidebar-toggle-btn, .topbar-toggle-btn {
  display: grid;
  width: 2.2rem;
  height: 2.2rem;
  place-items: center;
  border-radius: 0.55rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: background 0.15s;
}

.sidebar-toggle-btn:hover, .topbar-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.topbar-toggle-btn {
  border-color: var(--line);
  background: var(--paper);
  color: var(--ink-700);
}

.organization {
  display: grid;
  gap: 0.25rem;
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.06);
}

.organization span {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.63rem;
  font-weight: 800;
  text-transform: uppercase;
}

.organization strong {
  color: white;
  font-size: 0.8rem;
}

.admin-sidebar :deep(.nav-label) {
  color: rgba(255, 255, 255, 0.4);
}

.admin-sidebar :deep(.admin-group) {
  margin-top: 0;
  padding-top: 0;
  border: 0;
}

.admin-sidebar :deep(.app-sidebar a) {
  color: rgba(255, 255, 255, 0.64);
}

.admin-sidebar :deep(.app-sidebar a:hover) {
  background: rgba(255, 255, 255, 0.08);
  color: white;
}

.admin-sidebar :deep(.app-sidebar a.router-link-exact-active) {
  background: var(--teal-600);
  color: white;
}

.back-portal {
  display: flex;
  min-height: 2.5rem;
  align-items: center;
  gap: 0.5rem;
  margin-top: auto;
  padding: 0.5rem 0.6rem;
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.78rem;
  text-decoration: none;
  border-radius: var(--radius-md);
}

.back-portal:hover {
  background: rgba(255, 255, 255, 0.08);
  color: white;
}

.admin-main {
  min-width: 0;
}

.admin-topbar {
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
  background: rgba(255, 253, 248, 0.92);
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

.admin-topbar span {
  color: var(--ink-650);
  font-size: 0.75rem;
}

.admin-actions {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.icon-button, .logout-button {
  position: relative;
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 0.7rem;
  background: var(--paper);
  color: var(--ink-650);
  cursor: pointer;
}

.icon-button i {
  position: absolute;
  top: 0.55rem;
  right: 0.55rem;
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 50%;
  background: var(--coral-700);
}

.admin-avatar {
  display: grid;
  width: 2.35rem;
  height: 2.35rem;
  place-items: center;
  border-radius: 0.65rem;
  background: var(--amber-100);
  color: var(--amber-700) !important;
  font-size: 0.74rem !important;
  font-weight: 900;
}

.admin-name {
  max-width: 9rem;
  overflow: hidden;
  color: var(--ink-950) !important;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

#admin-content {
  padding: clamp(1rem, 2.5vw, 2rem);
}

@media (max-width: 900px) {
  .admin-shell {
    grid-template-columns: 4.5rem minmax(0, 1fr);
  }
  .admin-sidebar {
    padding-inline: 0.5rem;
  }
  .admin-brand :deep(.brand-copy), .organization, .back-portal span {
    display: none;
  }
  .admin-sidebar :deep(a) {
    justify-content: center;
  }
}
</style>
