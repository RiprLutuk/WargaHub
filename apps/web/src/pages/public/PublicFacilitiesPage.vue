<script setup lang="ts">
import { Home } from 'lucide-vue-next';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import { formatRupiah } from '../../lib/format';

interface PublicFacility {
  id: string;
  name: string;
  category: string;
  description: string;
  capacity?: number | null;
  fee: number;
}

const facilities = useResource(() => api.get<PublicFacility[]>('/public/facilities'));
</script>

<template>
  <div class="container public-page-container">
    <header class="page-heading">
      <span class="eyebrow">Aset Bersama Lingkungan</span>
      <h1>Fasilitas & inventaris publik</h1>
      <p>Informasi penggunaan balai warga, lapangan, tenda, dan peralatan RT/RW yang dapat dimanfaatkan oleh warga terdaftar.</p>
    </header>

    <StatePanel v-if="facilities.loading.value" state="loading" />
    <StatePanel v-else-if="facilities.error.value" state="error" :message="facilities.error.value" @retry="facilities.reload" />
    <EmptyState v-else-if="!facilities.data.value?.length" title="Belum ada fasilitas dipublikasikan" message="Pengurus belum memublikasikan daftar fasilitas publik." />

    <div v-else class="facility-grid">
      <article v-for="item in facilities.data.value" :key="item.id" class="card facility-card">
        <span class="icon-box"><Home :size="24" /></span>
        <div class="card-content">
          <span class="cat-tag">{{ item.category }}</span>
          <h2>{{ item.name }}</h2>
          <p>{{ item.description }}</p>
          <div class="facility-meta">
            <span class="fee">{{ item.fee > 0 ? formatRupiah(item.fee) : 'Gratis Penggunaan' }}</span>
            <span v-if="item.capacity" class="capacity">Kapasitas: {{ item.capacity }} orang</span>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.public-page-container { padding-block: clamp(3rem, 6vw, 5.5rem); }
.page-heading { margin-bottom: 3rem; }
.page-heading .eyebrow { margin-bottom: .6rem; }
.page-heading h1 { margin-bottom: .75rem; font-size: clamp(2.2rem, 5vw, 3.4rem); line-height: 1.16; }
.page-heading p { max-width: 48rem; margin: 0; color: var(--ink-650); font-size: 1.1rem; line-height: 1.6; }
.facility-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr)); gap: 1.4rem; }
.facility-card { display: flex; gap: 1.2rem; padding: 1.6rem 1.8rem; border-radius: var(--radius-lg); }
.icon-box { display: grid; width: 3.4rem; height: 3.4rem; flex: none; place-items: center; border-radius: 1rem; background: var(--teal-100); color: var(--teal-700); }
.card-content { display: grid; gap: .4rem; flex: 1; }
.cat-tag { color: var(--teal-700); font-size: .74rem; font-weight: 850; text-transform: uppercase; letter-spacing: .03em; }
.facility-card h2 { margin: .1rem 0; font-size: 1.28rem; line-height: 1.3; }
.facility-card p { margin: 0 0 .8rem; color: var(--ink-650); font-size: .92rem; line-height: 1.55; }
.facility-meta { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: .6rem; border-top: 1px solid var(--line); font-size: .84rem; font-weight: 750; color: var(--ink-800); }
.fee { color: var(--amber-700); }
</style>
