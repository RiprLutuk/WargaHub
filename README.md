<div align="center">

# 🏡 WargaHub
### *Rukun Dalam Satu Ruang*

[![Release](https://img.shields.io/github/v/release/RiprLutuk/WargaHub?style=for-the-badge&color=07574f)](https://github.com/RiprLutuk/WargaHub/releases)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-amber?style=for-the-badge)](LICENSE)
[![Bun](https://img.shields.io/badge/Bun-v1.3+-black?style=for-the-badge&logo=bun)](https://bun.sh)
[![Vue 3](https://img.shields.io/badge/Vue.js-3.x-4FC08D?style=for-the-badge&logo=vuedotjs)](https://vuejs.org)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-000000?style=for-the-badge&logo=fastify)](https://fastify.dev)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa)](https://vite-pwa-org.netlify.app/)

**WargaHub** adalah platform open-source modern berbasis *Privacy-First* untuk membantu pengurus RT/RW dan warga dalam mengelola informasi, iuran, pengaduan, kegiatan, ronda, musyawarah digital, serta transparansi keuangan lingkungan secara bermartabat.

[Fitur Utama](#-fitur-unggulan) • [Cara Jalankan](#-menjalankan-secara-lokal) • [Akun Demo](#-akun-demo) • [Prinsip Privasi](#-prinsip-privasi) • [Dokumentasi](#-dokumentasi)

---

</div>

## 🌟 Fitur Unggulan

<table>
  <tr>
    <td width="50%">
      <h3>🏢 Tata Kelola & Warga</h3>
      <ul>
        <li><b>Manajemen Rumah & Warga</b> — Pendataan rumah terisi/kosong, status hunian, dan alur verifikasi via link undangan unik.</li>
        <li><b>Import/Export CSV</b> — Upload data rumah dan warga secara kolektif dengan validasi format otomatis.</li>
        <li><b>Role-Based Access Control (RBAC)</b> — Hak akses berjenjang untuk Admin, Ketua RT/RW, Bendahara, Koordinator, dan Warga.</li>
      </ul>
    </td>
    <td width="50%">
      <h3>💳 Keuangan & Iuran</h3>
      <ul>
        <li><b>Buku Kas Immutable</b> — Pencatatan iuran transparan berbasis alokasi pembayaran & reversal tanpa fitur hapus transaksi.</li>
        <li><b>Verifikasi Bukti Transfer</b> — Upload bukti bayar warga dengan verifikasi aman dari Bendahara.</li>
        <li><b>Laporan Keuangan Publik</b> — Proyeksi kas agregat bulanan untuk publik tanpa membuka privasi keuangan individu.</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🗳️ Musyawarah & Surat Digital</h3>
      <ul>
        <li><b>Voting & Polling Warga</b> — Pemungutan suara online untuk keputusan bersama dengan batas waktu & kuorum.</li>
        <li><b>Permohonan Surat RT/RW</b> — Pengajuan permohonan surat pengantar online dengan pelacakan status approval.</li>
        <li><b>Program Pembangunan</b> — Transparansi proyek lingkungan beserta progres dan sisa kebutuhan dana.</li>
      </ul>
    </td>
    <td width="50%">
      <h3>🚨 Operasional & Keamanan</h3>
      <ul>
        <li><b>Pengaduan Privat & Publik</b> — Laporan kendala lingkungan dengan penetapan PIC/petugas dan histori penanganan.</li>
        <li><b>Jadwal & Pertukaran Ronda</b> — Pengaturan petugas siskamling dengan alur tukar jadwal ronda (Patrol Swap).</li>
        <li><b>Fasilitas, UMKM & Kehilangan</b> — Peminjaman barang/fasilitas warga, direktori usaha warga lokal, dan papan <i>Lost & Found</i>.</li>
      </ul>
    </td>
  </tr>
</table>

---

## ⚡ Teknologi & Arsitektur

- **Runtime & Package Manager**: [Bun](https://bun.sh) (Monorepo Workspaces)
- **Backend Framework**: [Fastify](https://fastify.dev) dengan Zod Contract Validation & OpenAPI (Swagger) Documentation
- **Database**: Embedded WASM [PGlite](https://pglite.dev) (Development lokal tanpa Docker DB) & PostgreSQL (Production)
- **Frontend Framework**: [Vue 3](https://vuejs.org) + Vite + Vue Router + Pinia
- **Styling & UI**: Modern Responsive Design System dengan HSL Tokens & Glassmorphism Aesthetics
- **Offline & Installable**: Progressive Web App (PWA) dengan Service Worker precaching

---

## 🚀 Menjalankan Secara Lokal

### Prasyarat
- **Bun** version `v1.3.0` atau lebih baru (`curl -fsSL https://bun.sh/install | bash`)

### Langkah Instalasi

```bash
# 1. Clone repository
git clone https://github.com/RiprLutuk/WargaHub.git
cd WargaHub

# 2. Salin environment & install dependensi
cp .env.example .env
bun install

# 3. Jalankan migrasi & seed database demo
bun run db:migrate
bun run db:seed

# 4. Jalankan server dev (API + Frontend Web)
bun run dev
```

> 💡 **PGlite Embedded Database**: Tanpa mengisi `DATABASE_URL`, WargaHub otomatis menggunakan PGlite WASM di `.data/wargahub`. Anda tidak memerlukan Docker/Podman untuk menjalankan aplikasi di lingkungan lokal!

- 🌐 **Portal Web**: `http://localhost:5173`
- ⚙️ **REST API**: `http://localhost:3000`
- 📑 **Dokumentasi OpenAPI**: `http://localhost:3000/documentation`

---

## 🔑 Akun Demo

Setelah menjalankan `bun run db:seed`, Anda dapat mencoba masuk menggunakan salah satu kredensial demo berikut:

| Peran | Email Login | Password | Akses Utama |
| :--- | :--- | :--- | :--- |
| **Admin RT/RW** | `admin@demo.wargahub.id` | `WargaHub123!` | Kelola Warga, Organisasi, Pengumuman |
| **Bendahara** | `bendahara@demo.wargahub.id` | `WargaHub123!` | Verifikasi Pembayaran & Ledger Kas |
| **Koordinator** | `koordinator@demo.wargahub.id` | `WargaHub123!` | Penanganan Pengaduan & Jadwal Ronda |
| **Warga** | `warga@demo.wargahub.id` | `WargaHub123!` | Portal Warga, Bayar Tagihan, Pengaduan |

---

## 🛡️ Prinsip Privasi & Keamanan

WargaHub dibangun dengan prinsip **Privacy-First & Dignity**:

1. **Anti-Shaming**: Informasi tunggakan iuran, alasan dispensasi, dan detail keuangan individu **TIDAK PERNAH** dipublikasikan ke daftar publik.
2. **Pengaduan Terlindungi**: Pengaduan bersikap privat hanya dapat diakses oleh pelapor dan petugas yang ditugaskan.
3. **Audit Log & Append-Only Ledger**: Setiap tindakan sensitif tercatat di audit log. Transaksi kas tidak dihapus melainkan dikoreksi via entri reversal.
4. **Bebas Surveillance**: WargaHub tidak mendukung *social scoring*, ranking kepatuhan warga, *biometric tracking*, atau pelacakan lokasi real-time.

---

## 🧪 Pemeriksaan Kualitas Code

```bash
# Menjalankan typecheck TypeScript di seluruh workspace
bun run typecheck

# Menjalankan 58+ unit tests backend & frontend
bun run test

# Membangun bundle produksi untuk API & Web PWA
bun run build
```

---

## 📖 Dokumentasi Lengkap

- 📐 [Arsitektur & ADR](docs/architecture/overview.md)
- 🚀 [Panduan Self-Hosting Production](docs/deployment/self-hosting.md)
- 💾 [Strategi Backup & Restore](docs/deployment/backup-restore.md)
- 📋 [Spesifikasi PRD](PRD-WargaHub.md)

## ❤️ Dukung Pengembangan WargaHub

WargaHub dikembangkan sebagai proyek *open-source* nirlaba untuk membantu transparansi dan kerukunan warga di Indonesia. Jika proyek ini bermanfaat bagi lingkungan Anda, Anda dapat memberikan dukungan pengembangan via **GoPay / QRIS**:

<div align="center">
  <img src="docs/donation-qr.jpeg" alt="Dukungan WargaHub via GoPay / QRIS" width="280" style="border-radius: 12px; margin-block: 1rem;" />
  <p><i>Scan kode QRIS / GoPay di atas untuk berkontribusi mendukung pemeliharaan & pengembangan fitur WargaHub. Terima kasih atas dukungan Anda! 🙏</i></p>
</div>

---

## 📜 Lisensi

Lisensi open-source di bawah **[AGPL-3.0-or-later](LICENSE)**.
