<script setup lang="ts">
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-vue-next';
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import BrandMark from '../components/BrandMark.vue';
import { api, ApiClientError } from '../lib/api';

const email = ref('');
const busy = ref(false);
const sent = ref(false);
const error = ref('');

async function submit(): Promise<void> {
  error.value = '';
  busy.value = true;
  try {
    await api.post('/auth/forgot-password', { email: email.value });
    sent.value = true;
  } catch (cause) {
    error.value = cause instanceof ApiClientError || cause instanceof Error
      ? cause.message
      : 'Permintaan pemulihan belum dapat dikirim.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main id="konten-utama" class="recovery-page">
    <section class="recovery-card" aria-labelledby="recovery-heading">
      <RouterLink class="brand-link" to="/" aria-label="WargaHub, kembali ke beranda"><BrandMark /></RouterLink>
      <span class="eyebrow">Pemulihan akses</span><h1 id="recovery-heading">Lupa kata sandi?</h1>
      <p class="muted">Masukkan email akun Anda. Demi privasi, respons yang ditampilkan selalu sama.</p>
      <div v-if="sent" class="notice" role="status"><Mail :size="20" aria-hidden="true" /><span><strong>Periksa email Anda</strong><br />Jika akun terdaftar, petunjuk pemulihan akan dikirim melalui email.</span></div>
      <div v-if="error" class="notice notice-error" role="alert">{{ error }}</div>
      <form v-if="!sent" class="form-grid" @submit.prevent="submit"><div class="field"><label for="recovery-email">Alamat email</label><input id="recovery-email" v-model.trim="email" type="email" autocomplete="email" required /></div><div class="privacy-note"><ShieldCheck :size="18" aria-hidden="true" />Tautan pemulihan hanya berlaku 30 menit dan akan mengakhiri sesi lama.</div><button class="button" type="submit" :disabled="busy">{{ busy ? 'Mengirim…' : 'Kirim tautan pemulihan' }}</button></form>
      <RouterLink class="back-link" to="/login"><ArrowLeft :size="16" aria-hidden="true" /> Kembali ke halaman masuk</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.recovery-page{display:grid;min-height:100vh;place-items:center;padding:clamp(1rem,5vw,3rem);background:radial-gradient(circle at 20% 10%,var(--amber-100),transparent 22rem),var(--cream-50)}.recovery-card{width:min(100%,32rem);padding:clamp(1.25rem,4vw,2.25rem);border:1px solid var(--line);border-radius:var(--radius-xl);background:var(--paper);box-shadow:var(--shadow-lg)}.brand-link{display:inline-flex;margin-bottom:2.5rem;text-decoration:none}h1{margin:.35rem 0 .7rem;font-family:var(--font-display);font-size:clamp(2rem,6vw,3rem)}.recovery-card>.muted{margin-bottom:1.4rem}.notice{margin-bottom:1rem}.privacy-note{display:flex;align-items:center;gap:.5rem;padding:.75rem;border-radius:var(--radius-md);background:var(--teal-50);color:var(--ink-650);font-size:.78rem}.button{width:100%}.back-link{display:flex;align-items:center;justify-content:center;gap:.35rem;margin-top:1.2rem;font-size:.8rem;font-weight:750;text-decoration:none}
</style>
