<script setup lang="ts">
import { Car, CarFront, HelpCircle, PackageSearch, Phone, Plus, QrCode, Search, ShieldCheck, ShoppingBag, Store, UserCheck, Users, X } from 'lucide-vue-next';
import { computed, reactive, ref } from 'vue';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import { useResource } from '../../composables/useResource';
import { api, ApiClientError } from '../../lib/api';
import { formatDate, formatDateTime } from '../../lib/format';

interface Business {
  id: string;
  name: string;
  category: string;
  description: string;
  phone: string;
  address?: string | null;
}

interface LostFound {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  status: string;
  createdAt: string;
}

interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  type: string;
}

interface Visitor {
  id: string;
  name: string;
  visitDate: string;
  qrCodeToken: string;
  status: string;
}

const activeTab = ref<'umkm' | 'lost_found' | 'vehicles' | 'visitors'>('umkm');
const businesses = useResource(() => api.get<Business[]>('/businesses'));
const lostFounds = useResource(() => api.get<LostFound[]>('/lost-found'));
const vehicles = useResource(() => api.get<Vehicle[]>('/vehicles'));
const visitors = useResource(() => api.get<Visitor[]>('/visitors'));

const search = ref('');
const busy = ref(false);
const formOpen = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

const umkmForm = reactive({ name: '', category: 'KULINER', description: '', phone: '' });
const lostForm = reactive({ title: '', description: '', location: '', category: 'BARANG' });
const vehicleForm = reactive({ plateNumber: '', model: 'Mobil Honda HR-V Silver', type: 'CAR' });
const visitorForm = reactive({ name: '', visitDate: '2026-08-10', purpose: 'Tamu keluarga' });

async function submitForm() {
  busy.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    if (activeTab.value === 'umkm') {
      await api.post('/businesses', { ...umkmForm });
      successMsg.value = 'Usaha UMKM Anda berhasil didaftarkan ke direktori warga.';
      await businesses.reload();
    } else if (activeTab.value === 'lost_found') {
      await api.post('/lost-found', { ...lostForm });
      successMsg.value = 'Laporan kehilangan/penemuan barang berhasil diterbitkan.';
      await lostFounds.reload();
    } else if (activeTab.value === 'vehicles') {
      await api.post('/vehicles', { ...vehicleForm });
      successMsg.value = 'Kendaraan rumah tangga berhasil terdaftar.';
      await vehicles.reload();
    } else if (activeTab.value === 'visitors') {
      await api.post('/visitors', { ...visitorForm });
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
    <section v-if="formOpen" class="card form-panel">
      <div class="panel-header">
        <div>
          <span class="eyebrow">Formulir Layanan</span>
          <h2>
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
          <div class="field"><label for="biz-desc">Deskripsi Produk / Jasa</label><textarea id="biz-desc" v-model.trim="umkmForm.description" rows="3" required /></div>
        </template>

        <!-- Lost Found Form -->
        <template v-else-if="activeTab === 'lost_found'">
          <div class="field"><label for="lf-title">Nama Barang</label><input id="lf-title" v-model.trim="lostForm.title" placeholder="Misal: Kunci Motor Honda dengan Gantungan Biru" required /></div>
          <div class="two-fields">
            <div class="field"><label for="lf-cat">Kategori Laporan</label><select id="lf-cat" v-model="lostForm.category"><option value="BARANG">Barang Hilang</option><option value="DITEMUKAN">Barang Ditemukan di Fasum</option></select></div>
            <div class="field"><label for="lf-loc">Lokasi Terakhir / Ditemukan</label><input id="lf-loc" v-model.trim="lostForm.location" placeholder="Taman RW / Dekat Pos Ronda Blok A" required /></div>
          </div>
          <div class="field"><label for="lf-desc">Ciri-Ciri & Deskripsi Singkat</label><textarea id="lf-desc" v-model.trim="lostForm.description" rows="3" required /></div>
        </template>

        <!-- Vehicle Form -->
        <template v-else-if="activeTab === 'vehicles'">
          <div class="two-fields">
            <div class="field"><label for="veh-plate">Nomor Polisi (Plat)</label><input id="veh-plate" v-model.trim="vehicleForm.plateNumber" placeholder="B 1234 ABC" required /></div>
            <div class="field"><label for="veh-type">Jenis Kendaraan</label><select id="veh-type" v-model="vehicleForm.type"><option value="CAR">Mobil</option><option value="MOTORCYCLE">Sepeda Motor</option><option value="BICYCLE">Sepeda / Lainnya</option></select></div>
          </div>
          <div class="field"><label for="veh-model">Merk & Warna</label><input id="veh-model" v-model.trim="vehicleForm.model" required /></div>
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
            <a :href="`https://wa.me/${b.phone.replace(/^0/, '62')}`" target="_blank" class="phone-link"><Phone :size="14" /> {{ b.phone }}</a>
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
            <div class="card-top"><span class="cat-tag">{{ lf.category }}</span><StatusBadge :status="lf.status" /></div>
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
            <p>{{ v.model }}</p>
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
            <p>Tanggal Kunjungan: {{ formatDate(vis.visitDate) }}</p>
            <div class="qr-token">Token QR: <code>{{ vis.qrCodeToken }}</code></div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.portal-page { display: grid; max-width: 78rem; gap: 1.2rem; margin-inline: auto; }
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
.panel-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
.close-btn { border: 0; background: transparent; font-size: 1.4rem; cursor: pointer; }
.two-fields { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
@media (max-width: 600px) { .two-fields { grid-template-columns: 1fr; } }
</style>
