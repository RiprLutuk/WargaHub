<script setup lang="ts">
import { CheckCircle2, EyeOff, ImagePlus, LockKeyhole, Plus, Send, X } from 'lucide-vue-next';
import { reactive, ref } from 'vue';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import type { Complaint } from '../../lib/demo';
import { formatDateTime } from '../../lib/format';

const complaints = useResource(() => api.get<Complaint[]>('/complaints'));
const formOpen = ref(true);
const confirming = ref(false);
const submitting = ref(false);
const success = ref('');
const form = reactive({ category: 'FASILITAS', title: '', description: '', location: '', visibility: 'PRIVATE', priority: 'NORMAL' });

async function submitComplaint() {
  submitting.value = true;
  try {
    const created = await api.post<Complaint>('/complaints', { ...form });
    if (complaints.data.value) complaints.data.value = [created, ...complaints.data.value];
    success.value = 'Pengaduan terkirim. Nomor tiket dibuat dan hanya pihak berizin yang dapat membacanya.';
    confirming.value = false;
    form.title = ''; form.description = ''; form.location = '';
  } finally { submitting.value = false; }
}
</script>

<template>
  <div class="portal-page">
    <header class="portal-page-heading"><div><span class="eyebrow">Lapor tanpa berdebat di grup</span><h1>Pengaduan warga</h1><p>Kirim masalah secara terstruktur, pilih tingkat privasi, dan pantau setiap perubahan status.</p></div><button v-if="!formOpen" class="button" type="button" @click="formOpen = true"><Plus :size="17" /> Buat pengaduan</button></header>
    <div class="privacy-note"><LockKeyhole :size="20" aria-hidden="true" /><div><strong>Privat secara default</strong><span>Identitas Anda tidak ditampilkan kepada warga lain. Pengurus yang berizin tetap dapat melihat pelapor agar laporan dapat ditindaklanjuti.</span></div></div>

    <section v-if="formOpen" class="card complaint-form" aria-labelledby="complaint-form-heading">
      <div class="form-heading"><div><span class="eyebrow">Laporan baru</span><h2 id="complaint-form-heading">Ceritakan masalah dengan singkat</h2></div><button type="button" aria-label="Tutup formulir pengaduan" @click="formOpen = false"><X :size="19" /></button></div>
      <div v-if="success" class="notice" role="status"><CheckCircle2 :size="19" /><span>{{ success }}</span></div>
      <form v-else class="form-grid" @submit.prevent="confirming = true">
        <div class="two-fields"><div class="field"><label for="complaint-category">Kategori</label><select id="complaint-category" v-model="form.category"><option value="FASILITAS">Fasilitas</option><option value="SAMPAH">Sampah</option><option value="KEAMANAN">Keamanan</option><option value="SALURAN_AIR">Saluran air</option><option value="KEBISINGAN">Kebisingan</option><option value="LAINNYA">Lainnya</option></select></div><div class="field"><label for="complaint-priority">Prioritas</label><select id="complaint-priority" v-model="form.priority"><option value="LOW">Rendah</option><option value="NORMAL">Normal</option><option value="HIGH">Tinggi</option><option value="URGENT">Mendesak</option></select></div></div>
        <div class="field"><label for="complaint-title">Judul masalah</label><input id="complaint-title" v-model.trim="form.title" minlength="4" maxlength="120" placeholder="Contoh: Lampu jalan depan blok C padam" required /></div>
        <div class="field"><label for="complaint-description">Apa yang terjadi?</label><textarea id="complaint-description" v-model.trim="form.description" minlength="10" maxlength="5000" placeholder="Jelaskan kondisi dan sejak kapan terjadi…" required /><p class="field-hint">Hindari mencantumkan data pribadi orang lain jika tidak dibutuhkan.</p></div>
        <div class="field"><label for="complaint-location">Lokasi (opsional)</label><input id="complaint-location" v-model.trim="form.location" maxlength="240" placeholder="Blok, jalan, atau titik terdekat" /></div>
        <fieldset class="visibility-field"><legend>Siapa yang dapat melihat laporan?</legend><label><input v-model="form.visibility" type="radio" value="PRIVATE" /><span><EyeOff :size="18" /><strong>Privat</strong><small>Hanya Anda dan pengurus terkait</small></span></label><label><input v-model="form.visibility" type="radio" value="PUBLIC" /><span><Send :size="18" /><strong>Terlihat warga</strong><small>Identitas tetap tidak ditampilkan</small></span></label></fieldset>
        <button class="button" type="submit">Kirim pengaduan</button>
      </form>
      <div v-if="confirming" class="confirmation-overlay" role="dialog" aria-modal="true" aria-labelledby="complaint-confirm-heading"><div><span class="eyebrow">Konfirmasi</span><h2 id="complaint-confirm-heading">Kirim laporan ini?</h2><p>Pengurus akan menerima isi laporan dan identitas akun Anda. Warga lain tidak akan melihat identitas Anda.</p><dl><div><dt>Judul</dt><dd>{{ form.title }}</dd></div><div><dt>Privasi</dt><dd>{{ form.visibility === 'PRIVATE' ? 'Privat' : 'Terlihat warga tanpa identitas' }}</dd></div></dl><div class="form-actions"><button class="button" type="button" :disabled="submitting" @click="submitComplaint">{{ submitting ? 'Mengirim…' : 'Ya, kirim laporan' }}</button><button class="button button-secondary" type="button" @click="confirming = false">Periksa lagi</button></div></div></div>
    </section>

    <section aria-labelledby="complaint-list-heading"><div class="section-heading"><div><h2 id="complaint-list-heading">Laporan Anda</h2><p class="muted">Riwayat status disimpan agar proses mudah ditelusuri.</p></div></div><StatePanel v-if="complaints.loading.value" state="loading" /><StatePanel v-else-if="complaints.error.value" state="error" :message="complaints.error.value" @retry="complaints.reload" /><EmptyState v-else-if="!complaints.data.value?.length" title="Belum ada pengaduan" /><div v-else class="complaint-list"><article v-for="item in complaints.data.value" :key="item.id" class="card card-body"><div><span>{{ item.category }}</span><h3>{{ item.title }}</h3><small>Diperbarui {{ formatDateTime(item.updatedAt) }}</small></div><StatusBadge :status="item.status" /></article></div></section>
  </div>
</template>

<style scoped>
.portal-page { display: grid; max-width: 78rem; gap: 1.35rem; margin-inline: auto; }
.portal-page-heading { display: flex; align-items: end; justify-content: space-between; gap: 1rem; }
.portal-page-heading h1 { margin-bottom: .45rem; font-size: clamp(2rem, 4.5vw, 3rem); }
.portal-page-heading p { max-width: 44rem; margin: 0; color: var(--ink-650); }
.privacy-note { display: flex; gap: .75rem; padding: 1rem; border: 1px solid var(--teal-100); border-radius: var(--radius-md); background: var(--teal-50); color: var(--teal-700); }
.privacy-note > svg { flex: none; }
.privacy-note div { display: grid; }
.privacy-note span { color: var(--ink-650); font-size: .83rem; }
.complaint-form { position: relative; padding: clamp(1rem, 3vw, 1.5rem); }
.form-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
.form-heading h2 { margin: 0; }
.form-heading button { display: grid; width: 2.75rem; height: 2.75rem; place-items: center; border: 1px solid var(--line); border-radius: .7rem; background: white; cursor: pointer; }
.two-fields { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
.visibility-field { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem; padding: 0; border: 0; }
.visibility-field legend { grid-column: 1 / -1; margin-bottom: .4rem; color: var(--ink-800); font-size: .89rem; font-weight: 760; }
.visibility-field label { position: relative; }
.visibility-field input { position: absolute; opacity: 0; }
.visibility-field label > span { display: grid; min-height: 6.5rem; grid-template-columns: auto 1fr; align-content: center; gap: .1rem .6rem; padding: .9rem; border: 1px solid var(--line); border-radius: var(--radius-md); cursor: pointer; }
.visibility-field label > span svg { grid-row: 1 / 3; color: var(--teal-700); }
.visibility-field small { color: var(--ink-650); }
.visibility-field input:checked + span { border-color: var(--teal-700); background: var(--teal-50); box-shadow: 0 0 0 2px var(--teal-100); }
.confirmation-overlay { position: absolute; z-index: 2; inset: 0; display: grid; place-items: center; padding: 1rem; border-radius: inherit; background: rgb(16 43 39 / .32); backdrop-filter: blur(3px); }
.confirmation-overlay > div { width: min(100%, 30rem); padding: 1.4rem; border-radius: var(--radius-lg); background: var(--paper); box-shadow: var(--shadow-lg); }
.confirmation-overlay dl { display: grid; gap: .55rem; padding: .8rem; border-radius: var(--radius-md); background: var(--cream-50); }
.confirmation-overlay dl div { display: grid; grid-template-columns: 5rem 1fr; gap: .5rem; }
.confirmation-overlay dt { color: var(--ink-650); }
.confirmation-overlay dd { margin: 0; font-weight: 750; }
.complaint-list { display: grid; gap: .65rem; }
.complaint-list article { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.complaint-list article span:first-child { color: var(--teal-700); font-size: .68rem; font-weight: 850; text-transform: uppercase; }
.complaint-list h3 { margin: .15rem 0; }
.complaint-list small { color: var(--ink-650); }
@media (max-width: 650px) { .portal-page-heading { align-items: flex-start; flex-direction: column; } .two-fields, .visibility-field { grid-template-columns: 1fr; } .visibility-field legend { grid-column: auto; } }
</style>
