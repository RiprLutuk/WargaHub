import { describe, expect, it } from 'vitest';
import { parseWaMessage } from './wa-parser';

describe('wa-parser for RT/RW WhatsApp chat broadcasts', () => {
  it('parses food donation schedules, patrol schedules, and jimpitan amounts accurately from real WA text', () => {
    const rawWaText = `
Jadwal kirim sodakoh makanan buat tukang
Hari Minggu tgl 12 juli 2026
: bpk Dim Roni B
: Winardi
: bpk Endang Suryadi
1: hari senin 13 juli 2026
: bpk Elba G
: bpk M kodir
: bpk bayu G

PENGUMUMAN   JADWAL RONDA HARI SABTU MALMING,TGL 18-07-2026:
 1. SUHENDANG
 2. HARTONO
 3. MARWAN
 4. ANDI.SW
 5. DEDE KA.7

Mohon kumpul di depan rumah pak RW/RT pada pukul  22:45wib untuk mengambil uang  jimpitan mohon kerja sama'y NB:Mohon absen  kehadiran dan kaleng jimpitan'y di isi*🙏🙏🙏

[27/07/26, 10.26.12 PM] Pak RT 04 Ken Arok: Jimpitan senin tgl 27 07 2026 Rp 24000
    `;

    const parsed = parseWaMessage(rawWaText);

    // 1. Food Schedules
    expect(parsed.foodSchedules.length).toBeGreaterThanOrEqual(2);
    expect(parsed.foodSchedules[0]?.date).toBe('2026-07-12');
    expect(parsed.foodSchedules[0]?.residents).toContain('Dim Roni B');
    expect(parsed.foodSchedules[0]?.residents).toContain('Winardi');

    // 2. Patrols
    expect(parsed.patrols.length).toBe(1);
    expect(parsed.patrols[0]?.date).toBe('2026-07-18');
    expect(parsed.patrols[0]?.officers).toContain('SUHENDANG');
    expect(parsed.patrols[0]?.officers).toContain('HARTONO');
    expect(parsed.patrols[0]?.time).toBe('22:45');

    // 3. Jimpitan
    expect(parsed.jimpitans.length).toBe(1);
    expect(parsed.jimpitans[0]?.date).toBe('2026-07-27');
    expect(parsed.jimpitans[0]?.amount).toBe(24000);
  });
});
