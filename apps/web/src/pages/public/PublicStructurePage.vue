<script setup lang="ts">
import {
  Building2,
  Calendar,
  Mail,
  MessageCircle,
  Phone,
  Shield,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-vue-next';
import { computed, ref } from 'vue';
import EmptyState from '../../components/EmptyState.vue';
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

const selectedDept = ref('SEMUA');
const officers = useResource(() => api.get<Officer[]>('/public/officers'));

const departments = [
  { key: 'SEMUA', label: 'Semua Pengurus' },
  { key: 'PENGURUS_INTI', label: 'Pengurus Inti' },
  { key: 'SEKSI_KEAMANAN', label: 'Seksi Keamanan & Ronda' },
  { key: 'SEKSI_LINGKUNGAN', label: 'Seksi Lingkungan & Kebersihan' },
  { key: 'PEMUDA_KARANG_TARUNA', label: 'Pemuda & Karang Taruna' },
];

const filteredOfficers = computed(() => {
  const list = officers.data.value ?? [];
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
</script>

<template>
  <div class="container public-page-shell">
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
    </template>
  </div>
</template>

<style scoped>
.public-page-shell {
  padding-block: clamp(3rem, 6vw, 5.5rem);
}

.page-header {
  margin-bottom: 2.5rem;
  max-width: 48rem;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  background: var(--teal-50);
  border: 1px solid var(--teal-200);
  color: var(--teal-800);
  font-size: 0.78rem;
  font-weight: 800;
  margin-bottom: 0.9rem;
}

.badge-icon {
  color: var(--teal-600);
}

.page-header h1 {
  font-size: clamp(2.1rem, 4.2vw, 3rem);
  font-weight: 850;
  line-height: 1.15;
  color: var(--ink-950);
  margin-bottom: 0.75rem;
  letter-spacing: -0.02em;
}

.header-desc {
  font-size: 1.05rem;
  line-height: 1.6;
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
  grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
  gap: 1.25rem;
}

.officer-card {
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--line);
  background: var(--paper);
  box-shadow: var(--shadow-sm);
  transition: all 0.25 ease;
}

.officer-card:hover {
  border-color: var(--teal-300);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.card-avatar-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.avatar-box {
  display: grid;
  width: 3.4rem;
  height: 3.4rem;
  place-items: center;
  border-radius: 1rem;
  background: linear-gradient(135deg, var(--teal-600), var(--teal-800));
  color: white;
  font-size: 1.15rem;
  font-weight: 850;
  letter-spacing: 0.04em;
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.25);
}

.dept-badge {
  padding: 0.2rem 0.6rem;
  border-radius: 0.4rem;
  background: var(--cream-100);
  color: var(--ink-800);
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.officer-name {
  font-size: 1.25rem;
  font-weight: 850;
  color: var(--ink-950);
  margin: 0;
}

.position-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.88rem;
  font-weight: 800;
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
  font-weight: 700;
}

.contact-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 0.8rem;
  border-top: 1px dashed var(--line);
}

.wa-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  border-radius: 0.5rem;
  background: #25d366;
  color: white;
  font-size: 0.78rem;
  font-weight: 800;
  text-decoration: none;
  transition: opacity 0.2s;
}

.wa-btn:hover {
  opacity: 0.9;
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
  font-weight: 800;
  text-decoration: none;
}

.email-btn:hover {
  background: var(--cream-200);
}
</style>
