import { describe, expect, it } from 'vitest';
import {
  complaintCreateSchema,
  loginSchema,
  moneySchema,
  organizationUpdateSchema,
  paymentStatusSchema,
  residentCreateSchema,
} from './index.js';

describe('kontrak domain bersama', () => {
  it('menolak nilai rupiah negatif', () => {
    expect(moneySchema.safeParse(-1).success).toBe(false);
  });

  it('hanya menerima status pembayaran yang dikenal', () => {
    expect(paymentStatusSchema.parse('PENDING_VERIFICATION')).toBe(
      'PENDING_VERIFICATION',
    );
    expect(paymentStatusSchema.safeParse('UNKNOWN').success).toBe(false);
  });

  it('mensyaratkan deskripsi pengaduan yang berguna', () => {
    expect(
      complaintCreateSchema.safeParse({
        category: 'FASILITAS',
        title: 'Lampu',
        description: 'mati',
      }).success,
    ).toBe(false);
  });

  it('menerima login dengan email atau nomor telepon, bukan keduanya', () => {
    expect(
      loginSchema.safeParse({ phone: '+6281234567890', password: 'WargaHub123!' }).success,
    ).toBe(true);
    expect(
      loginSchema.safeParse({
        email: 'warga@example.org',
        phone: '+6281234567890',
        password: 'WargaHub123!',
      }).success,
    ).toBe(false);
  });

  it('requires an email while invitation delivery is email-only', () => {
    expect(
      residentCreateSchema.safeParse({
        householdId: 'household_123456789',
        name: 'Warga Tanpa Email',
        phone: '+6281234567890',
        relationship: 'TENANT',
        participationPreferences: [],
      }).success,
    ).toBe(false);
  });

  it('accepts short official emergency numbers', () => {
    expect(
      organizationUpdateSchema.safeParse({
        name: 'Warga Harmoni',
        shortName: 'Harmoni',
        description: 'Portal layanan untuk lingkungan Warga Harmoni.',
        address: 'Jl. Harmoni No. 1',
        emergencyPhone: '112',
        timezone: 'Asia/Jakarta',
        locale: 'id-ID',
      }).success,
    ).toBe(true);
  });
});
