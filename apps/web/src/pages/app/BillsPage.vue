<script setup lang="ts">
import { CheckCircle2, Clock3, FileUp, Info, ReceiptText, ShieldCheck, X } from 'lucide-vue-next';
import { computed, reactive, ref } from 'vue';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import SmartSelect from '../../components/SmartSelect.vue';
import StatusBadge from '../../components/StatusBadge.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import { createManualPayment, type ManualPaymentInput } from '../../lib/billing';
import { formatDate, formatRupiah } from '../../lib/format';
import { adaptBills, type BillView } from '../../lib/view-models';

const bills = useResource(async () => adaptBills(await api.get<unknown>('/bills')));
const selected = ref<BillView | null>(null);
const confirming = ref(false);
const submitting = ref(false);
const success = ref('');
const form = reactive({ amount: 0, method: 'BANK_TRANSFER', note: '', file: null as File | null });
const outstanding = computed(() => (bills.data.value ?? []).filter((bill) => ['OPEN', 'PARTIALLY_PAID'].includes(bill.status)).reduce((sum, bill) => sum + Math.max(0, bill.amount - bill.amountPaid), 0));

function openPayment(bill: BillView) {
  selected.value = bill;
  form.amount = Math.max(1, bill.amount - bill.amountPaid);
  form.method = 'BANK_TRANSFER';
  form.note = '';
  form.file = null;
  confirming.value = false;
  success.value = '';
}

function pickFile(event: Event) {
  form.file = (event.target as HTMLInputElement).files?.[0] ?? null;
}

function closePayment() {
  selected.value = null;
  confirming.value = false;
}

async function submitPayment() {
  if (!selected.value) return;
  submitting.value = true;
  try {
    let proofFileId: string | undefined;
    if (form.method === 'BANK_TRANSFER' && form.file) {
      const upload = new FormData();
      upload.append('file', form.file);
      const file = await api.post<{ id: string }>('/files', upload);
      proofFileId = file.id;
    }
    const payment: ManualPaymentInput = {
      amount: form.amount,
      method: form.method as ManualPaymentInput['method'],
      ...(proofFileId ? { proofFileId } : {}),
      ...(form.note ? { note: form.note } : {}),
    };
    await createManualPayment(api, selected.value.id, payment, crypto.randomUUID());
    success.value = 'Bukti pembayaran berhasil dikirim dan menunggu pemeriksaan bendahara.';
    confirming.value = false;
    await bills.reload();
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="portal-page">
    <header class="portal-page-heading">
      <div>
        <span class="eyebrow">Kewajiban rumah</span>
        <h1>Tagihan & pembayaran</h1>
        <p>Tagihan hanya dapat dilihat oleh anggota rumah yang berizin. Pengingat selalu dikirim secara privat.</p>
      </div>
      <div class="outstanding">
        <span>Total perlu diselesaikan</span>
        <strong>{{ formatRupiah(outstanding) }}</strong>
      </div>
    </header>

    <div class="notice">
      <ShieldCheck :size="19" aria-hidden="true" />
      <span>Tidak ada daftar tunggakan publik. Jika membutuhkan dispensasi atau penjadwalan ulang, hubungi bendahara secara privat.</span>
    </div>

    <StatePanel v-if="bills.loading.value" state="loading" />
    <StatePanel v-else-if="bills.error.value" state="error" :message="bills.error.value" @retry="bills.reload" />
    <EmptyState v-else-if="!bills.data.value?.length" title="Belum ada tagihan" />
    <div v-else class="bill-list">
      <article v-for="bill in bills.data.value" :key="bill.id" class="card bill-row">
        <span class="bill-icon"><ReceiptText :size="21" /></span>
        <div class="bill-copy">
          <div>
            <h2>{{ bill.title }}</h2>
            <StatusBadge :status="bill.status" />
          </div>
          <p>{{ bill.period }} · Jatuh tempo {{ formatDate(bill.dueAt) }}</p>
          <small>{{ bill.description }}</small>
          <small v-if="bill.amountPaid > 0" class="paid-progress">Sudah dibayar {{ formatRupiah(bill.amountPaid) }} · Sisa {{ formatRupiah(Math.max(0, bill.amount - bill.amountPaid)) }}</small>
        </div>
        <strong>{{ formatRupiah(bill.amount) }}</strong>

        <button v-if="['OPEN', 'PARTIALLY_PAID'].includes(bill.status)" class="button button-sm" type="button" @click="openPayment(bill)">{{ bill.amountPaid > 0 ? 'Bayar sisa' : 'Kirim bukti' }}</button>
        <span v-else-if="bill.status === 'PENDING_VERIFICATION'" class="pending-note"><Clock3 :size="16" /> Menunggu pemeriksaan</span>
        <span v-else-if="bill.status === 'PAID'" class="paid-note"><CheckCircle2 :size="16" /> Tercatat lunas</span>
        <span v-else class="muted small">Tagihan tidak menerima pembayaran baru</span>
      </article>
    </div>

    <div v-if="selected" class="payment-panel" role="region" aria-labelledby="payment-form-heading">
      <div class="panel-header">
        <div>
          <span class="eyebrow">Pembayaran manual</span>
          <h2 id="payment-form-heading">{{ selected.title }} · {{ selected.period }}</h2>
        </div>
        <button class="close-button" type="button" aria-label="Tutup formulir pembayaran" @click="closePayment"><X :size="20" /></button>
      </div>

      <div v-if="success" class="notice" role="status"><CheckCircle2 :size="20" /><span>{{ success }}</span></div>
      <template v-else-if="!confirming">
        <form class="form-grid" @submit.prevent="confirming = true">
          <div class="two-fields">
            <div class="field"><label for="payment-amount">Nominal pembayaran</label><input id="payment-amount" v-model.number="form.amount" type="number" min="1" required /></div>
            <div class="field">
              <label for="payment-method">Metode pembayaran</label>
              <SmartSelect id="payment-method" v-model="form.method" :options="[{ value: 'BANK_TRANSFER', label: 'Transfer bank' }, { value: 'CASH', label: 'Tunai melalui pengurus' }]" :searchable="false" />
            </div>
          </div>
          <div v-if="form.method === 'BANK_TRANSFER'" class="field">
            <label for="payment-proof">Bukti transfer</label>
            <label class="upload-box" for="payment-proof">
              <FileUp :size="22" aria-hidden="true" />
              <span><strong>{{ form.file?.name ?? 'Pilih gambar atau PDF' }}</strong><small>Maksimal 10 MB. Bukti bersifat privat.</small></span>
            </label>
            <input id="payment-proof" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required @change="pickFile" />
          </div>
          <div class="field"><label for="payment-note">Catatan (opsional)</label><textarea id="payment-note" v-model="form.note" rows="3" placeholder="Contoh: transfer dari rekening pasangan" /></div>
          <div class="notice notice-warning"><Info :size="18" /><span>Pastikan nominal dan bukti sudah sesuai. Bendahara hanya melihat data yang dibutuhkan untuk pemeriksaan.</span></div>
          <div class="form-actions"><button class="button" type="submit">Tinjau pembayaran</button><button class="button button-secondary" type="button" @click="closePayment">Batal</button></div>
        </form>
      </template>

      <div v-else class="review-payment">
        <span>Periksa sebelum mengirim</span>
        <dl>
          <div><dt>Tagihan</dt><dd>{{ selected.title }} · {{ selected.period }}</dd></div>
          <div><dt>Nominal</dt><dd>{{ formatRupiah(form.amount) }}</dd></div>
          <div><dt>Metode</dt><dd>{{ form.method === 'BANK_TRANSFER' ? 'Transfer bank' : 'Tunai' }}</dd></div>
          <div v-if="form.file"><dt>Bukti</dt><dd>{{ form.file.name }}</dd></div>
        </dl>
        <div class="form-actions">
          <button class="button" type="button" :disabled="submitting" @click="submitPayment">{{ submitting ? 'Mengirim…' : 'Kirim untuk diperiksa' }}</button>
          <button class="button button-secondary" type="button" @click="confirming = false">Kembali periksa</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.portal-page { display: grid; max-width: var(--content); gap: 1.2rem; margin-inline: auto; }
.portal-page-heading { display: flex; align-items: end; justify-content: space-between; gap: 1.5rem; }
.portal-page-heading h1 { margin-bottom: .45rem; font-size: clamp(2rem, 4.5vw, 3rem); }
.portal-page-heading p { max-width: 43rem; margin: 0; color: var(--ink-650); }
.outstanding { display: grid; flex: none; justify-items: end; }
.outstanding span { color: var(--ink-650); font-size: .74rem; }
.outstanding strong { font-size: 1.6rem; letter-spacing: -.04em; }
.bill-list { display: grid; gap: .7rem; }
.bill-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; align-items: center; gap: 1rem; padding: 1rem; }
.bill-icon { display: grid; width: 2.8rem; height: 2.8rem; place-items: center; border-radius: .8rem; background: var(--cream-100); color: var(--teal-700); }
.bill-copy > div { display: flex; flex-wrap: wrap; align-items: center; gap: .55rem; }
.bill-copy h2 { margin: 0; font-size: 1rem; }
.bill-copy p, .bill-copy small { margin: 0; color: var(--ink-650); }
.bill-copy p { font-size: .83rem; }
.bill-copy small { font-size: .74rem; }
.bill-copy .paid-progress { color: var(--success-700); font-weight: 600; }
.paid-note { display: inline-flex; align-items: center; gap: .3rem; color: var(--success-700); font-size: .78rem; font-weight: 750; }
.pending-note { display: inline-flex; align-items: center; gap: .3rem; color: var(--amber-700); font-size: .78rem; font-weight: 750; }
.payment-panel { position: fixed; z-index: 50; top: 0; right: 0; width: min(100%, 36rem); height: 100vh; padding: clamp(1rem, 3vw, 2rem); overflow-y: auto; border-left: 1px solid var(--line); background: var(--paper); box-shadow: var(--shadow-lg); }
.panel-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
.panel-header h2 { font-family: var(--font-display); font-size: 1.65rem; }
.close-button { display: grid; width: 2.75rem; height: 2.75rem; flex: none; place-items: center; border: 1px solid var(--line); border-radius: .7rem; background: white; cursor: pointer; }
.two-fields { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
.upload-box { display: flex; min-height: 6rem; align-items: center; gap: .8rem; padding: 1rem; border: 1px dashed var(--teal-600); border-radius: var(--radius-md); background: var(--teal-50); color: var(--teal-700); cursor: pointer; }
.upload-box span { display: grid; }
.upload-box small { color: var(--ink-650); font-weight: 400; }
.review-payment { display: grid; gap: 1rem; }
.review-payment > span { color: var(--teal-700); font-weight: 850; }
.review-payment dl { display: grid; gap: 0; margin: 0; border: 1px solid var(--line); border-radius: var(--radius-md); }
.review-payment dl div { display: grid; grid-template-columns: 8rem 1fr; gap: 1rem; padding: .8rem; border-bottom: 1px solid var(--line); }
.review-payment dl div:last-child { border: 0; }
.review-payment dt { color: var(--ink-650); }
.review-payment dd { margin: 0; font-weight: 750; }
@media (max-width: 760px) { .portal-page-heading { align-items: flex-start; flex-direction: column; } .outstanding { justify-items: start; } .bill-row { grid-template-columns: auto 1fr; } .bill-row > strong { grid-column: 2; } .bill-row > button, .bill-row > .paid-note, .bill-row > .pending-note { grid-column: 1 / -1; justify-self: stretch; } .two-fields { grid-template-columns: 1fr; } }
</style>
