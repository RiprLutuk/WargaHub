<script setup lang="ts">
import { CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-vue-next';
import { reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import BrandMark from '../components/BrandMark.vue';
import { api, ApiClientError } from '../lib/api';
import { consumeOneTimeToken } from '../lib/one-time-token';

const route = useRoute();
const router = useRouter();
const form = reactive({ password: '', confirmation: '' });
const showPassword = ref(false);
const busy = ref(false);
const error = ref('');
const token = ref(consumeOneTimeToken(route.query.token, route.hash));

function passwordProblem(): string {
  if (form.password.length < 12) return 'Kata sandi harus terdiri dari minimal 12 karakter.';
  if (!/[a-z]/.test(form.password)) return 'Tambahkan setidaknya satu huruf kecil.';
  if (!/[A-Z]/.test(form.password)) return 'Tambahkan setidaknya satu huruf besar.';
  if (!/\d/.test(form.password)) return 'Tambahkan setidaknya satu angka.';
  if (form.password !== form.confirmation) return 'Konfirmasi kata sandi belum sama.';
  return '';
}

async function submit(): Promise<void> {
  error.value = '';
  if (token.value.length < 32) {
    error.value = 'Tautan undangan tidak valid atau tidak lengkap.';
    return;
  }
  const problem = passwordProblem();
  if (problem) {
    error.value = problem;
    return;
  }
  busy.value = true;
  try {
    await api.post('/auth/accept-invitation', { token: token.value, password: form.password });
    await router.push({ path: '/login', query: { invitation: 'accepted' } });
  } catch (cause) {
    error.value = cause instanceof ApiClientError || cause instanceof Error
      ? cause.message
      : 'Undangan belum dapat diaktifkan. Silakan coba lagi.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main id="konten-utama" class="invitation-page">
    <section class="invitation-card" aria-labelledby="invitation-heading">
      <RouterLink class="brand-link" to="/" aria-label="WargaHub, kembali ke beranda"><BrandMark /></RouterLink>
      <span class="eyebrow">Aktivasi akun warga</span>
      <h1 id="invitation-heading">Buat kata sandi Anda</h1>
      <p class="muted">Selesaikan undangan ini untuk mengaktifkan akun. Tautan hanya dapat digunakan satu kali.</p>

      <div v-if="!token" class="notice notice-error" role="alert">Tautan undangan tidak memuat token. Minta pengurus mengirim undangan baru.</div>
      <div v-if="error" class="notice notice-error" role="alert">{{ error }}</div>

      <form class="form-grid" novalidate @submit.prevent="submit">
        <div class="field">
          <label for="invitation-password">Kata sandi baru</label>
          <div class="password-field"><LockKeyhole :size="18" aria-hidden="true" /><input id="invitation-password" v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" minlength="12" required aria-describedby="password-help" /><button type="button" :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="18" /><Eye v-else :size="18" /></button></div>
          <small id="password-help">Minimal 12 karakter dengan huruf besar, huruf kecil, dan angka.</small>
        </div>
        <div class="field"><label for="invitation-password-confirmation">Ulangi kata sandi</label><input id="invitation-password-confirmation" v-model="form.confirmation" type="password" autocomplete="new-password" minlength="12" required /></div>
        <div class="privacy-note"><ShieldCheck :size="20" aria-hidden="true" /><span><strong>Privasi sejak awal</strong><small>Aktivasi mencatat persetujuan privasi akun. Kata sandi tidak pernah dikirim melalui email.</small></span></div>
        <button class="button" type="submit" :disabled="busy || !token"><span v-if="busy" class="button-spinner" aria-hidden="true" />{{ busy ? 'Mengaktifkan akun…' : 'Aktifkan akun' }}</button>
      </form>
      <p class="login-link"><CheckCircle2 :size="16" aria-hidden="true" /> Sudah mengaktifkan akun? <RouterLink to="/login">Masuk ke WargaHub</RouterLink></p>
    </section>
  </main>
</template>

<style scoped>
.invitation-page { display: grid; min-height: 100vh; place-items: center; padding: clamp(1rem, 5vw, 3rem); background: radial-gradient(circle at 80% 10%, var(--teal-100), transparent 24rem), var(--cream-50); }
.invitation-card { width: min(100%, 34rem); padding: clamp(1.25rem, 4vw, 2.25rem); border: 1px solid var(--line); border-radius: var(--radius-xl); background: var(--paper); box-shadow: var(--shadow-lg); }
.brand-link { display: inline-flex; margin-bottom: 2.5rem; text-decoration: none; }
h1 { margin: .35rem 0 .7rem; font-family: var(--font-display); font-size: clamp(2rem, 6vw, 3rem); }
.invitation-card > .muted { margin-bottom: 1.4rem; }
.notice { margin-bottom: 1rem; }
.password-field { display: flex; align-items: center; gap: .5rem; padding-left: .75rem; border: 1px solid var(--line-strong); border-radius: .72rem; color: var(--ink-500); }
.password-field:focus-within { border-color: var(--teal-600); box-shadow: 0 0 0 3px var(--teal-100); }
.password-field input { min-width: 0; border: 0; box-shadow: none; outline: 0; }
.password-field button { display: grid; width: 2.75rem; height: 2.75rem; flex: none; place-items: center; border: 0; background: transparent; color: var(--ink-650); cursor: pointer; }
.field small { color: var(--ink-650); font-size: .75rem; }
.privacy-note { display: flex; gap: .65rem; padding: .85rem; border: 1px solid var(--teal-100); border-radius: var(--radius-md); background: var(--teal-50); color: var(--teal-800); }
.privacy-note > svg { flex: none; }
.privacy-note span { display: grid; }
.privacy-note small { margin-top: .15rem; color: var(--ink-650); }
.button { width: 100%; }
.button-spinner { width: 1rem; height: 1rem; border: 2px solid rgb(255 255 255 / .4); border-top-color: white; border-radius: 50%; animation: spin .8s linear infinite; }
.login-link { display: flex; align-items: center; justify-content: center; gap: .35rem; margin: 1.3rem 0 0; color: var(--ink-650); font-size: .78rem; }
@keyframes spin { to { transform: rotate(1turn); } }
</style>
