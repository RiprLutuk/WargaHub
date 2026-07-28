<script setup lang="ts">
import { AlertCircle, Calendar, CheckCircle2, Home, Info, Plus, ShieldCheck, Wrench, X } from 'lucide-vue-next';
import { computed, reactive, ref } from 'vue';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import { useResource } from '../../composables/useResource';
import { api, ApiClientError } from '../../lib/api';
import { formatDate, formatDateTime, formatRupiah } from '../../lib/format';
import { adaptHouseholds } from '../../lib/view-models';

interface Facility {
  id: string;
  name: string;
  category: string;
  description: string;
  capacity?: number | null;
  fee: number;
}

interface FacilityBooking {
  id: string;
  facilityId: string;
  facilityName: string;
  startsAt: string;
  endsAt: string;
  purpose: string;
  status: string;
}

const facilities = useResource(() => api.get<Facility[]>('/facilities'));
const bookings = useResource(() => api.get<FacilityBooking[]>('/facilities/reservations'));
const households = useResource(async () => adaptHouseholds(await api.get<unknown>('/households')));
const formOpen = ref(false);
const selectedFacility = ref<Facility | null>(null);
const busy = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

const form = reactive({
  facilityId: '',
  startsAt: '2026-08-17T08:00',
  endsAt: '2026-08-17T18:00',
  purpose: 'Acara syukuran keluarga warga',
});

function openBooking(facility: Facility) {
  selectedFacility.value = facility;
  form.facilityId = facility.id;
  formOpen.value = true;
  errorMsg.value = '';
  successMsg.value = '';
}

async function submitBooking() {
  if (!selectedFacility.value) return;
  busy.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    const householdId = households.data.value?.[0]?.id;
    if (!householdId) {
      errorMsg.value = 'Hubungkan rumah terlebih dahulu sebelum mengajukan reservasi.';
      return;
    }
    await api.post('/facilities/reservations', {
      facilityId: selectedFacility.value.id,
      householdId,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      purpose: form.purpose,
    });
    successMsg.value = 'Permohonan peminjaman fasilitas berhasil dikirim dan menunggu persetujuan pengurus.';
    formOpen.value = false;
    await bookings.reload();
  } catch (cause) {
    errorMsg.value = cause instanceof ApiClientError || cause instanceof Error ? cause.message : 'Gagal mengajukan reservasi fasilitas.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="portal-page">
    <header class="portal-page-heading">
      <div>
        <span class="eyebrow">Fasilitas Bersama & Peminjaman Barang</span>
        <h1>Fasilitas warga</h1>
        <p>Gunakan balai warga, lapangan, tenda, kursi, dan sound system untuk kegiatan keluarga dan RT/RW.</p>
      </div>
    </header>

    <div v-if="successMsg" class="notice" role="status"><CheckCircle2 :size="19" /> {{ successMsg }}</div>

    <!-- Booking Form Modal -->
    <div v-if="formOpen && selectedFacility" class="booking-overlay" role="dialog" aria-modal="true" aria-labelledby="booking-heading" @click.self="formOpen = false">
    <section class="card booking-modal">
      <div class="panel-header">
        <div>
          <span class="eyebrow">Reservasi Fasilitas</span>
          <h2 id="booking-heading">{{ selectedFacility.name }}</h2>
        </div>
        <button type="button" class="close-btn" aria-label="Tutup modal" @click="formOpen = false"><X :size="20" /></button>
      </div>

      <div v-if="errorMsg" class="notice notice-error"><AlertCircle :size="18" /> {{ errorMsg }}</div>

      <form class="form-grid" @submit.prevent="submitBooking">
        <p>{{ selectedFacility.description }}</p>
        <p v-if="selectedFacility.fee > 0">Biaya / Deposit Kebersihan: <strong>{{ formatRupiah(selectedFacility.fee) }}</strong></p>

        <div class="two-fields">
          <div class="field"><label for="book-start">Waktu Mulai Peminjaman</label><input id="book-start" v-model="form.startsAt" type="datetime-local" required /></div>
          <div class="field"><label for="book-end">Waktu Selesai Peminjaman</label><input id="book-end" v-model="form.endsAt" type="datetime-local" required /></div>
        </div>

        <div class="field">
          <label for="book-purpose">Tujuan Peminjaman</label>
          <textarea id="book-purpose" v-model.trim="form.purpose" rows="3" placeholder="Contoh: Rapat RT, syukuran, atau kerja bakti" required />
        </div>

        <div class="form-actions">
          <button class="button" type="submit" :disabled="busy">{{ busy ? 'Mengirim…' : 'Kirim Pengajuan Reservasi' }}</button>
          <button class="button button-secondary" type="button" @click="formOpen = false">Batal</button>
        </div>
      </form>
    </section>
    </div>

    <!-- Available Facilities Cards -->
    <section>
      <div class="section-heading">
        <div>
          <h2>Daftar Fasilitas & Inventaris</h2>
          <p class="muted">Pilih fasilitas yang ingin dipinjam.</p>
        </div>
      </div>

      <StatePanel v-if="facilities.loading.value" state="loading" />
      <StatePanel v-else-if="facilities.error.value" state="error" :message="facilities.error.value" @retry="facilities.reload" />
      <EmptyState v-else-if="!facilities.data.value?.length" title="Belum ada fasilitas aktif" message="Belum ada fasilitas yang bisa dipinjam saat ini." />
      <div v-else class="facility-grid">
        <article v-for="item in facilities.data.value" :key="item.id" class="card facility-card">
          <span class="facility-icon"><Home :size="22" /></span>
          <div class="facility-body">
            <span class="cat-tag">{{ item.category }}</span>
            <h2>{{ item.name }}</h2>
            <p>{{ item.description }}</p>
            <span class="fee-tag">{{ item.fee > 0 ? formatRupiah(item.fee) : 'Gratis / Tanpa Biaya' }}</span>
          </div>
          <button class="button button-secondary button-sm" type="button" @click="openBooking(item)">Reservasi</button>
        </article>
      </div>
    </section>

    <!-- Resident Booking History -->
    <section>
      <div class="section-heading">
        <div>
          <h2>Riwayat Peminjaman Anda</h2>
          <p class="muted">Status persetujuan dan jadwal reservasi Anda.</p>
        </div>
      </div>

      <StatePanel v-if="bookings.loading.value" state="loading" />
      <EmptyState v-else-if="!bookings.data.value?.length" title="Belum ada reservasi" message="Anda belum pernah mengajukan peminjaman fasilitas." />
      <div v-else class="booking-list">
        <article v-for="b in bookings.data.value" :key="b.id" class="card booking-card">
          <div>
            <span class="eyebrow">{{ b.facilityName }}</span>
            <h3>{{ b.purpose }}</h3>
            <p>{{ formatDateTime(b.startsAt) }} — {{ formatDateTime(b.endsAt) }}</p>
          </div>
          <StatusBadge :status="b.status" />
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.portal-page { display: grid; max-width: var(--content); gap: 1.5rem; margin-inline: auto; }
.portal-page-heading h1 { margin-bottom: .45rem; font-size: clamp(2rem, 4.5vw, 3rem); }
.portal-page-heading p { max-width: 46rem; margin: 0; color: var(--ink-650); }
.facility-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr)); gap: 1rem; }
.facility-card { display: grid; gap: .8rem; padding: 1.2rem; }
.facility-icon { display: grid; width: 2.9rem; height: 2.9rem; place-items: center; border-radius: .85rem; background: var(--teal-100); color: var(--teal-700); }
.cat-tag { color: var(--teal-700); font-size: .72rem; font-weight: 850; text-transform: uppercase; }
.facility-body h2 { margin: .2rem 0; font-size: 1.15rem; }
.facility-body p { margin: 0 0 .5rem; color: var(--ink-650); font-size: .84rem; }
.fee-tag { font-size: .82rem; font-weight: 850; color: var(--amber-700); }
.booking-modal { padding: 1.4rem; }
.booking-overlay { position: fixed; z-index: 50; inset: 0; display: grid; place-items: center; overflow-y: auto; padding: 1rem; background: rgb(16 43 39 / .38); backdrop-filter: blur(5px); }
.booking-overlay .booking-modal { width: min(100%, 48rem); max-height: 92vh; overflow-y: auto; box-shadow: var(--shadow-lg); }
.panel-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
.close-btn { border: 0; background: transparent; font-size: 1.4rem; cursor: pointer; }
.booking-list { display: grid; gap: .7rem; }
.booking-card { display: flex; justify-content: space-between; align-items: center; padding: 1.1rem; }
.booking-card h3 { margin: .15rem 0; font-size: 1.05rem; }
.booking-card p { margin: 0; color: var(--ink-650); font-size: .8rem; }
.two-fields { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
@media (max-width: 600px) { .two-fields { grid-template-columns: 1fr; } .booking-overlay { align-items: end; padding: .5rem; } .booking-overlay .booking-modal { max-height: 94vh; border-radius: 1.1rem 1.1rem .8rem .8rem; } .booking-card { align-items: flex-start; flex-direction: column; } }
</style>
