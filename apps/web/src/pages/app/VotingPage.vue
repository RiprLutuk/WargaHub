<script setup lang="ts">
import { AlertCircle, CheckCircle2, Clock, Vote } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import { useResource } from '../../composables/useResource';
import { api, ApiClientError } from '../../lib/api';
import { formatDateTime } from '../../lib/format';

interface PollOption {
  id: string;
  label: string;
  voteCount: number;
}

interface PollView {
  id: string;
  title: string;
  description: string;
  votingType: string;
  startsAt: string;
  endsAt: string;
  status: string;
  hasVoted?: boolean;
  selectedOptionId?: string | null;
  totalVotes?: number;
  options: PollOption[];
}

const polls = useResource(() => api.get<PollView[]>('/polls'));
const selectedPoll = ref<PollView | null>(null);
const chosenOptionId = ref('');
const busy = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

function selectPoll(item: PollView) {
  selectedPoll.value = item;
  chosenOptionId.value = item.selectedOptionId ?? item.options[0]?.id ?? '';
  errorMsg.value = '';
  successMsg.value = '';
}

async function submitVote() {
  if (!selectedPoll.value || !chosenOptionId.value) return;
  busy.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    await api.post(`/polls/${selectedPoll.value.id}/vote`, {
      optionId: chosenOptionId.value,
    });
    successMsg.value = 'Suara Anda berhasil direkam dalam musyawarah warga secara transparan.';
    selectedPoll.value.hasVoted = true;
    selectedPoll.value.selectedOptionId = chosenOptionId.value;
    await polls.reload();
  } catch (cause) {
    errorMsg.value = cause instanceof ApiClientError || cause instanceof Error ? cause.message : 'Gagal merekam suara.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="portal-page">
    <header class="portal-page-heading">
      <div>
        <span class="eyebrow">Demokrasi Lingkungan Transparan</span>
        <h1>Musyawarah & polling</h1>
        <p>Berikan suara dan pandangan Anda untuk pengambilan keputusan bersama secara adil dan terhitung.</p>
      </div>
    </header>

    <div class="notice">
      <Vote :size="20" />
      <span>Setiap rumah tangga / warga memiliki hak suara yang setara. Hasil perolehan suara ditampilkan secara terbuka.</span>
    </div>

    <StatePanel v-if="polls.loading.value" state="loading" />
    <StatePanel v-else-if="polls.error.value" state="error" :message="polls.error.value" @retry="polls.reload" />
    <EmptyState v-else-if="!polls.data.value?.length" title="Belum ada musyawarah aktif" message="Pengurus belum membuka agenda polling atau pengambilan keputusan baru saat ini." />

    <div v-else class="poll-grid">
      <article v-for="item in polls.data.value" :key="item.id" class="card poll-card">
        <div class="poll-header">
          <span class="poll-icon"><Vote :size="22" /></span>
          <div>
            <span class="eyebrow">Batas akhir: {{ formatDateTime(item.endsAt) }}</span>
            <h2>{{ item.title }}</h2>
          </div>
          <StatusBadge :status="item.status === 'PUBLISHED' ? 'TERJADWAL' : item.status" />
        </div>

        <p class="poll-desc">{{ item.description }}</p>

        <!-- Vote progress visual bars -->
        <div class="options-progress">
          <div v-for="opt in item.options" :key="opt.id" class="opt-row">
            <div class="opt-label">
              <span>{{ opt.label }}</span>
              <strong>{{ opt.voteCount ?? 0 }} suara</strong>
            </div>
            <div class="opt-bar">
              <i :style="{ width: `${item.totalVotes ? ((opt.voteCount / item.totalVotes) * 100) : 0}%` }" />
            </div>
          </div>
        </div>

        <div class="poll-footer">
          <span v-if="item.hasVoted" class="voted-chip"><CheckCircle2 :size="15" /> Anda sudah memilih</span>
          <button v-else class="button button-sm" type="button" @click="selectPoll(item)">Berikan Suara</button>
        </div>
      </article>
    </div>

    <!-- Vote Input Drawer Modal -->
    <div v-if="selectedPoll" class="modal-overlay" role="dialog" aria-modal="true">
      <div class="vote-modal-card">
        <div class="modal-header">
          <div>
            <span class="eyebrow">Musyawarah Warga</span>
            <h2>{{ selectedPoll.title }}</h2>
          </div>
          <button type="button" class="close-btn" aria-label="Tutup modal" @click="selectedPoll = null">×</button>
        </div>

        <div v-if="successMsg" class="notice" role="status"><CheckCircle2 :size="18" /> {{ successMsg }}</div>
        <div v-if="errorMsg" class="notice notice-error" role="alert"><AlertCircle :size="18" /> {{ errorMsg }}</div>

        <form v-if="!selectedPoll.hasVoted" class="form-grid" @submit.prevent="submitVote">
          <p>{{ selectedPoll.description }}</p>

          <fieldset class="options-select">
            <legend class="sr-only">Pilih salah satu opsi</legend>
            <label v-for="opt in selectedPoll.options" :key="opt.id" class="opt-choice">
              <input v-model="chosenOptionId" type="radio" name="poll-opt" :value="opt.id" required />
              <span><strong>{{ opt.label }}</strong></span>
            </label>
          </fieldset>

          <div class="form-actions">
            <button class="button" type="submit" :disabled="busy || !chosenOptionId">{{ busy ? 'Mengirim…' : 'Kirim Suara Anda' }}</button>
            <button class="button button-secondary" type="button" @click="selectedPoll = null">Batal</button>
          </div>
        </form>

        <div v-else class="voted-summary">
          <p>Terima kasih atas partisipasi Anda dalam musyawarah ini.</p>
          <button class="button button-secondary" type="button" @click="selectedPoll = null">Selesai</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.portal-page { display: grid; max-width: var(--content); gap: 1.2rem; margin-inline: auto; }
.portal-page-heading h1 { margin-bottom: .45rem; font-size: clamp(2rem, 4.5vw, 3rem); }
.portal-page-heading p { max-width: 46rem; margin: 0; color: var(--ink-650); }
.poll-grid { display: grid; gap: 1rem; }
.poll-card { display: grid; gap: 1rem; padding: 1.3rem; }
.poll-header { display: flex; align-items: flex-start; gap: 1rem; }
.poll-icon { display: grid; width: 2.9rem; height: 2.9rem; flex: none; place-items: center; border-radius: .85rem; background: var(--teal-100); color: var(--teal-700); }
.poll-header h2 { margin: 0; font-size: 1.2rem; }
.poll-desc { margin: 0; color: var(--ink-650); font-size: .88rem; line-height: 1.45; }
.options-progress { display: grid; gap: .75rem; padding: .9rem; border-radius: var(--radius-md); background: var(--cream-50); }
.opt-row { display: grid; gap: .3rem; }
.opt-label { display: flex; justify-content: space-between; font-size: .8rem; font-weight: 750; }
.opt-bar { height: .5rem; overflow: hidden; border-radius: 999px; background: var(--cream-100); }
.opt-bar i { display: block; height: 100%; border-radius: inherit; background: var(--teal-600); transition: width .3s; }
.poll-footer { display: flex; justify-content: flex-end; }
.voted-chip { display: inline-flex; align-items: center; gap: .35rem; color: var(--teal-700); font-size: .8rem; font-weight: 800; }
.modal-overlay { position: fixed; z-index: 50; inset: 0; display: grid; place-items: center; padding: 1rem; background: rgba(16, 43, 39, 0.4); backdrop-filter: blur(4px); }
.vote-modal-card { width: min(100%, 34rem); padding: 1.5rem; border-radius: var(--radius-lg); background: var(--paper); box-shadow: var(--shadow-lg); }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
.modal-header h2 { margin: .2rem 0; font-size: 1.3rem; }
.close-btn { font-size: 1.5rem; border: 0; background: transparent; cursor: pointer; }
.options-select { display: grid; gap: .6rem; border: 0; padding: 0; margin-block: .8rem; }
.opt-choice input { position: absolute; opacity: 0; }
.opt-choice span { display: flex; align-items: center; min-height: 3.2rem; padding: .8rem; border: 1px solid var(--line); border-radius: .75rem; background: white; cursor: pointer; }
.opt-choice input:checked + span { border-color: var(--teal-700); background: var(--teal-100); color: var(--teal-800); box-shadow: 0 0 0 2px var(--teal-100); }
</style>
