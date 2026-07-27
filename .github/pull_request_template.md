## Ringkasan

Jelaskan masalah dan outcome pengguna. Tautkan issue terkait.

## Perubahan

- Jelaskan perubahan utama.

## Verifikasi

Tuliskan command beserta hasil aktual.

- [ ] Typecheck
- [ ] Unit/integration test
- [ ] Build production
- [ ] E2E atau langkah manual relevan
- [ ] Mobile, keyboard focus, loading, empty, dan error state diperiksa bila UI berubah

## Privacy, security, dan data

- [ ] Authorization diterapkan di backend, bukan hanya menyembunyikan kontrol UI.
- [ ] Query bisnis tetap scoped dengan `organization_id`/household yang diizinkan.
- [ ] Tidak ada secret, data warga, bukti pembayaran, atau dokumen privat pada diff/log/fixture.
- [ ] Audit log ditambahkan untuk tindakan sensitif.
- [ ] Migration, retention, export, dan rollback/restore impact didokumentasikan bila relevan.
- [ ] Public response menggunakan projection eksplisit dan telah diuji terhadap kebocoran data.

## Operasional dan dokumentasi

- [ ] OpenAPI/shared contract dan dokumentasi pengguna diperbarui bila perlu.
- [ ] `CHANGELOG.md` diperbarui untuk perubahan yang terlihat pengguna/operator.
- [ ] Dependency atau service baru memiliki alasan, ownership, threat model, dan runbook.

## Bukti visual

Lampirkan screenshot yang hanya memakai data demo/sanitized untuk perubahan UI.
