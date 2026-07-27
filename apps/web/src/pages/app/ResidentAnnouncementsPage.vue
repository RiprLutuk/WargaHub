<script setup lang="ts">
import { Megaphone } from 'lucide-vue-next';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import type { Announcement } from '../../lib/demo';
import { formatDate } from '../../lib/format';
const announcements = useResource(() => api.get<Announcement[]>('/announcements'));
</script>
<template><div class="portal-page"><header><span class="eyebrow">Informasi untuk penghuni</span><h1>Pengumuman warga</h1><p>Pengumuman internal hanya dapat dibaca oleh akun yang sudah diverifikasi.</p></header><StatePanel v-if="announcements.loading.value" state="loading"/><StatePanel v-else-if="announcements.error.value" state="error" :message="announcements.error.value" @retry="announcements.reload"/><EmptyState v-else-if="!announcements.data.value?.length" title="Belum ada pengumuman"/><div v-else class="items"><article v-for="item in announcements.data.value" :key="item.id" class="card card-body"><span class="icon"><Megaphone :size="19"/></span><div><small>{{ item.category }} · {{ formatDate(item.publishedAt) }}</small><h2>{{ item.title }}</h2><p>{{ item.summary }}</p></div></article></div></div></template>
<style scoped>.portal-page{display:grid;max-width:78rem;gap:1.2rem;margin-inline:auto}header h1{margin-bottom:.45rem;font-size:clamp(2rem,4.5vw,3rem)}header p{color:var(--ink-650)}.items{display:grid;gap:.7rem}.items article{display:flex;gap:.8rem}.icon{display:grid;width:2.6rem;height:2.6rem;flex:none;place-items:center;border-radius:.75rem;background:var(--amber-100);color:var(--amber-700)}small{color:var(--teal-700);font-weight:750}h2{margin:.15rem 0;font-size:1.08rem}article p{margin:0;color:var(--ink-650)}</style>
