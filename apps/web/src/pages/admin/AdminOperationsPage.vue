<script setup lang="ts">
import { Activity, CalendarClock, Camera, CheckCircle2, ClipboardCheck, Clock3, FileClock, FileText, MessageSquare, Plus, RefreshCw, Search, Send, ShieldCheck, UserCheck, Video } from 'lucide-vue-next';
import { computed, reactive, ref } from 'vue';
import AutomatedRosterModal from '../../components/AutomatedRosterModal.vue';
import StatePanel from '../../components/StatePanel.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import WhatsAppImportModal from '../../components/WhatsAppImportModal.vue';
import { useResource } from '../../composables/useResource';
import { api, ApiClientError } from '../../lib/api';
import type { Complaint } from '../../lib/demo';
import { formatDateTime } from '../../lib/format';
import { adaptActivities, adaptAuditLogs, adaptPatrolAssignments, adaptResidents } from '../../lib/view-models';

interface WahaStatus {
  enabled: boolean;
  baseUrl: string;
  session: string;
  connected: boolean;
  status: string;
  error?: string;
}

interface AdminCctvCam {
  id: string;
  name: string;
  location: string;
  rtspUrl: string;
  quality: string;
  ptzSupport: boolean;
  publicVisible: boolean;
  status: 'ONLINE' | 'OFFLINE';
}

const props = withDefaults(defineProps<{ section?: 'operations' | 'audit' }>(), { section: 'operations' });
const complaints = useResource(() => api.get<Complaint[]>('/complaints'));
const activities = useResource(async () => adaptActivities(await api.get<unknown>('/activities')));
const patrols = useResource(async () => adaptPatrolAssignments(await api.get<unknown>('/patrol-assignments')));
const audits = useResource(async () => adaptAuditLogs(await api.get<unknown>('/audit-logs')));
const residents = useResource(async () => adaptResidents(await api.get<unknown>('/residents')));
const wahaStatus = useResource(() => api.get<WahaStatus>('/waha/status'));

const tab = ref<'complaints' | 'activities' | 'patrol' | 'notifications' | 'cctv'>('complaints');
const message = ref('');
const search = ref('');
const panelOpen = ref(false);
const waModalOpen = ref(false);
const rosterModalOpen = ref(false);

const panelMode = ref<'activity' | 'patrol' | 'assign' | 'cctv'>('activity');
const busy = ref(false);
const selectedComplaintId = ref('');

const cctvList = ref<AdminCctvCam[]>([
  {
    id: 'cctv-1',
    name: 'CCTV 01 — Gerbang Utama RT 04',
    location: 'Akses Keluar-Masuk Utama Warga',
    rtspUrl: 'rtsp://admin:secret@192.168.1.101:554/stream1',
    quality: '1080p Full HD',
    ptzSupport: true,
    publicVisible: true,
    status: 'ONLINE',
  },
  {
    id: 'cctv-2',
    name: 'CCTV 02 — Pos Ronda Central',
    location: 'Pusat Keamanan & Siskamling',
    rtspUrl: 'rtsp://admin:secret@192.168.1.102:554/stream1',
    quality: '1080p Full HD',
    ptzSupport: true,
    publicVisible: true,
    status: 'ONLINE',
  },
  {
    id: 'cctv-3',
    name: 'CCTV 03 — Taman Warga & Area Bermain',
    location: 'Fasilitas Terbuka & Balai Pertemuan',
    rtspUrl: 'rtsp://admin:secret@192.168.1.103:554/stream1',
    quality: '1080p Full HD',
    ptzSupport: false,
    publicVisible: true,
    status: 'ONLINE',
  },
  {
    id: 'cctv-4',
    name: 'CCTV 04 — Pertigaan Utama Blok B',
    location: 'Simpang Perlintasan Kendaraan Warga',
    rtspUrl: 'rtsp://admin:secret@192.168.1.104:554/stream1',
    quality: '1080p Full HD',
    ptzSupport: false,
    publicVisible: true,
    status: 'ONLINE',
  },
]);

const cctvForm = reactive({
  name: '',
  location: '',
  rtspUrl: 'rtsp://admin:pass@192.168.1.105:554/stream1',
  quality: '1080p Full HD',
  ptzSupport: true,
  publicVisible: true,
});

const activityForm = reactive({
  title: '',
  location: '',
  description: '',
  startsAt: '2026-08-17T08:00',
  endsAt: '2026-08-17T12:00',
  capacity: 50,
  needType: 'VOLUNTEER',
  needTarget: 10,
});

const patrolForm = reactive({
  userId: '',
  area: 'Pos Ronda Utama (Blok A-C)',
  startsAt: '2026-08-01T22:00',
  endsAt: '2026-08-02T04:00',
});

const assignForm = reactive({
  workerUserId: '',
});

const wahaTestForm = reactive({
  phone: '081234567890',
  message: 'Halo warga, ini pesan tes notifikasi otomatis dari sistem WargaHub via WAHA API!',
});
const wahaSending = ref(false);
const wahaResult = ref('');

const openComplaints = computed(() => complaints.data.value?.filter(item => !['RESOLVED', 'CLOSED'].includes(item.status)) ?? []);

function failureMessage(cause: unknown) {
  return cause instanceof ApiClientError || cause instanceof Error ? cause.message : 'Tindakan belum dapat diproses.';
}

function openAssignModal(complaint: Complaint) {
  selectedComplaintId.value = complaint.id;
  panelMode.value = 'assign';
  panelOpen.value = true;
}

function openCreateModal(mode: 'activity' | 'patrol' | 'cctv') {
  panelMode.value = mode;
  panelOpen.value = true;
}

async function addCctvCamera() {
  if (!cctvForm.name || !cctvForm.location) return;
  busy.value = true;
  try {
    const newId = `cctv-${cctvList.value.length + 1}`;
    cctvList.value.push({
      id: newId,
      name: cctvForm.name,
      location: cctvForm.location,
      rtspUrl: cctvForm.rtspUrl,
      quality: cctvForm.quality,
      ptzSupport: cctvForm.ptzSupport,
      publicVisible: cctvForm.publicVisible,
      status: 'ONLINE',
    });
    message.value = `Kamera CCTV "${cctvForm.name}" berhasil ditambahkan & terkonfigurasi!`;
    cctvForm.name = '';
    cctvForm.location = '';
    panelOpen.value = false;
  } catch (cause) {
    message.value = failureMessage(cause);
  } finally {
    busy.value = false;
  }
}

async function onImported() {
  waModalOpen.value = false;
  message.value = 'Data jadwal dan jimpitan pengumuman berhasil diimpor ke sistem.';
  await activities.reload();
  await patrols.reload();
}

async function onGenerated() {
  rosterModalOpen.value = false;
  message.value = 'Giliran & jadwal otomatis berhasil diterbitkan ke sistem WargaHub!';
  await activities.reload();
  await patrols.reload();
}

async function sendWahaTest() {
  if (!wahaTestForm.phone || !wahaTestForm.message) return;
  wahaSending.value = true;
  wahaResult.value = '';
  try {
    const res = await api.post<{ sent: boolean; message: string }>('/waha/send-test', {
      phone: wahaTestForm.phone,
      message: wahaTestForm.message,
    });
    wahaResult.value = res.message;
  } catch (cause) {
    wahaResult.value = failureMessage(cause);
  } finally {
    wahaSending.value = false;
  }
}

async function resolve(item: Complaint) {
  busy.value = true;
  try {
    await api.post(`/complaints/${item.id}/status`, { status: 'RESOLVED' });
    item.status = 'RESOLVED';
    message.value = 'Status pengaduan diperbarui dan pelapor akan menerima notifikasi.';
  } catch (cause) {
    message.value = failureMessage(cause);
  } finally {
    busy.value = false;
  }
}

async function assignPIC() {
  if (!selectedComplaintId.value || !assignForm.workerUserId) return;
  busy.value = true;
  try {
    await api.post(`/complaints/${selectedComplaintId.value}/assign`, {
      workerUserId: assignForm.workerUserId,
    });
    message.value = 'Petugas PIC pengaduan berhasil ditetapkan.';
    panelOpen.value = false;
    await complaints.reload();
  } catch (cause) {
    message.value = failureMessage(cause);
  } finally {
    busy.value = false;
  }
}

async function createActivity() {
  busy.value = true;
  try {
    await api.post('/activities', {
      title: activityForm.title,
      location: activityForm.location,
      description: activityForm.description,
      startsAt: new Date(activityForm.startsAt).toISOString(),
      endsAt: new Date(activityForm.endsAt).toISOString(),
      capacity: activityForm.capacity,
      needs: [
        { type: activityForm.needType, target: activityForm.needTarget },
      ],
    });
    message.value = 'Kegiatan warga berhasil ditambahkan.';
    panelOpen.value = false;
    await activities.reload();
  } catch (cause) {
    message.value = failureMessage(cause);
  } finally {
    busy.value = false;
  }
}

async function createPatrol() {
  if (!patrolForm.userId) return;
  busy.value = true;
  try {
    await api.post('/patrol-assignments', {
      userId: patrolForm.userId,
      area: patrolForm.area,
      startsAt: new Date(patrolForm.startsAt).toISOString(),
      endsAt: new Date(patrolForm.endsAt).toISOString(),
    });
    message.value = 'Jadwal ronda berhasil ditambahkan.';
    panelOpen.value = false;
    await patrols.reload();
  } catch (cause) {
    message.value = failureMessage(cause);
  } finally {
    busy.value = false;
  }
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
        <button :class="{ active: tab === 'activities' }" type="button" @click="tab = 'activities'"><Activity :size="17" /> Giliran & Kegiatan</button>
        <button :class="{ active: tab === 'patrol' }" type="button" @click="tab = 'patrol'"><ShieldCheck :size="17" /> Jadwal Ronda</button>
        <button :class="{ active: tab === 'cctv' }" type="button" @click="tab = 'cctv'"><Camera :size="17" /> Konfigurasi CCTV</button>
        <button :class="{ active: tab === 'notifications' }" type="button" @click="tab = 'notifications'"><MessageSquare :size="17" /> WhatsApp WAHA API</button>
      </nav>

      <section v-if="tab === 'complaints'" class="operation-section">
        <div class="section-heading">
          <div>
            <h2>Antrean pengaduan</h2>
            <p class="muted">Identitas pelapor hanya muncul untuk role yang memiliki kebutuhan kerja.</p>
          </div>
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
              <button class="button button-secondary button-sm" type="button" @click="openAssignModal(item)"><UserCheck :size="15" /> Tetapkan PIC</button>
              <button v-if="item.status !== 'RESOLVED'" class="button button-sm" type="button" :disabled="busy" @click="resolve(item)">Tandai selesai</button>
            </div>
          </article>
        </div>
      </section>

      <section v-else-if="tab === 'activities'" class="operation-section">
        <div class="section-heading">
          <div>
            <h2>Giliran sodakoh & kegiatan warga</h2>
            <p class="muted">Kelola giliran konsumsi tukang dan kebutuhan kegiatan warga secara otomatis.</p>
          </div>
          <div class="heading-actions">
            <button class="button button-sm" type="button" @click="rosterModalOpen = true"><CalendarClock :size="15" /> Susun Giliran Otomatis</button>
            <button class="button button-secondary button-sm" type="button" @click="openCreateModal('activity')"><Plus :size="15" /> Buat manual</button>
          </div>
        </div>

        <StatePanel v-if="activities.loading.value" state="loading" />
        <div v-else class="activity-admin-grid">
          <article v-for="item in activities.data.value" :key="item.id" class="card card-body">
            <span class="operation-icon green"><Activity :size="19" /></span>
            <h3>{{ item.title }}</h3>
            <p>{{ item.location }} · {{ formatDateTime(item.startsAt) }}</p>
            <div class="need-meter">
              <small>Kebutuhan Kategori (Sisa: {{ item.remainingNeeds ?? 0 }})</small>
              <span><i :style="{ width: `${item.remainingNeeds === 0 ? 100 : 65}%` }" /></span>
              <strong>Status: {{ item.contribution }}</strong>
            </div>
          </article>
        </div>
      </section>

      <section v-else-if="tab === 'patrol'" class="operation-section">
        <div class="section-heading">
          <div>
            <h2>Jadwal & penugasan ronda</h2>
            <p class="muted">Monitor giliran ronda warga dan persetujuan tukar jadwal piket siskamling.</p>
          </div>
          <div class="heading-actions">
            <button class="button button-sm" type="button" @click="rosterModalOpen = true"><CalendarClock :size="15" /> Susun Giliran Otomatis</button>
            <button class="button button-secondary button-sm" type="button" @click="openCreateModal('patrol')"><Plus :size="15" /> Tambah piket</button>
          </div>
        </div>

        <StatePanel v-if="patrols.loading.value" state="loading" />
        <div v-else class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Petugas Ronda</th>
                <th>Area Pos / Rute</th>
                <th>Jadwal Tugas</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in patrols.data.value" :key="item.id">
                <td><strong>{{ item.label || 'Petugas Warga' }}</strong></td>
                <td>{{ item.area }}</td>
                <td>{{ formatDateTime(item.startsAt) }} — {{ formatDateTime(item.endsAt) }}</td>
                <td><StatusBadge :status="item.status" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- CCTV Management Tab -->
      <section v-else-if="tab === 'cctv'" class="operation-section">
        <div class="section-heading">
          <div>
            <h2>Kelola Kamera CCTV Lingkungan</h2>
            <p class="muted">Konfigurasi alamat RTSP/HLS stream kamera IP, status koneksi gateway, dan visibilitas siaran publik.</p>
          </div>
          <button class="button button-sm" type="button" @click="openCreateModal('cctv')">
            <Plus :size="15" /> Tambah Kamera CCTV
          </button>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Kamera & Lokasi</th>
                <th>Stream RTSP / URL Gateway</th>
                <th>Kualitas & Fitur</th>
                <th>Visibilitas Publik</th>
                <th>Status Stream</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cam in cctvList" :key="cam.id">
                <td>
                  <strong>{{ cam.name }}</strong>
                  <br />
                  <small class="muted">{{ cam.location }}</small>
                </td>
                <td><code>{{ cam.rtspUrl }}</code></td>
                <td>
                  {{ cam.quality }}
                  <span v-if="cam.ptzSupport" class="ptz-chip">PTZ Support</span>
                </td>
                <td>
                  <span :class="cam.publicVisible ? 'badge-public' : 'badge-private'">
                    {{ cam.publicVisible ? 'Publik & Portal' : 'Khusus Pengurus' }}
                  </span>
                </td>
                <td>
                  <span class="status-online">● ONLINE</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="notice notice-info" style="margin-top: 1rem;">
          <Video :size="18" />
          <span>Sistem menggunakan Media Streaming Gateway (RTSP to HLS/WebRTC). Pastikan IP Cam / NVR terhubung di jaringan lokal pos ronda.</span>
        </div>
      </section>

      <section v-else-if="tab === 'notifications'" class="waha-admin-section">
        <!-- WAHA Connection Status Card -->
        <div class="card card-body waha-status-card">
          <div class="status-header">
            <div class="waha-icon">
              <MessageSquare :size="24" />
            </div>
            <div>
              <h2>Integrasi WhatsApp API (WAHA)</h2>
              <p class="muted">Status koneksi gateway WhatsApp untuk pengiriman notifikasi pengumuman dan tagihan warga.</p>
            </div>
            <span class="waha-badge" :class="wahaStatus.data.value?.connected ? 'online' : 'offline'">
              <span class="dot" /> {{ wahaStatus.data.value?.connected ? 'WAHA Terhubung (WORKING)' : 'Gateway Siap / Menunggu WAHA' }}
            </span>
          </div>

          <dl class="waha-metrics">
            <div>
              <dt>Engine Gateway</dt>
              <dd>WAHA HTTP API</dd>
            </div>
            <div>
              <dt>Base URL API</dt>
              <dd><code>{{ wahaStatus.data.value?.baseUrl ?? 'http://localhost:3001' }}</code></dd>
            </div>
            <div>
              <dt>ID Sesi WhatsApp</dt>
              <dd><code>{{ wahaStatus.data.value?.session ?? 'default' }}</code></dd>
            </div>
            <div>
              <dt>Status Integrasi</dt>
              <dd><strong class="highlight-text">{{ wahaStatus.data.value?.enabled !== false ? 'Aktif' : 'Non-Aktif' }}</strong></dd>
            </div>
          </dl>
        </div>

        <!-- Test Notification Sender -->
        <div class="card card-body waha-test-card">
          <div class="section-heading">
            <div>
              <h2>Uji Coba Kirim Pesan WhatsApp</h2>
              <p class="muted">Kirim pesan notifikasi pengujian melalui API WAHA ke nomor WhatsApp tujuan.</p>
            </div>
          </div>

          <form class="waha-form" @submit.prevent="sendWahaTest">
            <div class="field">
              <label for="waha-phone">Nomor WhatsApp Tujuan</label>
              <input id="waha-phone" v-model="wahaTestForm.phone" placeholder="Contoh: 081234567890" required />
            </div>

            <div class="field">
              <label for="waha-msg">Isi Pesan Notifikasi</label>
              <textarea id="waha-msg" v-model="wahaTestForm.message" rows="3" placeholder="Tulis isi pesan yang ingin dikirim..." required />
            </div>

            <button class="button" type="submit" :disabled="wahaSending">
              <Send :size="16" /> {{ wahaSending ? 'Mengirim pesan WA...' : 'Kirim Pesan WhatsApp via WAHA' }}
            </button>
          </form>

          <div v-if="wahaResult" class="notice notice-info" style="margin-top: 1rem;">
            <CheckCircle2 :size="18" /> {{ wahaResult }}
          </div>
        </div>
      </section>
    </template>

    <aside v-if="panelOpen" class="side-panel">
      <div class="panel-heading">
        <div>
          <span class="eyebrow">Aksi operasional</span>
          <h2>
            {{
              panelMode === 'activity' ? 'Buat kegiatan baru' :
              panelMode === 'patrol' ? 'Susun jadwal ronda' :
              panelMode === 'cctv' ? 'Tambah kamera CCTV baru' : 'Tetapkan PIC pengaduan'
            }}
          </h2>
        </div>
        <button type="button" aria-label="Tutup panel" @click="panelOpen = false">×</button>
      </div>

      <!-- Form Tambah CCTV -->
      <form v-if="panelMode === 'cctv'" class="form-grid" @submit.prevent="addCctvCamera">
        <div class="field">
          <label for="cctv-name">Nama Kamera CCTV</label>
          <input id="cctv-name" v-model="cctvForm.name" placeholder="Misal: CCTV 05 — Gang Melati 2" required />
        </div>
        <div class="field">
          <label for="cctv-loc">Lokasi / Area Pemasangan</label>
          <input id="cctv-loc" v-model="cctvForm.location" placeholder="Misal: Pertigaan Gang Melati 2 Blok C" required />
        </div>
        <div class="field">
          <label for="cctv-url">URL Stream RTSP / HLS</label>
          <input id="cctv-url" v-model="cctvForm.rtspUrl" placeholder="rtsp://admin:pass@192.168.1.105:554/stream1" required />
        </div>
        <div class="two-fields">
          <div class="field">
            <label for="cctv-quality">Resolusi Stream</label>
            <select id="cctv-quality" v-model="cctvForm.quality">
              <option value="1080p Full HD">1080p Full HD</option>
              <option value="720p HD">720p HD</option>
              <option value="4K Ultra HD">4K Ultra HD</option>
            </select>
          </div>
          <div class="field">
            <label for="cctv-ptz">Dukungan PTZ (Pan-Tilt-Zoom)</label>
            <select id="cctv-ptz" :value="cctvForm.ptzSupport ? 'YES' : 'NO'" @change="cctvForm.ptzSupport = ($event.target as HTMLSelectElement).value === 'YES'">
              <option value="YES">Ya (Dapat Digerakkan)</option>
              <option value="NO">Tidak (Statis)</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label for="cctv-pub">Visibilitas Publik</label>
          <select id="cctv-pub" :value="cctvForm.publicVisible ? 'YES' : 'NO'" @change="cctvForm.publicVisible = ($event.target as HTMLSelectElement).value === 'YES'">
            <option value="YES">Tampilkan di Portal Publik & Warga</option>
            <option value="NO">Khusus Portal Pengurus / Internal</option>
          </select>
        </div>
        <button class="button" type="submit" :disabled="busy">{{ busy ? 'Menyimpan…' : 'Simpan Kamera CCTV' }}</button>
      </form>

      <!-- Form Buat Kegiatan -->
      <form v-else-if="panelMode === 'activity'" class="form-grid" @submit.prevent="createActivity">
        <div class="field"><label for="act-title">Nama kegiatan</label><input id="act-title" v-model="activityForm.title" placeholder="Misal: Kerja Bakti HUT RI" required /></div>
        <div class="field"><label for="act-loc">Lokasi</label><input id="act-loc" v-model="activityForm.location" placeholder="Misal: Lapangan Serbaguna" required /></div>
        <div class="field"><label for="act-desc">Deskripsi</label><textarea id="act-desc" v-model="activityForm.description" rows="3" required /></div>
        <div class="two-fields">
          <div class="field"><label for="act-start">Waktu mulai</label><input id="act-start" v-model="activityForm.startsAt" type="datetime-local" required /></div>
          <div class="field"><label for="act-end">Waktu selesai</label><input id="act-end" v-model="activityForm.endsAt" type="datetime-local" required /></div>
        </div>
        <div class="two-fields">
          <div class="field"><label for="act-type">Jenis kebutuhan</label><select id="act-type" v-model="activityForm.needType"><option value="VOLUNTEER">Relawan</option><option value="LOGISTICS">Konsumsi / Peralatan</option></select></div>
          <div class="field"><label for="act-target">Target jumlah</label><input id="act-target" v-model.number="activityForm.needTarget" type="number" min="1" required /></div>
        </div>
        <button class="button" type="submit" :disabled="busy">{{ busy ? 'Menyimpan…' : 'Simpan kegiatan' }}</button>
      </form>

      <!-- Form Susun Ronda -->
      <form v-else-if="panelMode === 'patrol'" class="form-grid" @submit.prevent="createPatrol">
        <div class="field">
          <label for="patrol-user">Pilih petugas ronda</label>
          <select id="patrol-user" v-model="patrolForm.userId" required>
            <option value="" disabled>Pilih warga</option>
            <option v-for="r in residents.data.value" :key="r.id" :value="r.id">{{ r.name }} ({{ r.household }})</option>
          </select>
        </div>
        <div class="field"><label for="patrol-area">Area pos / rute</label><input id="patrol-area" v-model="patrolForm.area" required /></div>
        <div class="two-fields">
          <div class="field"><label for="patrol-start">Jam mulai</label><input id="patrol-start" v-model="patrolForm.startsAt" type="datetime-local" required /></div>
          <div class="field"><label for="patrol-end">Jam selesai</label><input id="patrol-end" v-model="patrolForm.endsAt" type="datetime-local" required /></div>
        </div>
        <button class="button" type="submit" :disabled="busy || !patrolForm.userId">{{ busy ? 'Menyimpan…' : 'Simpan jadwal ronda' }}</button>
      </form>

      <!-- Form Tetapkan PIC -->
      <form v-else class="form-grid" @submit.prevent="assignPIC">
        <div class="field">
          <label for="assign-worker">Pilih petugas PIC</label>
          <select id="assign-worker" v-model="assignForm.workerUserId" required>
            <option value="" disabled>Pilih pengurus / petugas</option>
            <option v-for="r in residents.data.value" :key="r.id" :value="r.id">{{ r.name }} ({{ r.role }})</option>
          </select>
        </div>
        <button class="button" type="submit" :disabled="busy || !assignForm.workerUserId">{{ busy ? 'Menugaskan…' : 'Tetapkan PIC' }}</button>
      </form>
    </aside>
  </div>
</template>

<style scoped>
.admin-page{display:grid;max-width:88rem;gap:1.2rem;margin-inline:auto}
.admin-heading{display:flex;align-items:center;justify-content:space-between;gap:1rem}
.heading-actions{display:flex;align-items:center;gap:.6rem;flex-wrap:nowrap;flex:none}
.heading-actions .button, .heading-actions .sla-chip{white-space:nowrap !important;word-break:keep-all !important;flex:none}
.admin-heading h1{margin-bottom:.4rem;font-size:clamp(2rem,4vw,3rem)}
.admin-heading p{max-width:52rem;margin:0;color:var(--ink-650)}
.sla-chip{display:inline-flex;align-items:center;gap:.35rem;padding:.5rem .85rem;border-radius:999px;background:var(--amber-100);color:var(--amber-700);font-size:.78rem;font-weight:800;white-space:nowrap !important}
.toolbar{display:flex;gap:.6rem;padding:.7rem;border:1px solid var(--line);border-radius:var(--radius-md);background:var(--paper)}
.toolbar label{display:flex;max-width:32rem;flex:1;align-items:center;gap:.4rem;padding-inline:.65rem;border:1px solid var(--line-strong);border-radius:.65rem;color:var(--ink-500)}
.toolbar input{width:100%;min-height:2.5rem;border:0;outline:0}
.request-id{color:var(--ink-500);font-family:monospace}
.operation-tabs{display:flex;gap:.35rem;overflow-x:auto;padding:.35rem;border:1px solid var(--line);border-radius:var(--radius-md);background:var(--paper)}
.operation-tabs button{display:flex;min-height:2.75rem;align-items:center;gap:.4rem;padding:.55rem .75rem;border:0;border-radius:.65rem;background:transparent;color:var(--ink-650);font-size:.8rem;font-weight:750;white-space:nowrap;cursor:pointer}
.operation-tabs button.active{background:var(--teal-100);color:var(--teal-800)}
.operation-tabs button span{padding:.08rem .35rem;border-radius:99px;background:var(--amber-100);color:var(--amber-700);font-size:.65rem}
.operation-section{display:grid;gap:.8rem}
.operation-list{display:grid;gap:.65rem}
.operation-list article{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:.8rem}
.operation-icon{display:grid;width:2.65rem;height:2.65rem;place-items:center;border-radius:.75rem;background:var(--blue-100);color:var(--blue-700)}
.operation-icon.green{background:var(--teal-100);color:var(--teal-700)}
.operation-list small{color:var(--teal-700);font-weight:750}
.operation-list h3{margin:.1rem 0;font-size:.95rem}
.operation-list p{margin:0;color:var(--ink-650);font-size:.75rem}
.row-actions{display:flex;gap:.4rem}
.activity-admin-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem}
.activity-admin-grid h3{margin:.1rem 0}
.activity-admin-grid p{color:var(--ink-650)}
.need-meter{display:grid;gap:.35rem;margin-block:1rem}
.need-meter>span{height:.45rem;overflow:hidden;border-radius:99px;background:var(--cream-100)}
.need-meter i{display:block;height:100%;border-radius:inherit;background:var(--teal-600)}
.need-meter strong{color:var(--amber-700);font-size:.75rem}
.waha-admin-section{display:grid;gap:1.2rem}
.waha-status-card,.waha-test-card{padding:1.6rem;border-radius:var(--radius-lg)}
.status-header{display:flex;align-items:center;gap:1rem;margin-bottom:1.4rem}
.waha-icon{display:grid;width:3.2rem;height:3.2rem;place-items:center;border-radius:1rem;background:var(--teal-100);color:var(--teal-700);flex:none}
.status-header h2{margin:0 0 .2rem;font-size:1.3rem}
.waha-badge{display:inline-flex;align-items:center;gap:.4rem;padding:.4rem .8rem;border-radius:999px;font-size:.8rem;font-weight:800;margin-left:auto}
.waha-badge.online{background:var(--teal-100);color:var(--teal-800)}
.waha-badge.offline{background:var(--cream-100);color:var(--ink-750)}
.waha-badge .dot{width:.5rem;height:.5rem;border-radius:50%;background:var(--teal-600)}
.waha-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin:0}
.waha-metrics div{padding:1rem;border-radius:var(--radius-md);background:var(--cream-50);border:1px solid var(--line)}
.waha-metrics dt{font-size:.76rem;color:var(--ink-500);font-weight:750;text-transform:uppercase}
.waha-metrics dd{margin:.3rem 0 0;font-size:1.05rem;font-weight:850}
.highlight-text{color:var(--teal-700)}
.waha-form{display:grid;gap:1rem;max-width:38rem;margin-top:1rem}
.side-panel{position:fixed;z-index:50;top:0;right:0;width:min(100%,35rem);height:100vh;padding:1.5rem;overflow-y:auto;border-left:1px solid var(--line);background:var(--paper);box-shadow:var(--shadow-lg)}
.panel-heading{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.3rem}
.panel-heading button{width:2.75rem;height:2.75rem;border:1px solid var(--line);border-radius:.7rem;background:white;font-size:1.5rem;cursor:pointer}
.two-fields{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}
.ptz-chip{display:inline-flex;margin-left:.4rem;padding:.15rem .45rem;border-radius:.35rem;background:var(--teal-100);color:var(--teal-800);font-size:.68rem;font-weight:800}
.badge-public{padding:.2rem .5rem;border-radius:.35rem;background:var(--success-100);color:var(--success-800);font-size:.72rem;font-weight:800}
.badge-private{padding:.2rem .5rem;border-radius:.35rem;background:var(--amber-100);color:var(--amber-800);font-size:.72rem;font-weight:800}
@media(max-width:950px){.waha-metrics{grid-template-columns:1fr 1fr}.activity-admin-grid{grid-template-columns:1fr 1fr}.operation-list article{grid-template-columns:auto 1fr}.operation-list article>.status-badge{grid-column:2}.row-actions,.operation-list article>.button{grid-column:1/-1}}
@media(max-width:620px){.waha-metrics{grid-template-columns:1fr}.admin-heading{align-items:flex-start;flex-direction:column}.activity-admin-grid{grid-template-columns:1fr}.row-actions{flex-direction:column}.row-actions .button{width:100%}.two-fields{grid-template-columns:1fr}}
</style>
