<script setup lang="ts">
import { Ambulance, Flame, PhoneCall, ShieldAlert, TriangleAlert } from 'lucide-vue-next';
import { computed } from 'vue';
import StatePanel from '../../components/StatePanel.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import { adaptPublicSite } from '../../lib/view-models';

const site = useResource(async () => adaptPublicSite(await api.get<unknown>('/public/site')));
const nationalContacts = [
  { label: 'Nomor darurat nasional', number: '112', icon: PhoneCall, note: 'Keadaan darurat umum' },
  { label: 'Ambulans / kesehatan', number: '119', icon: Ambulance, note: 'Pertolongan medis' },
  { label: 'Pemadam kebakaran', number: '113', icon: Flame, note: 'Kebakaran dan penyelamatan' },
];
const contacts = computed(() => {
  const localNumber = site.data.value?.emergencyPhone;
  if (!localNumber || nationalContacts.some((item) => item.number === localNumber)) return nationalContacts;
  return [...nationalContacts, {
    label: `Kontak darurat ${site.data.value?.shortName || 'lingkungan'}`,
    number: localNumber,
    icon: ShieldAlert,
    note: 'Nomor lokal yang dikelola pengurus',
  }];
});
</script>

<template>
  <div class="emergency-page">
    <div class="container page-stack">
      <header class="page-heading"><span class="emergency-eyebrow"><TriangleAlert :size="16" /> Informasi darurat</span><h1>Bantuan cepat</h1><p>Hubungi layanan yang sesuai secara langsung. Jangan mengirim pengaduan portal jika keselamatan seseorang sedang terancam.</p></header>
      <div class="notice notice-warning"><TriangleAlert :size="22" aria-hidden="true" /><span>Pastikan Anda berada di tempat aman. Sampaikan lokasi, jenis kejadian, dan jumlah orang yang membutuhkan bantuan.</span></div>
      <StatePanel v-if="site.error.value" state="error" message="Nomor darurat lingkungan belum dapat dimuat. Nomor nasional tetap tersedia di bawah." @retry="site.reload" />
      <div class="contact-cards"><article v-for="item in contacts" :key="item.number" class="emergency-card"><component :is="item.icon" :size="26" aria-hidden="true" /><div><h2>{{ item.label }}</h2><p>{{ item.note }}</p></div><a class="call-button" :href="`tel:${item.number}`" :aria-label="`Telepon ${item.label} di ${item.number}`">{{ item.number }}</a></article></div>
      <p class="disclaimer">Nomor dapat berbeda menurut wilayah. Pengurus instalasi WargaHub bertanggung jawab menjaga informasi ini tetap mutakhir.</p>
    </div>
  </div>
</template>

<style scoped>
.emergency-page { min-height: 65vh; background: linear-gradient(180deg, #fff4f0, var(--cream-50)); }
.emergency-eyebrow { display: inline-flex; align-items: center; gap: .4rem; margin-bottom: .8rem; color: var(--coral-700); font-size: .78rem; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; }
.contact-cards { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
.emergency-card { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 1rem; padding: 1.2rem; border: 1px solid var(--coral-100); border-radius: var(--radius-lg); background: var(--paper); }
.emergency-card > svg { color: var(--coral-700); }
.emergency-card h2 { margin-bottom: .15rem; font-size: 1rem; }
.emergency-card p { margin: 0; color: var(--ink-650); font-size: .82rem; }
.call-button { min-width: 6.5rem; padding: .65rem .8rem; border-radius: .7rem; background: var(--coral-700); color: white; font-size: 1.05rem; font-weight: 850; text-align: center; text-decoration: none; }
.disclaimer { color: var(--ink-650); font-size: .8rem; }
@media (max-width: 700px) { .contact-cards { grid-template-columns: 1fr; } }
@media (max-width: 450px) { .emergency-card { grid-template-columns: auto 1fr; } .call-button { grid-column: 1 / -1; } }
</style>
