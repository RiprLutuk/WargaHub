<script setup lang="ts">
import {
  Activity, Bell, BookOpen, CalendarClock, ClipboardList, FileSignature, FileText, Gauge,
  HardHat, Home, Megaphone, ReceiptText, Settings, ShieldCheck, Store, Users, Video, Vote, WalletCards,
} from 'lucide-vue-next';
import { computed, type Component } from 'vue';
import { RouterLink } from 'vue-router';

interface NavigationItem { to: string; label: string; icon: Component; permission?: string }
interface NavigationGroup { title: string; items: NavigationItem[] }

const props = withDefaults(
  defineProps<{
    permissions: string[];
    variant?: 'app' | 'admin' | 'all';
    collapsed?: boolean;
  }>(),
  {
    variant: 'all',
    collapsed: false,
  }
);

const residentGroups: NavigationGroup[] = [
  {
    title: 'Utama & Keuangan',
    items: [
      { to: '/app', label: 'Beranda Warga', icon: Home },
      { to: '/app/tagihan', label: 'Tagihan & Iuran', icon: ReceiptText, permission: 'billing.read' },
      { to: '/app/notifikasi', label: 'Notifikasi', icon: Bell, permission: 'notification.read' },
    ],
  },
  {
    title: 'Partisipasi & Komunitas',
    items: [
      { to: '/app/pengaduan', label: 'Pengaduan Warga', icon: ClipboardList, permission: 'complaint.read' },
      { to: '/app/kegiatan', label: 'Kegiatan & Gotong Royong', icon: Activity, permission: 'activity.read' },
      { to: '/app/ronda', label: 'Jadwal Ronda', icon: ShieldCheck, permission: 'patrol.schedule.read' },
      { to: '/app/voting', label: 'Musyawarah & Voting', icon: Vote },
      { to: '/app/program', label: 'Program Lingkungan', icon: HardHat },
      { to: '/app/struktur', label: 'Struktur Pengurus RT/RW', icon: Users },
    ],
  },
  {
    title: 'Layanan & Pemantauan',
    items: [
      { to: '/fasilitas/cctv', label: 'CCTV Lingkungan (Live)', icon: Video },
      { to: '/app/surat', label: 'Surat Pengantar', icon: FileSignature },
      { to: '/app/fasilitas', label: 'Fasilitas & Peminjaman', icon: Home },
      { to: '/app/layanan', label: 'Layanan & UMKM', icon: Store },
      { to: '/app/dokumen', label: 'Dokumen Warga', icon: FileText, permission: 'document.read' },
    ],
  },
];

const adminGroups: NavigationGroup[] = [
  {
    title: 'Ikhtisar & Warga',
    items: [
      { to: '/admin', label: 'Ringkasan Dashboard', icon: Gauge },
      { to: '/admin/warga', label: 'Kelola Warga', icon: Users, permission: 'resident.read' },
      { to: '/admin/organisasi', label: 'Struktur Pengurus', icon: Users, permission: 'organization.update' },
      { to: '/admin/pengumuman', label: 'Publikasi & Info', icon: Megaphone, permission: 'announcement.create' },
    ],
  },
  {
    title: 'Keuangan & Operasional',
    items: [
      { to: '/admin/tagihan', label: 'Kelola Tagihan', icon: ReceiptText, permission: 'billing.create' },
      { to: '/admin/pembayaran', label: 'Verifikasi Pembayaran', icon: WalletCards, permission: 'billing.reconcile' },
      { to: '/admin/keuangan', label: 'Buku Kas & Ledger', icon: BookOpen, permission: 'finance.read' },
      { to: '/admin/operasional', label: 'Operasional & Ronda', icon: CalendarClock, permission: 'complaint.assign' },
      { to: '/admin/surat', label: 'Kelola Surat', icon: FileSignature },
      { to: '/admin/voting', label: 'Musyawarah Warga', icon: Vote },
    ],
  },
  {
    title: 'Fasilitas & Pemantauan',
    items: [
      { to: '/admin/cctv', label: 'Kelola Kamera CCTV', icon: Video },
      { to: '/admin/fasilitas', label: 'Kelola Fasilitas', icon: Home },
      { to: '/admin/program', label: 'Program Lingkungan', icon: HardHat },
      { to: '/admin/layanan', label: 'Direktori UMKM', icon: Store },
      { to: '/admin/dokumen', label: 'Kelola Dokumen', icon: FileText, permission: 'document.manage' },
      { to: '/admin/audit', label: 'Audit Log System', icon: ClipboardList, permission: 'audit_log.read' },
      { to: '/admin/pengaturan', label: 'Pengaturan CMS', icon: Settings, permission: 'settings.manage' },
    ],
  },
];

function allowed(item: NavigationItem): boolean {
  return !item.permission || props.permissions.includes(item.permission);
}

const showResident = computed(() => props.variant !== 'admin');
const showAdmin = computed(() => props.variant !== 'app' && adminGroups.some((g) => g.items.some(allowed)));
</script>

<template>
  <nav class="app-sidebar" :class="{ collapsed: collapsed }" :aria-label="variant === 'admin' ? 'Navigasi CMS' : 'Navigasi portal warga'">
    <div v-if="showResident" class="nav-tree">
      <div v-for="group in residentGroups" :key="group.title" class="nav-section">
        <span v-if="!collapsed" class="section-title">{{ group.title }}</span>
        <div class="section-items">
          <RouterLink
            v-for="item in group.items.filter(allowed)"
            :key="item.to"
            :to="item.to"
            :title="collapsed ? item.label : undefined"
          >
            <component :is="item.icon" :size="18" aria-hidden="true" class="nav-icon" />
            <span v-if="!collapsed">{{ item.label }}</span>
          </RouterLink>
        </div>
      </div>
    </div>

    <div v-if="showAdmin" class="nav-tree" :class="{ 'admin-group': variant === 'all' }">
      <span v-if="variant === 'all' && !collapsed" class="nav-label">Area Pengurus</span>
      <div v-for="group in adminGroups" :key="group.title" class="nav-section">
        <span v-if="!collapsed" class="section-title">{{ group.title }}</span>
        <div class="section-items">
          <RouterLink
            v-for="item in group.items.filter(allowed)"
            :key="item.to"
            :to="item.to"
            :title="collapsed ? item.label : undefined"
          >
            <component :is="item.icon" :size="18" aria-hidden="true" class="nav-icon" />
            <span v-if="!collapsed">{{ item.label }}</span>
          </RouterLink>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.app-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.nav-tree {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.admin-group {
  margin-top: 0.5rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--line);
}

.nav-label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--ink-500);
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.nav-section {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.section-title {
  padding-inline: 0.75rem;
  margin-bottom: 0.2rem;
  color: var(--ink-500);
  font-size: 0.66rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.section-items {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.app-sidebar a {
  display: flex;
  min-height: 2.35rem;
  align-items: center;
  gap: 0.65rem;
  padding: 0.45rem 0.75rem;
  border-radius: var(--radius-md);
  color: var(--ink-700);
  font-size: 0.84rem;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.15s, color 0.15s, padding 0.15s;
}

.app-sidebar a:hover {
  background: var(--cream-100);
  color: var(--teal-800);
}

.app-sidebar a.router-link-exact-active {
  background: var(--teal-100);
  color: var(--teal-800);
}

/* Collapsed Icon-Only State */
.app-sidebar.collapsed a {
  justify-content: center;
  padding-inline: 0;
  min-height: 2.5rem;
}

.app-sidebar.collapsed .nav-icon {
  flex: none;
}
</style>
