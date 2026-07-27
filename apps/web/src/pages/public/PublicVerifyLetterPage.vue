<script setup lang="ts">
import { CheckCircle2, QrCode, ShieldCheck, XCircle } from 'lucide-vue-next';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import StatePanel from '../../components/StatePanel.vue';
import { api, ApiClientError } from '../../lib/api';
import { formatDate } from '../../lib/format';

interface VerificationResult {
  valid: boolean;
  letterNumber: string;
  type: string;
  purpose: string;
  organizationName: string;
  issuedAt: string;
}

const route = useRoute();
const loading = ref(true);
const error = ref('');
const result = ref<VerificationResult | null>(null);

async function verify() {
  loading.value = true;
  error.value = '';
  const token = route.params.token as string;
  try {
    const data = await api.get<VerificationResult>(`/public/letters/verify/${token}`);
    result.value = data;
  } catch (cause) {
    error.value = cause instanceof ApiClientError || cause instanceof Error ? cause.message : 'Surat tidak ditemukan atau kode verifikasi tidak valid.';
  } finally {
    loading.value = false;
  }
}

onMounted(verify);
</script>

<template>
  <div class="container section">
    <header class="page-heading">
      <span class="eyebrow">Autentikasi Dokumen Resmi</span>
      <h1>Verifikasi keabsahan surat</h1>
      <p>Pemeriksaan autentisitas digital surat pengantar yang diterbitkan oleh Pengurus RT/RW.</p>
    </header>

    <StatePanel v-if="loading" state="loading" />

    <div v-else-if="error" class="card verify-card invalid">
      <span class="icon-box red"><XCircle :size="32" /></span>
      <h2>Dokumen Tidak Valid atau Tidak Ditemukan</h2>
      <p>{{ error }}</p>
    </div>

    <div v-else-if="result" class="card verify-card valid">
      <span class="icon-box green"><CheckCircle2 :size="32" /></span>
      <h2>SURAT RESMI TERVERIFIKASI</h2>
      <p class="subtitle">Dokumen ini secara sah diterbitkan oleh <strong>{{ result.organizationName }}</strong>.</p>

      <dl class="cert-details">
        <div><dt>Nomor Surat</dt><dd>{{ result.letterNumber }}</dd></div>
        <div><dt>Jenis Surat</dt><dd>{{ result.type }}</dd></div>
        <div><dt>Keperluan</dt><dd>{{ result.purpose }}</dd></div>
        <div><dt>Tanggal Terbit</dt><dd>{{ formatDate(result.issuedAt) }}</dd></div>
      </dl>

      <div class="stamp-chip"><ShieldCheck :size="16" /> Tanda Tangan Digital RT/RW Sah</div>
    </div>
  </div>
</template>

<style scoped>
.page-heading { margin-bottom: 2rem; }
.page-heading h1 { margin-bottom: .45rem; font-size: clamp(2.2rem, 5vw, 3.2rem); }
.page-heading p { max-width: 44rem; margin: 0; color: var(--ink-650); }
.verify-card { max-width: 36rem; padding: 2rem; margin-inline: auto; text-align: center; }
.icon-box { display: grid; width: 4rem; height: 4rem; place-items: center; border-radius: 50%; margin: 0 auto 1rem; }
.icon-box.green { background: var(--teal-100); color: var(--teal-700); }
.icon-box.red { background: var(--coral-100); color: var(--coral-700); }
.verify-card h2 { margin: 0; font-size: 1.35rem; }
.subtitle { color: var(--ink-650); font-size: .88rem; margin: .3rem 0 1.2rem; }
.cert-details { display: grid; gap: .5rem; text-align: left; padding: 1rem; border-radius: var(--radius-md); background: var(--cream-50); font-size: .84rem; }
.cert-details div { display: grid; grid-template-columns: 8rem 1fr; gap: .5rem; }
.cert-details dt { color: var(--ink-650); }
.cert-details dd { margin: 0; font-weight: 750; }
.stamp-chip { display: inline-flex; align-items: center; gap: .4rem; margin-top: 1.2rem; padding: .35rem .75rem; border-radius: 999px; background: var(--teal-100); color: var(--teal-800); font-size: .78rem; font-weight: 850; }
</style>
