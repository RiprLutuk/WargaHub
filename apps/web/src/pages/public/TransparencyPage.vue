<script setup lang="ts">
import { ArrowDownRight, ArrowUpRight, Landmark, ShieldCheck } from 'lucide-vue-next';
import StatePanel from '../../components/StatePanel.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import { formatRupiah } from '../../lib/format';
import { adaptPublicTransparency } from '../../lib/view-models';

const report = useResource(async () => adaptPublicTransparency(await api.get<unknown>('/public/transparency')));
function periodLabel(period: string): string {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) return period;
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)));
}
</script>

<template>
  <div class="container page-stack">
    <header class="page-heading"><span class="eyebrow">Terbuka tanpa membuka data pribadi</span><h1>Transparansi keuangan</h1><p>Ringkasan kas yang sudah disanitasi. Nama pembayar, bukti transfer, dan nomor rekening tidak pernah ditampilkan di halaman publik.</p></header>
    <StatePanel v-if="report.loading.value" state="loading" />
    <StatePanel v-else-if="report.error.value" state="error" :message="report.error.value" @retry="report.reload" />
    <template v-else-if="report.data.value">
      <div class="report-meta"><div><Landmark :size="22" aria-hidden="true" /><span><strong>Ringkasan kas terpublikasi</strong><small>{{ report.data.value.note }}</small></span></div><span class="sanitized"><ShieldCheck :size="15" /> Data publik tersanitasi</span></div>
      <dl class="finance-grid">
        <div class="income"><dt><ArrowUpRight :size="16" /> Pemasukan</dt><dd>{{ formatRupiah(report.data.value.income) }}</dd></div>
        <div class="expense"><dt><ArrowDownRight :size="16" /> Pengeluaran</dt><dd>{{ formatRupiah(report.data.value.expense) }}</dd></div>
        <div class="closing"><dt>Saldo</dt><dd>{{ formatRupiah(report.data.value.balance) }}</dd></div>
      </dl>
      <section class="card card-body" aria-labelledby="monthly-heading"><div class="section-heading"><div><h2 id="monthly-heading">Ringkasan bulanan</h2><p class="muted">Agregat pemasukan dan pengeluaran, tanpa identitas atau bukti transaksi.</p></div></div><div v-if="report.data.value.monthly.length" class="category-list"><div v-for="item in report.data.value.monthly" :key="item.period"><span>{{ periodLabel(item.period) }}</span><strong><span class="income-text">+{{ formatRupiah(item.income) }}</span> · <span class="expense-text">−{{ formatRupiah(item.expense) }}</span></strong><span class="bar"><i :style="{ width: `${Math.min(100, item.income > 0 ? item.expense / item.income * 100 : 0)}%` }" /></span></div></div><p v-else class="muted">Belum ada transaksi terpublikasi untuk ditampilkan.</p></section>
    </template>
  </div>
</template>

<style scoped>
.report-meta { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.report-meta > div { display: flex; align-items: center; gap: .7rem; }
.report-meta span span { display: grid; }
.report-meta small { color: var(--ink-650); }
.sanitized { display: inline-flex; align-items: center; gap: .35rem; padding: .4rem .6rem; border-radius: 999px; background: var(--teal-100); color: var(--teal-700); font-size: .73rem; font-weight: 800; }
.finance-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .8rem; margin: 0; }
.finance-grid div { padding: 1.1rem; border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--paper); }
.finance-grid dt { display: flex; align-items: center; gap: .3rem; color: var(--ink-650); font-size: .76rem; font-weight: 700; }
.finance-grid dd { margin: .5rem 0 0; font-size: clamp(1.1rem, 2vw, 1.45rem); font-weight: 850; letter-spacing: -.03em; }
.finance-grid .income dd { color: var(--success-700); }
.finance-grid .expense dd { color: var(--coral-700); }
.finance-grid .closing { border-color: var(--teal-700); background: var(--ink-950); color: white; }
.finance-grid .closing dt { color: rgb(255 255 255 / .65); }
.category-list { display: grid; gap: 1rem; }
.category-list > div { display: grid; grid-template-columns: 1fr auto; gap: .35rem 1rem; }
.category-list strong { font-size: .88rem; }
.bar { grid-column: 1 / -1; height: .45rem; overflow: hidden; border-radius: 99px; background: var(--cream-100); }
.bar i { display: block; height: 100%; border-radius: inherit; background: var(--teal-600); }
.income-text { color: var(--success-700); }
.expense-text { color: var(--coral-700); }
@media (max-width: 850px) { .finance-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 520px) { .report-meta { align-items: flex-start; flex-direction: column; } .finance-grid { grid-template-columns: 1fr; } }
</style>
