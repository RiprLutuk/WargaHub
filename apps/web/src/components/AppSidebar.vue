<script setup lang="ts">
import {
  Activity, Bell, BookOpen, CalendarClock, ClipboardList, FileText, Gauge, Home, Megaphone,
  ReceiptText, Settings, ShieldCheck, Users, WalletCards,
} from 'lucide-vue-next';
import { computed, type Component } from 'vue';
import { RouterLink } from 'vue-router';

interface NavigationItem { to: string; label: string; icon: Component; permission?: string }

const props = withDefaults(defineProps<{ permissions: string[]; variant?: 'app' | 'admin' | 'all' }>(), {
  variant: 'all',
});

const residentItems: NavigationItem[] = [
  { to: '/app', label: 'Beranda', icon: Home },
  { to: '/app/tagihan', label: 'Tagihan', icon: ReceiptText, permission: 'billing.read' },
  { to: '/app/pengaduan', label: 'Pengaduan', icon: ClipboardList, permission: 'complaint.read' },
  { to: '/app/kegiatan', label: 'Kegiatan', icon: Activity, permission: 'activity.read' },
  { to: '/app/ronda', label: 'Ronda', icon: ShieldCheck, permission: 'patrol.schedule.read' },
  { to: '/app/dokumen', label: 'Dokumen', icon: FileText, permission: 'document.read' },
  { to: '/app/notifikasi', label: 'Notifikasi', icon: Bell, permission: 'notification.read' },
];

const adminItems: NavigationItem[] = [
  { to: '/admin', label: 'Ringkasan', icon: Gauge },
  { to: '/admin/warga', label: 'Kelola warga', icon: Users, permission: 'resident.read' },
  { to: '/admin/pengumuman', label: 'Publikasi', icon: Megaphone, permission: 'announcement.create' },
  { to: '/admin/tagihan', label: 'Tagihan', icon: ReceiptText, permission: 'billing.create' },
  { to: '/admin/pembayaran', label: 'Pembayaran', icon: WalletCards, permission: 'billing.reconcile' },
  { to: '/admin/keuangan', label: 'Keuangan', icon: BookOpen, permission: 'finance.read' },
  { to: '/admin/operasional', label: 'Operasional', icon: CalendarClock, permission: 'complaint.assign' },
  { to: '/admin/dokumen', label: 'Dokumen', icon: FileText, permission: 'document.manage' },
  { to: '/admin/audit', label: 'Audit log', icon: ClipboardList, permission: 'audit_log.read' },
  { to: '/admin/pengaturan', label: 'Pengaturan', icon: Settings, permission: 'settings.manage' },
];

function allowed(item: NavigationItem): boolean {
  return !item.permission || props.permissions.includes(item.permission);
}

const showResident = computed(() => props.variant !== 'admin');
const showAdmin = computed(() => props.variant !== 'app' && adminItems.some((item) => item.permission && allowed(item)));
</script>

<template>
  <nav class="app-sidebar" :aria-label="variant === 'admin' ? 'Navigasi CMS' : 'Navigasi portal warga'">
    <div v-if="showResident" class="nav-group">
      <span v-if="variant === 'all'" class="nav-label">Portal warga</span>
      <RouterLink v-for="item in residentItems.filter(allowed)" :key="item.to" :to="item.to">
        <component :is="item.icon" :size="19" aria-hidden="true" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </div>
    <div v-if="showAdmin" class="nav-group admin-group">
      <span v-if="variant === 'all'" class="nav-label">Kelola lingkungan</span>
      <RouterLink v-for="item in adminItems.filter(allowed)" :key="item.to" :to="item.to">
        <component :is="item.icon" :size="19" aria-hidden="true" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </div>
  </nav>
</template>

<style scoped>
.app-sidebar, .nav-group { display: grid; align-content: start; gap: .3rem; }
.admin-group { margin-top: .9rem; padding-top: .9rem; border-top: 1px solid var(--line); }
.nav-label { padding: .25rem .7rem; color: var(--ink-500); font-size: .65rem; font-weight: 850; letter-spacing: .09em; text-transform: uppercase; }
a { display: flex; min-height: 2.85rem; align-items: center; gap: .7rem; padding: .62rem .72rem; border-radius: .72rem; color: var(--ink-650); font-size: .88rem; font-weight: 720; text-decoration: none; }
a:hover { background: var(--teal-50); color: var(--teal-800); }
a.router-link-exact-active { background: var(--teal-100); color: var(--teal-800); font-weight: 820; }
</style>
