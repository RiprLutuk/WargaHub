# Changelog

Semua perubahan penting WargaHub dicatat di file ini. Format mengikuti
[Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/) dan versi release
mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [0.4.0] - 2026-07-28

### Added
- **Struktur Organisasi & Pengurus RT/RW**:
  - Migrasi database `0007_organization_structure.sql` untuk tabel `organization_officers`.
  - Halaman publik Struktur Pengurus (`PublicStructurePage.vue`) di rute `/struktur` dengan filter seksi/bidang (Pengurus Inti, Seksi Keamanan, Seksi Lingkungan, Pemuda Karang Taruna) dan tautan kontak langsung WhatsApp.
  - Endpoint proyeksi publik `GET /api/v1/public/officers`.
  - Endpoint CRUD Admin `/api/v1/organization/officers` serta panel manajemen pengurus di `AdminContentPage.vue` (`/admin/organisasi`).
- **Integrasi WhatsApp WAHA (WhatsApp HTTP API)**:
  - Service client `WahaService` (`apps/api/src/services/waha.ts`) untuk pengiriman pesan teks, berkas, format nomor otomatis ke format WAHA (`@c.us` & `@g.us`), serta pemeriksaan status sesi.
  - Endpoint Webhook publik `/api/v1/public/waha/webhook` dengan auto-reply bot WargaHub.
  - Kartu pemantauan sesi WAHA & penguji kirim pesan instan di portal Admin Operasional (`AdminOperationsPage.vue`).

### Changed
- **Desain Kartu Pengaduan Publik (`PublicComplaintsPage.vue`)**: Refaktor penuh tampilan kartu pengaduan warga publik dari susunan stacked tag menjadi layout 3-kolom yang lebih bersih, infomatif, dan modern (Avatar kategori, Detail deskripsi & lokasi/tgl, Status badge).
- **Responsivitas & Layout Portal Publik**: Perbaikan spasi, navigasi navbar dropdown, dan footer pada seluruh halaman portal publik (`PublicLayout.vue`).

## [0.3.0] - 2026-07-28

### Added
- Musyawarah, Polling, dan Pemungutan Suara Digital (`/api/v1/polls`, `/api/v1/polls/:id/vote`).
- Layanan Permohonan & Penerbitan Surat Administrasi Warga (`/api/v1/letters`).
- Program & Proyek Pembangunan Lingkungan (`/api/v1/programs`).
- Manajemen Inventaris Fasilitas & Peminjaman Barang (`/api/v1/facilities`).
- Keamanan Kendaraan Warga & Registrasi Tamu Pra-Kedatangan (`/api/v1/vehicles`, `/api/v1/guests`).
- Direktori UMKM & Jasa Warga Lokal (`/api/v1/umkms`).
- Bantuan Sosial & Papan Kehilangan/Penemuan (`/api/v1/social-aid`, `/api/v1/lost-found`).

## [0.1.0] - 2026-07-27

### Added
- Fondasi monorepo Bun dengan Vue 3 PWA, Fastify REST API, dan shared Zod contracts.
- Alur MVP organisasi, warga/rumah, pengumuman, tagihan/pembayaran, keuangan, pengaduan, kegiatan, ronda, dokumen, notifikasi, dashboard, RBAC, dan audit.
- Reference deployment Docker Compose, Caddy, backup/restore, dan dokumentasi self-hosting.

### Security
- Opaque session, Argon2id, CSRF validation, organization scoping, private file authorization, rate limiting, audit log, dan sanitized public projections.
