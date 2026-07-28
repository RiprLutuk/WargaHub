<script setup lang="ts">
import { Phone, Store } from 'lucide-vue-next';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';

interface PublicBusiness {
  id: string;
  name: string;
  category: string;
  description: string;
  phone: string;
  address?: string | null;
}

const businesses = useResource(() => api.get<PublicBusiness[]>('/public/businesses'));
</script>

<template>
  <div class="container section">
    <header class="page-heading">
      <span class="eyebrow">Ekonomi Lokal Warga</span>
      <h1>Direktori UMKM & jasa warga</h1>
      <p>Dukung usaha tetangga dan beli kebutuhan harian langsung dari warga di sekitar lingkungan RT/RW.</p>
    </header>

    <StatePanel v-if="businesses.loading.value" state="loading" />
    <StatePanel v-else-if="businesses.error.value" state="error" :message="businesses.error.value" @retry="businesses.reload" />
    <EmptyState v-else-if="!businesses.data.value?.length" title="Belum ada UMKM terdaftar" message="Belum ada direktori usaha warga yang terdaftar saat ini." />

    <div v-else class="biz-grid">
      <article v-for="b in businesses.data.value" :key="b.id" class="card biz-card">
        <span class="icon-box"><Store :size="24" /></span>
        <div>
          <span class="cat-tag">{{ b.category }}</span>
          <h2>{{ b.name }}</h2>
          <p>{{ b.description }}</p>
          <a :href="`https://wa.me/${b.phone.replace(/^0/, '62')}`" target="_blank" class="phone-link"><Phone :size="14" /> {{ b.phone }}</a>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.page-heading { margin-bottom: 2rem; }
.page-heading h1 { margin-bottom: .45rem; font-size: clamp(2.2rem, 5vw, 3.2rem); }
.page-heading p { max-width: 44rem; margin: 0; color: var(--ink-650); }
.biz-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr)); gap: 1rem; }
.biz-card { display: flex; gap: 1rem; padding: 1.3rem; }
.icon-box { display: grid; width: 3.2rem; height: 3.2rem; flex: none; place-items: center; border-radius: .9rem; background: var(--teal-100); color: var(--teal-700); }
.cat-tag { color: var(--teal-700); font-size: .72rem; font-weight: 850; text-transform: uppercase; }
.biz-card h2 { margin: .2rem 0; font-size: 1.2rem; }
.biz-card p { margin: 0 0 .5rem; color: var(--ink-650); font-size: .86rem; line-height: 1.45; }
.phone-link { display: inline-flex; align-items: center; gap: .3rem; color: var(--teal-700); font-size: .82rem; font-weight: 800; text-decoration: none; }
</style>
