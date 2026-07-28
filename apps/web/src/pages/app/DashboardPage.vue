<script setup lang="ts">
import { ArrowRight, CalendarClock, CheckCircle2, CircleAlert, Clock3, Megaphone, ReceiptText } from 'lucide-vue-next';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import type { Announcement, Complaint } from '../../lib/demo';
import { formatDateTime, formatRupiah } from '../../lib/format';
import { adaptActivities, adaptBills, adaptPatrolAssignments } from '../../lib/view-models';
import { useSessionStore } from '../../stores/session';

const session = useSessionStore();
const bills = useResource(async () => adaptBills(await api.get<unknown>('/bills')));
const announcements = useResource(() => api.get<Announcement[]>('/announcements'));
const complaints = useResource(() => api.get<Complaint[]>('/complaints'));
const activities = useResource(async () => adaptActivities(await api.get<unknown>('/activities')));
const patrols = useResource(async () => adaptPatrolAssignments(await api.get<unknown>('/patrol-assignments')));
const dueBills = computed(() => bills.data.value?.filter((bill) => ['OPEN', 'PARTIALLY_PAID'].includes(bill.status)) ?? []);
const importantAnnouncements = computed(() => announcements.data.value?.filter((item) => item.urgency !== 'NORMAL').slice(0, 2) ?? []);
const nextPatrol = computed(() => patrols.data.value?.[0]);
const nextActivity = computed(() => activities.data.value?.[0]);
</script>

<template>
  <div class="dashboard-page">
    <header class="portal-heading"><div><span class="eyebrow">Ringkasan rumah</span><h1>Apa yang perlu Anda tahu hari ini</h1><p>Prioritas pribadi ditampilkan lebih dulu. Tidak ada ranking atau perbandingan antarwarga.</p></div><span class="privacy-chip">Privat untuk {{ session.user?.householdIds.length === 1 ? 'rumah Anda' : `${session.user?.householdIds.length ?? 0} rumah terhubung` }}</span></header>

    <section aria-labelledby="attention-heading">
      <div class="section-heading"><div><h2 id="attention-heading">Perlu perhatian</h2><p class="muted">Kewajiban dan tindakan yang menunggu respons Anda.</p></div></div>
      <StatePanel v-if="bills.loading.value" state="loading" />
      <StatePanel v-else-if="bills.error.value" state="error" :message="bills.error.value" @retry="bills.reload" />
      <EmptyState v-else-if="!dueBills.length" title="Semua sudah tertangani" description="Tidak ada kewajiban rumah yang perlu diselesaikan saat ini." compact />
      <div v-else class="attention-grid">
        <article v-for="bill in dueBills" :key="bill.id" class="attention-card bill-card"><span class="attention-icon"><ReceiptText :size="21" /></span><div><div class="card-top"><span>Tagihan rumah</span><StatusBadge :status="bill.status" /></div><h3>{{ bill.title }} · {{ bill.period }}</h3><strong>{{ formatRupiah(bill.amount) }}</strong><p>Jatuh tempo {{ new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' }).format(new Date(bill.dueAt)) }}</p></div><RouterLink class="button button-sm" to="/app/tagihan">Selesaikan <ArrowRight :size="15" /></RouterLink></article>
        <article v-if="complaints.data.value?.some((item) => item.status === 'IN_PROGRESS')" class="attention-card"><span class="attention-icon info"><Clock3 :size="21" /></span><div><div class="card-top"><span>Pengaduan Anda</span><StatusBadge status="IN_PROGRESS" /></div><h3>Penanganan sedang berjalan</h3><p>Pengurus akan mengirim pembaruan melalui notifikasi.</p></div><RouterLink class="button button-secondary button-sm" to="/app/pengaduan">Lihat status</RouterLink></article>
      </div>
    </section>

    <section aria-labelledby="important-heading">
      <div class="section-heading"><div><h2 id="important-heading">Pengumuman penting</h2><p class="muted">Informasi resmi yang relevan untuk penghuni.</p></div><RouterLink to="/app/pengumuman">Lihat semua</RouterLink></div>
      <StatePanel v-if="announcements.loading.value" state="loading" />
      <EmptyState v-else-if="!importantAnnouncements.length" title="Tidak ada pengumuman mendesak" compact />
      <div v-else class="announcement-strip"><article v-for="item in importantAnnouncements" :key="item.id"><span><CircleAlert :size="19" /></span><div><small>{{ item.category }}</small><h3>{{ item.title }}</h3><p>{{ item.summary }}</p></div></article></div>
    </section>

    <div class="dashboard-columns">
      <section class="card card-body" aria-labelledby="schedule-heading"><div class="section-heading"><div><h2 id="schedule-heading">Jadwal pribadi</h2><p class="muted">Kegiatan dan ronda terdekat.</p></div></div><div class="schedule-list"><article v-if="nextPatrol"><span class="schedule-icon"><CalendarClock :size="18" /></span><div><small>Ronda · {{ nextPatrol.label }}</small><h3>{{ formatDateTime(nextPatrol.startsAt) }}</h3><p>{{ nextPatrol.area }}</p></div><RouterLink to="/app/ronda" aria-label="Lihat jadwal ronda"><ArrowRight :size="18" /></RouterLink></article><article v-if="nextActivity"><span class="schedule-icon amber"><CheckCircle2 :size="18" /></span><div><small>Kegiatan warga</small><h3>{{ nextActivity.title }}</h3><p>{{ formatDateTime(nextActivity.startsAt) }}</p></div><RouterLink to="/app/kegiatan" aria-label="Lihat kegiatan"><ArrowRight :size="18" /></RouterLink></article></div></section>
      <section class="card card-body" aria-labelledby="complaint-heading"><div class="section-heading"><div><h2 id="complaint-heading">Status pengaduan</h2><p class="muted">Hanya laporan yang Anda berhak lihat.</p></div></div><div class="compact-list"><article v-for="item in complaints.data.value?.slice(0, 3)" :key="item.id"><div><h3>{{ item.title }}</h3><small>Diperbarui {{ formatDateTime(item.updatedAt) }}</small></div><StatusBadge :status="item.status" /></article></div><RouterLink class="text-action" to="/app/pengaduan">Buka pusat pengaduan <ArrowRight :size="15" /></RouterLink></section>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page { display: grid; gap: 2rem; max-width: 78rem; margin-inline: auto; }
.portal-heading { display: flex; align-items: end; justify-content: space-between; gap: 1rem; }
.portal-heading h1 { margin-bottom: .55rem; font-size: clamp(2rem, 4.8vw, 3.25rem); }
.portal-heading p { max-width: 44rem; margin-bottom: 0; color: var(--ink-650); }
.privacy-chip { flex: none; padding: .45rem .65rem; border: 1px solid var(--teal-100); border-radius: 999px; background: var(--teal-50); color: var(--teal-700); font-size: .72rem; font-weight: 800; }
.attention-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 29rem), 1fr)); gap: .8rem; }
.attention-card { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 1rem; padding: 1.1rem; border: 1px solid var(--line); border-radius: var(--radius-lg); background: var(--paper); box-shadow: var(--shadow-sm); }
.bill-card { border-left: 4px solid var(--amber-500); }
.attention-icon, .schedule-icon { display: grid; width: 2.75rem; height: 2.75rem; place-items: center; border-radius: .8rem; background: var(--amber-100); color: var(--amber-700); }
.attention-icon.info { background: var(--blue-100); color: var(--blue-700); }
.card-top { display: flex; align-items: center; gap: .5rem; margin-bottom: .2rem; color: var(--ink-650); font-size: .72rem; }
.attention-card h3 { margin-bottom: .15rem; font-size: 1rem; }
.attention-card strong { font-size: 1.2rem; }
.attention-card p { margin: 0; color: var(--ink-650); font-size: .78rem; }
.announcement-strip { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
.announcement-strip article { display: flex; gap: .75rem; padding: 1rem; border: 1px solid var(--amber-100); border-radius: var(--radius-md); background: #fff9eb; }
.announcement-strip article > span { color: var(--amber-700); }
.announcement-strip small { color: var(--amber-700); font-weight: 800; text-transform: uppercase; }
.announcement-strip h3 { margin: .15rem 0 .25rem; }
.announcement-strip p { margin: 0; color: var(--ink-650); font-size: .84rem; }
.dashboard-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.schedule-list, .compact-list { display: grid; gap: .4rem; }
.schedule-list article, .compact-list article { display: flex; align-items: center; gap: .7rem; padding: .75rem 0; border-bottom: 1px solid var(--line); }
.schedule-list article:last-child, .compact-list article:last-child { border: 0; }
.schedule-list article > div:nth-child(2), .compact-list article > div { min-width: 0; flex: 1; }
.schedule-icon { width: 2.4rem; height: 2.4rem; flex: none; background: var(--teal-100); color: var(--teal-700); }
.schedule-icon.amber { background: var(--amber-100); color: var(--amber-700); }
.schedule-list small, .compact-list small { color: var(--ink-650); }
.schedule-list h3, .compact-list h3 { margin: .1rem 0; overflow: hidden; font-size: .9rem; text-overflow: ellipsis; white-space: nowrap; }
.schedule-list p { margin: 0; color: var(--ink-650); font-size: .75rem; }
.compact-list article { justify-content: space-between; }
.text-action { display: inline-flex; align-items: center; gap: .35rem; margin-top: .8rem; font-size: .82rem; font-weight: 750; text-decoration: none; }
@media (max-width: 980px) { .dashboard-columns { grid-template-columns: 1fr; } }
@media (max-width: 680px) { .portal-heading { align-items: flex-start; flex-direction: column; } .announcement-strip { grid-template-columns: 1fr; } .attention-card { grid-template-columns: auto 1fr; } .attention-card > .button { grid-column: 1 / -1; width: 100%; } }
</style>
