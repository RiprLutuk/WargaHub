<script setup lang="ts">
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-vue-next';
import { reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import BrandMark from '../components/BrandMark.vue';
import { api, ApiClientError } from '../lib/api';
import { consumeOneTimeToken } from '../lib/one-time-token';

const route = useRoute();
const router = useRouter();
const token = ref(consumeOneTimeToken(route.query.token, route.hash));
const form = reactive({ password: '', confirmation: '' });
const showPassword = ref(false);
const busy = ref(false);
const error = ref('');

function passwordProblem(): string {
  if (form.password.length < 12) return 'Kata sandi harus terdiri dari minimal 12 karakter.';
  if (!/[a-z]/.test(form.password) || !/[A-Z]/.test(form.password) || !/\d/.test(form.password)) return 'Gunakan huruf besar, huruf kecil, dan angka.';
  if (form.password !== form.confirmation) return 'Konfirmasi kata sandi belum sama.';
  return '';
}

async function submit(): Promise<void> {
  error.value = '';
  if (token.value.length < 32) { error.value = 'Tautan pemulihan tidak valid atau tidak lengkap.'; return; }
  const problem = passwordProblem();
  if (problem) { error.value = problem; return; }
  busy.value = true;
  try {
    await api.post('/auth/reset-password', { token: token.value, password: form.password });
    await router.push({ path: '/login', query: { password: 'reset' } });
  } catch (cause) {
    error.value = cause instanceof ApiClientError || cause instanceof Error
      ? cause.message
      : 'Kata sandi belum dapat diperbarui.';
  } finally { busy.value = false; }
}
</script>

<template>
  <main id="konten-utama" class="reset-page"><section class="reset-card" aria-labelledby="reset-heading"><RouterLink class="brand-link" to="/" aria-label="WargaHub, kembali ke beranda"><BrandMark /></RouterLink><span class="eyebrow">Pemulihan akses</span><h1 id="reset-heading">Atur kata sandi baru</h1><p class="muted">Setelah berhasil, semua sesi lama akan diakhiri untuk menjaga keamanan akun.</p><div v-if="!token" class="notice notice-error" role="alert">Tautan pemulihan tidak memuat token.</div><div v-if="error" class="notice notice-error" role="alert">{{ error }}</div><form class="form-grid" novalidate @submit.prevent="submit"><div class="field"><label for="reset-password">Kata sandi baru</label><div class="password-field"><LockKeyhole :size="18" aria-hidden="true"/><input id="reset-password" v-model="form.password" :type="showPassword?'text':'password'" autocomplete="new-password" minlength="12" required aria-describedby="reset-password-help"/><button type="button" :aria-label="showPassword?'Sembunyikan kata sandi':'Tampilkan kata sandi'" @click="showPassword=!showPassword"><EyeOff v-if="showPassword" :size="18"/><Eye v-else :size="18"/></button></div><small id="reset-password-help">Minimal 12 karakter dengan huruf besar, huruf kecil, dan angka.</small></div><div class="field"><label for="reset-password-confirmation">Ulangi kata sandi</label><input id="reset-password-confirmation" v-model="form.confirmation" type="password" autocomplete="new-password" minlength="12" required/></div><div class="privacy-note"><ShieldCheck :size="18" aria-hidden="true"/>Tautan hanya dapat dipakai satu kali.</div><button class="button" type="submit" :disabled="busy||!token">{{ busy?'Memperbarui…':'Perbarui kata sandi' }}</button></form></section></main>
</template>

<style scoped>
.reset-page{display:grid;min-height:100vh;place-items:center;padding:clamp(1rem,5vw,3rem);background:radial-gradient(circle at 80% 10%,var(--teal-100),transparent 24rem),var(--cream-50)}.reset-card{width:min(100%,34rem);padding:clamp(1.25rem,4vw,2.25rem);border:1px solid var(--line);border-radius:var(--radius-xl);background:var(--paper);box-shadow:var(--shadow-lg)}.brand-link{display:inline-flex;margin-bottom:2.5rem;text-decoration:none}h1{margin:.35rem 0 .7rem;font-family:var(--font-display);font-size:clamp(2rem,6vw,3rem)}.reset-card>.muted{margin-bottom:1.4rem}.notice{margin-bottom:1rem}.password-field{display:flex;align-items:center;gap:.5rem;padding-left:.75rem;border:1px solid var(--line-strong);border-radius:.72rem;color:var(--ink-500)}.password-field:focus-within{border-color:var(--teal-600);box-shadow:0 0 0 3px var(--teal-100)}.password-field input{min-width:0;border:0;box-shadow:none;outline:0}.password-field button{display:grid;width:2.75rem;height:2.75rem;flex:none;place-items:center;border:0;background:transparent;color:var(--ink-650);cursor:pointer}.field small{color:var(--ink-650);font-size:.75rem}.privacy-note{display:flex;align-items:center;gap:.5rem;padding:.75rem;border-radius:var(--radius-md);background:var(--teal-50);color:var(--ink-650);font-size:.78rem}.button{width:100%}
</style>
