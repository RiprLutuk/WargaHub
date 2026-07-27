<script setup lang="ts">
import { ArrowLeft, Bell, LogOut } from 'lucide-vue-next';
import { computed } from 'vue';
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
async function logout() { await session.logout(); await router.push('/login'); }
</script>

<template>
  <a class="skip-link" href="#admin-content">Lewati ke konten CMS</a>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <RouterLink class="admin-brand" to="/admin"><BrandMark inverse /></RouterLink>
      <div class="organization"><span>Organisasi aktif</span><strong>{{ site.data.value?.name ?? 'Lingkungan terverifikasi' }}</strong></div>
      <AppSidebar :permissions="session.permissions" variant="admin" />
      <RouterLink class="back-portal" to="/app"><ArrowLeft :size="16" /> Kembali ke portal warga</RouterLink>
    </aside>
    <div class="admin-main">
      <header class="admin-topbar"><div><strong>CMS Pengurus</strong><span>Kelola layanan tanpa membuka privasi warga.</span></div><div class="admin-actions"><button class="icon-button" type="button" aria-label="Notifikasi operasional"><Bell :size="19" /><i /></button><span class="admin-avatar">{{ initials }}</span><span class="admin-name">{{ session.user?.name }}</span><button class="logout-button" type="button" aria-label="Keluar" @click="logout"><LogOut :size="18" /></button></div></header>
      <main id="admin-content" tabindex="-1"><RouterView /></main>
    </div>
  </div>
</template>

<style scoped>
.admin-shell { display: grid; min-height: 100vh; grid-template-columns: 17rem minmax(0, 1fr); background: #f2f4f1; }
.admin-sidebar { position: sticky; top: 0; display: flex; height: 100vh; flex-direction: column; gap: 1.25rem; padding: 1.2rem; overflow-y: auto; background: var(--ink-950); color: white; }
.admin-brand { width: fit-content; text-decoration: none; }
.organization { display: grid; gap: .25rem; padding: .75rem; border: 1px solid rgb(255 255 255 / .1); border-radius: var(--radius-md); background: rgb(255 255 255 / .06); }
.organization span { color: rgb(255 255 255 / .5); font-size: .63rem; font-weight: 800; text-transform: uppercase; }
.organization strong { color: white; font-size: .8rem; }
.admin-sidebar :deep(.nav-label) { color: rgb(255 255 255 / .4); }
.admin-sidebar :deep(.admin-group) { margin-top: 0; padding-top: 0; border: 0; }
.admin-sidebar :deep(.app-sidebar a) { color: rgb(255 255 255 / .64); }
.admin-sidebar :deep(.app-sidebar a:hover) { background: rgb(255 255 255 / .08); color: white; }
.admin-sidebar :deep(.app-sidebar a.router-link-exact-active) { background: var(--teal-600); color: white; }
.back-portal { display: flex; min-height: 2.75rem; align-items: center; gap: .5rem; margin-top: auto; padding: .6rem .7rem; color: rgb(255 255 255 / .65); font-size: .78rem; text-decoration: none; }
.admin-main { min-width: 0; }
.admin-topbar { position: sticky; z-index: 20; top: 0; display: flex; min-height: 4.7rem; align-items: center; justify-content: space-between; gap: 1rem; padding: .75rem clamp(1rem, 3vw, 2rem); border-bottom: 1px solid var(--line); background: rgb(255 253 248 / .92); backdrop-filter: blur(16px); }
.admin-topbar > div:first-child { display: grid; }
.admin-topbar span { color: var(--ink-650); font-size: .75rem; }
.admin-actions { display: flex; align-items: center; gap: .55rem; }
.icon-button, .logout-button { position: relative; display: grid; width: 2.75rem; height: 2.75rem; place-items: center; border: 1px solid var(--line); border-radius: .7rem; background: var(--paper); color: var(--ink-650); cursor: pointer; }
.icon-button i { position: absolute; top: .65rem; right: .65rem; width: .42rem; height: .42rem; border-radius: 50%; background: var(--coral-700); }
.admin-avatar { display: grid; width: 2.35rem; height: 2.35rem; place-items: center; border-radius: .65rem; background: var(--amber-100); color: var(--amber-700) !important; font-size: .74rem !important; font-weight: 900; }
.admin-name { max-width: 9rem; overflow: hidden; color: var(--ink-950) !important; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }
#admin-content { padding: clamp(1rem, 3vw, 2rem); }
@media (max-width: 900px) { .admin-shell { grid-template-columns: 5rem minmax(0, 1fr); } .admin-sidebar { padding-inline: .7rem; } .admin-brand :deep(.brand-copy), .organization, .back-portal { display: none; } .admin-sidebar :deep(a) { justify-content: center; } .admin-sidebar :deep(a span) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); } }
@media (max-width: 620px) { .admin-shell { display: block; } .admin-sidebar { position: static; width: 100%; height: auto; flex-direction: row; overflow-x: auto; } .admin-brand { flex: none; } .admin-sidebar :deep(.app-sidebar), .admin-sidebar :deep(.nav-group) { display: flex; } .admin-sidebar :deep(a) { min-width: 2.8rem; } .admin-topbar > div:first-child span, .admin-name { display: none; } #admin-content { padding-inline: .75rem; } }
</style>
