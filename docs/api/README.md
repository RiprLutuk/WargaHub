# WargaHub REST API

API menggunakan JSON melalui prefix `/api/v1`. Dokumentasi OpenAPI yang dihasilkan server adalah sumber kebenaran untuk endpoint dan schema saat ini:

- UI: `/documentation`
- JSON: `/documentation/json`
- liveness: `/health`
- readiness: `/ready`

Pada development default, URL API adalah `http://localhost:3000`. Pada production, gunakan origin web yang sama, misalnya `https://warga.example.org/api/v1`.

## Authentication

Login memakai email dan password. Server mengembalikan opaque session cookie; client browser harus mengirim request dengan credentials. Password atau session token tidak pernah dikirim kembali dalam payload user. Logout mencabut session aktif, sedangkan logout-all mencabut seluruh session milik pengguna.

UI berbasis permission hanya membantu pengalaman pengguna. Setiap endpoint privat tetap memeriksa session, permission granular, hubungan household, dan scope `organization_id` pada backend.

## Envelope response

Response sukses tunggal:

```json
{
  "data": {
    "id": "01JXYZ...",
    "status": "PAID"
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

Response daftar:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "requestId": "req_123"
  }
}
```

Response error:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Anda tidak memiliki izin untuk tindakan ini.",
    "details": null
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

Gunakan `meta.requestId` ketika melaporkan masalah. Jangan sertakan cookie, password, bukti transfer, atau payload pribadi dalam issue publik.

## Konvensi

- Timestamp memakai ISO 8601 dengan offset/UTC.
- Nominal uang adalah integer rupiah, bukan floating point.
- ID bersifat opaque; client tidak boleh menebak tipe atau urutannya.
- List besar menggunakan `page`, `pageSize`, dan filter yang terdokumentasi OpenAPI.
- Unknown field dan input tidak valid ditolak dengan error validation terstruktur.
- Operasi pembayaran yang menerima idempotency key harus memakai key unik per intent.
- Status workflow harus diubah melalui action endpoint yang didokumentasikan, bukan dengan menulis status bebas.
- `404` dapat digunakan untuk resource di luar scope agar keberadaan data rumah lain tidak bocor.

## Public projection

Endpoint `/api/v1/public/*` hanya mengembalikan projection yang memang disetujui untuk publik. Projection tersebut tidak memuat email/telepon warga, anggota rumah, tagihan individual, bukti pembayaran, rekening lengkap, identitas pengadu privat, private file key, atau catatan pengurus.

Konten internal tidak berubah menjadi publik hanya karena caller tidak login. Status publikasi, visibility, waktu publikasi/kedaluwarsa, dan module flag semuanya harus lolos sebelum data dikembalikan.

## Compatibility

Perubahan backward-incompatible membutuhkan versi API baru atau migration window yang didokumentasikan. Menambah optional field diperbolehkan; client harus mengabaikan field yang tidak dikenal. Enum dan status workflow diperlakukan sebagai kontrak stabil dan harus diperbarui bersama di `packages/contracts` serta OpenAPI.

## Contoh request development

```sh
curl --fail --show-error http://localhost:3000/health
curl --fail --show-error http://localhost:3000/documentation/json
```

Untuk request terautentikasi gunakan cookie jar lokal yang aman dan hapus setelah pengujian. Jangan menyalin contoh credential development ke production.

