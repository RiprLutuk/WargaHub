type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null ? value as UnknownRecord : {};
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function number(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function compactIdentifier(value: unknown, prefix: string): string {
  const id = text(value);
  return id ? `${prefix} ••••${id.slice(-4)}` : prefix;
}

export interface PublicSiteView {
  name: string;
  shortName: string;
  slug: string;
  description: string;
  address: string;
  emergencyPhone: string;
  timezone: string;
  locale: string;
  households: number | null;
  activePrograms: number | null;
}

export function adaptPublicSite(input: unknown): PublicSiteView {
  const value = record(input);
  return {
    name: text(value.name, 'WargaHub'),
    shortName: text(value.shortName, 'Lingkungan warga'),
    slug: text(value.slug),
    description: text(value.description, 'Ruang resmi untuk informasi dan layanan warga.'),
    address: text(value.address, 'Alamat lingkungan belum diatur'),
    emergencyPhone: text(value.emergencyPhone, '112'),
    timezone: text(value.timezone, 'Asia/Jakarta'),
    locale: text(value.locale, 'id-ID'),
    households: nullableNumber(value.households),
    activePrograms: nullableNumber(value.activePrograms),
  };
}

export interface PublicTransparencyView {
  currency: string;
  income: number;
  expense: number;
  balance: number;
  monthly: Array<{ period: string; income: number; expense: number }>;
  entries: Array<{ kind: 'INCOME' | 'EXPENSE'; category: string; amount: number; occurredAt: string }>;
  note: string;
}

export function adaptPublicTransparency(input: unknown): PublicTransparencyView {
  const value = record(input);
  const income = number(value.income);
  const expense = number(value.expense);
  const monthly = Array.isArray(value.monthly)
    ? value.monthly.map((item) => record(item)).map((item) => ({
      period: text(item.period), income: number(item.income), expense: number(item.expense),
    })).filter((item) => item.period.length > 0)
    : [];
  const entries = Array.isArray(value.entries)
    ? value.entries.map((item) => record(item)).map((item) => ({
      kind: item.kind === 'EXPENSE' ? 'EXPENSE' as const : 'INCOME' as const,
      category: text(item.category, 'Lainnya'), amount: number(item.amount), occurredAt: text(item.occurredAt),
    })).filter((item) => item.occurredAt)
    : [];
  return {
    currency: text(value.currency, 'IDR'),
    income,
    expense,
    balance: number(value.balance, income - expense),
    monthly,
    entries,
    note: text(value.note, 'Laporan publik hanya menampilkan nilai agregat yang sudah disanitasi.'),
  };
}

export interface PublicEventView {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  endsAt: string;
  capacity: number | null;
  type: string;
}

export function adaptPublicEvents(input: unknown): PublicEventView[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => record(item)).map((item) => ({
    id: text(item.id),
    title: text(item.title, 'Kegiatan warga'),
    description: text(item.description),
    location: text(item.location, 'Lokasi menyusul'),
    date: text(item.startsAt, text(item.date)),
    endsAt: text(item.endsAt),
    capacity: nullableNumber(item.capacity),
    type: text(item.type, 'Kegiatan warga'),
  })).filter((item) => item.id && item.date);
}

export interface DocumentView {
  id: string;
  title: string;
  description: string;
  category: string;
  visibility: string;
  publishedAt: string;
  downloadUrl: string | null;
  updatedAt: string;
  size: string;
}

export function adaptPublicDocuments(input: unknown): DocumentView[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => record(item)).map((item) => {
    const publishedAt = text(item.publishedAt, text(item.updatedAt, text(item.createdAt)));
    return {
    id: text(item.id),
    title: text(item.title, 'Dokumen'),
    description: text(item.description),
    category: text(item.category, 'Dokumen'),
    visibility: text(item.visibility, 'PUBLIC'),
    publishedAt,
    downloadUrl: typeof item.downloadUrl === 'string' ? item.downloadUrl : null,
    updatedAt: publishedAt,
    size: text(item.size, typeof item.downloadUrl === 'string' ? 'Berkas' : 'Tanpa lampiran'),
  }; }).filter((item) => item.id);
}

export interface BillView {
  id: string;
  householdId: string;
  title: string;
  description: string;
  period: string;
  kind: string;
  recurrence: string;
  amount: number;
  amountPaid: number;
  dueAt: string;
  status: string;
}

export function adaptBills(input: unknown): BillView[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => record(item)).map((item) => ({
    id: text(item.id), householdId: text(item.householdId), title: text(item.title, 'Tagihan'),
    description: text(item.description), period: text(item.period), kind: text(item.kind, 'MANDATORY'),
    recurrence: text(item.recurrence, 'ONE_TIME'), amount: number(item.amount), amountPaid: number(item.amountPaid),
    dueAt: text(item.dueAt), status: text(item.status, 'OPEN'),
  })).filter((item) => item.id);
}

export interface PaymentView {
  id: string;
  billId: string;
  householdId: string;
  submittedBy: string;
  amount: number;
  method: string;
  status: string;
  submittedAt: string;
  verifiedAt: string | null;
  proofFileId: string | null;
  proofUrl: string | null;
  submitterLabel: string;
  billLabel: string;
  resident: string;
  bill: string;
}

export function adaptPayments(input: unknown): PaymentView[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => record(item)).map((item) => {
    const submitterLabel = text(item.resident, text(item.residentName, compactIdentifier(item.submittedBy, 'Akun')));
    const billLabel = text(item.bill, text(item.billTitle, compactIdentifier(item.billId, 'Tagihan')));
    const proofFileId = typeof item.proofFileId === 'string' && item.proofFileId ? item.proofFileId : null;
    const proofUrl = typeof item.proofUrl === 'string' && item.proofUrl
      ? item.proofUrl
      : proofFileId ? `/api/v1/files/${encodeURIComponent(proofFileId)}` : null;
    return {
      id: text(item.id), billId: text(item.billId), householdId: text(item.householdId),
      submittedBy: text(item.submittedBy), amount: number(item.amount), method: text(item.method),
      status: text(item.status, 'PENDING_VERIFICATION'), submittedAt: text(item.submittedAt),
      verifiedAt: typeof item.verifiedAt === 'string' ? item.verifiedAt : null,
      proofFileId,
      proofUrl,
      submitterLabel,
      billLabel,
      resident: submitterLabel,
      bill: billLabel,
    };
  }).filter((item) => item.id);
}

export interface PatrolAssignmentView {
  id: string;
  userId: string;
  startsAt: string;
  endsAt: string;
  area: string;
  status: string;
  label: string;
}

export function adaptPatrolAssignments(input: unknown): PatrolAssignmentView[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => record(item)).map((item) => ({
    id: text(item.id), userId: text(item.userId), startsAt: text(item.startsAt), endsAt: text(item.endsAt),
    area: text(item.area, 'Area ronda'), status: text(item.status, 'SCHEDULED'),
    label: text(item.group, 'Jadwal ronda'),
  })).filter((item) => item.id && item.startsAt);
}

export interface ActivityView {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
  status: string;
  contribution: string;
  remainingNeeds: number | null;
}

export function adaptActivities(input: unknown): ActivityView[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => record(item)).map((item) => ({
    id: text(item.id), title: text(item.title, 'Kegiatan warga'), description: text(item.description),
    location: text(item.location, 'Lokasi menyusul'), startsAt: text(item.startsAt), endsAt: text(item.endsAt),
    capacity: nullableNumber(item.capacity), status: text(item.status, 'PUBLISHED'),
    contribution: text(item.contribution, 'Belum memilih'),
    remainingNeeds: nullableNumber(item.remainingNeeds),
  })).filter((item) => item.id && item.startsAt);
}

export interface HouseholdView {
  id: string;
  code: string;
  address: string;
  members: number | null;
  status: string;
}

export function adaptHouseholds(input: unknown): HouseholdView[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => record(item)).map((item) => ({
    id: text(item.id), code: text(item.code), address: text(item.address),
    members: nullableNumber(item.members),
    status: text(item.status, item.occupancyStatus === 'EMPTY' ? 'Kosong' : 'Terisi'),
  })).filter((item) => item.id);
}

export interface ResidentView {
  id: string;
  name: string;
  household: string;
  role: string;
  status: string;
}

export function adaptResidents(input: unknown): ResidentView[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => record(item)).map((item) => ({
    id: text(item.id), name: text(item.name, 'Warga'),
    household: text(item.household, text(item.householdCode, '—')),
    role: text(item.role, text(item.relationship, 'Anggota')),
    status: item.status === 'ACTIVE' ? 'Aktif' : item.status === 'INVITED' ? 'Menunggu verifikasi' : text(item.status, 'Terdaftar'),
  })).filter((item) => item.id);
}

export interface FinanceTransactionView {
  id: string;
  date: string;
  description: string;
  category: string;
  kind: 'INCOME' | 'EXPENSE';
  amount: number;
  status: string;
}

export function adaptFinanceTransactions(input: unknown): FinanceTransactionView[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => record(item)).map((item) => ({
    id: text(item.id), date: text(item.occurredAt, text(item.date)), description: text(item.description),
    category: text(item.category), kind: item.kind === 'EXPENSE' ? 'EXPENSE' as const : 'INCOME' as const,
    amount: number(item.amount), status: text(item.status, 'POSTED'),
  })).filter((item) => item.id);
}

export interface AuditLogView {
  id: string;
  actorId: string | null;
  actor: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entity: string;
  requestId: string;
  createdAt: string;
}

export function adaptAuditLogs(input: unknown): AuditLogView[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => record(item)).map((item) => {
    const actorId = typeof item.actorId === 'string' && item.actorId ? item.actorId : null;
    const actor = text(item.actorName, text(item.actor, actorId ? compactIdentifier(actorId, 'Warga') : 'Sistem / Publik'));
    const entityType = text(item.entityType, text(item.entity, 'Sistem'));
    const entityId = typeof item.entityId === 'string' && item.entityId ? item.entityId : null;
    const entity = entityId ? `${entityType} (${entityId.slice(-6)})` : entityType;
    return {
      id: text(item.id),
      actorId,
      actor,
      action: text(item.action, '—'),
      entityType,
      entityId,
      entity,
      requestId: text(item.requestId, text(item.id)),
      createdAt: text(item.createdAt),
    };
  }).filter((item) => item.id);
}
