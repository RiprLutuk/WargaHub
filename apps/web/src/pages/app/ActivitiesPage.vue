<script setup lang="ts">
import { AlertCircle, CheckCircle2, Clock3, HandHeart, MapPin } from 'lucide-vue-next';
import { reactive, ref } from 'vue';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import { useResource } from '../../composables/useResource';
import { api, ApiClientError } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { adaptActivities, type ActivityView } from '../../lib/view-models';

const activities = useResource(async () => adaptActivities(await api.get<unknown>('/activities')));
const selected = ref<ActivityView | null>(null);
const saved = ref('');
const errorMsg = ref('');
const busy = ref(false);
const form = reactive({ contributionType: 'HADIR', quantity: 1, note: '' });
const contributions = [
  ['HADIR', 'Hadir & tenaga'], ['KONSUMSI', 'Konsumsi'], ['ALAT', 'Pinjamkan alat'], ['DANA', 'Dana'],
  ['ADMINISTRASI', 'Administrasi'], ['DOKUMENTASI', 'Dokumentasi'], ['JARAK_JAUH', 'Bantuan jarak jauh'], ['DISPENSASI', 'Ajukan dispensasi'],
] as const;

function selectActivity(item: ActivityView) {
  selected.value = item;
  saved.value = '';
  errorMsg.value = '';
  form.contributionType = 'HADIR';
  form.note = '';
}

async function saveContribution() {
  if (!selected.value) return;
  busy.value = true;
  errorMsg.value = '';
  try {
    await api.post(`/activities/${selected.value.id}/responses`, { ...form });
    saved.value = 'Pilihan kontribusi berhasil disimpan. Koordinator akan menerima pemberitahuan ini.';
    await activities.reload();
  } catch (cause) {
    errorMsg.value = cause instanceof ApiClientError || cause instanceof Error ? cause.message : 'Gagal menyimpan pilihan kontribusi.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="portal-page">
    <header class="portal-page-heading">
      <div>
        <span class="eyebrow">Kontribusi tidak harus seragam</span>
        <h1>Kegiatan warga</h1>
        <p>Pilih cara berkontribusi yang sesuai waktu, tenaga, keahlian, dan kondisi Anda.</p>
      </div>
    </header>

    <div class="notice">
      <HandHeart :size="20" />
      <span>Tidak dapat hadir bukan berarti tidak peduli. Anda dapat membantu melalui konsumsi, alat, administrasi, dokumentasi, dana, atau dispensasi.</span>
    </div>

    <StatePanel v-if="activities.loading.value" state="loading" />
    <StatePanel v-else-if="activities.error.value" state="error" :message="activities.error.value" @retry="activities.reload" />
    <EmptyState v-else-if="!activities.data.value?.length" title="Belum ada kegiatan" />
    <div v-else class="activity-grid">
      <article v-for="item in activities.data.value" :key="item.id" class="card activity-card">
        <div class="activity-date">
          <strong>{{ new Intl.DateTimeFormat('id-ID', { day: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date(item.startsAt)) }}</strong>
          <span>{{ new Intl.DateTimeFormat('id-ID', { month: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(item.startsAt)) }}</span>
        </div>
        <div class="activity-copy">
          <h2>{{ item.title }}</h2>
          <p>{{ item.description }}</p>
          <div class="activity-meta">
            <span><Clock3 :size="15" /> {{ formatDateTime(item.startsAt) }}</span>
            <span><MapPin :size="15" /> {{ item.location }}</span>
          </div>
          <div class="need-row">
            <span>{{ item.remainingNeeds === null ? 'Buka detail untuk melihat kebutuhan' : `${item.remainingNeeds} kebutuhan belum terpenuhi` }}</span>
            <span>Kontribusi Anda: <strong>{{ item.contribution }}</strong></span>
          </div>
        </div>
        <button v-if="item.contribution === 'Belum memilih'" class="button button-secondary" type="button" @click="selectActivity(item)">Pilih kontribusi</button>
        <span v-else class="contribution-status"><CheckCircle2 :size="16" /> Sudah memilih: <strong>{{ item.contribution }}</strong></span>
      </article>
    </div>

    <div v-if="selected" class="contribution-modal" role="dialog" aria-modal="true" aria-labelledby="contribution-heading" @click.self="selected = null">
    <section class="card contribution-panel">
      <div>
        <span class="eyebrow">{{ selected.title }}</span>
        <h2 id="contribution-heading">Bagaimana Anda ingin berkontribusi?</h2>
        <p>Alasan dispensasi bersifat privat dan tidak ditampilkan kepada warga lain.</p>
      </div>

      <div v-if="saved" class="notice" role="status"><CheckCircle2 :size="19" /> {{ saved }}</div>
      <div v-if="errorMsg" class="notice notice-error" role="alert"><AlertCircle :size="19" /> {{ errorMsg }}</div>

      <form v-if="!saved" class="form-grid" @submit.prevent="saveContribution">
        <fieldset class="contribution-options">
          <legend class="sr-only">Bentuk kontribusi</legend>
          <label v-for="item in contributions" :key="item[0]">
            <input v-model="form.contributionType" type="radio" :value="item[0]" />
            <span>{{ item[1] }}</span>
          </label>
        </fieldset>
        <div class="field">
          <label for="contribution-note">Catatan (opsional)</label>
          <textarea id="contribution-note" v-model="form.note" rows="3" placeholder="Sampaikan detail yang membantu koordinator…" />
        </div>
        <div class="form-actions">
          <button class="button" type="submit" :disabled="busy">{{ busy ? 'Menyimpan…' : 'Simpan pilihan' }}</button>
          <button class="button button-secondary" type="button" @click="selected = null">Batal</button>
        </div>
      </form>
    </section>
    </div>
  </div>
</template>

<style scoped>
.portal-page { display: grid; max-width: var(--content); gap: 1.2rem; margin-inline: auto; }
.portal-page-heading h1 { margin-bottom: .45rem; font-size: clamp(2rem,4.5vw,3rem); }
.portal-page-heading p { max-width: 44rem; margin: 0; color: var(--ink-650); }
.activity-grid { display: grid; gap: .8rem; }
.activity-card { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 1rem; padding: 1rem; }
.activity-date { display: grid; width: 3.8rem; padding: .5rem; border-radius: .8rem; background: var(--teal-700); color: white; text-align: center; }
.activity-date strong { font-family: var(--font-display); font-size: 1.5rem; line-height: 1; }
.activity-date span { font-size: .68rem; text-transform: uppercase; }
.activity-copy h2 { margin: 0 0 .3rem; font-size: 1.15rem; }
.activity-copy p { margin-bottom: .45rem; color: var(--ink-650); font-size: .84rem; }
.activity-meta,.need-row { display: flex; flex-wrap: wrap; gap: .45rem 1rem; color: var(--ink-650); font-size: .74rem; }
.activity-meta span { display: inline-flex; align-items: center; gap: .25rem; }
.need-row { margin-top: .55rem; padding-top: .55rem; border-top: 1px solid var(--line); }
.need-row span:first-child { color: var(--amber-700); font-weight: 750; }
.contribution-panel { display: grid; gap: 1rem; padding: 1.3rem; }
.contribution-modal { position: fixed; z-index: 50; inset: 0; display: grid; place-items: center; overflow-y: auto; padding: 1rem; background: rgb(16 43 39 / .38); backdrop-filter: blur(5px); }
.contribution-modal .contribution-panel { width: min(100%, 48rem); max-height: 92vh; overflow-y: auto; box-shadow: var(--shadow-lg); }
.contribution-panel > div:first-child p { color: var(--ink-650); }
.contribution-options { display: grid; grid-template-columns: repeat(4,1fr); gap: .6rem; padding: 0; border: 0; }
.contribution-options label { position: relative; }
.contribution-options input { position: absolute; opacity: 0; }
.contribution-options span { display: grid; min-height: 3.5rem; place-items: center; padding: .6rem; border: 1px solid var(--line); border-radius: .7rem; background: white; font-size: .76rem; font-weight: 750; text-align: center; cursor: pointer; }
.contribution-options input:checked + span { border-color: var(--teal-700); background: var(--teal-100); color: var(--teal-800); box-shadow: 0 0 0 2px var(--teal-100); }
.notice-error { background: var(--coral-100); color: var(--coral-700); }
.contribution-status { display: inline-flex; align-items: center; justify-content: center; gap: .35rem; color: var(--teal-700); font-size: .8rem; font-weight: 700; text-align: right; }
@media(max-width:800px){.activity-card{grid-template-columns:auto 1fr}.activity-card>.button{grid-column:1/-1}.contribution-options{grid-template-columns:1fr 1fr}}
@media(max-width:480px){.contribution-options{grid-template-columns:1fr}.contribution-status { grid-column: 1 / -1; justify-content: flex-start; text-align: left; }.contribution-modal { align-items: end; padding: .5rem; }.contribution-modal .contribution-panel { max-height: 94vh; border-radius: 1.1rem 1.1rem .8rem .8rem; }}
</style>
