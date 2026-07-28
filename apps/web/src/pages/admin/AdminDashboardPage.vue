<script setup lang="ts">
import { Activity, AlertTriangle, ArrowRight, Banknote, CheckCircle2, Clock3, Home, ReceiptText, Sparkles, Users } from 'lucide-vue-next';
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
        <h1>Ringkasan lingkungan</h1>
        <p>Prioritaskan pekerjaan yang menunggu tindakan. Pengurus dapat mengimpor pesan WhatsApp jadwal & jimpitan secara otomatis.</p>
      </div>

      <div class="heading-actions">
        <button class="button button-sm" type="button" @click="waModalOpen = true">
          <Sparkles :size="16" /> Impor Teks WhatsApp
        </button>
        <span class="last-update"><CheckCircle2 :size="15" /> Data terbaru</span>
      </div>
    </header>

    <WhatsAppImportModal :open="waModalOpen" @close="waModalOpen = false" @imported="onImported" />

    <StatePanel v-if="households.loading.value" state="loading" />
    <section v-else class="metric-grid" aria-label="Metrik operasional">
      <article>
        <span class="metric-icon teal"><Home :size="20" /></span>
        <div>
          <small>Rumah terdaftar</small>
          <strong>{{ households.data.value?.length ?? 0 }}</strong>
          <em>Data terverifikasi di direktori</em>
        </div>
      </article>
      <article>
        <span class="metric-icon amber"><ReceiptText :size="20" /></span>
        <div>
          <small>Pembayaran menunggu</small>
          <strong>{{ pendingPayments.length }}</strong>
          <em>Perlu verifikasi bendahara</em>
        </div>
      </article>
      <article>
        <span class="metric-icon blue"><Activity :size="20" /></span>
        <div>
          <small>Pengaduan terbuka</small>
          <strong>{{ openComplaints.length }}</strong>
          <em>Semua sudah memiliki status</em>
        </div>
      </article>
      <article>
        <span class="metric-icon green"><Banknote :size="20" /></span>
        <div>
          <small>Tagihan periode ini</small>
          <strong class="money">{{ formatRupiah(billedAmount) }}</strong>
          <em>Agregat seluruh rumah</em>
        </div>
      </article>
    </section>

    <div class="admin-columns">
      <section class="card card-body">
        <div class="section-heading">
          <div>
            <h2>Antrean pembayaran</h2>
            <p class="muted">Periksa bukti berdasarkan urutan masuk.</p>
          </div>
          <RouterLink to="/admin/pembayaran">Lihat semua</RouterLink>
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
            <h2>Pengaduan perlu tindak lanjut</h2>
            <p class="muted">Privasi pelapor tetap dibatasi per role.</p>
          </div>
          <RouterLink to="/admin/operasional">Kelola</RouterLink>
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
      <h2>Tindakan cepat</h2>
      <div>
        <button type="button" class="action-card" @click="waModalOpen = true">
          <Sparkles :size="20" />
          <span>
            <strong>Impor Pesan WA Grup</strong>
            <small>Jadwal konsumsi, ronda, jimpitan</small>
          </span>
          <ArrowRight :size="17" />
        </button>
        <RouterLink to="/admin/pengumuman">
          <Users :size="18" />
          <span>
            <strong>Buat pengumuman</strong>
            <small>Simpan draf atau jadwalkan</small>
          </span>
          <ArrowRight :size="17" />
        </RouterLink>
        <RouterLink to="/admin/tagihan">
          <ReceiptText :size="18" />
          <span>
            <strong>Terbitkan tagihan</strong>
            <small>Satu kali atau berulang</small>
          </span>
          <ArrowRight :size="17" />
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin-page { display: grid; max-width: 86rem; gap: 1.5rem; margin-inline: auto; }
.admin-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; }
.heading-actions { display: flex; align-items: center; gap: .8rem; }
.admin-heading h1 { margin-bottom: .45rem; font-size: clamp(2rem, 4vw, 3rem); }
.admin-heading p { max-width: 48rem; margin: 0; color: var(--ink-650); }
.last-update { display: inline-flex; align-items: center; gap: .35rem; padding: .4rem .6rem; border-radius: 999px; background: var(--success-100); color: var(--success-700); font-size: .72rem; font-weight: 800; }
.metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: .75rem; }
.metric-grid article { display: flex; align-items: center; gap: .8rem; padding: 1rem; border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--paper); box-shadow: var(--shadow-sm); }
.metric-icon { display: grid; width: 2.7rem; height: 2.7rem; flex: none; place-items: center; border-radius: .8rem; }
.metric-icon.teal { background: var(--teal-100); color: var(--teal-700); }
.metric-icon.amber { background: var(--amber-100); color: var(--amber-700); }
.metric-icon.blue { background: var(--blue-100); color: var(--blue-700); }
.metric-icon.green { background: var(--success-100); color: var(--success-700); }
.metric-grid article > div { display: grid; min-width: 0; }
.metric-grid small { color: var(--ink-650); }
.metric-grid strong { font-size: 1.5rem; line-height: 1.2; }
.metric-grid strong.money { font-size: 1.05rem; }
.metric-grid em { overflow: hidden; color: var(--ink-500); font-size: .66rem; font-style: normal; text-overflow: ellipsis; white-space: nowrap; }
.admin-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.queue-list { display: grid; }
.queue-list article { display: flex; align-items: center; gap: .65rem; padding: .7rem 0; border-bottom: 1px solid var(--line); }
.queue-list article:last-child { border: 0; }
.queue-list article > div:nth-child(2) { min-width: 0; flex: 1; }
.queue-list h3 { margin: 0; overflow: hidden; font-size: .88rem; text-overflow: ellipsis; white-space: nowrap; }
.queue-list p { margin: 0; color: var(--ink-650); font-size: .72rem; }
.avatar { display: grid; width: 2.25rem; height: 2.25rem; place-items: center; border-radius: .65rem; background: var(--cream-100); color: var(--ink-800); font-weight: 850; }
.metric-icon.small { width: 2.25rem; height: 2.25rem; }
.quick-actions > div { display: grid; grid-template-columns: repeat(3, 1fr); gap: .75rem; }
.quick-actions a, .action-card { display: flex; align-items: center; gap: .7rem; padding: 1rem; border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--paper); color: var(--ink-950); text-decoration: none; text-align: left; cursor: pointer; }
.action-card { border-color: var(--teal-100); background: var(--teal-50); }
.quick-actions a > svg:first-child, .action-card > svg:first-child { color: var(--teal-700); }
.quick-actions a > span, .action-card > span { display: grid; flex: 1; }
.quick-actions small { color: var(--ink-650); }
@media (max-width: 1100px) { .metric-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 780px) { .admin-columns, .quick-actions > div { grid-template-columns: 1fr; } }
@media (max-width: 520px) { .admin-heading { align-items: flex-start; flex-direction: column; } .metric-grid { grid-template-columns: 1fr; } }
</style>
