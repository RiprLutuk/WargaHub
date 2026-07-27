<script setup lang="ts">
import { AlertCircle, ArrowLeftRight, CheckCircle2, Clock3, Info, MapPin, ShieldCheck } from 'lucide-vue-next';
import { computed, reactive, ref } from 'vue';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import { useResource } from '../../composables/useResource';
import { api, ApiClientError } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { adaptPatrolAssignments, type PatrolAssignmentView } from '../../lib/view-models';

const patrols = useResource(async () => adaptPatrolAssignments(await api.get<unknown>('/patrol-assignments')));
const selected = ref<PatrolAssignmentView | null>(null);
const sent = ref(false);
const busy = ref(false);
const errorMsg = ref('');

const form = reactive({
  targetAssignmentId: '',
  reason: '',
  alternative: 'SWAP',
});

const otherPatrols = computed(() => {
  return (patrols.data.value ?? []).filter((item) => item.id !== selected.value?.id);
});

function openSwap(item: PatrolAssignmentView) {
  selected.value = item;
  sent.value = false;
  errorMsg.value = '';
  form.reason = '';
  form.alternative = 'SWAP';
  form.targetAssignmentId = otherPatrols.value[0]?.id ?? '';
}

async function requestSwap() {
  if (!selected.value) return;
  busy.value = true;
  errorMsg.value = '';
  try {
    if (form.alternative === 'SWAP' && !form.targetAssignmentId) {
      errorMsg.value = 'Silakan pilih jadwal pengganti/tujuan pertukaran.';
      return;
    }
    await api.post(`/patrol-assignments/${selected.value.id}/swap-request`, {
      targetAssignmentId: form.targetAssignmentId || otherPatrols.value[0]?.id || selected.value.id,
      reason: form.reason,
    });
    sent.value = true;
    await patrols.reload();
  } catch (cause) {
    errorMsg.value = cause instanceof ApiClientError || cause instanceof Error ? cause.message : 'Gagal mengirim permintaan pertukaran.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="portal-page">
    <header class="portal-page-heading">
      <div>
        <span class="eyebrow">Jadwal yang menghormati keadaan warga</span>
        <h1>Ronda & keamanan</h1>
        <p>Jika jadwal tidak memungkinkan, Anda dapat menukar jadwal, mencari pengganti, memilih kontribusi alternatif, atau mengajukan dispensasi.</p>
      </div>
    </header>

    <div class="notice">
      <ShieldCheck :size="20" />
      <span>Alasan pribadi tidak ditampilkan kepada warga lain. Tidak ada ranking kehadiran atau daftar “paling sering absen”.</span>
    </div>

    <section>
      <div class="section-heading">
        <div>
          <h2>Jadwal Anda</h2>
          <p class="muted">Semua waktu ditampilkan dalam WIB.</p>
        </div>
      </div>
      <StatePanel v-if="patrols.loading.value" state="loading" />
      <StatePanel v-else-if="patrols.error.value" state="error" :message="patrols.error.value" @retry="patrols.reload" />
      <EmptyState v-else-if="!patrols.data.value?.length" title="Belum ada jadwal ronda" />
      <div v-else class="patrol-list">
        <article v-for="item in patrols.data.value" :key="item.id" class="card patrol-row">
          <span class="shield-icon"><ShieldCheck :size="21" /></span>
          <div>
            <span>{{ item.label }}</span>
            <h3>{{ formatDateTime(item.startsAt) }}</h3>
            <p><MapPin :size="14" /> {{ item.area }}</p>
          </div>
          <StatusBadge :status="item.status" />
          <button class="button button-secondary button-sm" type="button" @click="openSwap(item)">
            <ArrowLeftRight :size="15" /> Atur ulang
          </button>
        </article>
      </div>
    </section>

    <section v-if="selected" class="card swap-panel" aria-labelledby="swap-heading">
      <div>
        <span class="eyebrow">{{ selected.label }} · {{ formatDateTime(selected.startsAt) }}</span>
        <h2 id="swap-heading">Ajukan perubahan jadwal</h2>
      </div>

      <div v-if="sent" class="notice" role="status">
        <CheckCircle2 :size="19" />
        <span>Permintaan terkirim. Jadwal belum berubah sampai pengganti menerima dan koordinator menyetujui.</span>
      </div>

      <div v-if="errorMsg" class="notice notice-error" role="alert">
        <AlertCircle :size="19" />
        <span>{{ errorMsg }}</span>
      </div>

      <form v-if="!sent" class="form-grid" @submit.prevent="requestSwap">
        <fieldset class="swap-options">
          <legend>Pilih solusi</legend>
          <label><input v-model="form.alternative" type="radio" value="SWAP" /> Tukar dengan jadwal lain</label>
          <label><input v-model="form.alternative" type="radio" value="REPLACEMENT" /> Cari pengganti</label>
          <label><input v-model="form.alternative" type="radio" value="ALTERNATIVE" /> Kontribusi alternatif</label>
          <label><input v-model="form.alternative" type="radio" value="DISPENSATION" /> Ajukan dispensasi</label>
        </fieldset>

        <div v-if="form.alternative === 'SWAP'" class="field">
          <label for="target-schedule">Jadwal yang dituju</label>
          <select id="target-schedule" v-model="form.targetAssignmentId" required>
            <option value="" disabled>Pilih jadwal lain</option>
            <option v-for="item in otherPatrols" :key="item.id" :value="item.id">
              {{ formatDateTime(item.startsAt) }} · {{ item.area }}
            </option>
          </select>
        </div>

        <div class="field">
          <label for="swap-reason">Alasan atau catatan</label>
          <textarea id="swap-reason" v-model.trim="form.reason" minlength="5" placeholder="Tuliskan catatan singkat untuk koordinator..." required />
          <p class="field-hint">Hanya koordinator dan pihak terkait yang dapat melihat catatan ini.</p>
        </div>

        <div class="notice notice-warning">
          <Info :size="18" />
          <span>Pengiriman permintaan tidak langsung mengubah jadwal. Anda tetap bertugas sampai permintaan disetujui.</span>
        </div>

        <div class="form-actions">
          <button class="button" type="submit" :disabled="busy">{{ busy ? 'Mengirim…' : 'Kirim permintaan' }}</button>
          <button class="button button-secondary" type="button" @click="selected = null">Batal</button>
        </div>
      </form>
    </section>

    <section class="emergency-info">
      <Clock3 :size="21" />
      <div>
        <h2>Butuh bantuan keamanan sekarang?</h2>
        <p>Untuk kejadian yang sedang berlangsung, hubungi pos keamanan atau layanan darurat. Jangan menunggu respons formulir.</p>
      </div>
      <a href="tel:112">Telepon 112</a>
    </section>
  </div>
</template>

<style scoped>
.portal-page { display: grid; max-width: 78rem; gap: 1.35rem; margin-inline: auto; }
.portal-page-heading h1 { margin-bottom: .45rem; font-size: clamp(2rem,4.5vw,3rem); }
.portal-page-heading p { max-width: 48rem; margin: 0; color: var(--ink-650); }
.patrol-list { display: grid; gap: .7rem; }
.patrol-row { display: grid; grid-template-columns: auto minmax(0,1fr) auto auto; align-items: center; gap: 1rem; padding: 1rem; }
.shield-icon { display: grid; width: 2.8rem; height: 2.8rem; place-items: center; border-radius: .8rem; background: var(--teal-100); color: var(--teal-700); }
.patrol-row > div > span { color: var(--teal-700); font-size: .7rem; font-weight: 850; text-transform: uppercase; }
.patrol-row h3 { margin: .1rem 0; font-size: 1rem; }
.patrol-row p { display: flex; align-items: center; gap: .25rem; margin: 0; color: var(--ink-650); font-size: .78rem; }
.swap-panel { display: grid; gap: 1rem; padding: 1.3rem; }
.swap-options { display: grid; grid-template-columns: 1fr 1fr; gap: .55rem; padding: 0; border: 0; }
.swap-options legend { grid-column: 1/-1; margin-bottom: .3rem; font-weight: 800; }
.swap-options label { display: flex; min-height: 3.2rem; align-items: center; gap: .5rem; padding: .7rem; border: 1px solid var(--line); border-radius: .7rem; background: white; font-size: .8rem; font-weight: 700; cursor: pointer; }
.swap-options input { width: 1.05rem; height: 1.05rem; accent-color: var(--teal-700); }
.notice-error { background: var(--coral-100); color: var(--coral-700); }
.emergency-info { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 1rem; padding: 1rem; border-radius: var(--radius-md); background: var(--ink-950); color: white; }
.emergency-info > svg { color: var(--amber-500); }
.emergency-info h2 { margin-bottom: .2rem; font-size: 1rem; }
.emergency-info p { margin: 0; color: rgb(255 255 255/.65); font-size: .78rem; }
.emergency-info a { padding: .55rem .7rem; border-radius: .6rem; background: var(--amber-500); color: var(--ink-950); font-weight: 850; text-decoration: none; }
@media(max-width:700px){.patrol-row{grid-template-columns:auto 1fr}.patrol-row>.status-badge{grid-column:2}.patrol-row>.button{grid-column:1/-1}.swap-options{grid-template-columns:1fr}.swap-options legend{grid-column:auto}.emergency-info{grid-template-columns:auto 1fr}.emergency-info a{grid-column:1/-1;text-align:center}}
</style>
