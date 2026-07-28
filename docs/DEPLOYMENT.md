# Deployment gratis WargaHub

Konfigurasi yang direkomendasikan:

- **Vercel** untuk `apps/web`.
- **Render Web Service** untuk `apps/api` menggunakan `render.yaml`.
- **Neon atau Supabase PostgreSQL** untuk database production.

## 1. Database

Buat database PostgreSQL di Neon atau Supabase, lalu salin connection string pooled ke
`DATABASE_URL` Render. Migration dijalankan otomatis saat API start.

## 2. API di Render

Hubungkan repository GitHub ke Render dan pilih **Blueprint**, atau buat Web Service
manual dengan konfigurasi berikut:

```text
Build: bun install --frozen-lockfile && bun run --cwd apps/api build
Start: bun run --cwd apps/api start
Health check: /health
```

Set environment variables:

```text
NODE_ENV=production
DATABASE_URL=<postgres-connection-string>
WEB_ORIGIN=https://<nama-project>.vercel.app
PUBLIC_BASE_URL=https://<nama-project>.vercel.app
```

`UPLOAD_DIR` pada Render diarahkan ke `/tmp`, sehingga file lokal bersifat sementara.
Untuk dokumen produksi, gunakan object storage S3-compatible (Cloudflare R2, Supabase
Storage, atau AWS S3) sebelum aplikasi digunakan untuk data warga sungguhan.

## 3. Frontend di Vercel

Import repository yang sama ke Vercel. `vercel.json` sudah mengatur monorepo build dan
SPA fallback. Tambahkan:

```text
VITE_API_BASE_URL=https://<nama-service>.onrender.com/api/v1
VITE_ENABLE_DEMO_FALLBACK=false
```

Setelah deploy frontend, masukkan URL Vercel tersebut ke `WEB_ORIGIN` dan
`PUBLIC_BASE_URL` di Render, lalu redeploy API.

## Catatan free tier

Render Free dapat sleep setelah idle. Database jangan diletakkan di Render Free karena
instance free memiliki masa hidup terbatas; gunakan Neon/Supabase sebagai database
terpisah. Railway cocok untuk percobaan kredit, bukan asumsi free permanen.
