# Arsitektur WargaHub

WargaHub adalah modular monolith yang dipasang untuk satu organisasi pada MVP. Web dan API dibangun serta dijalankan sebagai proses terpisah, tetapi seluruh domain backend tetap berada dalam satu codebase dan satu database PostgreSQL. Setiap record bisnis membawa `organization_id` agar batas data tetap eksplisit dan pengembangan multi-organisasi di masa depan tidak memerlukan pemodelan ulang.

## Gambaran runtime

```text
Browser / PWA
      |
      | HTTPS
      v
    Caddy
      |----------------------|
      |                      |
      v                      v
 Vue static web         Fastify REST API
                             |
                   |---------|----------|
                   v         v          v
              PostgreSQL  uploads    SMTP opsional
                   ^
                   |
              job worker
```

Caddy adalah satu-satunya service yang dipublikasikan ke host. Request `/api/*`, `/health`, `/ready`, dan `/documentation/*` diteruskan ke API; request lain diteruskan ke web. PostgreSQL tidak memiliki host port. Web menggunakan URL API same-origin sehingga cookie sesi tidak perlu dibagikan lintas origin saat production.

## Batas aplikasi

- `apps/web`: Vue 3 SPA/PWA untuk halaman publik, portal warga, dan CMS pengurus.
- `apps/api`: composition root Fastify, policy enforcement, layanan domain, persistence, OpenAPI, dan worker.
- `packages/contracts`: schema Zod, enum stabil, dan bentuk request/response yang digunakan kedua aplikasi.
- `infra`: konfigurasi reverse proxy dan container.
- `scripts`: operasi backup dan restore yang harus dijalankan secara eksplisit.

Modul backend mengikuti boundary domain: autentikasi, organisasi, rumah/warga, pengumuman, dokumen, tagihan/pembayaran, keuangan, pengaduan, kegiatan, ronda, notifikasi, audit, dan pengaturan. Route memvalidasi input serta menerjemahkan HTTP; service menangani aturan bisnis dan transaksi; policy memeriksa scope organisasi dan permission; repository/database adapter menangani query.

## Alur request dan trust boundary

1. Caddy menerima koneksi publik, menangani TLS, dan menambahkan header keamanan umum.
2. Fastify memberi request ID, memvalidasi input, membaca opaque session cookie, dan memuat actor beserta permission.
3. Policy backend memeriksa permission dan `organization_id`. Menyembunyikan tombol di UI bukan authorization.
4. Service menjalankan perubahan atomik dan menulis audit log untuk aksi sensitif.
5. Response memakai envelope konsisten dan projection eksplisit. Projection publik tidak pernah berasal dari serialisasi row database mentah.

File privat disimpan di volume uploads dan hanya dirujuk oleh metadata database. API adalah satu-satunya boundary yang boleh mengotorisasi download; nama file dari pengguna tidak digunakan sebagai path storage. Email diproses oleh job worker sehingga request warga tidak menunggu provider eksternal.

## Data dan konsistensi

PostgreSQL adalah sumber kebenaran production. PGlite hanya dipakai untuk development dan test. Migration SQL bernomor disimpan di repository dan dicatat pada `schema_migrations`.

Aturan penting:

- rupiah disimpan sebagai integer;
- timestamp backend disimpan dalam UTC dan ditampilkan menggunakan `Asia/Jakarta`/`id-ID`;
- pembayaran diverifikasi atomik dan tidak boleh menghasilkan pemasukan dua kali;
- transaksi keuangan tidak dihapus; koreksi dibuat sebagai reversal;
- histori status serta audit log bersifat append-only;
- query data warga selalu dibatasi oleh organisasi dan household yang diizinkan.

## Keamanan dan privasi

Password menggunakan Argon2id. Session token bersifat opaque; database hanya menyimpan digest token. Cookie production harus `HttpOnly`, `Secure`, dan `SameSite=Lax`. Endpoint login serta endpoint publik diberi rate limit. MIME, ukuran, dan nama upload divalidasi di API.

Data tunggakan, bukti transfer, identitas pengadu sensitif, nomor kontak, dan catatan privat tidak masuk projection publik. Dashboard tidak membuat ranking kepatuhan atau skor sosial. Ekspor, perubahan role, verifikasi pembayaran, reversal, dan akses sensitif dicatat dalam audit log.

## Availability dan observability

API menyediakan `/health` untuk liveness dan `/ready` untuk readiness database. Log terstruktur dikirim ke stdout agar dapat dikumpulkan platform hosting. Caddy juga menghasilkan access log JSON. Worker melakukan retry berbatas untuk notifikasi dan pekerjaan terjadwal.

Satu VPS 1–2 GB RAM cukup untuk pilot. Vertical scaling dipilih sebelum memecah service. Redis, message broker, Kubernetes, dan microservices sengaja tidak menjadi dependency MVP.

## Perubahan arsitektur

Keputusan lintas boundary harus dicatat sebagai Architecture Decision Record di direktori ini. Perubahan yang memperluas data publik, menambahkan surveillance, atau memperkenalkan service stateful baru memerlukan threat-model dan rencana operasi sebelum implementasi.

