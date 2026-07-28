<script setup lang="ts">
import {
  Building2,
  Calendar,
  CheckCircle2,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  Shield,
  ShieldCheck,
  UserCheck,
  Users,
  Vote,
  Wallet,
  Wrench,
} from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import EmptyState from '../../components/EmptyState.vue';
import PublicPageShell from '../../components/PublicPageShell.vue';
import StatePanel from '../../components/StatePanel.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';

interface Officer {
  id: string;
  name: string;
  position: string;
  department: string;
  phone?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  period: string;
  orderIndex: number;
}

const route = useRoute();
const router = useRouter();
const selectedDept = ref(String(route.query.departemen ?? 'SEMUA'));
const officers = useResource(() => api.get<Officer[]>('/public/officers'));

const departments = [
  { key: 'SEMUA', label: 'Semua Pengurus' },
  { key: 'PENGURUS_INTI', label: 'Pengurus Inti' },
  { key: 'SEKSI_KEAMANAN', label: 'Seksi Keamanan & Ronda' },
  { key: 'SEKSI_LINGKUNGAN', label: 'Seksi Lingkungan & Kebersihan' },
  { key: 'PEMUDA_KARANG_TARUNA', label: 'Pemuda & Karang Taruna' },
];

watch(selectedDept, (department) => {
  router.replace({ query: { ...route.query, departemen: department !== 'SEMUA' ? department : undefined } });
});

watch(() => route.query.departemen, (department) => {
  const next = String(department ?? 'SEMUA');
  if (selectedDept.value !== next) selectedDept.value = next;
});

const defaultOfficers: Officer[] = [
  { id: 'off-1', name: 'Bpk. H. Ahmad Dahlan', position: 'Ketua RT 005', department: 'PENGURUS_INTI', phone: '+62 812-3456-7890', email: 'ahmad.dahlan@wargahub.id', period: '2024 - 2027', orderIndex: 1 },
  { id: 'off-2', name: 'Bpk. Bambang Setiawan', position: 'Wakil Ketua RT', department: 'PENGURUS_INTI', phone: '+62 813-9876-5432', email: 'bambang@wargahub.id', period: '2024 - 2027', orderIndex: 2 },
  { id: 'off-3', name: 'Ibu Rina Pratiwi', position: 'Sekretaris RT', department: 'PENGURUS_INTI', phone: '+62 815-1122-3344', email: 'rina.pratiwi@wargahub.id', period: '2024 - 2027', orderIndex: 3 },
  { id: 'off-4', name: 'Ibu Hj. Siti Rahma', position: 'Bendahara RT', department: 'PENGURUS_INTI', phone: '+62 817-5566-7788', email: 'siti.rahma@wargahub.id', period: '2024 - 2027', orderIndex: 4 },
  { id: 'off-5', name: 'Bpk. Hendra Wijaya', position: 'Koordinator Ronda & Keamanan', department: 'SEKSI_KEAMANAN', phone: '+62 818-9900-1122', email: 'hendra.keamanan@wargahub.id', period: '2024 - 2027', orderIndex: 5 },
  { id: 'off-6', name: 'Bpk. Eko Prasetyo', position: 'Koordinator Kebersihan & Lingkungan', department: 'SEKSI_LINGKUNGAN', phone: '+62 819-3344-5566', email: 'eko.lingkungan@wargahub.id', period: '2024 - 2027', orderIndex: 6 },
];

const filteredOfficers = computed(() => {
  const raw = officers.data.value ?? [];
  const list = raw.length > 0 ? raw : defaultOfficers;
  if (selectedDept.value === 'SEMUA') return list;
  return list.filter((o) => o.department === selectedDept.value);
});

function getDeptLabel(deptKey: string) {
  return departments.find((d) => d.key === deptKey)?.label || deptKey;
}

function getInitials(name: string) {
  return name
    .replace(/^(bpk\.|ibu\.|sdr\.|sdri\.|h\.|haj\.)\s+/i, '')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function formatWaUrl(phone: string) {
  const digits = phone.replace(/\D/g, '');
  const formatted = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
  return `https://wa.me/${formatted}?text=${encodeURIComponent('Halo Pengurus RT/RW WargaHub, saya ingin bertanya...')}`;
}

const adminCapabilities = [
  {
    icon: Users,
    title: 'Pendataan Warga & Rumah',
    desc: 'Mengelola data Kartu Keluarga (KK), status tempat tinggal (Pemilik, Pengontrak, Kos), serta verifikasi warga baru.',
  },
  {
    icon: Wallet,
    title: 'Keuangan & Iuran Bulanan',
    desc: 'Menerbitkan tagihan iuran otomatis, merekonsiliasi pembayaran warga, dan mengelola laporan kas yang transparan.',
  },
  {
    icon: Wrench,
    title: 'Pengaduan & Ronda Malam',
    desc: 'Menugaskan laporan masalah fasilitas ke petugas seksi dan mengatur jadwal piket siskamling & tukar ronda warga.',
  },
  {
    icon: FileText,
    title: 'Pengesahan Surat Digital',
    desc: 'Menyetujui Surat Pengantar RT/RW (KTP, Pindah Domisili, SKTM) secara online dengan Tanda Tangan Digital & QR Code.',
  },
  {
    icon: Vote,
    title: 'Musyawarah & Voting Online',
    desc: 'Membuat polling musyawarah warga untuk keputusan bersama seperti rencana proyek lingkungan atau pemilihan pengurus.',
  },
  {
    icon: MessageCircle,
    title: 'Notifikasi WhatsApp (WAHA)',
    desc: 'Mengirimkan pengumuman penting dan penagihan iuran langsung ke WhatsApp warga secara cepat dan akurat.',
  },
];
</script>

<template>
  <PublicPageShell :class="{ 'app-structure-shell': route.path.startsWith('/app/') }">
    <!-- Page Header -->
    <header class="page-header">
      <div class="header-badge">
        <Users :size="14" class="badge-icon" />
        <span>Kepengurusan Resmi</span>
      </div>
      <h1>Struktur Organisasi RT/RW</h1>
      <p class="header-desc">
        Susunan pengurus dan penanggung jawab bidang pelayanan masyarakat RT 03 / RW 05 Warga Harmoni. Warga dapat menghubungi pengurus terkait langsung.
      </p>
    </header>

    <!-- State Panels -->
    <StatePanel v-if="officers.loading.value" state="loading" />
    <StatePanel v-else-if="officers.error.value" state="error" :message="officers.error.value" @retry="officers.reload" />
    <EmptyState v-else-if="!officers.data.value?.length" title="Belum ada data pengurus" message="Data struktur pengurus belum diisi oleh pengelola lingkungan." />

    <template v-else>
      <!-- Department Filter Pills -->
      <div class="category-pills">
        <button
          v-for="dept in departments"
          :key="dept.key"
          type="button"
          class="pill-btn"
          :class="{ active: selectedDept === dept.key }"
          @click="selectedDept = dept.key"
        >
          {{ dept.label }}
        </button>
      </div>

      <!-- Officers Cards Grid -->
      <div class="officers-grid">
        <article v-for="item in filteredOfficers" :key="item.id" class="officer-card">
          <div class="card-avatar-wrap">
            <div class="avatar-box">
              <span>{{ getInitials(item.name) }}</span>
            </div>
            <span class="dept-badge">{{ getDeptLabel(item.department) }}</span>
          </div>

          <div class="card-info">
            <h2 class="officer-name">{{ item.name }}</h2>
            <div class="position-chip">
              <UserCheck :size="13" /> {{ item.position }}
            </div>

            <div class="meta-row">
              <span class="period-tag"><Calendar :size="12" /> Masa Bhakti {{ item.period }}</span>
            </div>

            <div v-if="item.phone || item.email" class="contact-actions">
              <a v-if="item.phone" :href="formatWaUrl(item.phone)" target="_blank" rel="noopener" class="wa-btn">
                <MessageCircle :size="14" /> Chat WA
              </a>
              <a v-if="item.email" :href="`mailto:${item.email}`" class="email-btn">
                <Mail :size="14" /> Email
              </a>
            </div>
          </div>
        </article>
      </div>

      <!-- Admin Capabilities Section for Citizens -->
      <section class="admin-capabilities-section">
        <div class="section-title">
          <ShieldCheck :size="22" class="shield-icon" />
          <div>
            <h2>Tugas & Kapabilitas Pengurus di WargaHub</h2>
            <p>Penjelasan lengkap mengenai apa saja yang dikelola oleh Pengurus RT/RW melalui portal admin WargaHub demi ketertiban bersama.</p>
          </div>
        </div>

        <div class="capability-grid">
          <article v-for="cap in adminCapabilities" :key="cap.title" class="cap-card">
            <div class="cap-icon-box">
              <component :is="cap.icon" :size="22" />
            </div>
            <h3>{{ cap.title }}</h3>
            <p>{{ cap.desc }}</p>
          </article>
        </div>
      </section>
    </template>
  </PublicPageShell>
</template>

<style scoped>
.app-structure-shell { width: 100%; max-width: var(--content); margin-top: 0; padding-block: 0 3rem; }
.app-structure-shell .page-header { max-width: 76rem; margin-bottom: 1.25rem; }
.app-structure-shell .officers-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.app-structure-shell .header-badge { display: inline-flex; padding: 0; margin-bottom: .7rem; border: 0; border-radius: 0; background: transparent; color: var(--teal-700); font-size: .76rem; letter-spacing: .08em; text-transform: uppercase; }
.app-structure-shell .header-badge::before { width: 1.6rem; height: 2px; margin-right: .4rem; border-radius: 2px; background: var(--amber-500); content: ''; }
.app-structure-shell .page-header h1 { font-size: clamp(2rem, 4vw, 2.8rem); margin-bottom: .6rem; }
.app-structure-shell .header-desc { max-width: none; font-size: 1rem; line-height: 1.55; }

.page-header {
  margin-bottom: 1.25rem;
  max-width: 76rem;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0;
  margin-bottom: .9rem;
  color: var(--teal-700);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.header-badge::before { width: 1.6rem; height: 2px; margin-right: .1rem; border-radius: 2px; background: var(--amber-500); content: ''; }
.header-badge svg { display: none; }

.badge-icon {
  color: var(--teal-600);
}

.page-header h1 {
  font-size: clamp(2rem, 4vw, 2.8rem);
  font-weight: 850;
  line-height: 1.15;
  color: var(--ink-950);
  margin-bottom: 0.6rem;
  letter-spacing: -0.02em;
}

.header-desc {
  font-size: 1rem;
  line-height: 1.55;
  color: var(--ink-650);
  margin: 0;
}

/* Department Pills */
.category-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.pill-btn {
  padding: 0.5rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--ink-700);
  font-size: 0.84rem;
  font-weight: 750;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pill-btn:hover {
  border-color: var(--teal-400);
  background: var(--cream-50);
  color: var(--teal-800);
}

.pill-btn.active {
  background: var(--teal-700);
  border-color: var(--teal-700);
  color: white;
  box-shadow: 0 3px 10px rgba(15, 118, 110, 0.2);
}

/* Officers Grid */
.officers-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.officer-card {
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
  border-radius: 1.15rem;
  border: 1px solid var(--line);
  background: var(--paper);
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.officer-card:hover {
  border-color: rgba(13, 148, 136, 0.25);
  box-shadow: 0 8px 24px rgba(16, 43, 39, 0.06);
  transform: translateY(-2px);
}

.card-avatar-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.9rem;
}

.avatar-box {
  display: grid;
  width: 3.15rem;
  height: 3.15rem;
  place-items: center;
  border-radius: 0.9rem;
  background: linear-gradient(135deg, var(--teal-600), var(--teal-800));
  color: white;
  font-size: 1.05rem;
  font-weight: 750;
  letter-spacing: 0.04em;
  box-shadow: 0 0 0 3px var(--amber-100), 0 4px 10px rgba(15, 118, 110, 0.16);
}

.dept-badge {
  padding: 0.22rem 0.55rem;
  border-radius: 0.4rem;
  border: 1px solid var(--teal-100);
  background: var(--teal-50);
  color: var(--teal-800);
  font-size: 0.66rem;
  font-weight: 700;
  text-transform: uppercase;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.officer-name {
  font-size: 1.12rem;
  font-weight: 650;
  color: var(--ink-950);
  margin: 0;
}

.position-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.83rem;
  font-weight: 650;
  color: var(--teal-700);
}

.meta-row {
  margin-top: 0.2rem;
  font-size: 0.78rem;
  color: var(--ink-500);
}

.period-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--ink-600);
  font-weight: 550;
}

.contact-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.8rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--line);
}

.wa-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  border-radius: 0.5rem;
  background: var(--success-700);
  color: white;
  font-size: 0.78rem;
  font-weight: 650;
  text-decoration: none;
  box-shadow: 0 2px 8px rgba(36, 112, 73, 0.16);
  transition: background 0.2s, box-shadow 0.2s, transform 0.2s;
}

.wa-btn:hover {
  background: var(--success-800);
  box-shadow: 0 4px 12px rgba(36, 112, 73, 0.22);
  transform: translateY(-1px);
}

.email-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  border-radius: 0.5rem;
  background: var(--cream-100);
  color: var(--ink-800);
  font-size: 0.78rem;
  font-weight: 650;
  text-decoration: none;
}

.email-btn:hover {
  background: var(--cream-200);
}

/* Capabilities Section */
.admin-capabilities-section {
  margin-top: 4.5rem;
  padding-top: 3.5rem;
  border-top: 1px solid var(--line);
}

.section-title {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 2.2rem;
}

.shield-icon {
  color: var(--teal-700);
  margin-top: 0.2rem;
}

.section-title h2 {
  font-size: 1.65rem;
  font-weight: 850;
  color: var(--ink-950);
  margin: 0 0 0.35rem;
}

.section-title p {
  color: var(--ink-650);
  margin: 0;
  font-size: 1.02rem;
}

.capability-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.4rem;
}

.cap-card {
  padding: 1.6rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--line);
  background: var(--paper);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.cap-icon-box {
  display: grid;
  width: 2.8rem;
  height: 2.8rem;
  place-items: center;
  border-radius: 0.8rem;
  background: var(--teal-50);
  color: var(--teal-700);
  border: 1px solid var(--teal-200);
}

.cap-card h3 {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--ink-950);
  margin: 0;
}

.cap-card p {
  font-size: 0.92rem;
  color: var(--ink-650);
  margin: 0;
  line-height: 1.6;
}

@media (max-width: 700px) {
  .category-pills { flex-wrap: nowrap; margin-inline: -.625rem; padding-inline: .625rem; overflow-x: auto; scrollbar-width: none; }
  .category-pills::-webkit-scrollbar { display: none; }
  .pill-btn { flex: 0 0 auto; white-space: nowrap; }
  .admin-capabilities-section { margin-top: 2.5rem; padding-top: 2rem; }
  .section-title { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: .6rem; margin-bottom: 1.25rem; }
  .section-title h2 { font-size: 1.35rem; line-height: 1.2; margin-bottom: .3rem; }
  .section-title p { font-size: .88rem; line-height: 1.5; }
  .officers-grid, .capability-grid { display: flex; gap: 1rem; margin-inline: 0; padding: .2rem .25rem .35rem; overflow-x: auto; scroll-padding-inline: .25rem; scroll-snap-type: x mandatory; scrollbar-width: none; }
  .officers-grid::-webkit-scrollbar, .capability-grid::-webkit-scrollbar { display: none; }
  .officer-card, .cap-card { flex: 0 0 min(84vw, 20rem); scroll-snap-align: start; }
}
@media (min-width: 701px) and (max-width: 1100px) {
  .officers-grid, .capability-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 700px) {
  .app-structure-shell { width: 100%; margin-top: 0; padding-block: 0 2rem; }
}
</style>
