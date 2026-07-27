# Database migration notes

Migration SQL tersimpan berurutan di `apps/api/src/db/migrations` dan dicatat di
table `schema_migrations`. File migration yang sudah dirilis bersifat immutable;
koreksi dilakukan melalui migration baru.

## Aturan perubahan schema

- Pertahankan scope `organization_id`, foreign key, unique/idempotency constraint,
  dan invariant finansial.
- Gunakan pola expand/migrate/contract untuk perubahan yang harus kompatibel dengan
  rolling restart. Hindari rename/drop langsung pada release yang sama.
- Backfill besar harus resumable, observable, dan tidak menahan lock panjang.
- Setiap migration memiliki integration test pada database kosong dan upgrade fixture.
- Dokumentasikan estimasi durasi, kebutuhan storage, lock risk, dan restore strategy.
- Jangan menulis credential atau data production pada SQL/fixture.

## Prosedur upgrade

1. Baca release-specific migration note dan pastikan versi asal didukung.
2. Buat backup database/uploads dan verifikasi checksum serta restore drill terbaru.
3. Hentikan writer lama jika migration tidak backward-compatible.
4. Jalankan migration satu kali; runner mencatat file yang berhasil dalam transaksi.
5. Mulai API/worker baru dan periksa `/ready`, error log, audit, saldo, serta job queue.
6. Jalankan smoke test untuk login, public projection, pembayaran, dan private file.

## Kegagalan

Runner menghentikan proses ketika migration gagal. Jangan mengedit row
`schema_migrations` secara manual untuk memaksa sukses. Simpan log/request ID,
identifikasi apakah transaksi sudah rollback, lalu perbaiki lewat migration baru atau
restore ke database baru sesuai runbook `docs/deployment/backup-restore.md`.

Setiap release yang menambah migration harus menambahkan bagian berjudul versinya di
bawah ini dengan precondition, expected duration, dan catatan incompatibility.

## Unreleased

- Initial MVP schema dan workflow-detail migration.
- Upgrade path sebelum release pertama: buat database baru dan jalankan seluruh
  migration berurutan.

