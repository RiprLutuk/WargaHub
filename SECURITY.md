# Kebijakan Keamanan

Jangan membuka issue publik untuk kerentanan yang dapat mengekspos data warga. Kirim laporan privat kepada maintainer instalasi dan sertakan versi, dampak, langkah reproduksi minimal, serta mitigasi yang diketahui.

## Batas keamanan utama

- Authorization dan organization/household scope diperiksa di backend.
- Password di-hash dengan Argon2id dan token sesi disimpan sebagai digest.
- File privat tidak boleh dilayani sebagai aset publik.
- Audit log tidak boleh menyimpan password, token, atau isi bukti pembayaran.
- Production wajib memakai HTTPS, secret unik, database least-privilege, dan backup terenkripsi.

Versi yang masih menerima patch keamanan adalah rilis minor terbaru.
