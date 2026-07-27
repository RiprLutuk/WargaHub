# ADR-001: Modular monolith dengan web dan API terpisah

- Status: Accepted
- Tanggal: 2026-07-27
- Pemilik: WargaHub maintainers

## Konteks

WargaHub harus dapat dipasang mandiri oleh komunitas kecil pada satu VPS, dapat dipahami kontributor baru, dan tetap menjaga transaksi pembayaran, keuangan, serta perubahan status secara konsisten. Web responsif/PWA perlu dikembangkan terpisah dari REST API agar integrasi lain dapat ditambahkan kemudian. Target awal tidak membutuhkan skala yang membenarkan biaya operasi distributed systems.

## Keputusan

Backend dibangun sebagai modular monolith Fastify/TypeScript dengan satu PostgreSQL. Domain memiliki route/service/policy boundary yang jelas, tetapi dideploy sebagai satu API dan satu worker dari image/codebase yang sama. Vue SPA dibangun serta dideploy terpisah dan hanya berkomunikasi dengan backend melalui REST `/api/v1`.

Repository menggunakan Bun workspaces. Kontrak yang aman dibagikan melalui `packages/contracts`; frontend tidak mengakses database atau implementation type backend. Production menggunakan PostgreSQL, sedangkan PGlite diperbolehkan untuk development/test. Docker Compose dan Caddy adalah deployment reference.

MVP tidak menggunakan Redis, message broker, GraphQL, WebSocket global, microservices, atau Kubernetes. Pekerjaan asinkron disimpan pada job table PostgreSQL dan diproses worker dari backend yang sama.

## Konsekuensi positif

- Satu transaksi database dapat menjaga idempotency dan invariant lintas modul.
- Instalasi, backup, restore, observability, dan debugging tetap sederhana.
- Web, API, dan worker masih dapat diskalakan sebagai proses terpisah.
- Module boundary memberi jalur ekstraksi service bila bukti operasional kelak membutuhkannya.
- Contributor menggunakan satu bahasa dan satu toolchain utama.

## Konsekuensi dan trade-off

- Perubahan schema memerlukan koordinasi antarmodul dan migration yang backward-compatible.
- Satu deploy API membawa seluruh modul, walaupun feature flag menyembunyikan sebagian fitur.
- Kegagalan proses API dapat memengaruhi semua domain; health check dan graceful shutdown menjadi wajib.
- Job table PostgreSQL bukan pengganti queue berthroughput tinggi. Metrik harus membuktikan kebutuhan sebelum menambah broker.

## Guardrail

- Setiap tabel bisnis dan query terautentikasi harus mempertahankan scope `organization_id`.
- Tidak ada import langsung dari web ke source internal API; hanya shared contracts.
- Domain tidak boleh melewati policy dengan mengandalkan kontrol UI.
- Service baru hanya diperkenalkan setelah profiling menunjukkan bottleneck atau isolation requirement yang nyata, beserta ownership dan runbook.

## Alternatif yang ditolak

- Microservices: biaya deployment, networking, transaksi terdistribusi, dan observability tidak sebanding dengan target pilot.
- Full-stack server-rendered monolith: lebih sederhana secara deployment, tetapi mengurangi pemisahan REST API yang disyaratkan produk.
- Serverless-only: menambah ketergantungan vendor dan menyulitkan instalasi mandiri/offline-friendly.

