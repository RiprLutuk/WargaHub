<script setup lang="ts">
import { AlertCircle, Calendar, CalendarClock, CheckCircle2, HardHat, RefreshCw, ShieldCheck, Users, X } from 'lucide-vue-next';
import { computed, reactive, ref } from 'vue';
import { useResource } from '../composables/useResource';
import { api, ApiClientError } from '../lib/api';
import { adaptResidents } from '../lib/view-models';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'imported'): void }>();

const residents = useResource(async () => adaptResidents(await api.get<unknown>('/residents')));

const activeMode = ref<'food' | 'patrol'>('food');
const busy = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

const foodForm = reactive({
  title: 'Sodakoh Makanan & Konsumsi Tukang',
  startDate: '2026-07-12',
  endDate: '2026-07-25',
  residentsPerDay: 3,
  location: 'Pos RT / Lokasi Pembangunan',
});

const patrolForm = reactive({
  title: 'Ronda Malam Terjadwal',
  startDate: '2026-07-18',
  endDate: '2026-08-31',
  selectedDays: ['SABTU', 'SENIN'],
  officersPerShift: 5,
  timeSlot: '22:45 WIB - 04:00 WIB',
  area: 'Wilayah RT 01 - RT 04',
});

// Calculate generated preview dates and resident assignments
const generatedFoodDays = computed(() => {
  if (!foodForm.startDate || !foodForm.endDate) return [];
  const start = new Date(foodForm.startDate);
  const end = new Date(foodForm.endDate);
  const resList = residents.data.value ?? [];
  if (resList.length === 0) return [];

  const days: Array<{ dateStr: string; assignedNames: string[] }> = [];
  let curr = new Date(start);
  let resIdx = 0;

  while (curr <= end) {
    const dateStr = curr.toISOString().split('T')[0] ?? foodForm.startDate;
    const assignedNames: string[] = [];

    for (let i = 0; i < foodForm.residentsPerDay; i++) {
      if (resList.length > 0) {
        const res = resList[resIdx % resList.length];
        if (res) {
          assignedNames.push(res.name);
        }
        resIdx++;
      }
    }

    days.push({ dateStr, assignedNames });
    curr.setDate(curr.getDate() + 1);
  }

  return days;
});

const generatedPatrolDays = computed(() => {
  if (!patrolForm.startDate || !patrolForm.endDate) return [];
  const start = new Date(patrolForm.startDate);
  const end = new Date(patrolForm.endDate);
  const resList = residents.data.value ?? [];
  if (resList.length === 0) return [];

  const dayMap: Record<number, string> = { 0: 'MINGGU', 1: 'SENIN', 2: 'SELASA', 3: 'RABU', 4: 'KAMIS', 5: 'JUMAT', 6: 'SABTU' };
  const days: Array<{ dateStr: string; dayName: string; assignedOfficers: string[] }> = [];
  let curr = new Date(start);
  let resIdx = 0;

  while (curr <= end) {
    const dayName = dayMap[curr.getDay()] ?? 'SABTU';
    if (patrolForm.selectedDays.includes(dayName)) {
      const dateStr = curr.toISOString().split('T')[0] ?? patrolForm.startDate;
      const assignedOfficers: string[] = [];

      for (let i = 0; i < patrolForm.officersPerShift; i++) {
        if (resList.length > 0) {
          const res = resList[resIdx % resList.length];
          if (res) {
            assignedOfficers.push(res.name);
          }
          resIdx++;
        }
      }

      days.push({ dateStr, dayName, assignedOfficers });
    }
    curr.setDate(curr.getDate() + 1);
  }

  return days;
});

async function runAutoGenerator() {
  busy.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    const resList = residents.data.value ?? [];
    if (!resList.length) {
      throw new Error('Belum ada data warga terdaftar untuk disusun giliran.');
    }

    if (activeMode.value === 'food') {
      let createdCount = 0;
      for (const day of generatedFoodDays.value) {
        await api.post('/activities', {
          title: `${foodForm.title} (${day.dateStr})`,
          description: `Jadwal giliran konsumsi tukang tanggal ${day.dateStr}. Penanggung jawab: ${day.assignedNames.join(', ')}.`,
          location: foodForm.location,
          startsAt: `${day.dateStr}T07:00:00.000Z`,
          endsAt: `${day.dateStr}T18:00:00.000Z`,
          needs: [
            { type: 'KONSUMSI', target: foodForm.residentsPerDay },
          ],
        });
        createdCount++;
      }
      successMsg.value = `Berhasil menyusun giliran ${createdCount} hari konsumsi tukang dan mengunggah ke kalender warga!`;
    } else {
      let createdCount = 0;
      for (let i = 0; i < generatedPatrolDays.value.length; i++) {
        const day = generatedPatrolDays.value[i];
        const assignedResident = resList[i % resList.length];

        if (assignedResident && day) {
          await api.post('/patrol-assignments', {
            userId: assignedResident.id,
            area: patrolForm.area,
            startsAt: `${day.dateStr}T22:45:00.000Z`,
            endsAt: `${day.dateStr}T04:00:00.000Z`,
          });
          createdCount++;
        }
      }
      successMsg.value = `Berhasil menerbitkan ${createdCount} penugasan ronda malam otomatis ke sistem WargaHub!`;
    }

    emit('imported');
  } catch (cause) {
    errorMsg.value = cause instanceof ApiClientError || cause instanceof Error ? cause.message : 'Gagal menyusun giliran otomatis.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div v-if="open" class="modal-overlay" role="dialog" aria-modal="true">
    <div class="generator-modal-card">
      <div class="modal-header">
        <div class="header-title">
          <span class="eyebrow"><CalendarClock :size="14" /> Penjadwalan System-Driven</span>
          <h2>Susun Giliran & Rotasi Terjadwal Warga</h2>
        </div>
        <button type="button" class="close-btn" aria-label="Tutup modal" @click="emit('close')"><X :size="20" /></button>
      </div>

      <p class="subtitle">Sistem akan secara otomatis memutar giliran warga secara berurutan, menjadwalkan kalender, dan memberikan konfirmasi langsung di aplikasi.</p>

      <div v-if="successMsg" class="notice" role="status"><CheckCircle2 :size="18" /> {{ successMsg }}</div>
      <div v-if="errorMsg" class="notice notice-error" role="alert"><AlertCircle :size="18" /> {{ errorMsg }}</div>

      <!-- Mode Selector Tabs -->
      <nav class="mode-tabs">
        <button :class="{ active: activeMode === 'food' }" type="button" @click="activeMode = 'food'">
          <HardHat :size="16" /> Giliran Sodakoh Makanan Tukang
        </button>
        <button :class="{ active: activeMode === 'patrol' }" type="button" @click="activeMode = 'patrol'">
          <ShieldCheck :size="16" /> Rotasi Ronda Malam Otomatis
        </button>
      </nav>

      <form class="generator-body" @submit.prevent="runAutoGenerator">
        <!-- Food Roster Form -->
        <template v-if="activeMode === 'food'">
          <div class="field">
            <label for="food-title">Judul Inisiatif / Kegiatan</label>
            <input id="food-title" v-model="foodForm.title" required />
          </div>

          <div class="two-fields">
            <div class="field"><label for="food-start">Tanggal Mulai Program</label><input id="food-start" v-model="foodForm.startDate" type="date" required /></div>
            <div class="field"><label for="food-end">Tanggal Selesai Program</label><input id="food-end" v-model="foodForm.endDate" type="date" required /></div>
          </div>

          <div class="two-fields">
            <div class="field"><label for="food-rpd">Jumlah Warga Bertugas Per Hari</label><input id="food-rpd" v-model.number="foodForm.residentsPerDay" type="number" min="1" max="10" required /></div>
            <div class="field"><label for="food-loc">Lokasi Pengumpulan Makanan</label><input id="food-loc" v-model="foodForm.location" required /></div>
          </div>

          <!-- Preview Table -->
          <div class="preview-box">
            <span class="preview-label"><RefreshCw :size="15" /> Pratinjau Rotasi Giliran Warga ({{ generatedFoodDays.length }} Hari Total)</span>
            <div class="roster-preview-grid">
              <div v-for="d in generatedFoodDays.slice(0, 6)" :key="d.dateStr" class="roster-card">
                <strong>{{ d.dateStr }}</strong>
                <ul><li v-for="name in d.assignedNames" :key="name">{{ name }}</li></ul>
              </div>
            </div>
            <p v-if="generatedFoodDays.length > 6" class="muted small">+ {{ generatedFoodDays.length - 6 }} hari giliran warga berikutnya terhitung otomatis.</p>
          </div>
        </template>

        <!-- Patrol Roster Form -->
        <template v-else>
          <div class="field">
            <label for="patrol-title">Nama Jadwal Ronda</label>
            <input id="patrol-title" v-model="patrolForm.title" required />
          </div>

          <div class="two-fields">
            <div class="field"><label for="patrol-start">Tanggal Mulai Rotasi</label><input id="patrol-start" v-model="patrolForm.startDate" type="date" required /></div>
            <div class="field"><label for="patrol-end">Tanggal Selesai Rotasi</label><input id="patrol-end" v-model="patrolForm.endDate" type="date" required /></div>
          </div>

          <div class="two-fields">
            <div class="field"><label for="patrol-ops">Jumlah Petugas Per Sesi</label><input id="patrol-ops" v-model.number="patrolForm.officersPerShift" type="number" min="1" max="10" required /></div>
            <div class="field"><label for="patrol-slot">Jam Pertemuan Ronda</label><input id="patrol-slot" v-model="patrolForm.timeSlot" required /></div>
          </div>

          <!-- Preview Table -->
          <div class="preview-box">
            <span class="preview-label"><RefreshCw :size="15" /> Pratinjau Rotasi Ronda ({{ generatedPatrolDays.length }} Malam Ronda)</span>
            <div class="roster-preview-grid">
              <div v-for="d in generatedPatrolDays.slice(0, 4)" :key="d.dateStr" class="roster-card">
                <strong>{{ d.dayName }} ({{ d.dateStr }})</strong>
                <ul><li v-for="name in d.assignedOfficers" :key="name">{{ name }}</li></ul>
              </div>
            </div>
          </div>
        </template>

        <div class="modal-footer">
          <button class="button" type="submit" :disabled="busy">
            <CalendarClock :size="16" /> {{ busy ? 'Menyusun…' : 'Terbitkan Giliran & Jadwalkan Otomatis' }}
          </button>
          <button class="button button-secondary" type="button" @click="emit('close')">Batal</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; z-index: 60; inset: 0; display: grid; place-items: center; padding: 1rem; background: rgba(16, 43, 39, 0.45); backdrop-filter: blur(4px); }
.generator-modal-card { width: min(100%, 54rem); max-height: 90vh; overflow-y: auto; padding: 1.6rem; border-radius: var(--radius-lg); background: var(--paper); box-shadow: var(--shadow-lg); }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.header-title h2 { margin: .15rem 0; font-size: 1.35rem; }
.subtitle { margin: 0 0 1rem; color: var(--ink-650); font-size: .86rem; }
.close-btn { border: 0; background: transparent; font-size: 1.4rem; cursor: pointer; }
.mode-tabs { display: flex; gap: .4rem; padding: .35rem; border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--cream-50); margin-bottom: 1rem; }
.mode-tabs button { display: inline-flex; min-height: 2.6rem; align-items: center; gap: .45rem; padding: .55rem .8rem; border: 0; border-radius: .65rem; background: transparent; color: var(--ink-650); font-size: .82rem; font-weight: 750; cursor: pointer; }
.mode-tabs button.active { background: var(--teal-100); color: var(--teal-800); }
.generator-body { display: grid; gap: 1rem; }
.two-fields { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
.preview-box { display: grid; gap: .6rem; padding: 1rem; border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--cream-50); }
.preview-label { display: inline-flex; align-items: center; gap: .35rem; font-size: .8rem; font-weight: 850; color: var(--teal-800); }
.roster-preview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: .6rem; }
.roster-card { padding: .65rem; border: 1px solid var(--line); border-radius: .6rem; background: white; font-size: .78rem; }
.roster-card strong { color: var(--teal-800); display: block; margin-bottom: .25rem; }
.roster-card ul { margin: 0; padding-left: 1.1rem; }
.modal-footer { display: flex; justify-content: flex-end; gap: .8rem; margin-top: 1rem; }
@media (max-width: 600px) { .two-fields { grid-template-columns: 1fr; } }
</style>
