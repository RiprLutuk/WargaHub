<script setup lang="ts">
import { Car, CarFront, HelpCircle, PackageSearch, Phone, Plus, QrCode, Search, ShieldCheck, ShoppingBag, Store, UserCheck, Users, X } from 'lucide-vue-next';
import { computed, reactive, ref } from 'vue';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import { useResource } from '../../composables/useResource';
import { api, ApiClientError } from '../../lib/api';
import { formatDate, formatDateTime } from '../../lib/format';
import { adaptHouseholds } from '../../lib/view-models';

interface Business {
  id: string;
  name: string;
  category: string;
  description: string;
  contactPhone: string;
  address?: string | null;
}

interface LostFound {
  id: string;
  title: string;
  description: string;
  kind: string;
  location: string;
  status: string;
  createdAt: string;
}

interface Vehicle {
  id: string;
  plateNumber: string;
  brandModel: string;
  type: string;
}

interface Visitor {
  id: string;
  name: string;
  purpose: string;
  expectedArrival: string;
  passCode: string;
  status: string;
}

const activeTab = ref<'umkm' | 'lost_found' | 'vehicles' | 'visitors'>('umkm');
const businesses = useResource(() => api.get<Business[]>('/umkms'));
const lostFounds = useResource(() => api.get<LostFound[]>('/lost-found'));
const vehicles = useResource(() => api.get<Vehicle[]>('/vehicles'));
const visitors = useResource(() => api.get<Visitor[]>('/guests'));
const households = useResource(async () => adaptHouseholds(await api.get<unknown>('/households')));

const search = ref('');
const busy = ref(false);
const formOpen = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

const umkmForm = reactive({ name: '', category: 'KULINER', description: '', phone: '', operatingHours: 'Setiap hari 08.00–20.00' });
const lostForm = reactive({ title: '', description: '', location: '', kind: 'LOST' });
const vehicleForm = reactive({ plateNumber: '', brandModel: 'Mobil Honda HR-V Silver', type: 'CAR' });
const visitorForm = reactive({ name: '', visitDate: '2026-08-10', purpose: 'Tamu keluarga' });

async function submitForm() {
  busy.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    if (activeTab.value === 'umkm') {
      await api.post('/umkms', { name: umkmForm.name, category: umkmForm.category, description: umkmForm.description, contactPhone: umkmForm.phone, operatingHours: umkmForm.operatingHours });
      successMsg.value = 'Usaha UMKM Anda berhasil didaftarkan ke direktori warga.';
      await businesses.reload();
    } else if (activeTab.value === 'lost_found') {
      await api.post('/lost-found', { ...lostForm });
      successMsg.value = 'Laporan kehilangan/penemuan barang berhasil diterbitkan.';
      await lostFounds.reload();
    } else if (activeTab.value === 'vehicles') {
      const householdId = households.data.value?.[0]?.id;
      if (!householdId) throw new Error('Hubungkan rumah terlebih dahulu sebelum mendaftarkan kendaraan.');
      await api.post('/vehicles', { ...vehicleForm, householdId });
      successMsg.value = 'Kendaraan rumah tangga berhasil terdaftar.';
      await vehicles.reload();
    } else if (activeTab.value === 'visitors') {
      const householdId = households.data.value?.[0]?.id;
      if (!householdId) throw new Error('Hubungkan rumah terlebih dahulu sebelum mendaftarkan tamu.');
      await api.post('/guests', { householdId, guestName: visitorForm.name, purpose: visitorForm.purpose, expectedArrival: new Date(`${visitorForm.visitDate}T12:00:00+07:00`).toISOString() });
      successMsg.value = 'Pre-registrasi tamu berhasil dibuat. QR Code siap diberikan kepada tamu Anda.';
      await visitors.reload();
    }
    formOpen.value = false;
  } catch (cause) {
    errorMsg.value = cause instanceof ApiClientError || cause instanceof Error ? cause.message : 'Gagal memproses data.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="portal-page">
    <header class="portal-page-heading">
      <div>
        <span class="eyebrow">Layanan & Direktori Komunitas</span>
        <h1>Layanan warga</h1>
        <p>Ekosistem usaha warga (UMKM), barang kehilangan (Lost & Found), pendaftaran kendaraan, dan pre-registrasi QR tamu.</p>
      </div>
      <button class="button" type="button" @click="formOpen = true; successMsg = ''; errorMsg = '';">
        <Plus :size="17" />
        {{
          activeTab === 'umkm' ? 'Daftarkan UMKM' :
          activeTab === 'lost_found' ? 'Laporkan Barang' :
          activeTab === 'vehicles' ? 'Tambah Kendaraan' : 'Pre-registrasi Tamu'
        }}
      </button>
    </header>

    <div v-if="successMsg" class="notice" role="status"><CheckCircle2 :size="19" /> {{ successMsg }}</div>

    <!-- Navigation Tabs -->
    <nav class="service-tabs" role="tablist">
      <button :class="{ active: activeTab === 'umkm' }" type="button" @click="activeTab = 'umkm'"><Store :size="16" /> UMKM & Jasa Warga</button>
      <button :class="{ active: activeTab === 'lost_found' }" type="button" @click="activeTab = 'lost_found'"><PackageSearch :size="16" /> Kehilangan & Ditemukan</button>
      <button :class="{ active: activeTab === 'vehicles' }" type="button" @click="activeTab = 'vehicles'"><CarFront :size="16" /> Kendaraan Rumah</button>
      <button :class="{ active: activeTab === 'visitors' }" type="button" @click="activeTab = 'visitors'"><UserCheck :size="16" /> Akses Tamu (QR)</button>
    </nav>

    <!-- Create Form Drawer Modal -->
    <div v-if="formOpen" class="form-modal" role="dialog" aria-modal="true" aria-labelledby="service-form-heading" @click.self="formOpen = false">
    <section class="card form-panel">
      <div class="panel-header">
        <div>
          <span class="eyebrow">Formulir Layanan</span>
          <h2 id="service-form-heading">
            {{
              activeTab === 'umkm' ? 'Daftarkan Usaha / Jasa Warga' :
              activeTab === 'lost_found' ? 'Lapor Barang Hilang / Ditemukan' :
              activeTab === 'vehicles' ? 'Pendaftaran Kendaraan Rumah' : 'Pre-registrasi Tamu'
            }}
          </h2>
        </div>
        <button type="button" class="close-btn" aria-label="Tutup formulir" @click="formOpen = false"><X :size="20" /></button>
      </div>

      <div v-if="errorMsg" class="notice notice-error"><AlertCircle :size="18" /> {{ errorMsg }}</div>

      <form class="form-grid" @submit.prevent="submitForm">
        <!-- UMKM Form -->
        <template v-if="activeTab === 'umkm'">
          <div class="field"><label for="biz-name">Nama Usaha / Toko</label><input id="biz-name" v-model.trim="umkmForm.name" placeholder="Misal: Dapur Mama Ayu - Katering" required /></div>
          <div class="two-fields">
            <div class="field"><label for="biz-cat">Kategori</label><select id="biz-cat" v-model="umkmForm.category"><option value="KULINER">Kuliner & Makanan</option><option value="JASA">Jasa & Keahlian</option><option value="SOTO">Sembako & Harian</option><option value="FASHION">Pakaian & Kerajinan</option></select></div>
            <div class="field"><label for="biz-phone">WhatsApp / Kontak</label><input id="biz-phone" v-model.trim="umkmForm.phone" placeholder="08123456789" required /></div>
          </div>
          <div class="field"><label for="biz-hours">Jam operasional</label><input id="biz-hours" v-model.trim="umkmForm.operatingHours" required /></div>
          <div class="field"><label for="biz-desc">Deskripsi Produk / Jasa</label><textarea id="biz-desc" v-model.trim="umkmForm.description" rows="3" required /></div>
        </template>

        <!-- Lost Found Form -->
        <template v-else-if="activeTab === 'lost_found'">
          <div class="field"><label for="lf-title">Nama Barang</label><input id="lf-title" v-model.trim="lostForm.title" placeholder="Misal: Kunci Motor Honda dengan Gantungan Biru" required /></div>
          <div class="two-fields">
          <div class="field"><label for="lf-cat">Jenis Laporan</label><select id="lf-cat" v-model="lostForm.kind"><option value="LOST">Barang hilang</option><option value="FOUND">Barang ditemukan</option></select></div>
            <div class="field"><label for="lf-loc">Lokasi Terakhir / Ditemukan</label><input id="lf-loc" v-model.trim="lostForm.location" placeholder="Taman RW / Dekat Pos Ronda Blok A" required /></div>
          </div>
          <div class="field"><label for="lf-desc">Ciri-Ciri & Deskripsi Singkat</label><textarea id="lf-desc" v-model.trim="lostForm.description" rows="3" required /></div>
        </template>

        <!-- Vehicle Form -->
        <template v-else-if="activeTab === 'vehicles'">
          <div class="two-fields">
            <div class="field"><label for="veh-plate">Nomor Polisi (Plat)</label><input id="veh-plate" v-model.trim="vehicleForm.plateNumber" placeholder="B 1234 ABC" required /></div>
            <div class="field"><label for="veh-type">Jenis Kendaraan</label><select id="veh-type" v-model="vehicleForm.type"><option value="CAR">Mobil</option><option value="MOTORCYCLE">Sepeda Motor</option><option value="OTHER">Lainnya</option></select></div>
          </div>
          <div class="field"><label for="veh-model">Merk & Warna</label><input id="veh-model" v-model.trim="vehicleForm.brandModel" required /></div>
        </template>

        <!-- Visitor Form -->
        <template v-else>
          <div class="field"><label for="vis-name">Nama Tamu / Pengunjung</label><input id="vis-name" v-model.trim="visitorForm.name" placeholder="Misal: Bapak Haryono (Saudara)" required /></div>
          <div class="field"><label for="vis-date">Tanggal Kunjungan</label><input id="vis-date" v-model="visitorForm.visitDate" type="date" required /></div>
          <div class="field"><label for="vis-purpose">Tujuan Kunjungan</label><input id="vis-purpose" v-model.trim="visitorForm.purpose" required /></div>
        </template>

        <div class="form-actions">
          <button class="button" type="submit" :disabled="busy">{{ busy ? 'Menyimpan…' : 'Simpan Data' }}</button>
          <button class="button button-secondary" type="button" @click="formOpen = false">Batal</button>
        </div>
      </form>
    </section>
    </div>

    <!-- Tab Content Display -->
    <section v-if="activeTab === 'umkm'">
      <StatePanel v-if="businesses.loading.value" state="loading" />
      <EmptyState v-else-if="!businesses.data.value?.length" title="Belum ada UMKM terdaftar" message="Daftarkan usaha atau jasa Anda untuk membantu ekonomi lingkungan." />
      <div v-else class="service-grid">
        <article v-for="b in businesses.data.value" :key="b.id" class="card service-card">
          <span class="card-icon"><Store :size="22" /></span>
          <div>
            <span class="cat-tag">{{ b.category }}</span>
            <h2>{{ b.name }}</h2>
            <p>{{ b.description }}</p>
            <a :href="`https://wa.me/${b.contactPhone.replace(/^0/, '62')}`" target="_blank" class="phone-link"><Phone :size="14" /> {{ b.contactPhone }}</a>
          </div>
        </article>
      </div>
    </section>

    <section v-else-if="activeTab === 'lost_found'">
      <StatePanel v-if="lostFounds.loading.value" state="loading" />
      <EmptyState v-else-if="!lostFounds.data.value?.length" title="Tidak ada laporan kehilangan" message="Lingkungan dalam keadaan aman." />
      <div v-else class="service-grid">
        <article v-for="lf in lostFounds.data.value" :key="lf.id" class="card service-card">
          <span class="card-icon amber"><PackageSearch :size="22" /></span>
          <div>
            <div class="card-top"><span class="cat-tag">{{ lf.kind === 'FOUND' ? 'Ditemukan' : 'Hilang' }}</span><StatusBadge :status="lf.status" /></div>
            <h2>{{ lf.title }}</h2>
            <p>{{ lf.description }}</p>
            <small>Lokasi: {{ lf.location }} · {{ formatDate(lf.createdAt) }}</small>
          </div>
        </article>
      </div>
    </section>

    <section v-else-if="activeTab === 'vehicles'">
      <StatePanel v-if="vehicles.loading.value" state="loading" />
      <EmptyState v-else-if="!vehicles.data.value?.length" title="Belum ada kendaraan terdaftar" message="Daftarkan nomor kendaraan rumah tangga untuk stiker bebas akses pos." />
      <div v-else class="service-grid">
        <article v-for="v in vehicles.data.value" :key="v.id" class="card service-card">
          <span class="card-icon"><CarFront :size="22" /></span>
          <div>
            <span class="cat-tag">{{ v.type }}</span>
            <h2>{{ v.plateNumber }}</h2>
            <p>{{ v.brandModel }}</p>
          </div>
        </article>
      </div>
    </section>

    <section v-else>
      <StatePanel v-if="visitors.loading.value" state="loading" />
      <EmptyState v-else-if="!visitors.data.value?.length" title="Belum ada pre-registrasi tamu" message="Buat akses QR tamu untuk mempermudah pemeriksaan di pos keamanan." />
      <div v-else class="service-grid">
        <article v-for="vis in visitors.data.value" :key="vis.id" class="card service-card">
          <span class="card-icon"><QrCode :size="22" /></span>
          <div>
            <div class="card-top"><span class="cat-tag">QR Akses Tamu</span><StatusBadge :status="vis.status" /></div>
            <h2>{{ vis.name }}</h2>
            <p>{{ vis.purpose }} · {{ formatDate(vis.expectedArrival) }}</p>
            <div class="qr-token">Kode akses: <code>{{ vis.passCode }}</code></div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.portal-page { display: grid; max-width: var(--content); gap: 1.2rem; margin-inline: auto; }
.portal-page-heading { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 1rem; }
.portal-page-heading h1 { margin-bottom: .45rem; font-size: clamp(2rem, 4.5vw, 3rem); }
.portal-page-heading p { max-width: 46rem; margin: 0; color: var(--ink-650); }
.service-tabs { display: flex; gap: .35rem; overflow-x: auto; padding: .35rem; border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--paper); }
.service-tabs button { display: inline-flex; min-height: 2.6rem; align-items: center; gap: .45rem; padding: .55rem .8rem; border: 0; border-radius: .65rem; background: transparent; color: var(--ink-650); font-size: .8rem; font-weight: 750; white-space: nowrap; cursor: pointer; }
.service-tabs button.active { background: var(--teal-100); color: var(--teal-800); }
.service-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr)); gap: 1rem; }
.service-card { display: flex; gap: 1rem; padding: 1.2rem; }
.card-icon { display: grid; width: 2.9rem; height: 2.9rem; flex: none; place-items: center; border-radius: .85rem; background: var(--teal-100); color: var(--teal-700); }
.card-icon.amber { background: var(--amber-100); color: var(--amber-700); }
.cat-tag { color: var(--teal-700); font-size: .72rem; font-weight: 850; text-transform: uppercase; }
.service-card h2 { margin: .15rem 0; font-size: 1.1rem; }
.service-card p { margin: 0 0 .3rem; color: var(--ink-650); font-size: .84rem; }
.phone-link { display: inline-flex; align-items: center; gap: .3rem; color: var(--teal-700); font-size: .78rem; font-weight: 800; text-decoration: none; }
.qr-token { display: inline-flex; align-items: center; gap: .3rem; padding: .2rem .4rem; border-radius: .4rem; background: var(--cream-100); font-size: .72rem; font-weight: 800; }
.form-panel { padding: 1.3rem; }
.form-modal { position: fixed; z-index: 50; inset: 0; display: grid; place-items: center; overflow-y: auto; padding: 1rem; background: rgb(16 43 39 / .38); backdrop-filter: blur(5px); }
.form-modal .form-panel { width: min(100%, 48rem); max-height: 92vh; overflow-y: auto; box-shadow: var(--shadow-lg); }
.panel-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
.close-btn { border: 0; background: transparent; font-size: 1.4rem; cursor: pointer; }
.two-fields { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
@media (max-width: 600px) { .two-fields { grid-template-columns: 1fr; } .form-modal { align-items: end; padding: .5rem; } .form-modal .form-panel { max-height: 94vh; border-radius: 1.1rem 1.1rem .8rem .8rem; } }
</style>
