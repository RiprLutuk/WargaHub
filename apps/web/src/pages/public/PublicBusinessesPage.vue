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
  <div class="container public-page-container">
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
        <div class="card-content">
          <span class="cat-tag">{{ b.category }}</span>
          <h2>{{ b.name }}</h2>
          <p>{{ b.description }}</p>
          <a :href="`https://wa.me/${b.phone.replace(/^0/, '62')}`" target="_blank" class="phone-link"><Phone :size="15" /> Hubungi: {{ b.phone }}</a>
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
.biz-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr)); gap: 1.4rem; }
.biz-card { display: flex; gap: 1.2rem; padding: 1.6rem 1.8rem; border-radius: var(--radius-lg); }
.icon-box { display: grid; width: 3.4rem; height: 3.4rem; flex: none; place-items: center; border-radius: 1rem; background: var(--teal-100); color: var(--teal-700); }
.card-content { display: grid; gap: .4rem; flex: 1; }
.cat-tag { color: var(--teal-700); font-size: .74rem; font-weight: 850; text-transform: uppercase; letter-spacing: .03em; }
.biz-card h2 { margin: .1rem 0; font-size: 1.28rem; line-height: 1.3; }
.biz-card p { margin: 0 0 .8rem; color: var(--ink-650); font-size: .92rem; line-height: 1.55; }
.phone-link { display: inline-flex; align-items: center; gap: .4rem; margin-top: auto; padding-top: .6rem; border-top: 1px solid var(--line); color: var(--teal-700); font-size: .84rem; font-weight: 800; text-decoration: none; }
.phone-link:hover { text-decoration: underline; }
</style>
