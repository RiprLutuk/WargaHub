<script setup lang="ts">
import { Bell, LogOut, Settings, ShieldCheck } from 'lucide-vue-next';
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

async function logout() {
  await session.logout();
  await router.push('/login');
}
</script>

<template>
  <a class="skip-link" href="#portal-content">Lewati ke konten utama</a>
  <div class="portal-shell">
    <aside class="portal-sidebar">
      <RouterLink class="sidebar-brand" to="/app"><BrandMark /></RouterLink>
      <div class="home-context"><span>Rumah aktif</span><strong>{{ activeHousehold?.code ?? 'Rumah terhubung' }}</strong><small v-if="activeHousehold?.address">{{ activeHousehold.address }}</small></div>
      <AppSidebar :permissions="session.permissions" variant="app" />
      <RouterLink v-if="session.isAdmin" class="admin-switch" to="/admin"><ShieldCheck :size="17" /> Buka CMS pengurus</RouterLink>
    </aside>

    <div class="portal-main">
      <header class="portal-topbar">
        <div><span>Halo, {{ firstName }}</span><small>Semoga harimu berjalan ringan.</small></div>
        <div class="topbar-actions">
          <RouterLink class="icon-button" to="/app/notifikasi" aria-label="Buka notifikasi"><Bell :size="20" /><span class="notification-dot" /></RouterLink>
          <div class="profile-menu"><button class="avatar-button" type="button" :aria-expanded="profileOpen" @click="profileOpen = !profileOpen"><span>{{ firstName.slice(0, 1) }}</span><ChevronDown :size="15" /></button><div v-if="profileOpen" class="profile-popover"><strong>{{ session.user?.name }}</strong><small>{{ session.user?.email }}</small><RouterLink to="/app/pengaturan"><Settings :size="15" /> Pengaturan akun</RouterLink><button type="button" @click="logout"><LogOut :size="15" /> Keluar</button></div></div>
        </div>
      </header>
      <main id="portal-content" tabindex="-1"><RouterView /></main>
    </div>

    <div class="mobile-nav"><AppSidebar :permissions="session.permissions" variant="app" /></div>
  </div>
</template>

<style scoped>
.portal-shell { display: grid; min-height: 100vh; grid-template-columns: 16.5rem minmax(0, 1fr); background: #f5f6f2; }
.portal-sidebar { position: sticky; top: 0; display: flex; height: 100vh; flex-direction: column; gap: 1.2rem; padding: 1.2rem; border-right: 1px solid var(--line); background: var(--paper); }
.sidebar-brand { width: fit-content; text-decoration: none; }
.home-context { display: grid; gap: .28rem; padding: .7rem; border-radius: var(--radius-md); background: var(--cream-100); }
.home-context > span { color: var(--ink-500); font-size: .65rem; font-weight: 800; text-transform: uppercase; }
.home-context strong { color: var(--ink-950); font-size: .82rem; }
.home-context small { overflow: hidden; color: var(--ink-650); font-size: .68rem; text-overflow: ellipsis; white-space: nowrap; }
.admin-switch { display: flex; min-height: 2.75rem; align-items: center; gap: .55rem; margin-top: auto; padding: .65rem .75rem; border: 1px solid var(--teal-100); border-radius: .7rem; background: var(--teal-50); color: var(--teal-700); font-size: .78rem; font-weight: 800; text-decoration: none; }
.portal-main { min-width: 0; }
.portal-topbar { position: sticky; z-index: 20; top: 0; display: flex; min-height: 4.8rem; align-items: center; justify-content: space-between; gap: 1rem; padding: .8rem clamp(1rem, 3vw, 2rem); border-bottom: 1px solid var(--line); background: rgb(245 246 242 / .9); backdrop-filter: blur(16px); }
.portal-topbar > div:first-child { display: grid; }
.portal-topbar > div:first-child > span { font-weight: 850; }
.portal-topbar small { color: var(--ink-650); }
.topbar-actions { display: flex; align-items: center; gap: .6rem; }
.icon-button, .avatar-button { position: relative; display: flex; min-width: 2.75rem; min-height: 2.75rem; align-items: center; justify-content: center; border: 1px solid var(--line); border-radius: .72rem; background: var(--paper); color: var(--ink-800); text-decoration: none; cursor: pointer; }
.notification-dot { position: absolute; top: .63rem; right: .63rem; width: .45rem; height: .45rem; border: 2px solid var(--paper); border-radius: 50%; background: var(--coral-700); }
.profile-menu { position: relative; }
.avatar-button { gap: .35rem; padding: .25rem .5rem .25rem .28rem; }
.avatar-button > span { display: grid; width: 2rem; height: 2rem; place-items: center; border-radius: .55rem; background: var(--teal-700); color: white; font-weight: 850; }
.profile-popover { position: absolute; top: calc(100% + .5rem); right: 0; display: grid; width: 15rem; gap: .35rem; padding: .75rem; border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--paper); box-shadow: var(--shadow-lg); }
.profile-popover > strong, .profile-popover > small { padding-inline: .45rem; }
.profile-popover > small { margin-bottom: .45rem; overflow: hidden; color: var(--ink-650); text-overflow: ellipsis; }
.profile-popover a, .profile-popover button { display: flex; min-height: 2.5rem; align-items: center; gap: .5rem; padding: .5rem; border: 0; border-radius: .55rem; background: transparent; color: var(--ink-800); font-size: .8rem; text-decoration: none; cursor: pointer; }
.profile-popover a:hover, .profile-popover button:hover { background: var(--teal-50); }
#portal-content { padding: clamp(1rem, 3vw, 2rem); }
.mobile-nav { display: none; }
@media (max-width: 820px) {
  .portal-shell { display: block; padding-bottom: 4.8rem; }
  .portal-sidebar { display: none; }
  .portal-topbar { min-height: 4.25rem; }
  .mobile-nav { position: fixed; z-index: 30; right: 0; bottom: 0; left: 0; display: block; padding-bottom: env(safe-area-inset-bottom); border-top: 1px solid var(--line); background: var(--paper); box-shadow: 0 -8px 30px rgb(16 43 39 / .08); }
  .mobile-nav :deep(.app-sidebar) { display: flex; overflow-x: auto; padding: .35rem; }
  .mobile-nav :deep(.nav-group) { display: contents; }
  .mobile-nav :deep(a) { min-width: 4.5rem; flex: 1; flex-direction: column; gap: .1rem; padding: .35rem .25rem; font-size: .65rem; white-space: nowrap; }
  .mobile-nav :deep(a:nth-child(n+6)) { display: none; }
}
@media (max-width: 480px) { .portal-topbar small { display: none; } #portal-content { padding-inline: .75rem; } }
</style>
