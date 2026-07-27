# Backup dan restore

Backup dianggap berhasil hanya setelah database dan uploads tersalin, checksum diverifikasi, hasil dienkripsi, salinan dipindahkan ke lokasi terpisah, dan restore drill pernah berhasil.

## Isi backup

`scripts/backup.sh` membuat direktori timestamp baru yang berisi:

- `database.dump`: output `pg_dump --format=custom`;
- `uploads.tar.gz`: arsip seluruh upload;
- `manifest.txt`: versi format dan waktu UTC;
- `SHA256SUMS`: checksum ketiga file.

Script tidak menimpa backup lama. Marker `INCOMPLETE` tetap ada bila proses berhenti sebelum checksum selesai; jangan gunakan direktori tersebut untuk restore.

## Membuat backup

Jalankan pada host yang memiliki PostgreSQL client dengan major version sama atau lebih baru daripada server. Gunakan destination khusus, bukan root filesystem. Destination harus sudah ada dan tidak boleh sama, berada di dalam, atau menjadi parent dari direktori uploads.

```sh
./scripts/backup.sh \
  --database-url 'postgresql://wargahub:REDACTED@127.0.0.1:5432/wargahub' \
  --uploads-dir '/srv/wargahub/uploads' \
  --destination '/srv/backups/wargahub'
```

Pada deployment Compose, database dan uploads berada dalam named volume. Operator dapat menjalankan PostgreSQL client dari host/bastion atau container operasi yang versinya dipin dan hanya mendapat mount/read access yang diperlukan. Jangan memasukkan password ke script atau repository; ambil dari secret manager dan hindari command history.

Verifikasi hasil dari dalam direktori backup:

```sh
sha256sum --check SHA256SUMS
pg_restore --list database.dump >/dev/null
tar -tzf uploads.tar.gz >/dev/null
```

Di macOS, gunakan `shasum -a 256 --check SHA256SUMS`.

## Enkripsi dan retensi

Script menghasilkan format biasa agar tetap kompatibel dengan `age`, GPG, storage-side encryption, dan berbagai sistem backup. Enkripsi seluruh bundle setelah checksum dibuat. Contoh dengan `age`:

```sh
tar -czf - wargahub-20260727T150000Z \
  | age -r 'age1replace_with_real_recipient' \
  > wargahub-20260727T150000Z.tar.gz.age
```

Simpan key dekripsi terpisah dari backup. Baseline retensi PRD adalah 7 backup harian, 4 mingguan, dan 6 bulanan. Implementasikan retensi di sistem backup, bukan dengan wildcard deletion di script ini. Minimal satu salinan harus berada di failure domain berbeda.

## Persiapan restore

Restore selalu dilakukan ke database kosong dan direktori uploads yang belum ada atau kosong. Rekomendasi:

1. Aktifkan maintenance mode/hentikan traffic dan worker pada environment target.
2. Salin serta dekripsi backup ke host restore.
3. Verifikasi `SHA256SUMS`, daftar dump, versi aplikasi, dan versi migration.
4. Buat database target baru dengan owner dan encoding yang benar.
5. Pilih path uploads target baru; jangan arahkan percobaan pertama ke uploads aktif.

Script sengaja tidak menjalankan `dropdb`, `DROP DATABASE`, `pg_restore --clean`, `rm`, atau mengosongkan direktori.

## Menjalankan restore

```sh
./scripts/restore.sh \
  --database-url 'postgresql://wargahub:REDACTED@127.0.0.1:5432/wargahub_restore' \
  --dump '/srv/backups/wargahub/wargahub-20260727T150000Z/database.dump' \
  --uploads-archive '/srv/backups/wargahub/wargahub-20260727T150000Z/uploads.tar.gz' \
  --uploads-destination '/srv/wargahub-restored/uploads' \
  --checksum-file '/srv/backups/wargahub/wargahub-20260727T150000Z/SHA256SUMS' \
  --confirm RESTORE_WARGAHUB
```

Konfirmasi wajib mencegah eksekusi tidak sengaja, tetapi operator tetap bertanggung jawab memastikan URL menunjuk database target. Sebelum `pg_restore`, script memakai `psql` untuk menolak target yang memiliki table, view, sequence, routine, custom type, atau schema non-default. Instalasi PostgreSQL client harus menyediakan `psql` dan `pg_restore`. Restore kemudian menggunakan satu transaksi tanpa pembersihan otomatis.

## Validasi sebelum membuka traffic

- Jalankan application migration versi yang akan dipakai.
- Pastikan `/health` dan `/ready` sukses.
- Login dengan akun pemulihan yang sah.
- Bandingkan jumlah organisasi, rumah, pengguna, transaksi, audit log, dan file.
- Periksa saldo kas serta satu reversal dan pembayaran terverifikasi.
- Unduh beberapa file privat melalui authorization normal.
- Jalankan worker dan pastikan job lama tidak terkirim dua kali.
- Catat durasi, recovery point, temuan, dan persetujuan pembukaan traffic.

Restore drill harus dijalankan berkala pada environment terisolasi. Jangan menganggap backup valid hanya karena file dapat dibuat.
