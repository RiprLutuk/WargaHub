# Self-hosting WargaHub

Dokumen ini adalah baseline deployment production satu organisasi menggunakan Docker Compose. Gunakan server Linux dengan minimal 1 vCPU, RAM 2 GB, storage 20 GB, domain, akses SMTP, dan lokasi backup terpisah.

## Prasyarat

- Docker Engine dengan Compose v2;
- DNS A/AAAA domain mengarah ke server;
- port TCP 80 dan TCP/UDP 443 terbuka;
- filesystem persisten dan ruang untuk backup;
- akun operator non-root yang memiliki izin menjalankan Docker.

Jangan mengekspos port PostgreSQL atau API langsung ke internet. Reference Compose hanya mempublikasikan Caddy.

## Konfigurasi production

Buat file `.env` di root repository dengan mode `0600`. Jangan commit file ini.

```dotenv
SITE_ADDRESS=warga.example.org
PUBLIC_BASE_URL=https://warga.example.org
POSTGRES_DB=wargahub
POSTGRES_USER=wargahub
# Gunakan secret acak URL-safe; jangan memakai contoh ini.
POSTGRES_PASSWORD=replace-with-a-long-random-url-safe-secret
SMTP_HOST=smtp.example.org
SMTP_PORT=587
SMTP_USER=wargahub
SMTP_PASSWORD=replace-with-smtp-secret
SMTP_FROM=WargaHub <noreply@example.org>
LOG_LEVEL=info
```

`POSTGRES_PASSWORD` dipakai di connection URL, sehingga gunakan karakter URL-safe atau percent-encode nilainya. Simpan salinan secret di password manager. Jangan menaruh credential pada image, command history, issue, atau log.

## Instalasi pertama

Validasi interpolasi Compose sebelum menjalankan service:

```sh
docker compose config --quiet
docker compose build --pull
docker compose up -d
docker compose ps
```

API menunggu PostgreSQL sehat dan menjalankan migration yang belum tercatat sebelum server dimulai. Worker baru dimulai setelah API sehat. Jangan menjalankan demo seed pada production.

Periksa endpoint melalui domain publik:

```sh
curl --fail --show-error https://warga.example.org/health
curl --fail --show-error https://warga.example.org/ready
```

OpenAPI UI tersedia di `/documentation`; JSON OpenAPI digunakan sebagai sumber kebenaran endpoint.

### Bootstrap organisasi dan admin pertama

Simpan input bootstrap sementara di file yang hanya dapat dibaca operator:

```sh
install -m 600 /dev/null bootstrap.env
```

Isi `bootstrap.env` tanpa tanda kutip dan jangan commit file tersebut:

```dotenv
BOOTSTRAP_ORGANIZATION_NAME=Warga Sejahtera
BOOTSTRAP_ORGANIZATION_SHORT_NAME=RW Sejahtera
BOOTSTRAP_ORGANIZATION_SLUG=warga-sejahtera
BOOTSTRAP_ORGANIZATION_DESCRIPTION=Lingkungan bersama yang transparan dan saling menjaga.
BOOTSTRAP_ORGANIZATION_ADDRESS=Kelurahan Sukamaju, Indonesia
BOOTSTRAP_EMERGENCY_PHONE=112
BOOTSTRAP_RW_CODE=07
BOOTSTRAP_RT_CODE=02
BOOTSTRAP_ADMIN_NAME=Admin Utama
BOOTSTRAP_ADMIN_EMAIL=admin@example.org
BOOTSTRAP_ADMIN_PASSWORD=GantiPasswordKuat123
```

Jalankan bootstrap tepat satu kali:

```sh
docker compose run --rm --env-from-file bootstrap.env api bun apps/api/dist/bootstrap.js
```

Perintah menolak database yang sudah memiliki organisasi, membuat katalog role/permission, area RW/RT awal, rekening kas, admin organisasi, dan audit event secara atomik. Setelah berhasil, pindahkan atau musnahkan `bootstrap.env` sesuai kebijakan secret organisasi, lalu uji login admin. Password minimal 12 karakter dan harus memuat huruf besar, huruf kecil, serta angka.

## TLS dan reverse proxy

Caddy memperoleh serta memperbarui sertifikat otomatis ketika `SITE_ADDRESS` adalah domain publik yang valid dan port 80/443 dapat dijangkau. Di dalam container, Caddy menggunakan port non-root 8080/8443; mapping host tetap 80/443. Untuk local-only, gunakan `SITE_ADDRESS=http://localhost`.

Jika ada proxy/CDN lain di depan Caddy, dokumentasikan trusted proxy, terminasi TLS, dan real client IP secara eksplisit. Jangan mengaktifkan wildcard CORS atau menonaktifkan secure cookie untuk mengatasi konfigurasi proxy.

## Persistent data

Named volume berikut tidak boleh dihapus saat upgrade:

- `postgres_data`: database utama;
- `uploads`: bukti dan dokumen privat;
- `caddy_data`: sertifikat dan state ACME;
- `caddy_config`: state runtime Caddy.

Nama volume aktual memiliki prefix project Compose. Temukan target tepat dengan `docker volume ls` dan jangan memakai wildcard pada perintah penghapusan.

## Upgrade

1. Baca changelog dan migration notes release tujuan.
2. Buat serta verifikasi backup database dan uploads.
3. Pull source/image versi yang dipin.
4. Jalankan `docker compose build --pull` lalu `docker compose up -d`.
5. Pastikan `api`, `worker`, `web`, `postgres`, dan `caddy` sehat.
6. Periksa `/ready`, login, satu file privat, saldo agregat, dan job gagal.

Jangan downgrade setelah migration tanpa prosedur release yang eksplisit. Restore ke environment baru lebih aman daripada menghapus volume aktif.

## Operasi rutin

- Pantau kapasitas volume, health status, restart count, dan log error.
- Arahkan log stdout JSON ke sistem dengan retensi yang disepakati.
- Uji pengiriman SMTP dan antrean notifikasi gagal.
- Terapkan update OS/image serta dependency secara berkala.
- Jalankan backup harian database, backup uploads mingguan/incremental, dan restore drill berkala.
- Batasi akses Docker socket dan SSH; keduanya setara akses root ke data aplikasi.

## Troubleshooting awal

```sh
docker compose ps
docker compose logs --tail=200 api worker postgres caddy
docker compose exec postgres pg_isready -U wargahub -d wargahub
```

Jangan memublikasikan log mentah sebelum menghapus email, token, cookie, path file privat, dan connection string. Lihat [backup dan restore](backup-restore.md) sebelum tindakan yang dapat memengaruhi data.
