# WargaHub

WargaHub adalah platform open-source untuk membantu pengurus dan warga mengelola informasi, iuran, pengaduan, kegiatan, ronda, dokumen, dan laporan lingkungan secara transparan tanpa mempermalukan individu.

## Status

Versi ini mengimplementasikan MVP pada `PRD-WargaHub.md`: satu organisasi per instalasi, REST API terpisah, web responsif/PWA, role-based access control, audit, dan alur warga/pengurus. Seluruh record bisnis tetap memiliki scope organisasi agar model dapat dikembangkan kemudian.

## Menjalankan secara lokal

Persyaratan: Bun 1.3+ (atau Node.js 22 LTS untuk tooling yang kompatibel).

```bash
cp .env.example .env
bun install
bun run db:migrate
bun run db:seed
bun run dev
```

Tanpa `DATABASE_URL`, API memakai PGlite lokal di `.data/wargahub`. Web tersedia di `http://localhost:5173`, API di `http://localhost:3000`, dan OpenAPI di `http://localhost:3000/documentation`.

## Akun demo

| Peran | Email | Password |
|---|---|---|
| Admin | `admin@demo.wargahub.id` | `WargaHub123!` |
| Bendahara | `bendahara@demo.wargahub.id` | `WargaHub123!` |
| Koordinator | `koordinator@demo.wargahub.id` | `WargaHub123!` |
| Warga | `warga@demo.wargahub.id` | `WargaHub123!` |

Akun demo hanya untuk development. Jangan menjalankan `bun run db:seed` pada database production; gunakan bootstrap satu-kali pada [panduan self-hosting](docs/deployment/self-hosting.md#bootstrap-organisasi-dan-admin-pertama).

## Pemeriksaan kualitas

```bash
bun run typecheck
bun run test
bun run build
```

## Prinsip privasi

- Tunggakan, alasan dispensasi, bukti pembayaran, dan data rumah tidak pernah dipublikasikan.
- Pengaduan privat hanya terlihat pelapor dan petugas berizin.
- Transaksi keuangan yang sudah diposting tidak dihapus; koreksi memakai reversal dan audit.
- Produk tidak memiliki ranking kepatuhan, social score, atau pelacakan lokasi warga.

Panduan self-hosting, HTTPS, SMTP, PostgreSQL, serta backup/restore tersedia di `docs/deployment/`.

## Lisensi

AGPL-3.0-or-later. Lihat `LICENSE`.
