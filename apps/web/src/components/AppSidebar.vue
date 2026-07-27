<script setup lang="ts">
import {
  Activity, Bell, BookOpen, CalendarClock, ClipboardList, FileSignature, FileText, Gauge,
  HardHat, Home, Megaphone, ReceiptText, Settings, ShieldCheck, Store, Users, Vote, WalletCards,
} from 'lucide-vue-next';
import { computed, type Component } from 'vue';
import { RouterLink } from 'vue-router';

interface NavigationItem { to: string; label: string; icon: Component; permission?: string }
interface NavigationGroup { title: string; items: NavigationItem[] }

const props = withDefaults(defineProps<{ permissions: string[]; variant?: 'app' | 'admin' | 'all' }>(), {
  variant: 'all',
});

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
    ],
  },
  {
    title: 'Layanan & Dokumentasi',
    items: [
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
      { to: '/admin/warga', label: 'Kelola warga', icon: Users, permission: 'resident.read' },
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
    title: 'Fasilitas & Sistem',
    items: [
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
const showAdmin = computed(() => props.variant !== 'app' && adminGroups.some(g => g.items.some(allowed)));
</script>

<template>
  <nav class="app-sidebar" :aria-label="variant === 'admin' ? 'Navigasi CMS' : 'Navigasi portal warga'">
    <div v-if="showResident" class="nav-tree">
      <div v-for="group in residentGroups" :key="group.title" class="nav-section">
        <span class="section-title">{{ group.title }}</span>
        <div class="section-items">
          <RouterLink v-for="item in group.items.filter(allowed)" :key="item.to" :to="item.to">
            <component :is="item.icon" :size="18" aria-hidden="true" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </div>
      </div>
    </div>

    <div v-if="showAdmin" class="nav-tree admin-tree">
      <div v-for="group in adminGroups" :key="group.title" class="nav-section">
        <span class="section-title">{{ group.title }}</span>
        <div class="section-items">
          <RouterLink v-for="item in group.items.filter(allowed)" :key="item.to" :to="item.to">
            <component :is="item.icon" :size="18" aria-hidden="true" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.app-sidebar, .nav-tree { display: grid; align-content: start; gap: 1rem; }
.admin-tree { padding-top: 1rem; border-top: 1px solid var(--line); }
.nav-section { display: grid; gap: .25rem; }
.section-title { padding: .2rem .65rem; color: var(--ink-500); font-size: .63rem; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; }
.section-items { display: grid; gap: .18rem; }
a { display: flex; min-height: 2.6rem; align-items: center; gap: .65rem; padding: .5rem .65rem; border-radius: .65rem; color: var(--ink-650); font-size: .83rem; font-weight: 720; text-decoration: none; }
a:hover { background: var(--teal-50); color: var(--teal-800); }
a.router-link-exact-active { background: var(--teal-100); color: var(--teal-800); font-weight: 820; }
</style>
