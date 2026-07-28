# Changelog

Semua perubahan penting WargaHub dicatat di file ini. Format mengikuti
[Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/) dan versi release
mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

### Added
- Konfigurasi deployment gratis untuk Vercel (`vercel.json`) dan Render (`render.yaml`), plus panduan PostgreSQL eksternal di `docs/DEPLOYMENT.md`.
- Seeder demo bulk yang idempotent: 100 warga/rumah tambahan, 120 tagihan bulanan, dan 240 transaksi kas untuk mengisi dashboard serta laporan.

## [0.6.0] - 2026-07-28

### Added
- Modal reusable untuk form warga (pengaduan, surat, layanan, kegiatan, ronda, dan peminjaman fasilitas).
- `SmartSelect` reusable dengan pencarian untuk pilihan surat, jadwal, pembayaran, kategori, dan formulir terkait.
- Soft delete pengaduan dengan alur edit dan konfirmasi penghapusan yang aman.
- Rincian arus kas publik untuk menampilkan sumber pemasukan dan tujuan pengeluaran yang sudah disanitasi.
- Data target jadwal ronda warga lain untuk membantu pertukaran jadwal.

### Changed
- Refaktor portal publik dan portal warga agar lebih bersih, responsif, dan konsisten dengan baseline layout UMKM.
- Header, spacing, strip kategori, kartu, tombol WhatsApp, serta carousel mobile dirapikan di halaman UMKM, program, fasilitas, laporan, struktur, agenda, dokumen, kontak, dan darurat.
- Hero homepage dibuat lebih ringkas dan sejajar dengan halaman publik lainnya.
- Tab publik dan portal warga disinkronkan dengan URL agar tetap aktif saat reload dan mudah dibagikan.
- Form kontribusi menyembunyikan tombol setelah berhasil disimpan dan menampilkan status kontribusi.
- CCTV dari portal warga dibuka ke halaman publik di tab baru.
- Dropdown formulir tidak lagi memakai select native dan notifikasi/konfirmasi native diganti modal yang konsisten.

### Fixed
- CORS API kini mengizinkan domain production Vercel dan domain custom WargaHub.
- Validasi CSRF pada portal lintas subdomain (`vercel.app` dan domain custom) setelah reload halaman.
- Proyeksi data publik yang sebelumnya gagal dimuat atau menampilkan state kosong yang tidak informatif.
- Filter laporan publik agar hanya menampilkan laporan publik yang belum diarsipkan.
- Status program kini mengikuti status backend, termasuk warna progress yang membedakan pekerjaan selesai dan masih berjalan.
- Penempatan header dan jarak antar section pada halaman publik yang sebelumnya terlalu turun atau tidak seragam.

## [0.5.0] - 2026-07-28

### Added
- **Refactoring Clean Design & Kontras Kartu Terangkat (Elevated Cards)**:
  - Penyesuaian warna dasar *surface* aplikasi ke `#f1f5f9` (Neutral Slate Grey) yang nyaman di mata, dipadukan dengan *white paper card container* (`#ffffff`), bingkai tegas (`1px solid #cbd5e1`), dan bayangan bertingkat (*drop shadow & hover elevation*) sehingga seluruh kartu informasi terlihat kontras dan terpisah dari latar belakang.
- **Penyempurnaan Responsif & Tata Letak Sidebar**:
  - Penataan tata letak vertikal logo dan tombol toggle pada mode *collapsed sidebar* untuk mencegah tumpang tindih (*overlap*).

- **Komponen Select Dropdown Modern (`AppSelect.vue`)**:
  - Komponen *custom select* dengan pencarian otomatis (*search filter*), penyesuaian ikon, dan desain ringkas.
- **Penyempurnaan Lay-out DataTable & Toolbar Ringkas**:
  - Gaya tabel modern (*sticky header*, *zebra stripe*, *row hover highlight*) serta tombol aksi berlabel pendek dengan ikon presisi.

- **Sinkronisasi Rute Bersih & Modal Layar Penuh CCTV**:
  - Dukungan Rute Bersih (*Clean Path Routes*) `/fasilitas/cctv` dan `/cctv` serta modal interaktif *Fullscreen Live Stream* 1080p 60fps dengan tombol kontrol arah PTZ untuk warga yang sudah login.

- **Panduan Kapabilitas & Tugas Pengurus RT/RW**:
  - Penjelasan visual 6 pilar wewenang & fungsi pengurus RT/RW di `PublicStructurePage.vue` (`/struktur`) meliputi Pendataan Warga, Keuangan Kas, Operasional/Ronda, Surat Digital, Musyawarah/Voting, dan WA Broadcast.
- **Sinkronisasi Tab dengan URL Query Parameter**:
  - Status aktif tab (seperti `?tab=cctv` atau `?tab=facilities`) kini tersinkronisasi otomatis dengan parameter URL router sehingga pilihan tab tidak pernah kembali ke nilai awal (*default*) ketika halaman di-reload.

### Changed
- **Pembaruan Tipografi & Sistem Estetika**:
  - Mengganti font aplikasi ke **Outfit** (Display/Judul) dan **DM Sans** (Body/UI) untuk tampilan modern, *ultra-clean*, dan berkelas.
  - Penyesuaian kontras teks tombol navigasi (*Portal Warga*), eliminasi garis bawah (*underline*), dan *border-radius* konsisten (`0.75rem`).
- **Lencana Sinyal Darurat Pulsing Beacon**:
  - Animasi *beacon ping* berdenyut pada menu navigasi `Darurat` dengan ikon `PhoneCall`.
- **Inovasi Desain Footer Publik**:
  - Footer baru berdesain *civic platform* dengan *Top Status Bar*, 3 kolom navigasi modular terstruktur, serta kartu akses cepat portal warga.
- **Pemetaan Bidang Program Publik (`PublicProgramsPage.vue`)**:
  - Perbaikan parser properti API (`budget`/`spent`/`startsAt`) sehingga data proyek pembangunan dan posyandu ter-render sempurna secara serentak.

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
