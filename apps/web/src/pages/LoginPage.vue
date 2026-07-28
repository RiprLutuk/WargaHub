<script setup lang="ts">
import { ArrowLeft, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-vue-next';
import { computed, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import BrandMark from '../components/BrandMark.vue';
import { ApiClientError } from '../lib/api';
import { useSessionStore } from '../stores/session';

const session = useSessionStore();
const router = useRouter();
const route = useRoute();
const form = reactive({ email: '', password: '' });
const showPassword = ref(false);
const error = ref('');
const showDemoCredentials = import.meta.env.VITE_SHOW_DEMO_CREDENTIALS === 'true';
const invitationAccepted = computed(() => route.query.invitation === 'accepted');
const passwordReset = computed(() => route.query.password === 'reset');

async function submit(): Promise<void> {
  error.value = '';
  try {
    const user = await session.login(form.email, form.password);
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : undefined;
    await router.push(redirect ?? (user.permissions.includes('resident.read') ? '/admin' : '/app'));
  } catch (cause) {
    error.value = cause instanceof ApiClientError || cause instanceof Error
      ? cause.message
      : 'Email atau kata sandi belum benar.';
  }
}

function fillDemo(kind: 'resident' | 'admin'): void {
  form.email = kind === 'admin' ? 'admin@demo.wargahub.id' : 'warga@demo.wargahub.id';
  form.password = 'WargaHub123!';
}
</script>

<template>
  <main id="konten-utama" class="login-page">
    <section class="login-story" aria-labelledby="story-title">
      <RouterLink class="back-link" to="/"><ArrowLeft :size="17" /> Kembali ke situs publik</RouterLink>
      <div class="story-content">
        <BrandMark inverse />
        <p class="story-quote" id="story-title">“Semua warga dapat berkontribusi dengan cara yang berbeda, transparan, dan sesuai kapasitasnya.”</p>
        <div class="privacy-point"><ShieldCheck :size="20" aria-hidden="true" /><span><strong>Portal privat</strong><small>Tagihan dan data keluarga hanya terlihat oleh pihak yang berizin.</small></span></div>
      </div>
      <span class="story-foot">Dibangun untuk lingkungan yang lebih manusiawi.</span>
    </section>

    <section class="login-panel" aria-labelledby="login-heading">
      <div class="login-box">
        <span class="eyebrow">Portal warga & pengurus</span>
        <h1 id="login-heading">Selamat datang kembali</h1>
        <p class="muted">Masuk dengan akun terverifikasi pengurus lingkungan.</p>
        <div v-if="invitationAccepted" class="notice" role="status">Akun berhasil diaktifkan. Silakan masuk dengan kata sandi baru Anda.</div>
        <div v-if="passwordReset" class="notice" role="status">Kata sandi berhasil diperbarui. Semua sesi lama telah diakhiri.</div>
        <div v-if="error" class="notice notice-error" role="alert">{{ error }}</div>
        <form class="form-grid" @submit.prevent="submit">
          <div class="field"><label for="login-email">Alamat email</label><input id="login-email" v-model.trim="form.email" type="email" autocomplete="username" placeholder="nama@email.com" required /></div>
          <div class="field"><label for="login-password">Kata sandi</label><div class="password-field"><LockKeyhole :size="18" aria-hidden="true" /><input id="login-password" v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" minlength="8" required /><button type="button" :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="18" /><Eye v-else :size="18" /></button></div></div>
          <div class="login-options"><label><input type="checkbox" /> Ingat perangkat ini</label><RouterLink to="/forgot-password">Lupa kata sandi?</RouterLink></div>
          <button class="button login-submit" type="submit" :disabled="session.loading"><span v-if="session.loading" class="button-spinner" aria-hidden="true" />{{ session.loading ? 'Sedang masuk…' : 'Masuk ke WargaHub' }}</button>
        </form>
        <div v-if="showDemoCredentials" class="demo-access"><span>Akun instalasi demo</span><div><button type="button" @click="fillDemo('resident')">Isi akun warga demo</button><button type="button" @click="fillDemo('admin')">Isi akun admin demo</button></div><small>Login tetap diverifikasi oleh API; tombol ini hanya mengisi kredensial instalasi demo.</small></div>
        <p id="bantuan-login" class="login-help">Belum memiliki akses? Hubungi sekretaris atau admin lingkungan Anda.</p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.login-page { display: grid; min-height: 100vh; grid-template-columns: minmax(0, 1.45fr) minmax(28rem, .85fr); background: #ffffff; }
.login-story { position: relative; display: flex; min-height: 100vh; flex-direction: column; justify-content: space-between; overflow: hidden; padding: clamp(1.5rem, 4vw, 3.5rem); background: linear-gradient(150deg, var(--ink-950) 0%, var(--teal-800) 100%); color: white; }
.login-story::after { position: absolute; right: -11rem; bottom: -13rem; width: 29rem; height: 29rem; border: 1px solid rgb(255 255 255 / .1); border-radius: 50%; content: ''; }
.back-link { position: relative; z-index: 1; display: inline-flex; width: fit-content; min-height: 2.75rem; align-items: center; gap: .4rem; color: rgb(255 255 255 / .78); font-size: .85rem; font-weight: 700; text-decoration: none; }
.story-content { position: relative; z-index: 1; max-width: 28rem; }
.story-quote { max-width: 25rem; margin: 2.5rem 0; font-family: var(--font-display); font-size: clamp(1.55rem, 2.2vw, 2.2rem); line-height: 1.16; letter-spacing: -.01em; }
.privacy-point { display: flex; gap: .7rem; max-width: 28rem; padding: .8rem .9rem; border: 1px solid rgb(255 255 255 / .14); border-radius: var(--radius-md); background: rgb(255 255 255 / .07); }
.privacy-point > svg { flex: none; color: var(--amber-500); }
.privacy-point span { display: grid; }
.privacy-point small { margin-top: .2rem; color: rgb(255 255 255 / .65); }
.story-foot { position: relative; z-index: 1; color: rgb(255 255 255 / .5); font-size: .78rem; }
.login-panel { display: grid; min-height: 100vh; place-items: center; padding: clamp(1.5rem, 5vw, 4rem); border-left: 1px solid var(--line); }
.login-box { width: min(100%, 26rem); }
.login-box h1 { margin-bottom: .55rem; font-family: var(--font-display); font-size: clamp(1.9rem, 3.5vw, 2.5rem); letter-spacing: -.01em; }
.login-box > .muted { max-width: 24rem; margin-bottom: 1.25rem; }
.login-box .notice { margin-bottom: 1rem; }
.password-field { display: flex; align-items: center; gap: .5rem; padding-left: .75rem; border: 1px solid var(--line-strong); border-radius: .72rem; color: var(--ink-500); }
.password-field:focus-within { border-color: var(--teal-600); box-shadow: 0 0 0 3px var(--teal-100); }
.password-field input { min-width: 0; border: 0; box-shadow: none !important; outline: 0; }
.password-field button { display: grid; width: 2.75rem; height: 2.75rem; flex: none; place-items: center; border: 0; background: transparent; color: var(--ink-650); cursor: pointer; }
.login-options { display: flex; justify-content: space-between; gap: 1rem; font-size: .8rem; }
.login-options label { display: flex; align-items: center; gap: .35rem; }
.login-options input { width: 1rem; height: 1rem; }
.login-submit { width: 100%; }
.button-spinner { width: 1rem; height: 1rem; border: 2px solid rgb(255 255 255 / .4); border-top-color: white; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(1turn); } }
.demo-access { display: grid; gap: .55rem; margin-top: 1.3rem; padding: .85rem; border: 1px dashed var(--line-strong); border-radius: var(--radius-md); background: #fbfcfb; }
.demo-access > span { color: var(--ink-800); font-size: .78rem; font-weight: 800; }
.demo-access > div { display: flex; flex-wrap: wrap; gap: .5rem; }
.demo-access button { min-height: 2.5rem; padding: .45rem .65rem; border: 1px solid var(--line); border-radius: .6rem; background: white; color: var(--teal-700); font-size: .76rem; font-weight: 750; cursor: pointer; }
.demo-access small, .login-help { color: var(--ink-650); font-size: .73rem; }
.login-help { margin: 1.3rem 0 0; text-align: center; }
@media (max-width: 850px) { .login-page { grid-template-columns: 1fr; } .login-story { min-height: auto; padding-bottom: 1.5rem; } .story-content { margin-top: 2rem; } .story-quote { max-width: 22rem; margin-block: 1.4rem; font-size: 1.45rem; } .privacy-point, .story-foot { display: none; } .login-panel { min-height: auto; padding-block: 2.5rem; border-left: 0; } }
@media (max-width: 480px) { .login-panel { padding-inline: 1rem; } .login-options { align-items: flex-start; flex-direction: column; } }
</style>
