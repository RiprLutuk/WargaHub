<script setup lang="ts">
import { Activity, AlertTriangle, ArrowRight, Banknote, CalendarClock, CheckCircle2, Clock3, FileText, Home, ReceiptText, Users } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import StatePanel from '../../components/StatePanel.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import WhatsAppImportModal from '../../components/WhatsAppImportModal.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import type { Complaint } from '../../lib/demo';
import { formatDateTime, formatRupiah } from '../../lib/format';
import { adaptBills, adaptPayments } from '../../lib/view-models';

interface Household { id: string; code: string; status: string }
const households = useResource(() => api.get<Household[]>('/households'));
const bills = useResource(async () => adaptBills(await api.get<unknown>('/bills')));
const payments = useResource(async () => adaptPayments(await api.get<unknown>('/payments')));
const complaints = useResource(() => api.get<Complaint[]>('/complaints'));

const waModalOpen = ref(false);

const pendingPayments = computed(() => payments.data.value?.filter((item) => item.status === 'PENDING_VERIFICATION') ?? []);
const openComplaints = computed(() => complaints.data.value?.filter((item) => !['RESOLVED', 'CLOSED'].includes(item.status)) ?? []);
const billedAmount = computed(() => bills.data.value?.reduce((sum, item) => sum + item.amount, 0) ?? 0);

function onImported() {
  waModalOpen.value = false;
  households.reload();
  bills.reload();
  payments.reload();
  complaints.reload();
}
</script>

<template>
  <div class="admin-page">
    <header class="admin-heading">
      <div>
        <span class="eyebrow">Operasional RT/RW Hari Ini</span>
        <h1>Ringkasan Lingkungan</h1>
        <p>Prioritaskan pekerjaan yang menunggu tindakan. Pengurus dapat menyusun giliran otomatis atau mengimpor teks pesan rutin.</p>
      </div>

      <div class="heading-actions">
        <button class="button button-sm" type="button" @click="waModalOpen = true">
          <FileText :size="16" /> Impor Teks Pesan
        </button>
        <span class="last-update"><CheckCircle2 :size="15" /> Data terbaru</span>
      </div>
    </header>

    <WhatsAppImportModal :open="waModalOpen" @close="waModalOpen = false" @imported="onImported" />

    <StatePanel v-if="households.loading.value" state="loading" />
    <section v-else class="metric-grid" aria-label="Metrik operasional">
      <article class="metric-card">
        <span class="metric-icon teal"><Home :size="20" /></span>
        <div>
          <small>Rumah Terdaftar</small>
          <strong>{{ households.data.value?.length ?? 0 }}</strong>
          <em>Data terverifikasi di direktori</em>
        </div>
      </article>
      <article class="metric-card">
        <span class="metric-icon amber"><ReceiptText :size="20" /></span>
        <div>
          <small>Pembayaran Menunggu</small>
          <strong>{{ pendingPayments.length }}</strong>
          <em>Perlu verifikasi bendahara</em>
        </div>
      </article>
      <article class="metric-card">
        <span class="metric-icon blue"><Activity :size="20" /></span>
        <div>
          <small>Pengaduan Terbuka</small>
          <strong>{{ openComplaints.length }}</strong>
          <em>Semua sudah memiliki status</em>
        </div>
      </article>
      <article class="metric-card">
        <span class="metric-icon green"><Banknote :size="20" /></span>
        <div>
          <small>Tagihan Periode Ini</small>
          <strong class="money">{{ formatRupiah(billedAmount) }}</strong>
          <em>Agregat seluruh rumah</em>
        </div>
      </article>
    </section>

    <div class="admin-columns">
      <section class="card card-body">
        <div class="section-heading">
          <div>
            <h2>Antrean Pembayaran</h2>
            <p class="muted">Periksa bukti berdasarkan urutan masuk.</p>
          </div>
          <RouterLink to="/admin/pembayaran" class="text-action">Lihat semua <ArrowRight :size="15" /></RouterLink>
        </div>
        <div class="queue-list">
          <article v-for="item in pendingPayments.slice(0, 4)" :key="item.id">
            <span class="avatar">{{ item.submitterLabel.slice(0, 1) }}</span>
            <div>
              <h3>{{ item.submitterLabel }}</h3>
              <p>{{ formatRupiah(item.amount) }} · {{ formatDateTime(item.submittedAt) }}</p>
            </div>
            <StatusBadge :status="item.status" />
          </article>
          <p v-if="!pendingPayments.length" class="muted">Tidak ada pembayaran yang menunggu.</p>
        </div>
      </section>

      <section class="card card-body">
        <div class="section-heading">
          <div>
            <h2>Pengaduan Perlu Tindak Lanjut</h2>
            <p class="muted">Privasi pelapor tetap dibatasi per role.</p>
          </div>
          <RouterLink to="/admin/operasional" class="text-action">Kelola <ArrowRight :size="15" /></RouterLink>
        </div>
        <div class="queue-list">
          <article v-for="item in openComplaints.slice(0, 4)" :key="item.id">
            <span class="metric-icon small blue"><AlertTriangle :size="16" /></span>
            <div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.category }} · {{ formatDateTime(item.updatedAt) }}</p>
            </div>
            <StatusBadge :status="item.status" />
          </article>
        </div>
      </section>
    </div>

    <section class="quick-actions">
      <h2>Tindakan Cepat</h2>
      <div>
        <button type="button" class="action-card primary-action" @click="waModalOpen = true">
          <FileText :size="20" />
          <span>
            <strong>Impor Teks Pesan Rutin</strong>
            <small>Jadwal konsumsi, ronda, jimpitan</small>
          </span>
          <ArrowRight :size="17" />
        </button>
        <RouterLink to="/admin/pengumuman" class="action-card">
          <Users :size="18" />
          <span>
            <strong>Buat Pengumuman</strong>
            <small>Simpan draf atau jadwalkan</small>
          </span>
          <ArrowRight :size="17" />
        </RouterLink>
        <RouterLink to="/admin/tagihan" class="action-card">
          <ReceiptText :size="18" />
          <span>
            <strong>Terbitkan Tagihan</strong>
            <small>Satu kali atau berulang</small>
          </span>
          <ArrowRight :size="17" />
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin-page {
  display: grid;
  max-width: 86rem;
  gap: 1.6rem;
  margin-inline: auto;
}

.admin-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
}

.heading-actions {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.admin-heading h1 {
  margin-bottom: 0.45rem;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 850;
  color: var(--ink-950);
}

.admin-heading p {
  max-width: 48rem;
  margin: 0;
  color: var(--ink-650);
}

.last-update {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  background: var(--success-100);
  color: var(--success-700);
  font-size: 0.76rem;
  font-weight: 800;
  border: 1px solid var(--success-700);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 1.2rem;
  border: 1px solid #cbd5e1;
  border-radius: var(--radius-lg);
  background: #ffffff;
  box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.05);
  transition: all 0.2s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  border-color: var(--teal-600);
  box-shadow: 0 8px 20px -3px rgba(15, 118, 110, 0.12);
}

.metric-icon {
  display: grid;
  width: 2.85rem;
  height: 2.85rem;
  flex: none;
  place-items: center;
  border-radius: 0.85rem;
}

.metric-icon.teal { background: var(--teal-100); color: var(--teal-800); }
.metric-icon.amber { background: var(--amber-100); color: var(--amber-700); }
.metric-icon.blue { background: var(--blue-100); color: var(--blue-700); }
.metric-icon.green { background: var(--success-100); color: var(--success-700); }

.metric-card > div {
  display: grid;
  min-width: 0;
}

.metric-card small {
  color: var(--ink-650);
  font-size: 0.78rem;
  font-weight: 750;
}

.metric-card strong {
  font-size: 1.55rem;
  line-height: 1.2;
  font-weight: 850;
  color: var(--ink-950);
}

.metric-card strong.money {
  font-size: 1.1rem;
}

.metric-card em {
  overflow: hidden;
  color: var(--ink-500);
  font-size: 0.7rem;
  font-style: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2rem;
}

.queue-list {
  display: grid;
}

.queue-list article {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.8rem 0;
  border-bottom: 1px solid var(--line);
}

.queue-list article:last-child {
  border: 0;
}

.queue-list article > div:nth-child(2) {
  min-width: 0;
  flex: 1;
}

.queue-list h3 {
  margin: 0;
  overflow: hidden;
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--ink-950);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.queue-list p {
  margin: 0;
  color: var(--ink-650);
  font-size: 0.76rem;
}

.avatar {
  display: grid;
  width: 2.35rem;
  height: 2.35rem;
  place-items: center;
  border-radius: 0.7rem;
  background: var(--teal-100);
  color: var(--teal-800);
  font-weight: 850;
}

.metric-icon.small {
  width: 2.35rem;
  height: 2.35rem;
}

.quick-actions h2 {
  font-size: 1.2rem;
  font-weight: 850;
  margin-bottom: 0.85rem;
  color: var(--ink-950);
}

.quick-actions > div {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1.2rem;
  border: 1px solid #cbd5e1;
  border-radius: var(--radius-lg);
  background: #ffffff;
  color: var(--ink-950);
  text-decoration: none;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 4px 14px -2px rgba(15, 23, 42, 0.05);
  transition: all 0.2s ease;
}

.action-card:hover {
  transform: translateY(-2px);
  border-color: var(--teal-600);
  box-shadow: 0 8px 20px -3px rgba(15, 118, 110, 0.12);
}

.action-card.primary-action {
  border-color: var(--teal-200);
  background: var(--teal-50);
}

.action-card > svg:first-child {
  color: var(--teal-700);
  flex: none;
}

.action-card > span {
  display: grid;
  flex: 1;
}

.action-card strong {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--ink-950);
}

.action-card small {
  color: var(--ink-650);
  font-size: 0.78rem;
}

.text-action {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.84rem;
  font-weight: 800;
  color: var(--teal-700);
  text-decoration: none;
}

@media (max-width: 1100px) {
  .metric-grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 780px) {
  .admin-columns, .quick-actions > div { grid-template-columns: 1fr; }
}

@media (max-width: 520px) {
  .admin-heading { align-items: flex-start; flex-direction: column; }
  .metric-grid { grid-template-columns: 1fr; }
}
</style>
