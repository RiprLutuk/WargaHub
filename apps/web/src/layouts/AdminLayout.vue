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
      </div>

      <div v-if="!isSidebarCollapsed" class="organization">
        <span>Organisasi aktif</span>
        <strong>{{ site.data.value?.name ?? 'Lingkungan terverifikasi' }}</strong>
      </div>

      <AppSidebar :permissions="session.permissions" variant="admin" :collapsed="isSidebarCollapsed" />

      <div class="sidebar-bottom-actions">
        <button type="button" class="sidebar-bottom-toggle" :title="isSidebarCollapsed ? 'Buka Sidebar' : 'Sembunyikan Sidebar'" @click="toggleSidebar">
          <PanelLeftOpen v-if="isSidebarCollapsed" :size="17" />
          <PanelLeftClose v-else :size="17" />
          <span v-if="!isSidebarCollapsed">Sembunyikan menu</span>
        </button>

        <RouterLink class="back-portal" to="/app" :title="isSidebarCollapsed ? 'Kembali ke portal warga' : undefined">
          <ArrowLeft :size="16" />
          <span v-if="!isSidebarCollapsed">Kembali ke portal warga</span>
        </RouterLink>
      </div>
    </aside>

    <div class="admin-main">
      <header class="admin-topbar">
        <div class="topbar-left">
          <div>
            <strong>CMS Pengurus</strong>
            <span>Kelola layanan tanpa membuka privasi warga.</span>
          </div>
        </div>

        <div class="admin-actions">
          <button class="icon-button" type="button" aria-label="Notifikasi operasional"><Bell :size="19" /><i /></button>
          <div class="user-pill">
            <span class="avatar-badge">{{ initials }}</span>
            <span class="user-name">{{ session.user?.name }}</span>
          </div>
          <button class="icon-button logout-button" type="button" title="Keluar dari akun" aria-label="Keluar" @click="logout"><LogOut :size="18" /></button>
        </div>
      </header>
      <main id="admin-content" tabindex="-1"><RouterView /></main>
    </div>
  </div>
</template>

<style scoped>
.admin-shell { display: grid; min-height: 100vh; grid-template-columns: 17rem minmax(0, 1fr); background: #f2f4f1; transition: grid-template-columns 0.25s ease; }
.admin-shell.sidebar-collapsed { grid-template-columns: 4.5rem minmax(0, 1fr); }
.admin-sidebar { position: sticky; top: 0; display: flex; height: 100vh; flex-direction: column; gap: 1.1rem; padding: 1.1rem 1rem; overflow-y: auto; background: #102b27; color: #ffffff; transition: padding 0.2s ease; }
.admin-sidebar.collapsed { padding: 1.1rem 0.5rem; align-items: center; }
.sidebar-top { display: flex; align-items: center; width: 100%; }
.admin-brand { width: fit-content; text-decoration: none; }
.sidebar-bottom-actions { margin-top: auto; display: flex; flex-direction: column; gap: 0.5rem; width: 100%; }
.sidebar-bottom-toggle { display: flex; align-items: center; gap: 0.5rem; width: 100%; padding: 0.55rem 0.65rem; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: var(--radius-md); background: rgba(255, 255, 255, 0.08); color: #d9eee8; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: background 0.15s; }
.admin-sidebar.collapsed .sidebar-bottom-toggle { justify-content: center; padding-inline: 0; }
.sidebar-bottom-toggle:hover { background: rgba(255, 255, 255, 0.2); color: #ffffff; }
.organization { display: grid; gap: 0.2rem; padding: 0.75rem; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: var(--radius-md); background: rgba(255, 255, 255, 0.05); }
.organization span { color: #8faea7; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
.organization strong { color: #ffffff; font-size: 0.84rem; font-weight: 600; }
.admin-sidebar :deep(.nav-label), .admin-sidebar :deep(.section-title) { color: #8faea7 !important; font-size: 0.68rem !important; font-weight: 700 !important; letter-spacing: 0.04em !important; }
.admin-sidebar :deep(.admin-group) { margin-top: 0; padding-top: 0; border: 0; }
.admin-sidebar :deep(.app-sidebar a) { color: #d9eee8 !important; font-size: 0.86rem !important; font-weight: 500 !important; }
.admin-sidebar :deep(.app-sidebar a:hover) { background: rgba(255, 255, 255, 0.1) !important; color: #ffffff !important; }
.admin-sidebar :deep(.app-sidebar a.router-link-exact-active) { background: #0b786c !important; color: #ffffff !important; font-weight: 600 !important; }
.back-portal { display: flex; min-height: 2.5rem; align-items: center; gap: 0.5rem; padding: 0.5rem 0.6rem; color: #d9eee8 !important; font-size: 0.8rem; font-weight: 600; text-decoration: none; border-radius: var(--radius-md); }
.admin-sidebar.collapsed .back-portal { justify-content: center; padding-inline: 0; }
.back-portal:hover { background: rgba(255, 255, 255, 0.1); color: #ffffff !important; }
.admin-main { min-width: 0; }
.admin-topbar { position: sticky; z-index: 20; top: 0; display: flex; min-height: 4.5rem; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.75rem clamp(1rem, 3vw, 2rem); border-bottom: 1px solid var(--line); background: rgba(255, 253, 248, 0.92); backdrop-filter: blur(16px); }
.topbar-left { display: flex; align-items: center; gap: 0.75rem; }
.topbar-toggle-btn { display: grid; width: 2.35rem; height: 2.35rem; place-items: center; border-radius: 0.65rem; border: 1px solid var(--line-strong); background: var(--paper); color: var(--ink-800); cursor: pointer; transition: background 0.15s; flex: none; }
.topbar-toggle-btn:hover { background: var(--teal-50); border-color: var(--teal-600); color: var(--teal-800); }
.admin-topbar strong { font-family: var(--font-display); font-weight: 700; font-size: 1.05rem; display: block; }
.admin-topbar span { color: var(--ink-650); font-size: 0.78rem; display: block; }
.admin-actions { display: flex; align-items: center; gap: 0.75rem; }
.user-pill { display: flex; align-items: center; gap: 0.6rem; padding: 0.3rem 0.85rem 0.3rem 0.35rem; border: 1px solid var(--line); border-radius: 999px; background: var(--paper); box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03); }
.avatar-badge { display: inline-flex; align-items: center; justify-content: center; width: 2.1rem; height: 2.1rem; border-radius: 50%; background: var(--amber-100); color: var(--amber-700); font-size: 0.78rem; font-weight: 700; line-height: 1; text-align: center; }
.user-name { color: var(--ink-950); font-size: 0.88rem; font-weight: 600; max-width: 10rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.icon-button, .logout-button { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 2.5rem; height: 2.5rem; border: 1px solid var(--line); border-radius: 0.75rem; background: var(--paper); color: var(--ink-800); cursor: pointer; transition: all 0.15s ease; }
.icon-button:hover, .logout-button:hover { background: var(--teal-50); border-color: var(--teal-600); color: var(--teal-800); }
.icon-button i { position: absolute; top: 0.55rem; right: 0.55rem; width: 0.42rem; height: 0.42rem; border-radius: 50%; background: var(--coral-700); }
#admin-content { padding: clamp(1rem, 2.5vw, 2rem); }
@media (max-width: 900px) { .admin-shell { grid-template-columns: 4.5rem minmax(0, 1fr); } .admin-sidebar { padding-inline: 0.5rem; } .admin-brand :deep(.brand-copy), .organization, .back-portal span { display: none; } .admin-sidebar :deep(a) { justify-content: center; } }
</style>
