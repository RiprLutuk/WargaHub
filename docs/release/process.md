# Release process

WargaHub memakai Semantic Versioning. Release harus dapat dibangun ulang dari tag
repository dan tidak boleh bergantung pada secret maintainer.

## Sebelum release

1. Tetapkan scope dan pindahkan item relevan dari `Unreleased` di `CHANGELOG.md`.
2. Audit migration compatibility, backup format, environment variable, dan OpenAPI.
3. Jalankan `bun install --frozen-lockfile`, typecheck, seluruh test, build, serta
   critical E2E pada database baru.
4. Jalankan security/dependency scan dan periksa tidak ada secret atau data pribadi.
5. Build image dari tag candidate dan uji Compose pada host bersih.
6. Lakukan backup serta restore drill, kemudian verifikasi `/ready`, login, saldo,
   private file access, dan job worker.
7. Minta code review dan persetujuan maintainer untuk release notes.

## Publikasi

1. Buat signed/annotated tag `vMAJOR.MINOR.PATCH` dari commit yang sudah diverifikasi.
2. Build dan push image immutable dengan tag versi serta digest; jangan hanya `latest`.
3. Publikasikan changelog, checksum artefak, supported upgrade path, dan known issues.
4. Arsipkan OpenAPI JSON dan catat versi PostgreSQL/Bun/Caddy yang diuji.

## Setelah release

- Deploy ke environment pilot terlebih dahulu dan pantau health, error, job gagal,
  kapasitas volume, serta laporan privasi.
- Siapkan patch release atau rollback/restore decision; jangan downgrade database
  setelah migration tanpa prosedur eksplisit.
- Buka kembali bagian `Unreleased` pada changelog.

