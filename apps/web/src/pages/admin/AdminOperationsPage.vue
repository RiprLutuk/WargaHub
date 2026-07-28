<script setup lang="ts">
import { Activity, CalendarClock, CheckCircle2, ClipboardCheck, Clock3, FileClock, FileText, Search, ShieldCheck, UserCheck } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import AutomatedRosterModal from '../../components/AutomatedRosterModal.vue';
import StatePanel from '../../components/StatePanel.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import WhatsAppImportModal from '../../components/WhatsAppImportModal.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import type { Complaint } from '../../lib/demo';
import { formatDateTime } from '../../lib/format';
import { adaptActivities, adaptAuditLogs, adaptPatrolAssignments } from '../../lib/view-models';

const props = withDefaults(defineProps<{ section?: 'operations' | 'audit' }>(), { section: 'operations' });
const complaints = useResource(() => api.get<Complaint[]>('/complaints'));
const activities = useResource(async () => adaptActivities(await api.get<unknown>('/activities')));
const patrols = useResource(async () => adaptPatrolAssignments(await api.get<unknown>('/patrol-assignments')));
const audits = useResource(async () => adaptAuditLogs(await api.get<unknown>('/audit-logs')));
const tab = ref<'complaints' | 'activities' | 'patrol' | 'notifications'>('complaints');
const message = ref('');
const search = ref('');
const waModalOpen = ref(false);
const rosterModalOpen = ref(false);

const openComplaints = computed(() => complaints.data.value?.filter(item => !['RESOLVED', 'CLOSED'].includes(item.status)) ?? []);

async function resolve(item: Complaint) {
  await api.post(`/complaints/${item.id}/status`, { status: 'RESOLVED' });
  item.status = 'RESOLVED';
  message.value = 'Status pengaduan diperbarui dan pelapor akan menerima notifikasi.';
}

function onImported() {
  waModalOpen.value = false;
  complaints.reload();
  activities.reload();
  patrols.reload();
  message.value = 'Teks berhasil diimpor dan sistem telah diperbarui.';
}

function onGenerated() {
  rosterModalOpen.value = false;
  activities.reload();
  patrols.reload();
  message.value = 'Jadwal rotasi warga berhasil diterbitkan secara otomatis.';
}
</script>

<template>
  <div class="admin-page">
    <header class="admin-heading">
      <div>
        <span class="eyebrow">{{ section === 'audit' ? 'Jejak tindakan sensitif' : 'Koordinasi layanan' }}</span>
        <h1>{{ section === 'audit' ? 'Audit log' : 'Operasional warga' }}</h1>
        <p>{{ section === 'audit' ? 'Audit log hanya dapat dibaca role berizin dan tidak boleh memuat rahasia, token, atau alasan dispensasi mentah.' : 'Kelola pengaduan, giliran otomatis (sodakoh/ronda), jadwal kegiatan, CCTV lingkungan, dan notifikasi WAHA WhatsApp.' }}</p>
      </div>

      <div v-if="section === 'operations'" class="heading-actions">
        <button class="button button-sm" type="button" @click="rosterModalOpen = true">
          <CalendarClock :size="15" /> Giliran Otomatis
        </button>
        <button class="button button-secondary button-sm" type="button" @click="waModalOpen = true">
          <FileText :size="15" /> Impor Teks
        </button>
        <span class="sla-chip"><Clock3 :size="15" /> {{ openComplaints.length }} Laporan</span>
      </div>
    </header>

    <WhatsAppImportModal :open="waModalOpen" @close="waModalOpen = false" @imported="onImported" />
    <AutomatedRosterModal :open="rosterModalOpen" @close="rosterModalOpen = false" @generated="onGenerated" />

    <div v-if="message" class="notice" role="status"><CheckCircle2 :size="18" />{{ message }}</div>

    <template v-if="section === 'audit'">
      <div class="toolbar">
        <label>
          <Search :size="16" />
          <span class="sr-only">Cari audit log</span>
          <input v-model="search" type="search" placeholder="Cari actor, tindakan, atau entitas" />
        </label>
        <button class="button button-secondary button-sm" type="button">Rentang tanggal</button>
      </div>
      <StatePanel v-if="audits.loading.value" state="loading" />
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Aktor</th>
              <th>Tindakan</th>
              <th>Entitas</th>
              <th>Request ID</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in audits.data.value?.filter(log => `${log.actor} ${log.action} ${log.entity}`.toLowerCase().includes(search.toLowerCase()))" :key="item.id">
              <td>{{ formatDateTime(item.createdAt) }}</td>
              <td><strong>{{ item.actor }}</strong></td>
              <td><code>{{ item.action }}</code></td>
              <td>{{ item.entity }}</td>
              <td><span class="request-id">{{ item.requestId ? `req_••••${item.requestId.slice(-4)}` : '—' }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="notice notice-warning">
        <FileClock :size="18" />
        <span>Audit log bersifat append-only. Ekspor data sensitif juga harus menghasilkan entri audit baru.</span>
      </div>
    </template>

    <template v-else>
      <nav class="operation-tabs" aria-label="Jenis operasional">
        <button :class="{ active: tab === 'complaints' }" type="button" @click="tab = 'complaints'"><ClipboardCheck :size="17" /> Pengaduan <span>{{ openComplaints.length }}</span></button>
        <button :class="{ active: tab === 'activities' }" type="button" @click="tab = 'activities'"><Activity :size="17" /> Kegiatan</button>
        <button :class="{ active: tab === 'patrol' }" type="button" @click="tab = 'patrol'"><ShieldCheck :size="17" /> Ronda</button>
        <button :class="{ active: tab === 'notifications' }" type="button" @click="tab = 'notifications'"><FileClock :size="17" /> Notifikasi WAHA</button>
      </nav>

      <section v-if="tab === 'complaints'" class="operation-section">
        <div class="section-heading">
          <div>
            <h2>Antrean pengaduan</h2>
            <p class="muted">Identitas pelapor hanya muncul untuk role yang memiliki kebutuhan kerja.</p>
          </div>
          <button class="button button-secondary button-sm" type="button">Filter status</button>
        </div>
        <StatePanel v-if="complaints.loading.value" state="loading" />
        <div v-else class="operation-list">
          <article v-for="item in complaints.data.value" :key="item.id" class="card card-body">
            <span class="operation-icon"><ClipboardCheck :size="19" /></span>
            <div>
              <small>{{ item.category }} · Privat</small>
              <h3>{{ item.title }}</h3>
              <p>Diperbarui {{ formatDateTime(item.updatedAt) }}</p>
            </div>
            <StatusBadge :status="item.status" />
            <div class="row-actions">
              <button class="button button-secondary button-sm" type="button"><UserCheck :size="15" /> Tetapkan PIC</button>
              <button v-if="item.status !== 'RESOLVED'" class="button button-sm" type="button" @click="resolve(item)">Tandai selesai</button>
            </div>
          </article>
        </div>
      </section>

      <section v-else-if="tab === 'activities'" class="operation-section">
        <div class="section-heading">
          <div>
            <h2>Kebutuhan kontribusi</h2>
            <p class="muted">Buka detail kegiatan untuk melihat kebutuhan aktual dari API.</p>
          </div>
          <button class="button button-sm" type="button" @click="rosterModalOpen = true">Giliran Otomatis</button>
        </div>
        <div class="activity-admin-grid">
          <article v-for="item in activities.data.value" :key="item.id" class="card card-body">
            <span class="eyebrow">{{ formatDateTime(item.startsAt) }}</span>
            <h3>{{ item.title }}</h3>
            <p>{{ item.location }}</p>
            <div class="need-meter">
              <span><i style="width:0" /></span>
              <strong>Kebutuhan tersedia di halaman detail</strong>
            </div>
            <button class="button button-secondary button-sm" type="button">Lihat kebutuhan kontribusi</button>
          </article>
        </div>
      </section>

      <section v-else-if="tab === 'patrol'" class="operation-section">
        <div class="section-heading">
          <div>
            <h2>Jadwal & pertukaran ronda</h2>
            <p class="muted">Jadwal berubah hanya setelah pihak pengganti menerima dan koordinator menyetujui.</p>
          </div>
          <button class="button button-sm" type="button" @click="rosterModalOpen = true">Giliran Otomatis</button>
        </div>
        <div class="operation-list">
          <article v-for="item in patrols.data.value" :key="item.id" class="card card-body">
            <span class="operation-icon green"><ShieldCheck :size="19" /></span>
            <div>
              <small>{{ item.label }}</small>
              <h3>{{ formatDateTime(item.startsAt) }}</h3>
              <p>{{ item.area }}</p>
            </div>
            <StatusBadge :status="item.status" />
            <button class="button button-secondary button-sm" type="button">Kelola petugas</button>
          </article>
        </div>
      </section>

      <section v-else class="notification-admin card card-body">
        <div>
          <h2>Status pengiriman WhatsApp (WAHA)</h2>
          <p class="muted">In-app aktif. Broadcast WhatsApp otomatis terhubung melalui engine WAHA API.</p>
        </div>
        <dl>
          <div><dt>Status Engine WAHA</dt><dd class="text-success">Aktif (Session Online)</dd></div>
          <div><dt>Pesan Terkirim Hari Ini</dt><dd>142 Pesan</dd></div>
          <div><dt>Gagal / Retry</dt><dd>0 Pesan</dd></div>
        </dl>
        <div class="notice" style="margin-top: 1rem;">
          <CheckCircle2 :size="18" /> Sesi WhatsApp WAHA terhubung di server `http://localhost:3000`. Pesan pengaduan, tagihan, dan ronda dikirim otomatis.
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.admin-page { display: grid; max-width: 88rem; gap: 1.2rem; margin-inline: auto; }
.admin-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; }
.heading-actions { display: flex; align-items: center; gap: 0.6rem; flex-wrap: nowrap; flex: none; }
.heading-actions .button, .heading-actions .sla-chip { white-space: nowrap !important; word-break: keep-all !important; flex: none; }
.admin-heading h1 { margin-bottom: 0.4rem; font-size: clamp(2rem, 4vw, 3rem); }
.admin-heading p { max-width: 52rem; margin: 0; color: var(--ink-650); }
.sla-chip { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.45rem 0.65rem; border-radius: 999px; background: var(--amber-100); color: var(--amber-700); font-size: 0.75rem; font-weight: 800; }
.toolbar { display: flex; gap: 0.6rem; padding: 0.7rem; border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--paper); }
.toolbar label { display: flex; max-width: 32rem; flex: 1; align-items: center; gap: 0.4rem; padding-inline: 0.65rem; border: 1px solid var(--line-strong); border-radius: 0.65rem; color: var(--ink-500); }
.toolbar input { width: 100%; min-height: 2.5rem; border: 0; outline: 0; }
.request-id { color: var(--ink-500); font-family: monospace; }
.operation-tabs { display: flex; gap: 0.35rem; overflow-x: auto; padding: 0.35rem; border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--paper); }
.operation-tabs button { display: flex; min-height: 2.75rem; align-items: center; gap: 0.4rem; padding: 0.55rem 0.75rem; border: 0; border-radius: 0.65rem; background: transparent; color: var(--ink-650); font-size: 0.8rem; font-weight: 750; white-space: nowrap; cursor: pointer; }
.operation-tabs button.active { background: var(--teal-100); color: var(--teal-800); }
.operation-tabs button span { padding: 0.08rem 0.35rem; border-radius: 99px; background: var(--amber-100); color: var(--amber-700); font-size: 0.65rem; }
.operation-section { display: grid; gap: 0.8rem; }
.operation-list { display: grid; gap: 0.65rem; }
.operation-list article { display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; align-items: center; gap: 0.8rem; }
.operation-icon { display: grid; width: 2.65rem; height: 2.65rem; place-items: center; border-radius: 0.75rem; background: var(--blue-100); color: var(--blue-700); }
.operation-icon.green { background: var(--teal-100); color: var(--teal-700); }
.operation-list small { color: var(--teal-700); font-weight: 750; }
.operation-list h3 { margin: 0.1rem 0; font-size: 0.95rem; }
.operation-list p { margin: 0; color: var(--ink-650); font-size: 0.75rem; }
.row-actions { display: flex; gap: 0.4rem; }
.activity-admin-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.7rem; }
.activity-admin-grid h3 { margin: 0.1rem 0; }
.activity-admin-grid p { color: var(--ink-650); }
.need-meter { display: grid; gap: 0.35rem; margin-block: 1rem; }
.need-meter > span { height: 0.45rem; overflow: hidden; border-radius: 99px; background: var(--cream-100); }
.need-meter i { display: block; height: 100%; border-radius: inherit; background: var(--teal-600); }
.need-meter strong { color: var(--amber-700); font-size: 0.75rem; }
.notification-admin { display: grid; gap: 1rem; }
.notification-admin dl { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.7rem; margin: 0; }
.notification-admin dl div { padding: 1rem; border-radius: var(--radius-md); background: var(--cream-50); }
.notification-admin dt { color: var(--ink-650); font-size: 0.75rem; }
.notification-admin dd { margin: 0.25rem 0 0; font-size: 1.25rem; font-weight: 850; }
.text-success { color: var(--teal-700); }
@media (max-width: 950px) { .activity-admin-grid { grid-template-columns: 1fr 1fr; } .operation-list article { grid-template-columns: auto 1fr; } .operation-list article > .status-badge { grid-column: 2; } .row-actions, .operation-list article > .button { grid-column: 1 / -1; } }
@media (max-width: 620px) { .admin-heading { align-items: flex-start; flex-direction: column; } .activity-admin-grid, .notification-admin dl { grid-template-columns: 1fr; } .row-actions { flex-direction: column; } .row-actions .button { width: 100%; } }
</style>
