// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from './api';
import { createManualPayment } from './billing';
import {
  adaptPublicDocuments,
  adaptPublicEvents,
  adaptPublicSite,
  adaptPublicTransparency,
  adaptBills,
  adaptPatrolAssignments,
  adaptPayments,
} from './view-models';

describe('real API integration contract', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { id: 'payment-real', status: 'PENDING_VERIFICATION' },
      meta: { requestId: 'req-test' },
    }), { status: 201, headers: { 'content-type': 'application/json' } })));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('sends payment idempotency in the required header, not the request body', async () => {
    const client = createApiClient({ baseUrl: '/api/v1' });

    await createManualPayment(client, 'bill-real', {
      amount: 150_000,
      method: 'BANK_TRANSFER',
      proofFileId: 'file-real',
    }, 'payment-once-123');

    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);
    expect(headers.get('Idempotency-Key')).toBe('payment-once-123');
    expect(JSON.parse(String(init?.body))).not.toHaveProperty('idempotencyKey');
  });

  it('adapts the public site without inventing metrics omitted by the backend', () => {
    const site = adaptPublicSite({
      name: 'RW 06', shortName: 'RW 06', slug: 'rw-06', description: 'Lingkungan rukun.',
      address: 'Sukamaju', emergencyPhone: '112', timezone: 'Asia/Jakarta', locale: 'id-ID',
    });
    expect(site.households).toBeNull();
    expect(site.activePrograms).toBeNull();
  });

  it('maps transparency values and guards malformed numbers', () => {
    const report = adaptPublicTransparency({
      currency: 'IDR', income: 500_000, expense: 125_000, balance: 375_000,
      monthly: [{ period: '2026-07', income: 500_000, expense: 125_000 }], note: 'Agregat.',
    });
    expect(report.balance).toBe(375_000);
    expect(report.monthly[0]).toEqual({ period: '2026-07', income: 500_000, expense: 125_000 });
    expect(adaptPublicTransparency({ income: 'rusak', expense: null, balance: undefined, monthly: [] }).balance).toBe(0);
  });

  it('maps event and document timestamps from the real response fields', () => {
    expect(adaptPublicEvents([{ id: 'e1', title: 'Kerja bakti', description: 'Bersih taman', location: 'Taman', startsAt: '2026-08-01T01:00:00.000Z', endsAt: '2026-08-01T03:00:00.000Z', capacity: null }])[0]?.date)
      .toBe('2026-08-01T01:00:00.000Z');
    expect(adaptPublicDocuments([{ id: 'd1', title: 'Aturan', category: 'Peraturan', publishedAt: '2026-07-01T00:00:00.000Z', downloadUrl: '/api/v1/public/documents/d1/download' }])[0])
      .toMatchObject({ publishedAt: '2026-07-01T00:00:00.000Z', downloadUrl: '/api/v1/public/documents/d1/download' });
  });

  it('normalizes real bill, payment, and patrol fields without undefined labels', () => {
    expect(adaptBills([{ id: 'b1', householdId: 'h1', title: 'Iuran', description: 'Iuran rutin', period: 'Juli', kind: 'MANDATORY', recurrence: 'MONTHLY', amount: 150_000, amountPaid: 0, dueAt: '2026-07-31T00:00:00.000Z', status: 'OPEN' }])[0]?.amountPaid).toBe(0);
    expect(adaptPayments([{ id: 'p1', billId: 'b1', householdId: 'h1', submittedBy: 'user-abcdef12', amount: 150_000, method: 'BANK_TRANSFER', status: 'PENDING_VERIFICATION', submittedAt: '2026-07-27T00:00:00.000Z', verifiedAt: null, proofFileId: 'file-private' }])[0])
      .toMatchObject({
        submitterLabel: 'Akun ••••ef12',
        billLabel: 'Tagihan ••••b1',
        proofFileId: 'file-private',
        proofUrl: '/api/v1/files/file-private',
      });
    expect(adaptPayments([{ id: 'p2', billId: 'b1', householdId: 'h1', submittedBy: 'u1', amount: 1, method: 'CASH', status: 'PENDING_VERIFICATION', submittedAt: '2026-07-27T00:00:00.000Z' }])[0]?.proofUrl)
      .toBeNull();
    expect(adaptPatrolAssignments([{ id: 'a1', userId: 'u1', startsAt: '2026-07-30T15:00:00.000Z', endsAt: '2026-07-30T18:00:00.000Z', area: 'Gerbang', status: 'SCHEDULED' }])[0])
      .toMatchObject({ label: 'Jadwal ronda', status: 'SCHEDULED' });
  });
});
