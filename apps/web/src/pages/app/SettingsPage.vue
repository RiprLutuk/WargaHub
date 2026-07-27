<script setup lang="ts">
import { CheckCircle2, Home, Mail, MoonStar, ShieldCheck, User } from 'lucide-vue-next';
import { onMounted, reactive, ref } from 'vue';
import StatePanel from '../../components/StatePanel.vue';
import { api, ApiClientError } from '../../lib/api';
import { useSessionStore } from '../../stores/session';

type Digest = 'IMMEDIATE' | 'DAILY' | 'EMERGENCY_ONLY';
interface NotificationPreferences { inApp: boolean; email: boolean; quietHoursStart: string | null; quietHoursEnd: string | null; digest: Digest }

const session = useSessionStore();
const saved = ref(false);
const loading = ref(true);
const busy = ref(false);
const error = ref('');
const preferences = reactive({ email: true, inApp: true, digest: 'IMMEDIATE' as Digest, quietStart: '', quietEnd: '' });

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const value = await api.get<NotificationPreferences>('/notification-preferences');
    preferences.email = value.email;
    preferences.inApp = value.inApp;
    preferences.digest = value.digest;
    preferences.quietStart = value.quietHoursStart ?? '';
    preferences.quietEnd = value.quietHoursEnd ?? '';
  } catch (cause) {
    error.value = cause instanceof ApiClientError || cause instanceof Error ? cause.message : 'Preferensi belum dapat dimuat.';
  } finally {
    loading.value = false;
  }
}

async function save() {
  busy.value = true;
  saved.value = false;
  error.value = '';
  try {
    await api.put('/notification-preferences', {
      inApp: preferences.inApp,
      email: preferences.email,
      quietHoursStart: preferences.quietStart || null,
      quietHoursEnd: preferences.quietEnd || null,
      digest: preferences.digest,
    });
    saved.value = true;
  } catch (cause) {
    error.value = cause instanceof ApiClientError || cause instanceof Error ? cause.message : 'Preferensi belum dapat disimpan.';
  } finally {
    busy.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="portal-page">
    <header class="portal-page-heading">
      <div>
        <span class="eyebrow">Kendali & Identitas Akun</span>
        <h1>Pengaturan & profil</h1>
        <p>Pilih informasi yang berguna, waktu yang nyaman untuk notifikasi, dan periksa identitas terdaftar Anda.</p>
      </div>
    </header>

    <!-- Account Identity Summary Card -->
    <section class="card profile-card">
      <span class="avatar-box"><User :size="24" /></span>
      <div class="profile-info">
        <span class="role-badge"><ShieldCheck :size="13" /> {{ session.user?.roles?.[0] ?? 'RESIDENT' }}</span>
        <h2>{{ session.user?.name }}</h2>
        <p><Mail :size="14" /> {{ session.user?.email }}</p>

        <div class="household-tags">
          <span v-for="id in session.user?.householdIds" :key="id" class="household-chip">
            <Home :size="13" /> Unit Terdaftar: {{ id }}
          </span>
        </div>
      </div>
    </section>

    <StatePanel v-if="loading" state="loading" />
    <StatePanel v-else-if="error" state="error" :message="error" @retry="load" />

    <form v-else class="card card-body form-grid" @submit.prevent="save">
      <fieldset>
        <legend>Kanal notifikasi</legend>
        <label><input v-model="preferences.inApp" type="checkbox" /> Notifikasi di aplikasi WargaHub</label>
        <label><input v-model="preferences.email" type="checkbox" /> Pemberitahuan melalui Email</label>
        <div class="field">
          <label for="notification-digest">Frekuensi ringkasan</label>
          <select id="notification-digest" v-model="preferences.digest">
            <option value="IMMEDIATE">Segera (Langsung saat terjadi)</option>
            <option value="DAILY">Ringkasan harian</option>
            <option value="EMERGENCY_ONLY">Hanya keadaan darurat</option>
          </select>
        </div>
      </fieldset>

      <fieldset>
        <legend><MoonStar :size="18" /> Jam tenang</legend>
        <div class="two-fields">
          <div class="field"><label for="quiet-start">Waktu mulai</label><input id="quiet-start" v-model="preferences.quietStart" type="time" /></div>
          <div class="field"><label for="quiet-end">Waktu selesai</label><input id="quiet-end" v-model="preferences.quietEnd" type="time" /></div>
        </div>
        <p class="muted small">Informasi darurat dapat melewati jam tenang sesuai kebijakan keselamatan organisasi.</p>
      </fieldset>

      <div v-if="saved" class="notice" role="status"><CheckCircle2 :size="18" /> Preferensi notifikasi berhasil disimpan.</div>
      <button class="button" type="submit" :disabled="busy">{{ busy ? 'Menyimpan…' : 'Simpan pengaturan' }}</button>
    </form>
  </div>
</template>

<style scoped>
.portal-page { display: grid; max-width: 78rem; gap: 1.2rem; margin-inline: auto; }
.portal-page-heading h1 { margin-bottom: .45rem; font-size: clamp(2rem, 4.5vw, 3rem); }
.portal-page-heading p { max-width: 44rem; margin: 0; color: var(--ink-650); }
.profile-card { display: flex; align-items: center; gap: 1.2rem; padding: 1.3rem; }
.avatar-box { display: grid; width: 3.5rem; height: 3.5rem; flex: none; place-items: center; border-radius: 50%; background: var(--teal-100); color: var(--teal-700); }
.profile-info { display: grid; gap: .2rem; }
.role-badge { display: inline-flex; width: fit-content; align-items: center; gap: .3rem; padding: .15rem .5rem; border-radius: 999px; background: var(--amber-100); color: var(--amber-800); font-size: .68rem; font-weight: 850; }
.profile-info h2 { margin: 0; font-size: 1.2rem; }
.profile-info p { display: inline-flex; align-items: center; gap: .3rem; margin: 0; color: var(--ink-650); font-size: .83rem; }
.household-tags { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .4rem; }
.household-chip { display: inline-flex; align-items: center; gap: .3rem; padding: .2rem .55rem; border: 1px solid var(--line); border-radius: .5rem; background: var(--paper); color: var(--teal-700); font-size: .74rem; font-weight: 750; }
fieldset { display: grid; gap: .65rem; padding: 1rem; border: 1px solid var(--line); border-radius: var(--radius-md); }
legend { display: inline-flex; align-items: center; gap: .4rem; padding-inline: .35rem; font-weight: 850; }
fieldset > label { display: flex; align-items: center; gap: .55rem; min-height: 2.75rem; font-weight: 650; }
input[type=checkbox] { width: 1.1rem; height: 1.1rem; accent-color: var(--teal-700); }
.two-fields { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem; }
@media (max-width: 600px) { .profile-card { flex-direction: column; align-items: flex-start; } .two-fields { grid-template-columns: 1fr; } }
</style>
