<script setup lang="ts">
import { AlertCircle, CalendarClock, CheckCircle2, FileText, HardHat, MessageSquare, Receipt, RefreshCw, ShieldCheck, X } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { api, ApiClientError } from '../lib/api';
import { formatRupiah } from '../lib/format';
import { parseWaMessage, type WaParseResult } from '../lib/wa-parser';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'imported'): void }>();

const rawText = ref('');
const parsedResult = ref<WaParseResult | null>(null);
const busy = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

function parseText() {
  errorMsg.value = '';
  successMsg.value = '';
  if (!rawText.value.trim()) {
    parsedResult.value = null;
    return;
  }
  parsedResult.value = parseWaMessage(rawText.value);
}

async function commitImport() {
  if (!parsedResult.value) return;
  busy.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    let createdCount = 0;

    // 1. Create Food Donation Activity if food schedules exist
    if (parsedResult.value.foodSchedules.length > 0) {
      const firstDate = parsedResult.value.foodSchedules[0]?.date ?? '2026-07-12';
      const lastDate = parsedResult.value.foodSchedules[parsedResult.value.foodSchedules.length - 1]?.date ?? '2026-07-25';

      await api.post('/activities', {
        title: 'Sodakoh Makanan & Konsumsi Tukang',
        description: `Jadwal giliran kirim sodakoh makanan untuk pekerja/tukang (${firstDate} s/d ${lastDate}). Impor dari pengumuman.`,
        location: 'Lingkungan RT/RW',
        startsAt: `${firstDate}T07:00:00.000Z`,
        endsAt: `${lastDate}T18:00:00.000Z`,
        status: 'PUBLISHED',
      });
      createdCount++;
    }

    // 2. Create Patrol Schedules if patrol entries exist
    for (const p of parsedResult.value.patrols) {
      await api.post('/patrol-schedules', {
        title: `Ronda Malam - ${p.date}`,
        date: p.date,
        timeSlot: `${p.time} WIB - Selesai`,
        status: 'SCHEDULED',
      });
      createdCount++;
    }

    // 3. Create Jimpitan Finance Transactions if jimpitan entries exist
    for (const j of parsedResult.value.jimpitans) {
      await api.post('/finance-transactions', {
        title: `Penerimaan Uang Jimpitan (${j.date})`,
        kind: 'INCOME',
        amount: j.amount,
        occurredAt: `${j.date}T22:45:00.000Z`,
        notes: 'Hasil pengumpulan jimpitan ronda malam warga.',
      });
      createdCount++;
    }

    successMsg.value = `Berhasil mengimpor ${createdCount} data jadwal & catatan dari teks pengumuman ke sistem WargaHub!`;
    emit('imported');
  } catch (cause) {
    errorMsg.value = cause instanceof ApiClientError || cause instanceof Error ? cause.message : 'Gagal mengimpor data pengumuman.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div v-if="open" class="modal-overlay" role="dialog" aria-modal="true">
    <div class="wa-modal-card">
      <div class="modal-header">
        <div class="header-title">
          <span class="eyebrow"><FileText :size="14" /> Konversi Teks Pengumuman</span>
          <h2>Impor Teks Pesan Pengumuman RT/RW</h2>
        </div>
        <button type="button" class="close-btn" aria-label="Tutup modal" @click="emit('close')"><X :size="20" /></button>
      </div>

      <p class="subtitle">Tempelkan teks pengumuman rutin (Jadwal Makanan Tukang, Ronda, Jimpitan, Kerja Bakti) untuk dimasukkan langsung ke sistem.</p>

      <div v-if="successMsg" class="notice" role="status"><CheckCircle2 :size="18" /> {{ successMsg }}</div>
      <div v-if="errorMsg" class="notice notice-error" role="alert"><AlertCircle :size="18" /> {{ errorMsg }}</div>

      <div class="wa-grid">
        <div class="field">
          <label for="wa-raw">Salin & Tempel Teks Pesan di sini</label>
          <textarea
            id="wa-raw"
            v-model="rawText"
            rows="10"
            placeholder="Contoh:
Jadwal kirim sodakoh makanan buat tukang
Hari Minggu tgl 12 juli 2026: bpk Dim Roni B, Winardi

PENGUMUMAN JADWAL RONDA TGL 18-07-2026:
1. SUHENDANG
2. HARTONO

Jimpitan senin tgl 27 07 2026 Rp 24000"
            @input="parseText"
          />
        </div>

        <!-- Live Parsed Result Preview -->
        <div class="parsed-preview">
          <span class="preview-title"><RefreshCw :size="15" /> Hasil Konversi Otomatis</span>

          <div v-if="!parsedResult || (!parsedResult.foodSchedules.length && !parsedResult.patrols.length && !parsedResult.jimpitans.length)" class="empty-preview">
            <MessageSquare :size="28" />
            <p>Tempelkan teks pesan di sebelah kiri untuk melihat rincian jadwal yang teridentifikasi.</p>
          </div>

          <div v-else class="parsed-sections">
            <!-- Food Schedule Section -->
            <div v-if="parsedResult.foodSchedules.length" class="parsed-box">
              <div class="box-header"><HardHat :size="16" /> <strong>Sodakoh Makanan Tukang ({{ parsedResult.foodSchedules.length }} Hari)</strong></div>
              <ul class="parsed-list">
                <li v-for="fs in parsedResult.foodSchedules.slice(0, 5)" :key="fs.date">
                  <span>{{ fs.date }}:</span> <strong>{{ fs.residents.join(', ') }}</strong>
                </li>
                <li v-if="parsedResult.foodSchedules.length > 5" class="more-item">+ {{ parsedResult.foodSchedules.length - 5 }} hari giliran lainnya</li>
              </ul>
            </div>

            <!-- Patrol Section -->
            <div v-if="parsedResult.patrols.length" class="parsed-box">
              <div class="box-header"><ShieldCheck :size="16" /> <strong>Jadwal Ronda ({{ parsedResult.patrols.length }} Sesi)</strong></div>
              <ul class="parsed-list">
                <li v-for="p in parsedResult.patrols" :key="p.date">
                  <span>{{ p.date }} ({{ p.time }} WIB):</span> <strong>{{ p.officers.join(', ') }}</strong>
                </li>
              </ul>
            </div>

            <!-- Jimpitan Section -->
            <div v-if="parsedResult.jimpitans.length" class="parsed-box">
              <div class="box-header"><Receipt :size="16" /> <strong>Pencatatan Uang Jimpitan</strong></div>
              <ul class="parsed-list">
                <li v-for="j in parsedResult.jimpitans" :key="j.date">
                  <span>{{ j.date }}:</span> <strong>{{ formatRupiah(j.amount) }}</strong>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button
          class="button"
          type="button"
          :disabled="busy || !parsedResult || (!parsedResult.foodSchedules.length && !parsedResult.patrols.length && !parsedResult.jimpitans.length)"
          @click="commitImport"
        >
          <FileText :size="16" /> {{ busy ? 'Mengimpor…' : 'Impor & Masukkan ke Sistem WargaHub' }}
        </button>
        <button class="button button-secondary" type="button" @click="emit('close')">Tutup</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; z-index: 60; inset: 0; display: grid; place-items: center; padding: 1rem; background: rgba(16, 43, 39, 0.45); backdrop-filter: blur(4px); }
.wa-modal-card { width: min(100%, 54rem); max-height: 90vh; overflow-y: auto; padding: 1.6rem; border-radius: var(--radius-lg); background: var(--paper); box-shadow: var(--shadow-lg); }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.header-title h2 { margin: .15rem 0; font-size: 1.35rem; }
.subtitle { margin: 0 0 1rem; color: var(--ink-650); font-size: .86rem; }
.close-btn { border: 0; background: transparent; font-size: 1.4rem; cursor: pointer; }
.wa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; margin-block: .8rem; }
.parsed-preview { display: flex; flex-direction: column; gap: .6rem; padding: 1rem; border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--cream-50); }
.preview-title { display: inline-flex; align-items: center; gap: .35rem; font-size: .8rem; font-weight: 850; color: var(--teal-800); }
.empty-preview { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .5rem; height: 100%; text-align: center; color: var(--ink-500); font-size: .8rem; }
.parsed-sections { display: grid; gap: .75rem; }
.parsed-box { padding: .75rem; border-radius: .6rem; background: white; border: 1px solid var(--line); }
.box-header { display: flex; align-items: center; gap: .4rem; margin-bottom: .4rem; font-size: .8rem; color: var(--teal-700); }
.parsed-list { margin: 0; padding-left: 0; list-style: none; display: grid; gap: .25rem; font-size: .76rem; }
.parsed-list li { display: flex; gap: .4rem; }
.more-item { color: var(--ink-500); font-style: italic; }
.modal-footer { display: flex; justify-content: flex-end; gap: .8rem; margin-top: 1.2rem; }
@media (max-width: 700px) { .wa-grid { grid-template-columns: 1fr; } }
</style>
