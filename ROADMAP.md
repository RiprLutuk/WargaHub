# Roadmap WargaHub

Roadmap ini menunjukkan arah, bukan janji tanggal. Prioritas dapat berubah
berdasarkan kebutuhan lingkungan pilot, risiko privasi, dan kapasitas maintainer.

## 0.1 — Foundation dan MVP pilot

Status: in progress

- Auth email/password, opaque session, organisasi tunggal, RBAC, dan audit.
- Rumah/warga, pengumuman, dokumen, tagihan/pembayaran manual, dan kas sederhana.
- Pengaduan, kegiatan dengan kontribusi alternatif, ronda/swap, serta notifikasi.
- Public site, portal warga, CMS, PWA, OpenAPI, CSV, Compose, backup, dan restore.
- Exit criteria: acceptance test PRD hijau, restore drill berhasil, security review
  selesai, dan pilot dapat dijalankan tanpa credential/demo data.

## 0.2 — Hardening hasil pilot

- Perbaikan berdasarkan usability testing warga nonteknis dan audit aksesibilitas.
- Kebijakan retensi/anonimisasi, subject access export, dan incident runbook.
- Rekonsiliasi serta laporan keuangan lebih matang tanpa membuka data individu.
- Observability, capacity baseline, notification delivery, dan upgrade automation.

## 0.3 — Governance

- Voting/polling dengan aturan eligibility dan kuorum.
- Surat administratif, approval, penerbitan PDF, dan verifikasi.
- Program/proyek lingkungan serta transparansi publik yang disanitasi.

## Later / optional modules

- Fasilitas, sampah, jimpitan, UMKM, bantuan sosial, kendaraan, dan tamu.
- Payment gateway, WhatsApp, atau integrasi berbayar hanya sebagai adaptor opsional.
- Multi-organization runtime hanya setelah isolation dan operation model diaudit.

## Guardrail permanen

WargaHub tidak akan menambahkan social scoring, ranking kepatuhan, biometric
tracking, lokasi warga, surveillance default, atau daftar tunggakan publik. Lihat
PRD dan `docs/architecture/adr-001-modular-monolith.md` sebelum mengusulkan
perubahan arsitektur atau pengumpulan data baru.

