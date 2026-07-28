<script setup lang="ts">
import { CheckCircle2, Download, FileUp, Megaphone, Plus, Search, Trash2, Upload, UserCheck, UserPlus, Users } from 'lucide-vue-next';
import { computed, reactive, ref, watch } from 'vue';
import StatePanel from '../../components/StatePanel.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import { useResource } from '../../composables/useResource';
import { api, ApiClientError } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { adaptHouseholds, adaptResidents } from '../../lib/view-models';

type Section = 'residents' | 'announcements' | 'documents' | 'settings' | 'officers';
const props = withDefaults(defineProps<{ section?: Section }>(), { section: 'residents' });
const households = useResource(async () => adaptHouseholds(await api.get<unknown>('/households')));
const residents = useResource(async () => adaptResidents(await api.get<unknown>('/residents')));

interface AdminAnnouncement { id: string; category: string; title: string; summary: string; status: string; publishedAt: string | null; updatedAt: string }
interface AdminDocument { id: string; title: string; category: string; visibility: string; publishedAt: string | null; createdAt: string; downloadUrl: string | null }
interface AdminOfficer { id: string; name: string; position: string; department: string; phone?: string | null; email?: string | null; period: string; orderIndex: number; active: boolean }

const announcements = useResource(() => api.get<AdminAnnouncement[]>('/announcements'));
const documents = useResource(() => api.get<AdminDocument[]>('/documents'));
const officers = useResource(() => props.section === 'officers' ? api.get<AdminOfficer[]>('/organization/officers') : Promise.resolve([]));

const defaultAdminOfficers: AdminOfficer[] = [
  { id: 'off-1', name: 'Bpk. H. Ahmad Dahlan', position: 'Ketua RT 005', department: 'PENGURUS_INTI', phone: '+62 812-3456-7890', email: 'ahmad.dahlan@wargahub.id', period: '2024 - 2027', orderIndex: 1, active: true },
  { id: 'off-2', name: 'Bpk. Bambang Setiawan', position: 'Wakil Ketua RT', department: 'PENGURUS_INTI', phone: '+62 813-9876-5432', email: 'bambang@wargahub.id', period: '2024 - 2027', orderIndex: 2, active: true },
  { id: 'off-3', name: 'Ibu Rina Pratiwi', position: 'Sekretaris RT', department: 'PENGURUS_INTI', phone: '+62 815-1122-3344', email: 'rina.pratiwi@wargahub.id', period: '2024 - 2027', orderIndex: 3, active: true },
  { id: 'off-4', name: 'Ibu Hj. Siti Rahma', position: 'Bendahara RT', department: 'PENGURUS_INTI', phone: '+62 817-5566-7788', email: 'siti.rahma@wargahub.id', period: '2024 - 2027', orderIndex: 4, active: true },
  { id: 'off-5', name: 'Bpk. Hendra Wijaya', position: 'Koordinator Ronda & Keamanan', department: 'SEKSI_KEAMANAN', phone: '+62 818-9900-1122', email: 'hendra.keamanan@wargahub.id', period: '2024 - 2027', orderIndex: 5, active: true },
  { id: 'off-6', name: 'Bpk. Eko Prasetyo', position: 'Koordinator Kebersihan & Lingkungan', department: 'SEKSI_LINGKUNGAN', phone: '+62 819-3344-5566', email: 'eko.lingkungan@wargahub.id', period: '2024 - 2027', orderIndex: 6, active: true },
];

const adminOfficersList = computed(() => {
  const raw = officers.data.value ?? [];
  return raw.length > 0 ? raw : defaultAdminOfficers;
});

interface OrganizationSettings { id: string; name: string; shortName: string; description: string; address: string; emergencyPhone: string; timezone: string; locale: string }
interface ModuleSettings { billing: boolean; finance: boolean; patrol: boolean; complaints: boolean; activities: boolean; documents: boolean }
const organization = useResource<OrganizationSettings | null>(() => props.section === 'settings' ? api.get<OrganizationSettings>('/organization') : Promise.resolve(null));
const modules = useResource<ModuleSettings | null>(() => props.section === 'settings' ? api.get<ModuleSettings>('/settings/modules') : Promise.resolve(null));

const search = ref('');
const panelOpen = ref(false);
const panelMode = ref<'csv' | 'household' | 'invite' | 'announcement' | 'document' | 'officer'>('csv');
const message = ref('');
const importFile = ref<File | null>(null);
const documentFile = ref<File | null>(null);
const busy = ref(false);

const householdForm = reactive({ code: '', address: '', rw: '001', rt: '001', block: 'A', occupancyStatus: 'OCCUPIED', ownershipStatus: 'OWNER' });
const inviteForm = reactive({ householdId: '', email: '', relationship: 'HEAD' });
const announcementForm = reactive({ category: 'UMUM', title: '', summary: '', content: '', visibility: 'RESIDENT', urgency: 'NORMAL', pinned: false });
const documentForm = reactive({ title: '', description: '', category: 'Administrasi', visibility: 'INTERNAL' });
const officerForm = reactive({ name: '', position: '', department: 'PENGURUS_INTI', phone: '', email: '', period: '2024 - 2027', orderIndex: 1 });
const organizationForm = reactive({ name: '', shortName: '', description: '', address: '', emergencyPhone: '', timezone: 'Asia/Jakarta', locale: 'id-ID' });
const moduleForm = reactive<ModuleSettings>({ billing: true, finance: true, patrol: true, complaints: true, activities: true, documents: true });
const moduleOptions: Array<{ key: keyof ModuleSettings; label: string }> = [
  { key: 'billing', label: 'Tagihan' },
  { key: 'finance', label: 'Keuangan' },
  { key: 'complaints', label: 'Pengaduan' },
  { key: 'activities', label: 'Kegiatan' },
  { key: 'patrol', label: 'Ronda' },
  { key: 'documents', label: 'Dokumen' },
];

const title = computed(() => ({ residents: 'Warga & rumah', announcements: 'Publikasi pengumuman', documents: 'Dokumen & arsip', settings: 'Pengaturan lingkungan', officers: 'Struktur pengurus RT/RW' }[props.section]));
const description = computed(() => ({ residents: 'Kelola data seperlunya dan batasi akses berdasarkan peran.', announcements: 'Buat sumber informasi resmi yang tidak tenggelam di percakapan grup.', documents: 'Publikasikan hanya dokumen yang sudah diklasifikasikan dengan benar.', settings: 'Atur identitas, modul, dan preferensi operasional organisasi.', officers: 'Atur susunan pengurus, ketua, sekretaris, bendahara, dan penanggung jawab seksi.' }[props.section]));
const filteredResidents = computed(() => (residents.data.value ?? []).filter(item => `${item.name} ${item.household}`.toLowerCase().includes(search.value.toLowerCase())));

function chooseImport(event: Event) { importFile.value = (event.target as HTMLInputElement).files?.[0] ?? null; }
function chooseDocument(event: Event) { documentFile.value = (event.target as HTMLInputElement).files?.[0] ?? null; }
function failureMessage(cause: unknown) { return cause instanceof ApiClientError || cause instanceof Error ? cause.message : 'Tindakan belum dapat diproses.'; }

function openActionPanel(mode: 'csv' | 'household' | 'invite' | 'announcement' | 'document' | 'officer') {
  panelMode.value = mode;
  panelOpen.value = true;
}

async function createHousehold() {
  busy.value = true;
  try {
    await api.post('/households', { ...householdForm });
    message.value = `Rumah ${householdForm.code} berhasil ditambahkan.`;
    panelOpen.value = false;
    await households.reload();
  } catch (cause) {
    message.value = failureMessage(cause);
  } finally {
    busy.value = false;
  }
}

async function inviteResident() {
  if (!inviteForm.householdId) return;
  busy.value = true;
  try {
    const res = await api.post<{ invitationUrl?: string }>(`/households/${inviteForm.householdId}/invitations`, {
      email: inviteForm.email,
      relationship: inviteForm.relationship,
    });
    message.value = `Undangan warga berhasil dibuat untuk ${inviteForm.email}.`;
    panelOpen.value = false;
    await residents.reload();
  } catch (cause) {
    message.value = failureMessage(cause);
  } finally {
    busy.value = false;
  }
}

async function publishAnnouncement() {
  busy.value = true;
  try {
    await api.post('/announcements', { ...announcementForm });
    message.value = 'Pengumuman disimpan sebagai draf untuk ditinjau.';
    panelOpen.value = false;
    await announcements.reload();
  } catch (cause) {
    message.value = failureMessage(cause);
  } finally {
    busy.value = false;
  }
}

async function uploadDocument() {
  if (!documentFile.value) return;
  busy.value = true;
  try {
    const formData = new FormData();
    formData.append('file', documentFile.value);
    formData.append('title', documentForm.title);
    formData.append('description', documentForm.description);
    formData.append('category', documentForm.category);
    formData.append('visibility', documentForm.visibility);
    await fetch('/api/v1/documents', { credentials: 'include', method: 'POST', body: formData });
    message.value = 'Dokumen baru berhasil diunggah.';
    panelOpen.value = false;
    await documents.reload();
  } catch (cause) {
    message.value = failureMessage(cause);
  } finally {
    busy.value = false;
  }
}

async function createOfficer() {
  busy.value = true;
  try {
    await api.post('/organization/officers', { ...officerForm });
    message.value = `Pengurus ${officerForm.name} (${officerForm.position}) berhasil ditambahkan.`;
    panelOpen.value = false;
    await officers.reload();
  } catch (cause) {
    message.value = failureMessage(cause);
  } finally {
    busy.value = false;
  }
}

async function deleteOfficer(id: string) {
  if (!confirm('Hapus pengurus ini dari struktur organisasi?')) return;
  busy.value = true;
  try {
    await api.delete(`/organization/officers/${id}`);
    message.value = 'Data pengurus berhasil dihapus.';
    await officers.reload();
  } catch (cause) {
    message.value = failureMessage(cause);
  } finally {
    busy.value = false;
  }
}

async function updateOrganization() {
  busy.value = true;
  try {
    await api.patch('/organization', { ...organizationForm });
    message.value = 'Perubahan identitas lingkungan berhasil disimpan.';
  } catch (cause) {
    message.value = failureMessage(cause);
  } finally {
    busy.value = false;
  }
}

watch(organization.data, (value) => {
  if (value) Object.assign(organizationForm, value);
}, { immediate: true });

watch(modules.data, (value) => {
  if (value) Object.assign(moduleForm, value);
}, { immediate: true });
</script>

<template>
  <div class="admin-page">
    <header class="admin-heading">
      <div>
        <span class="eyebrow">Manajemen Lingkungan</span>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
      <div class="heading-actions">
        <template v-if="section === 'residents'">
          <button class="button button-secondary" type="button" @click="openActionPanel('household')"><Plus :size="16" /> Tambah rumah</button>
          <button class="button button-secondary" type="button" @click="openActionPanel('invite')"><UserPlus :size="16" /> Undang warga</button>
          <button class="button" type="button" @click="openActionPanel('csv')"><Upload :size="16" /> Impor CSV</button>
        </template>
        <template v-else-if="section === 'announcements'">
          <button class="button" type="button" @click="openActionPanel('announcement')"><Plus :size="16" /> Pengumuman baru</button>
        </template>
        <template v-else-if="section === 'documents'">
          <button class="button" type="button" @click="openActionPanel('document')"><Plus :size="16" /> Unggah dokumen</button>
        </template>
        <template v-else-if="section === 'officers'">
          <button class="button" type="button" @click="openActionPanel('officer')"><Plus :size="16" /> Tambah pengurus</button>
        </template>
      </div>
    </header>

    <div v-if="message" class="notice" role="status"><CheckCircle2 :size="18" />{{ message }}</div>

    <template v-if="section === 'residents'">
      <div class="toolbar">
        <label class="search">
          <Search :size="17" />
          <span class="sr-only">Cari warga atau rumah</span>
          <input v-model="search" type="search" placeholder="Cari nama, blok, atau kode rumah" />
        </label>
        <span>{{ filteredResidents.length }} warga terdaftar</span>
      </div>
      <div class="split-tables">
        <section>
          <div class="section-heading">
            <div>
              <h2>Daftar warga</h2>
              <p class="muted">Data kontak tidak ditampilkan di tabel ringkas.</p>
            </div>
          </div>
          <StatePanel v-if="residents.loading.value" state="loading" />
          <StatePanel v-else-if="residents.error.value" state="error" :message="residents.error.value" @retry="residents.reload" />
          <div v-else class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Rumah</th>
                  <th>Hubungan</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in filteredResidents" :key="item.id">
                  <td><strong>{{ item.name }}</strong></td>
                  <td>{{ item.household }}</td>
                  <td>{{ item.role }}</td>
                  <td><StatusBadge :status="item.status === 'Aktif' ? 'VERIFIED' : 'PENDING_VERIFICATION'" :label="item.status" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div class="section-heading">
            <div>
              <h2>Daftar rumah & unit</h2>
              <p class="muted">Struktur blok dan nomor rumah.</p>
            </div>
          </div>
          <StatePanel v-if="households.loading.value" state="loading" />
          <StatePanel v-else-if="households.error.value" state="error" :message="households.error.value" @retry="households.reload" />
          <div v-else class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Alamat</th>
                  <th>Hunian</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in households.data.value" :key="item.id">
                  <td><strong>{{ item.code }}</strong></td>
                  <td>{{ item.address }}</td>
                  <td>{{ item.members ?? 0 }} warga</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </template>

    <template v-else-if="section === 'officers'">
      <StatePanel v-if="officers.loading.value" state="loading" />
      <StatePanel v-else-if="officers.error.value" state="error" :message="officers.error.value" @retry="officers.reload" />
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Urutan</th>
              <th>Nama Pengurus</th>
              <th>Jabatan</th>
              <th>Bidang / Seksi</th>
              <th>Kontak</th>
              <th>Masa Bhakti</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in adminOfficersList" :key="item.id">
              <td><strong>#{{ item.orderIndex }}</strong></td>
              <td><strong>{{ item.name }}</strong></td>
              <td><span class="position-badge">{{ item.position }}</span></td>
              <td>{{ item.department }}</td>
              <td>{{ item.phone || '—' }}</td>
              <td>Masa Bhakti {{ item.period }}</td>
              <td>
                <button class="button button-danger button-sm" type="button" @click="deleteOfficer(item.id)">
                  <Trash2 :size="14" /> Hapus
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template v-else-if="section === 'announcements'">
      <StatePanel v-if="announcements.loading.value" state="loading" />
      <StatePanel v-else-if="announcements.error.value" state="error" :message="announcements.error.value" @retry="announcements.reload" />
      <div v-else class="content-grid">
        <article v-for="item in announcements.data.value" :key="item.id" class="card card-body">
          <div class="announcement-header">
            <span class="eyebrow">{{ item.category }}</span>
            <StatusBadge :status="item.status" />
          </div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.summary }}</p>
          <small class="muted">Diperbarui {{ formatDate(item.updatedAt) }}</small>
        </article>
      </div>
    </template>

    <template v-else-if="section === 'documents'">
      <StatePanel v-if="documents.loading.value" state="loading" />
      <StatePanel v-else-if="documents.error.value" state="error" :message="documents.error.value" @retry="documents.reload" />
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Judul dokumen</th>
              <th>Kategori</th>
              <th>Visibilitas</th>
              <th>Tanggal terbit</th>
              <th>Berkas</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in documents.data.value" :key="item.id">
              <td><strong>{{ item.title }}</strong></td>
              <td>{{ item.category }}</td>
              <td><StatusBadge :status="item.visibility" /></td>
              <td>{{ item.publishedAt ? formatDate(item.publishedAt) : '—' }}</td>
              <td>
                <a v-if="item.downloadUrl" class="button button-secondary button-sm" :href="item.downloadUrl" target="_blank" rel="noopener">
                  <Download :size="14" /> Unduh
                </a>
                <span v-else class="muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template v-else>
      <div class="settings-grid">
        <section class="card card-body">
          <h2>Identitas lingkungan</h2>
          <p class="muted">Informasi ini ditampilkan di portal publik dan footer dokumen resmi.</p>
          <form class="form-grid" @submit.prevent="updateOrganization">
            <div class="field"><label for="org-name">Nama lengkap organisasi</label><input id="org-name" v-model="organizationForm.name" required /></div>
            <div class="field"><label for="org-short">Nama singkat (RT/RW)</label><input id="org-short" v-model="organizationForm.shortName" required /></div>
            <div class="field"><label for="org-desc">Deskripsi publik</label><textarea id="org-desc" v-model="organizationForm.description" rows="3" required /></div>
            <div class="field"><label for="org-addr">Alamat posko / sekretariat</label><input id="org-addr" v-model="organizationForm.address" required /></div>
            <div class="field"><label for="org-phone">Nomor darurat / WhatsApp posko</label><input id="org-phone" v-model="organizationForm.emergencyPhone" required /></div>
            <button class="button" type="submit">Simpan perubahan identitas</button>
          </form>
        </section>

        <section class="card card-body">
          <h2>Modul & fitur aktif</h2>
          <p class="muted">Nonaktifkan fitur yang belum dibutuhkan lingkungan Anda.</p>
          <div class="module-list">
            <label v-for="mod in moduleOptions" :key="mod.key" class="module-item">
              <input v-model="moduleForm[mod.key]" type="checkbox" />
              <span><strong>{{ mod.label }}</strong></span>
            </label>
          </div>
          <button class="button" type="button">Simpan konfigurasi modul</button>
        </section>
      </div>
    </template>

    <!-- Slide Panel Modal Form -->
    <aside v-if="panelOpen" class="side-panel">
      <div class="panel-heading">
        <h2>
          {{
            panelMode === 'csv' ? 'Impor data CSV' :
            panelMode === 'household' ? 'Tambah rumah baru' :
            panelMode === 'invite' ? 'Undang warga' :
            panelMode === 'announcement' ? 'Buat pengumuman' :
            panelMode === 'officer' ? 'Tambah Pengurus RT/RW' : 'Unggah dokumen'
          }}
        </h2>
        <button type="button" aria-label="Tutup" @click="panelOpen = false">×</button>
      </div>

      <!-- Form Pengurus Baru -->
      <form v-if="panelMode === 'officer'" class="form-grid" @submit.prevent="createOfficer">
        <div class="field"><label for="off-name">Nama Lengkap & Gelar</label><input id="off-name" v-model="officerForm.name" placeholder="Misal: Bpk. H. Bambang Sudirman" required /></div>
        <div class="field"><label for="off-pos">Jabatan Resmi</label><input id="off-pos" v-model="officerForm.position" placeholder="Misal: Ketua RT 03 / Sekretaris / Bendahara" required /></div>
        <div class="field">
          <label for="off-dept">Bidang / Seksi</label>
          <select id="off-dept" v-model="officerForm.department">
            <option value="PENGURUS_INTI">Pengurus Inti</option>
            <option value="SEKSI_KEAMANAN">Seksi Keamanan & Ronda</option>
            <option value="SEKSI_LINGKUNGAN">Seksi Lingkungan & Kebersihan</option>
            <option value="PEMUDA_KARANG_TARUNA">Pemuda & Karang Taruna</option>
          </select>
        </div>
        <div class="field"><label for="off-phone">Nomor Telepon / WhatsApp</label><input id="off-phone" v-model="officerForm.phone" placeholder="Contoh: 081234567890" /></div>
        <div class="field"><label for="off-email">Email (Opsional)</label><input id="off-email" v-model="officerForm.email" type="email" placeholder="bambang@wargahub.id" /></div>
        <div class="two-fields">
          <div class="field"><label for="off-period">Masa Bhakti</label><input id="off-period" v-model="officerForm.period" placeholder="2024 - 2027" required /></div>
          <div class="field"><label for="off-order">Urutan Tampilan</label><input id="off-order" v-model.number="officerForm.orderIndex" type="number" min="1" required /></div>
        </div>
        <button class="button" type="submit" :disabled="busy">{{ busy ? 'Menyimpan…' : 'Simpan Pengurus' }}</button>
      </form>

      <!-- Form Pengumuman -->
      <form v-else-if="panelMode === 'announcement'" class="form-grid" @submit.prevent="publishAnnouncement">
        <div class="field"><label for="ann-title">Judul pengumuman</label><input id="ann-title" v-model="announcementForm.title" required /></div>
        <div class="field"><label for="ann-cat">Kategori</label><input id="ann-cat" v-model="announcementForm.category" required /></div>
        <div class="field"><label for="ann-summary">Ringkasan</label><textarea id="ann-summary" v-model="announcementForm.summary" rows="2" required /></div>
        <div class="field"><label for="ann-content">Isi lengkap</label><textarea id="ann-content" v-model="announcementForm.content" rows="6" required /></div>
        <button class="button" type="submit" :disabled="busy">{{ busy ? 'Menyimpan…' : 'Simpan draf' }}</button>
      </form>

      <!-- Form Dokumen -->
      <form v-else-if="panelMode === 'document'" class="form-grid" @submit.prevent="uploadDocument">
        <div class="field"><label for="doc-title">Judul dokumen</label><input id="doc-title" v-model="documentForm.title" required /></div>
        <div class="field"><label for="doc-desc">Deskripsi</label><textarea id="doc-desc" v-model="documentForm.description" rows="2" required /></div>
        <div class="field"><label for="doc-file">Pilih berkas</label><input id="doc-file" type="file" required @change="chooseDocument" /></div>
        <button class="button" type="submit" :disabled="busy || !documentFile">{{ busy ? 'Mengunggah…' : 'Unggah dokumen' }}</button>
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
.toolbar{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.7rem 1rem;border:1px solid var(--line);border-radius:var(--radius-md);background:var(--paper)}
.search{display:flex;max-width:32rem;flex:1;align-items:center;gap:.4rem;color:var(--ink-500)}
.search input{width:100%;border:0;outline:0}
.split-tables{display:grid;grid-template-columns:1.4fr 1fr;gap:1rem}
.table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:var(--radius-md);background:var(--paper)}
.data-table{width:100%;border-collapse:collapse;font-size:.875rem}
.data-table th,.data-table td{padding:.75rem 1rem;border-bottom:1px solid var(--line);text-align:left}
.data-table th{background:var(--cream-50);font-weight:750;color:var(--ink-700)}
.data-table tbody tr:hover{background:var(--cream-50)}
.position-badge{display:inline-block;padding:.2rem .5rem;border-radius:.4rem;background:var(--teal-50);color:var(--teal-800);font-weight:800;font-size:.78rem}
.content-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(22rem,1fr));gap:1rem}
.announcement-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem}
.settings-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:1rem}
.module-list{display:grid;gap:.6rem;margin-block:1rem}
.module-item{display:flex;align-items:center;gap:.6rem;padding:.6rem .8rem;border:1px solid var(--line);border-radius:var(--radius-md);background:var(--paper);cursor:pointer}
.side-panel{position:fixed;z-index:50;top:0;right:0;width:min(100%,32rem);height:100vh;padding:1.5rem;overflow-y:auto;border-left:1px solid var(--line);background:var(--paper);box-shadow:var(--shadow-lg)}
.panel-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem}
.panel-heading button{width:2.5rem;height:2.5rem;border:1px solid var(--line);border-radius:.6rem;background:white;font-size:1.4rem;cursor:pointer}
.form-grid{display:grid;gap:1rem}
.two-fields{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}
.field{display:grid;gap:.35rem}
.field label{font-size:.8rem;font-weight:750;color:var(--ink-800)}
.field input,.field select,.field textarea{padding:.6rem .8rem;border:1px solid var(--line-strong);border-radius:var(--radius-md);font-family:inherit;font-size:.9rem}
@media(max-width:900px){.split-tables,.settings-grid{grid-template-columns:1fr}}
</style>
