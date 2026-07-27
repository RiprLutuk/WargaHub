<script setup lang="ts">
import { CheckCircle2, Download, FileUp, Megaphone, Plus, Search, Trash2, Upload, UserPlus } from 'lucide-vue-next';
import { computed, reactive, ref, watch } from 'vue';
import StatePanel from '../../components/StatePanel.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import { useResource } from '../../composables/useResource';
import { api, ApiClientError } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { adaptHouseholds, adaptResidents } from '../../lib/view-models';

type Section = 'residents' | 'announcements' | 'documents' | 'settings';
const props = withDefaults(defineProps<{ section?: Section }>(), { section: 'residents' });
const households = useResource(async () => adaptHouseholds(await api.get<unknown>('/households')));
const residents = useResource(async () => adaptResidents(await api.get<unknown>('/residents')));
interface AdminAnnouncement { id: string; category: string; title: string; summary: string; status: string; publishedAt: string | null; updatedAt: string }
interface AdminDocument { id: string; title: string; category: string; visibility: string; publishedAt: string | null; createdAt: string; downloadUrl: string | null }
const announcements = useResource(() => api.get<AdminAnnouncement[]>('/announcements'));
const documents = useResource(() => api.get<AdminDocument[]>('/documents'));
interface OrganizationSettings { id: string; name: string; shortName: string; description: string; address: string; emergencyPhone: string; timezone: string; locale: string }
interface ModuleSettings { billing: boolean; finance: boolean; patrol: boolean; complaints: boolean; activities: boolean; documents: boolean }
const organization = useResource<OrganizationSettings | null>(() => props.section === 'settings' ? api.get<OrganizationSettings>('/organization') : Promise.resolve(null));
const modules = useResource<ModuleSettings | null>(() => props.section === 'settings' ? api.get<ModuleSettings>('/settings/modules') : Promise.resolve(null));

const search = ref('');
const panelOpen = ref(false);
const panelMode = ref<'csv' | 'household' | 'invite' | 'announcement' | 'document'>('csv');
const message = ref('');
const importFile = ref<File | null>(null);
const documentFile = ref<File | null>(null);
const busy = ref(false);

const householdForm = reactive({ code: '', address: '', rw: '001', rt: '001', block: 'A', occupancyStatus: 'OCCUPIED', ownershipStatus: 'OWNER' });
const inviteForm = reactive({ householdId: '', email: '', relationship: 'HEAD' });
const announcementForm = reactive({ category: 'UMUM', title: '', summary: '', content: '', visibility: 'RESIDENT', urgency: 'NORMAL', pinned: false });
const documentForm = reactive({ title: '', description: '', category: 'Administrasi', visibility: 'INTERNAL' });
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

const title = computed(() => ({ residents: 'Warga & rumah', announcements: 'Publikasi pengumuman', documents: 'Dokumen & arsip', settings: 'Pengaturan lingkungan' }[props.section]));
const description = computed(() => ({ residents: 'Kelola data seperlunya dan batasi akses berdasarkan peran.', announcements: 'Buat sumber informasi resmi yang tidak tenggelam di percakapan grup.', documents: 'Publikasikan hanya dokumen yang sudah diklasifikasikan dengan benar.', settings: 'Atur identitas, modul, dan preferensi operasional organisasi.' }[props.section]));
const filteredResidents = computed(() => (residents.data.value ?? []).filter(item => `${item.name} ${item.household}`.toLowerCase().includes(search.value.toLowerCase())));

function chooseImport(event: Event) { importFile.value = (event.target as HTMLInputElement).files?.[0] ?? null; }
function chooseDocument(event: Event) { documentFile.value = (event.target as HTMLInputElement).files?.[0] ?? null; }
function failureMessage(cause: unknown) { return cause instanceof ApiClientError || cause instanceof Error ? cause.message : 'Tindakan belum dapat diproses.'; }

function openActionPanel(mode: 'csv' | 'household' | 'invite' | 'announcement' | 'document') {
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

async function publishDraft(item: AdminAnnouncement) {
  busy.value = true;
  try {
    await api.post(`/announcements/${item.id}/publish`);
    item.status = 'PUBLISHED';
    item.publishedAt = new Date().toISOString();
    message.value = 'Pengumuman diterbitkan.';
  } catch (cause) {
    message.value = failureMessage(cause);
  } finally {
    busy.value = false;
  }
}

async function importHouseholds() {
  if (!importFile.value) return;
  busy.value = true;
  try {
    const csv = await importFile.value.text();
    const result = await api.post<{ imported: number }>('/households/import', csv);
    message.value = `${result.imported} rumah berhasil diimpor.`;
    panelOpen.value = false;
    await households.reload();
  } catch (cause) {
    message.value = failureMessage(cause);
  } finally {
    busy.value = false;
  }
}

async function createDocument() {
  if (!documentFile.value) return;
  busy.value = true;
  try {
    const body = new FormData();
    body.append('file', documentFile.value);
    const uploaded = await api.post<{ id: string }>('/files', body);
    await api.post('/documents', { ...documentForm, fileId: uploaded.id });
    message.value = 'Dokumen disimpan sebagai draf.';
    panelOpen.value = false;
    await documents.reload();
  } catch (cause) {
    message.value = failureMessage(cause);
  } finally {
    busy.value = false;
  }
}

async function publishDocument(item: AdminDocument) {
  busy.value = true;
  try {
    await api.post(`/documents/${item.id}/publish`);
    item.publishedAt = new Date().toISOString();
    message.value = 'Dokumen diterbitkan.';
  } catch (cause) {
    message.value = failureMessage(cause);
  } finally {
    busy.value = false;
  }
}

async function saveOrganization() {
  await api.patch('/organization', { ...organizationForm });
  message.value = 'Identitas organisasi tersimpan.';
  await organization.reload();
}

async function saveModules() {
  await api.put('/settings/modules', { ...moduleForm });
  message.value = 'Modul aktif tersimpan.';
}

watch(() => organization.data.value, (value) => {
  if (value) Object.assign(organizationForm, { name: value.name, shortName: value.shortName, description: value.description, address: value.address, emergencyPhone: value.emergencyPhone, timezone: value.timezone, locale: value.locale });
}, { immediate: true });

watch(() => modules.data.value, (value) => {
  if (value) Object.assign(moduleForm, value);
}, { immediate: true });
</script>

<template>
  <div class="admin-page">
    <header class="admin-heading">
      <div>
        <span class="eyebrow">Kelola konten & data</span>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
      <div class="heading-actions">
        <template v-if="section === 'residents'">
          <a class="button button-secondary" href="/api/v1/households/export"><Download :size="16" /> Ekspor CSV</a>
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
              <h2>Rumah</h2>
              <p class="muted">Struktur penagihan dan keanggotaan.</p>
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
                  <th>Anggota</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in households.data.value" :key="item.id">
                  <td><strong>{{ item.code }}</strong></td>
                  <td>{{ item.address }}</td>
                  <td>{{ item.members ?? '—' }}</td>
                  <td>{{ item.status }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </template>

    <template v-else-if="section === 'announcements'">
      <div class="toolbar">
        <label class="search">
          <Search :size="17" />
          <span class="sr-only">Cari pengumuman</span>
          <input v-model="search" type="search" placeholder="Cari pengumuman" />
        </label>
      </div>
      <StatePanel v-if="announcements.loading.value" state="loading" />
      <StatePanel v-else-if="announcements.error.value" state="error" :message="announcements.error.value" @retry="announcements.reload" />
      <div v-else class="content-list">
        <article v-for="item in announcements.data.value?.filter(entry => `${entry.title} ${entry.summary}`.toLowerCase().includes(search.toLowerCase()))" :key="item.id" class="card card-body">
          <span class="content-icon"><Megaphone :size="19" /></span>
          <div>
            <small>{{ item.category }} · {{ formatDate(item.publishedAt ?? item.updatedAt) }}</small>
            <h2>{{ item.title }}</h2>
            <p>{{ item.summary }}</p>
          </div>
          <StatusBadge :status="item.status" />
          <button v-if="['DRAFT', 'SCHEDULED'].includes(item.status)" class="button button-secondary button-sm" type="button" :disabled="busy" @click="publishDraft(item)">Terbitkan</button>
          <span v-else class="muted small">{{ item.status === 'ARCHIVED' ? 'Diarsipkan' : 'Sudah terbit' }}</span>
        </article>
      </div>
    </template>

    <template v-else-if="section === 'documents'">
      <div class="notice notice-warning">
        <FileUp :size="18" />
        <span>Dokumen privat tidak boleh dipublikasikan tanpa peninjauan. File sensitif selalu menggunakan akses terautentikasi.</span>
      </div>
      <StatePanel v-if="documents.loading.value" state="loading" />
      <StatePanel v-else-if="documents.error.value" state="error" :message="documents.error.value" @retry="documents.reload" />
      <div v-else class="content-list">
        <article v-for="item in documents.data.value" :key="item.id" class="card card-body">
          <span class="content-icon"><FileUp :size="19" /></span>
          <div>
            <small>{{ item.category }} · {{ item.visibility }}</small>
            <h2>{{ item.title }}</h2>
            <p>{{ formatDate(item.publishedAt ?? item.createdAt) }}</p>
          </div>
          <StatusBadge :status="item.publishedAt ? 'PUBLISHED' : 'DRAFT'" />
          <div class="row-actions">
            <a v-if="item.downloadUrl" class="button button-secondary button-sm" :href="item.downloadUrl" target="_blank" rel="noopener">Buka file</a>
            <button v-if="!item.publishedAt" class="button button-secondary button-sm" type="button" :disabled="busy" @click="publishDocument(item)">Terbitkan</button>
          </div>
        </article>
      </div>
    </template>

    <template v-else>
      <div class="settings-grid">
        <section class="card card-body">
          <h2>Identitas organisasi</h2>
          <StatePanel v-if="organization.loading.value" state="loading" />
          <StatePanel v-else-if="organization.error.value" state="error" :message="organization.error.value" @retry="organization.reload" />
          <form v-else class="form-grid" @submit.prevent="saveOrganization">
            <div class="field"><label for="org-name">Nama lingkungan</label><input id="org-name" v-model="organizationForm.name" minlength="3" required /></div>
            <div class="field"><label for="org-short-name">Nama singkat</label><input id="org-short-name" v-model="organizationForm.shortName" minlength="2" maxlength="30" required /></div>
            <div class="field"><label for="org-description">Deskripsi publik</label><textarea id="org-description" v-model="organizationForm.description" rows="3" minlength="10" required /></div>
            <div class="field"><label for="org-address">Alamat umum</label><textarea id="org-address" v-model="organizationForm.address" rows="3" minlength="5" required /></div>
            <div class="field"><label for="org-emergency">Nomor darurat lingkungan</label><input id="org-emergency" v-model="organizationForm.emergencyPhone" minlength="3" required /></div>
            <button class="button" type="submit">Simpan identitas</button>
          </form>
        </section>
        <section class="card card-body">
          <h2>Modul aktif</h2>
          <StatePanel v-if="modules.loading.value" state="loading" />
          <StatePanel v-else-if="modules.error.value" state="error" :message="modules.error.value" @retry="modules.reload" />
          <form v-else class="form-grid" @submit.prevent="saveModules">
            <div class="module-list">
              <label v-for="item in moduleOptions" :key="item.key">
                <input v-model="moduleForm[item.key]" type="checkbox" />
                <span><strong>{{ item.label }}</strong><small>Tampil untuk role yang memiliki izin</small></span>
              </label>
            </div>
            <button class="button" type="submit">Simpan modul</button>
          </form>
        </section>
      </div>
    </template>

    <aside v-if="panelOpen" class="side-panel" aria-labelledby="panel-heading">
      <div class="panel-heading">
        <div>
          <span class="eyebrow">Tindakan terarah</span>
          <h2 id="panel-heading">
            {{
              panelMode === 'household' ? 'Tambah rumah baru' :
              panelMode === 'invite' ? 'Undang warga' :
              panelMode === 'csv' ? 'Impor CSV rumah' :
              panelMode === 'announcement' ? 'Buat pengumuman' : 'Unggah dokumen'
            }}
          </h2>
        </div>
        <button type="button" aria-label="Tutup panel" @click="panelOpen = false">×</button>
      </div>

      <!-- Form Tambah Rumah Manual -->
      <form v-if="panelMode === 'household'" class="form-grid" @submit.prevent="createHousehold">
        <div class="two-fields">
          <div class="field"><label for="h-code">Kode rumah</label><input id="h-code" v-model="householdForm.code" placeholder="Misal: A-01" required /></div>
          <div class="field"><label for="h-block">Blok</label><input id="h-block" v-model="householdForm.block" placeholder="Misal: Blok A" required /></div>
        </div>
        <div class="field"><label for="h-address">Alamat lengkap</label><input id="h-address" v-model="householdForm.address" placeholder="Jl. Perumahan No. 1" required /></div>
        <div class="two-fields">
          <div class="field"><label for="h-rt">RT</label><input id="h-rt" v-model="householdForm.rt" required /></div>
          <div class="field"><label for="h-rw">RW</label><input id="h-rw" v-model="householdForm.rw" required /></div>
        </div>
        <div class="two-fields">
          <div class="field">
            <label for="h-occ">Status hunian</label>
            <select id="h-occ" v-model="householdForm.occupancyStatus">
              <option value="OCCUPIED">Terisi</option>
              <option value="EMPTY">Kosong</option>
            </select>
          </div>
          <div class="field">
            <label for="h-own">Kepemilikan</label>
            <select id="h-own" v-model="householdForm.ownershipStatus">
              <option value="OWNER">Pemilik</option>
              <option value="RENTER">Penyewa</option>
            </select>
          </div>
        </div>
        <button class="button" type="submit" :disabled="busy">{{ busy ? 'Menyimpan…' : 'Simpan rumah' }}</button>
      </form>

      <!-- Form Undang Warga Baru -->
      <form v-else-if="panelMode === 'invite'" class="form-grid" @submit.prevent="inviteResident">
        <div class="field">
          <label for="inv-household">Pilih rumah</label>
          <select id="inv-household" v-model="inviteForm.householdId" required>
            <option value="" disabled>Pilih rumah tujuan</option>
            <option v-for="h in households.data.value" :key="h.id" :value="h.id">{{ h.code }} · {{ h.address }}</option>
          </select>
        </div>
        <div class="field">
          <label for="inv-email">Email warga</label>
          <input id="inv-email" v-model="inviteForm.email" type="email" placeholder="warga@example.com" required />
        </div>
        <div class="field">
          <label for="inv-rel">Hubungan keluarga</label>
          <select id="inv-rel" v-model="inviteForm.relationship">
            <option value="HEAD">Kepala Keluarga</option>
            <option value="SPOUSE">Pasangan</option>
            <option value="CHILD">Anak</option>
            <option value="MEMBER">Anggota Lain</option>
          </select>
        </div>
        <button class="button" type="submit" :disabled="busy || !inviteForm.householdId">{{ busy ? 'Mengirim…' : 'Kirim undangan' }}</button>
      </form>

      <!-- Form Impor CSV -->
      <form v-else-if="panelMode === 'csv'" class="form-grid" @submit.prevent="importHouseholds">
        <div class="notice notice-warning">Setiap baris divalidasi oleh server sebelum seluruh impor disimpan secara atomik.</div>
        <div class="field">
          <label for="csv-import">File CSV rumah</label>
          <label class="upload" for="csv-import">
            <Upload :size="22" />
            <span><strong>{{ importFile?.name ?? 'Pilih file CSV' }}</strong><small>Kolom: code, address, rw, rt, block, occupancyStatus, ownershipStatus.</small></span>
          </label>
          <input id="csv-import" class="sr-only" type="file" accept="text/csv,.csv" required @change="chooseImport" />
        </div>
        <button class="button" type="submit" :disabled="busy || !importFile">{{ busy ? 'Mengimpor…' : 'Impor rumah' }}</button>
      </form>

      <!-- Form Buat Pengumuman -->
      <form v-else-if="panelMode === 'announcement'" class="form-grid" @submit.prevent="publishAnnouncement">
        <div class="field"><label for="announcement-title">Judul</label><input id="announcement-title" v-model="announcementForm.title" minlength="4" required /></div>
        <div class="field"><label for="announcement-summary">Ringkasan notifikasi</label><textarea id="announcement-summary" v-model="announcementForm.summary" minlength="10" maxlength="240" required /></div>
        <div class="field"><label for="announcement-content">Isi lengkap</label><textarea id="announcement-content" v-model="announcementForm.content" minlength="20" required /></div>
        <div class="two-fields">
          <div class="field">
            <label for="announcement-visibility">Audiens</label>
            <select id="announcement-visibility" v-model="announcementForm.visibility">
              <option value="RESIDENT">Warga terverifikasi</option>
              <option value="PUBLIC">Publik</option>
            </select>
          </div>
          <div class="field">
            <label for="announcement-urgency">Urgensi</label>
            <select id="announcement-urgency" v-model="announcementForm.urgency">
              <option value="NORMAL">Normal</option>
              <option value="IMPORTANT">Penting</option>
              <option value="EMERGENCY">Darurat</option>
            </select>
          </div>
        </div>
        <button class="button" type="submit" :disabled="busy">{{ busy ? 'Menyimpan…' : 'Simpan draf' }}</button>
      </form>

      <!-- Form Unggah Dokumen -->
      <form v-else class="form-grid" @submit.prevent="createDocument">
        <div class="field"><label for="document-title">Judul dokumen</label><input id="document-title" v-model="documentForm.title" minlength="4" required /></div>
        <div class="field"><label for="document-description">Deskripsi</label><textarea id="document-description" v-model="documentForm.description" maxlength="1000" /></div>
        <div class="field"><label for="document-category">Kategori</label><input id="document-category" v-model="documentForm.category" minlength="2" required /></div>
        <div class="field">
          <label for="document-visibility">Klasifikasi akses</label>
          <select id="document-visibility" v-model="documentForm.visibility">
            <option value="INTERNAL">Internal</option>
            <option value="PUBLIC">Publik</option>
            <option value="SENSITIVE">Sensitif</option>
          </select>
        </div>
        <div class="field"><label for="document-file">File PDF</label><input id="document-file" type="file" accept="application/pdf" required @change="chooseDocument" /></div>
        <button class="button" type="submit" :disabled="busy || !documentFile">{{ busy ? 'Mengunggah…' : 'Simpan dokumen' }}</button>
      </form>
    </aside>
  </div>
</template>

<style scoped>
.admin-page{display:grid;max-width:88rem;gap:1.2rem;margin-inline:auto}
.admin-heading{display:flex;align-items:end;justify-content:space-between;gap:1rem}
.admin-heading h1{margin-bottom:.4rem;font-size:clamp(2rem,4vw,3rem)}
.admin-heading p{max-width:52rem;margin:0;color:var(--ink-650)}
.heading-actions{display:flex;flex-wrap:wrap;gap:.6rem}
.toolbar{display:flex;align-items:center;gap:.6rem;padding:.7rem;border:1px solid var(--line);border-radius:var(--radius-md);background:var(--paper)}
.toolbar>span{margin-left:auto;color:var(--ink-650);font-size:.78rem}
.search{display:flex;min-width:15rem;max-width:30rem;flex:1;align-items:center;gap:.45rem;padding-inline:.7rem;border:1px solid var(--line-strong);border-radius:.65rem;color:var(--ink-500)}
.search input{width:100%;min-height:2.55rem;border:0;outline:0}
.split-tables{display:grid;grid-template-columns:1.2fr 1fr;gap:1rem}
.content-list{display:grid;gap:.65rem}
.content-list article{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:.8rem}
.content-icon{display:grid;width:2.7rem;height:2.7rem;place-items:center;border-radius:.75rem;background:var(--teal-100);color:var(--teal-700)}
.content-list small{color:var(--teal-700);font-weight:750}
.content-list h2{margin:.1rem 0;font-size:1rem}
.content-list p{margin:0;color:var(--ink-650);font-size:.8rem}
.settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.module-list{display:grid}
.module-list label{display:flex;align-items:center;gap:.65rem;min-height:3.7rem;border-bottom:1px solid var(--line)}
.module-list input{width:1.1rem;height:1.1rem;accent-color:var(--teal-700)}
.module-list span{display:grid}
.module-list small{color:var(--ink-650)}
.side-panel{position:fixed;z-index:50;top:0;right:0;width:min(100%,35rem);height:100vh;padding:1.5rem;overflow-y:auto;border-left:1px solid var(--line);background:var(--paper);box-shadow:var(--shadow-lg)}
.panel-heading{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.3rem}
.panel-heading button{width:2.75rem;height:2.75rem;border:1px solid var(--line);border-radius:.7rem;background:white;font-size:1.5rem;cursor:pointer}
.upload{display:flex;align-items:center;gap:.8rem;padding:1.2rem;border:1px dashed var(--teal-700);border-radius:var(--radius-md);background:var(--teal-50);color:var(--teal-700);cursor:pointer}
.upload span{display:grid}
.upload small{color:var(--ink-650)}
.two-fields{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}
@media(max-width:1000px){.split-tables,.settings-grid{grid-template-columns:1fr}}
@media(max-width:680px){.admin-heading{align-items:flex-start;flex-direction:column}.heading-actions,.heading-actions .button{width:100%}.content-list article{grid-template-columns:auto 1fr}.content-list article>.status-badge{grid-column:2}.content-list article>.button{grid-column:1/-1}.two-fields{grid-template-columns:1fr}}
</style>
