<script setup lang="ts">
import { Activity, CalendarClock, CheckCircle2, ClipboardCheck, Clock3, FileClock, FileText, Plus, RefreshCw, Search, ShieldCheck, UserCheck } from 'lucide-vue-next';
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

const props = withDefaults(defineProps<{ section?: 'operations' | 'audit' }>(), { section: 'operations' });
const complaints = useResource(() => api.get<Complaint[]>('/complaints'));
const activities = useResource(async () => adaptActivities(await api.get<unknown>('/activities')));
const patrols = useResource(async () => adaptPatrolAssignments(await api.get<unknown>('/patrol-assignments')));
const audits = useResource(async () => adaptAuditLogs(await api.get<unknown>('/audit-logs')));
const residents = useResource(async () => adaptResidents(await api.get<unknown>('/residents')));

const tab = ref<'complaints' | 'activities' | 'patrol' | 'notifications'>('complaints');
const message = ref('');
const search = ref('');
const panelOpen = ref(false);
const waModalOpen = ref(false);
const rosterModalOpen = ref(false);

const panelMode = ref<'activity' | 'patrol' | 'assign'>('activity');
const busy = ref(false);
const selectedComplaintId = ref('');

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

const openComplaints = computed(() => complaints.data.value?.filter(item => !['RESOLVED', 'CLOSED'].includes(item.status)) ?? []);

function failureMessage(cause: unknown) {
  return cause instanceof ApiClientError || cause instanceof Error ? cause.message : 'Tindakan belum dapat diproses.';
}

function openAssignModal(complaint: Complaint) {
  selectedComplaintId.value = complaint.id;
  panelMode.value = 'assign';
  panelOpen.value = true;
}

function openCreateModal(mode: 'activity' | 'patrol') {
  panelMode.value = mode;
  panelOpen.value = true;
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
        <p>{{ section === 'audit' ? 'Audit log hanya dapat dibaca role berizin dan tidak boleh memuat rahasia, token, atau alasan dispensasi mentah.' : 'Kelola pengaduan, giliran otomatis (sodakoh/ronda), jadwal kegiatan, dan notifikasi warga.' }}</p>
      </div>

      <div v-if="section === 'operations'" class="heading-actions">
        <button class="button button-sm" type="button" @click="rosterModalOpen = true">
          <CalendarClock :size="16" /> Susun Giliran Otomatis
        </button>
        <button class="button button-secondary button-sm" type="button" @click="waModalOpen = true">
          <FileText :size="16" /> Impor Teks Pesan
        </button>
        <span class="sla-chip"><Clock3 :size="15" /> {{ openComplaints.length }} laporan terbuka</span>
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
        <button :class="{ active: tab === 'notifications' }" type="button" @click="tab = 'notifications'"><FileClock :size="17" /> Notifikasi</button>
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
            <span class="eyebrow">{{ formatDateTime(item.startsAt) }}</span>
            <h3>{{ item.title }}</h3>
            <p>{{ item.location }}</p>
            <div class="need-meter">
              <span><i style="width: 50%" /></span>
              <strong>Status: {{ item.contribution }}</strong>
            </div>
            <button class="button button-secondary button-sm" type="button">Detail giliran</button>
          </article>
        </div>
      </section>

      <section v-else-if="tab === 'patrol'" class="operation-section">
        <div class="section-heading">
          <div>
            <h2>Jadwal & rotasi ronda malam</h2>
            <p class="muted">Rotasi ronda disusun otomatis dan dapat ditukar antar warga langsung dari aplikasi.</p>
          </div>
          <div class="heading-actions">
            <button class="button button-sm" type="button" @click="rosterModalOpen = true"><CalendarClock :size="15" /> Susun Rotasi Ronda</button>
            <button class="button button-secondary button-sm" type="button" @click="openCreateModal('patrol')"><Plus :size="15" /> Manual</button>
          </div>
        </div>
        <StatePanel v-if="patrols.loading.value" state="loading" />
        <div v-else class="operation-list">
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
          <h2>Status pengiriman</h2>
          <p class="muted">In-app aktif. Email dikirim asinkron dan kegagalan masuk antrean retry.</p>
        </div>
        <dl>
          <div><dt>Data terkirim</dt><dd>100%</dd></div>
          <div><dt>Menunggu worker</dt><dd>0</dd></div>
          <div><dt>Gagal setelah retry</dt><dd>0</dd></div>
        </dl>
        <div class="notice"><CheckCircle2 :size="18" /> Layanan notifikasi beroperasi dengan normal.</div>
      </section>
    </template>

    <aside v-if="panelOpen" class="side-panel">
      <div class="panel-heading">
        <div>
          <span class="eyebrow">Aksi operasional</span>
          <h2>
            {{
              panelMode === 'activity' ? 'Buat kegiatan baru' :
              panelMode === 'patrol' ? 'Susun jadwal ronda' : 'Tetapkan PIC pengaduan'
            }}
          </h2>
        </div>
        <button type="button" aria-label="Tutup panel" @click="panelOpen = false">×</button>
      </div>

      <!-- Form Buat Kegiatan -->
      <form v-if="panelMode === 'activity'" class="form-grid" @submit.prevent="createActivity">
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
.admin-heading{display:flex;align-items:end;justify-content:space-between;gap:1rem}
.heading-actions{display:flex;align-items:center;gap:.6rem}
.admin-heading h1{margin-bottom:.4rem;font-size:clamp(2rem,4vw,3rem)}
.admin-heading p{max-width:52rem;margin:0;color:var(--ink-650)}
.sla-chip{display:inline-flex;align-items:center;gap:.35rem;padding:.45rem .65rem;border-radius:999px;background:var(--amber-100);color:var(--amber-700);font-size:.75rem;font-weight:800}
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
.notification-admin{display:grid;gap:1rem}
.notification-admin dl{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem;margin:0}
.notification-admin dl div{padding:1rem;border-radius:var(--radius-md);background:var(--cream-50)}
.notification-admin dt{color:var(--ink-650);font-size:.75rem}
.notification-admin dd{margin:.25rem 0 0;font-size:1.5rem;font-weight:850}
.side-panel{position:fixed;z-index:50;top:0;right:0;width:min(100%,35rem);height:100vh;padding:1.5rem;overflow-y:auto;border-left:1px solid var(--line);background:var(--paper);box-shadow:var(--shadow-lg)}
.panel-heading{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.3rem}
.panel-heading button{width:2.75rem;height:2.75rem;border:1px solid var(--line);border-radius:.7rem;background:white;font-size:1.5rem;cursor:pointer}
.two-fields{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}
@media(max-width:950px){.activity-admin-grid{grid-template-columns:1fr 1fr}.operation-list article{grid-template-columns:auto 1fr}.operation-list article>.status-badge{grid-column:2}.row-actions,.operation-list article>.button{grid-column:1/-1}}
@media(max-width:620px){.admin-heading{align-items:flex-start;flex-direction:column}.activity-admin-grid,.notification-admin dl{grid-template-columns:1fr}.row-actions{flex-direction:column}.row-actions .button{width:100%}.two-fields{grid-template-columns:1fr}}
</style>
