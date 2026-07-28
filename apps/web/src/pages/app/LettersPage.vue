<script setup lang="ts">
import { AlertCircle, CheckCircle2, Clock3, Download, FileCheck, FileSignature, FileText, Plus, QrCode, Search, ShieldCheck, X } from 'lucide-vue-next';
import { reactive, ref } from 'vue';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import SmartSelect from '../../components/SmartSelect.vue';
import { useResource } from '../../composables/useResource';
import { api, ApiClientError } from '../../lib/api';
import { formatDate, formatDateTime } from '../../lib/format';
import { adaptHouseholds } from '../../lib/view-models';

interface LetterRequest {
  id: string;
  letterType: string;
  purpose: string;
  status: string;
  letterNumber?: string | null;
  verificationToken?: string | null;
  issuedAt?: string | null;
  createdAt: string;
}

const letters = useResource(() => api.get<LetterRequest[]>('/letters'));
const households = useResource(async () => adaptHouseholds(await api.get<unknown>('/households')));
const formOpen = ref(false);
const selectedLetter = ref<LetterRequest | null>(null);
const busy = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

const form = reactive({
  type: 'GENERAL',
  purpose: 'Pengurusan perpanjangan KTP Elektronik di Kantor Kelurahan',
  notes: '',
});

const letterTypes = [
  { value: 'DOMICILE', label: 'Surat Keterangan Domisili' },
  { value: 'BUSINESS_INFO', label: 'Surat Keterangan Usaha' },
  { value: 'LOW_INCOME', label: 'Surat Keterangan Tidak Mampu' },
  { value: 'MARRIAGE_INTRO', label: 'Surat Pengantar Nikah' },
  { value: 'MOVE_NOTICE', label: 'Surat Pindah / Datang' },
  { value: 'GENERAL', label: 'Surat Keterangan Umum' },
];


async function submitRequest() {
  busy.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    const householdId = households.data.value?.[0]?.id;
    if (!householdId) {
      errorMsg.value = 'Hubungkan rumah terlebih dahulu sebelum mengajukan surat.';
      return;
    }
    await api.post<LetterRequest>('/letters', {
      householdId,
      letterType: form.type,
      purpose: form.purpose,
      fields: form.notes ? { notes: form.notes } : {},
    });
    successMsg.value = 'Permohonan surat berhasil dikirim. Sekretaris RT/RW akan meninjau dan menerbitkan surat resmi.';
    formOpen.value = false;
    await letters.reload();
  } catch (cause) {
    errorMsg.value = cause instanceof ApiClientError || cause instanceof Error ? cause.message : 'Gagal mengirim permohonan surat.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="portal-page">
    <header class="portal-page-heading">
      <div>
        <span class="eyebrow">Layanan Administrasi RT/RW</span>
        <h1>Surat & pengantar</h1>
        <p>Ajukan surat pengantar resmi tanpa harus mengantre. Lacak status dan unduh dokumen terverifikasi QR Code.</p>
      </div>
      <button v-if="!formOpen" class="button" type="button" @click="formOpen = true; successMsg = ''; errorMsg = '';">
        <Plus :size="17" /> Ajukan Surat Baru
      </button>
    </header>

    <div v-if="successMsg" class="notice" role="status">
      <CheckCircle2 :size="19" /> <span>{{ successMsg }}</span>
    </div>

    <!-- New Letter Form Modal / Drawer -->
    <div v-if="formOpen" class="form-modal" role="dialog" aria-modal="true" aria-labelledby="letter-form-heading" @click.self="formOpen = false">
    <section class="card form-panel">
      <div class="panel-header">
        <div>
          <span class="eyebrow">Formulir Mandiri</span>
          <h2 id="letter-form-heading">Permohonan Surat Pengantar</h2>
        </div>
        <button type="button" class="close-btn" aria-label="Tutup formulir" @click="formOpen = false"><X :size="20" /></button>
      </div>

      <div v-if="errorMsg" class="notice notice-error">
        <AlertCircle :size="18" /> {{ errorMsg }}
      </div>

      <form class="form-grid" @submit.prevent="submitRequest">
        <div class="field">
          <label for="letter-type">Jenis Surat Pengantar</label>
          <SmartSelect id="letter-type" v-model="form.type" :options="letterTypes" search-placeholder="Cari jenis surat…" />
        </div>

        <div class="field">
          <label for="letter-purpose">Keperluan / Alasan Pengajuan</label>
          <textarea
            id="letter-purpose"
            v-model.trim="form.purpose"
            rows="3"
            minlength="10"
            placeholder="Tuliskan keperluan pengurusan surat dengan jelas..."
            required
          />
        </div>

        <div class="field">
          <label for="letter-notes">Catatan Tambahan untuk Sekretaris (Opsional)</label>
          <input id="letter-notes" v-model.trim="form.notes" placeholder="Contoh: Perlu diambil fisik di pos RT jam 7 malam" />
        </div>

        <div class="notice notice-warning">
          <ShieldCheck :size="18" />
          <span>Surat resmi akan diterbitkan lengkap dengan Nomor Surat dan QR Code verifikasi autentisitas.</span>
        </div>

        <div class="form-actions">
          <button class="button" type="submit" :disabled="busy">{{ busy ? 'Mengirim…' : 'Kirim Permohonan' }}</button>
          <button class="button button-secondary" type="button" @click="formOpen = false">Batal</button>
        </div>
      </form>
    </section>
    </div>

    <!-- Requests Table / List -->
    <StatePanel v-if="letters.loading.value" state="loading" />
    <StatePanel v-else-if="letters.error.value" state="error" :message="letters.error.value" @retry="letters.reload" />
    <EmptyState v-else-if="!letters.data.value?.length" title="Belum ada permohonan surat" message="Klik tombol 'Ajukan Surat Baru' di atas untuk membuat permohonan pengantar." />

    <div v-else class="letter-list">
      <article v-for="item in letters.data.value" :key="item.id" class="card letter-card">
        <span class="letter-icon"><FileSignature :size="22" /></span>

        <div class="letter-info">
          <div class="card-meta">
            <span class="type-tag">{{ item.letterType.replaceAll('_', ' ') }}</span>
            <span class="time-tag">Diajukan {{ formatDateTime(item.createdAt) }}</span>
          </div>

          <h2>{{ item.purpose }}</h2>
          <p v-if="item.letterNumber" class="letter-num">Nomor Surat: <strong>{{ item.letterNumber }}</strong></p>

        </div>

        <div class="card-right">
          <StatusBadge :status="item.status" />

          <button v-if="item.status === 'ISSUED'" class="button button-sm button-secondary" type="button" @click="selectedLetter = item">
            <FileCheck :size="15" /> Lihat Cetak
          </button>
        </div>
      </article>
    </div>

    <!-- Letter Digital Certificate Modal -->
    <div v-if="selectedLetter" class="modal-overlay" role="dialog" aria-modal="true">
      <div class="certificate-card">
        <div class="cert-header">
          <span class="eyebrow">Rukun Tetangga / Rukun Warga</span>
          <h2>SURAT KETERANGAN PENGANTAR</h2>
          <p>Nomor: {{ selectedLetter.letterNumber ?? '—' }}</p>
        </div>

        <div class="cert-body">
          <p>Yang bertanda tangan di bawah ini Pengurus RT/RW menerangkan bahwa permohonan berikut:</p>
          <dl>
            <div><dt>Jenis Surat</dt><dd>{{ selectedLetter.letterType.replaceAll('_', ' ') }}</dd></div>
            <div><dt>Keperluan</dt><dd>{{ selectedLetter.purpose }}</dd></div>
            <div><dt>Tanggal Terbit</dt><dd>{{ formatDate(selectedLetter.issuedAt ?? selectedLetter.createdAt) }}</dd></div>
            <div><dt>Status Autentikasi</dt><dd>TERVERIFIKASI DIGITAL</dd></div>
          </dl>
          <div class="qr-preview">
            <QrCode :size="48" />
            <small v-if="selectedLetter.verificationToken">Verifikasi publik: <code>/surat/verifikasi/{{ selectedLetter.verificationToken }}</code></small>
            <small v-else>Dokumen digital dapat diambil melalui sekretariat setelah status diterbitkan.</small>
          </div>
        </div>

        <div class="cert-footer">
          <button class="button button-secondary" type="button" @click="selectedLetter = null">Tutup</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.portal-page { display: grid; max-width: var(--content); gap: 1.2rem; margin-inline: auto; }
.portal-page-heading { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 1rem; }
.portal-page-heading h1 { margin-bottom: .45rem; font-size: clamp(2rem, 4.5vw, 3rem); }
.portal-page-heading p { max-width: 46rem; margin: 0; color: var(--ink-650); }
.form-panel { padding: 1.3rem; }
.form-modal { position: fixed; z-index: 50; inset: 0; display: grid; place-items: center; overflow-y: auto; padding: 1rem; background: rgb(16 43 39 / .38); backdrop-filter: blur(5px); }
.form-modal .form-panel { width: min(100%, 46rem); max-height: 92vh; overflow-y: auto; box-shadow: var(--shadow-lg); }
.panel-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
.panel-header h2 { margin: 0; }
.close-btn { display: grid; width: 2.5rem; height: 2.5rem; flex: none; place-items: center; border: 1px solid var(--line); border-radius: .6rem; background: white; cursor: pointer; }
.letter-list { display: grid; gap: .75rem; }
.letter-card { display: flex; align-items: center; gap: 1.1rem; padding: 1.2rem; }
.letter-icon { display: grid; width: 2.9rem; height: 2.9rem; flex: none; place-items: center; border-radius: .85rem; background: var(--teal-100); color: var(--teal-700); }
.letter-info { display: grid; flex: 1; gap: .25rem; }
.card-meta { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; font-size: .74rem; }
.type-tag { color: var(--teal-700); font-weight: 850; text-transform: uppercase; }
.time-tag { color: var(--ink-500); }
.letter-info h2 { margin: 0; font-size: 1.05rem; }
.letter-num { margin: 0; color: var(--ink-650); font-size: .8rem; }
.qr-verify-chip { display: inline-flex; width: fit-content; align-items: center; gap: .35rem; padding: .15rem .45rem; border-radius: .4rem; background: var(--cream-100); color: var(--ink-800); font-size: .7rem; font-weight: 750; }
.card-right { display: flex; flex-direction: column; align-items: flex-end; gap: .6rem; }
.modal-overlay { position: fixed; z-index: 50; inset: 0; display: grid; place-items: center; padding: 1rem; background: rgba(16, 43, 39, 0.4); backdrop-filter: blur(4px); }
.certificate-card { width: min(100%, 34rem); padding: 1.6rem; border-radius: var(--radius-lg); background: var(--paper); box-shadow: var(--shadow-lg); }
.cert-header { text-align: center; border-bottom: 2px double var(--line); padding-bottom: .8rem; margin-bottom: 1rem; }
.cert-header h2 { font-family: var(--font-display); font-size: 1.3rem; margin: .2rem 0; }
.cert-body dl { display: grid; gap: .45rem; margin-block: 1rem; padding: .9rem; border-radius: var(--radius-md); background: var(--cream-50); }
.cert-body dl div { display: grid; grid-template-columns: 8rem 1fr; gap: .5rem; font-size: .82rem; }
.cert-body dt { color: var(--ink-650); }
.cert-body dd { margin: 0; font-weight: 750; }
.qr-preview { display: flex; flex-direction: column; align-items: center; gap: .4rem; text-align: center; color: var(--ink-650); }
.cert-footer { display: flex; justify-content: flex-end; margin-top: 1.2rem; }
@media (max-width: 650px) { .letter-card { flex-direction: column; align-items: flex-start; } .card-right { align-items: flex-start; } .form-modal { align-items: end; padding: .5rem; } .form-modal .form-panel { max-height: 94vh; border-radius: 1.1rem 1.1rem .8rem .8rem; } }
</style>
