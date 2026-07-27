# PRD — WargaHub

> **Nama kerja:** WargaHub  
> **Jenis produk:** Open-source community management platform untuk RT/RW, perumahan, kampung, apartemen kecil, dan lingkungan warga  
> **Dokumen:** Product Requirements Document  
> **Versi:** 1.0  
> **Status:** Draft untuk MVP  
> **Lisensi yang disarankan:** AGPL-3.0  
> **Bahasa utama:** Bahasa Indonesia  
> **Platform:** Web responsif + Progressive Web App  
> **Arsitektur:** Frontend dan backend terpisah melalui REST API

---

## 1. Ringkasan Produk

WargaHub adalah sistem informasi RT/RW yang membantu warga dan pengurus mengelola kebutuhan lingkungan secara transparan, ringan, dan tidak melelahkan secara sosial.

Masalah utama di banyak lingkungan bukan hanya tidak adanya aplikasi, tetapi terlalu banyak aktivitas yang masih mengandalkan:

- grup WhatsApp yang penuh percakapan tidak terstruktur;
- pencatatan manual;
- penagihan berulang;
- tekanan sosial;
- keharusan hadir secara fisik;
- keputusan yang tidak terdokumentasi;
- pembagian tugas yang tidak adil;
- laporan keuangan yang sulit diperiksa;
- konflik antara warga, pengurus, petugas, dan vendor;
- asumsi bahwa setiap warga mempunyai waktu, energi, kondisi fisik, dan pola kerja yang sama.

WargaHub tidak bertujuan menghilangkan interaksi sosial. Produk ini bertujuan membuat interaksi sosial menjadi lebih sehat, sukarela, terukur, transparan, dan tidak membebani warga yang sedang bekerja, sakit, memiliki anak kecil, bekerja shift, tinggal sendiri, lanjut usia, atau sedang membutuhkan waktu istirahat.

Sistem menyediakan:

1. **Halaman publik lingkungan** untuk pengumuman, agenda, transparansi, fasilitas, kontak penting, dan informasi layanan.
2. **Portal warga** untuk pembayaran, pelaporan masalah, voting, pendaftaran kegiatan, pengajuan surat, penjadwalan ronda, kerja bakti, dan komunikasi resmi.
3. **Dashboard CMS pengurus** untuk mengelola data, keuangan, kegiatan, pengaduan, dokumen, petugas, vendor, dan laporan.
4. **REST API terpisah** agar frontend, backend, aplikasi mobile, bot, atau integrasi lain dapat dikembangkan secara independen.
5. **Fondasi open source** agar dapat dipasang mandiri, diaudit, dimodifikasi, dan digunakan banyak komunitas tanpa vendor lock-in.

---

## 2. Latar Belakang dan Keresahan Utama

Kehidupan di lingkungan RT/RW sering menuntut partisipasi dalam banyak bentuk:

- ronda malam;
- jimpitan;
- iuran sampah;
- IPL;
- kas RT/RW;
- kerja bakti;
- renovasi masjid atau fasilitas umum;
- konsumsi pekerja atau tukang;
- rapat warga;
- kegiatan hari besar;
- bantuan sosial;
- pengumpulan dana mendadak;
- pendataan penghuni;
- keamanan lingkungan;
- parkir;
- tamu;
- surat pengantar;
- informasi kehilangan;
- penanganan sampah;
- pengaduan fasilitas;
- konflik antarwarga.

Kegiatan tersebut memiliki manfaat sosial, tetapi pelaksanaannya sering tidak memperhitungkan kondisi warga yang:

- bekerja dengan beban mental tinggi;
- bekerja shift;
- pulang larut;
- bekerja dari rumah;
- memiliki tanggungan keluarga;
- memiliki keterbatasan fisik;
- sedang menjaga kesehatan mental;
- sering dinas luar;
- tinggal di rumah kontrakan;
- belum mengenal lingkungan;
- tidak nyaman menyampaikan keberatan secara langsung.

Akibatnya, partisipasi yang seharusnya menjadi bentuk gotong royong dapat berubah menjadi tekanan sosial, rasa bersalah, konflik, ketidakadilan, dan kelelahan.

WargaHub dirancang untuk mengubah pola:

> “Semua warga harus hadir dan mengikuti cara yang sama”

menjadi:

> “Semua warga dapat berkontribusi melalui cara yang berbeda, transparan, wajar, dan sesuai kapasitasnya.”

---

## 3. Visi

Menciptakan infrastruktur digital lingkungan yang adil, transparan, ringan, inklusif, dan menghormati waktu serta kapasitas setiap warga.

---

## 4. Misi

- Mengurangi pekerjaan administratif pengurus.
- Mengurangi tekanan sosial yang tidak perlu.
- Mempermudah warga berkontribusi tanpa harus selalu hadir fisik.
- Menyediakan catatan keputusan dan keuangan yang dapat diaudit.
- Membuat pengaduan dan kebutuhan warga tertangani secara terukur.
- Memberikan pilihan kontribusi: waktu, tenaga, keahlian, barang, atau dana.
- Mengurangi ketergantungan pada percakapan grup WhatsApp.
- Menjadi proyek open source yang mudah dipasang dan dikembangkan komunitas.

---

## 5. Prinsip Produk

### 5.1 Ringan

Sistem harus dapat berjalan pada server kecil dan perangkat warga kelas menengah ke bawah.

### 5.2 Tidak Memaksa

Sistem tidak boleh dirancang sebagai alat mempermalukan warga, menampilkan daftar tunggakan secara publik, atau memperbesar tekanan sosial.

### 5.3 Transparan tetapi Tetap Privat

Keuangan dan keputusan dapat transparan, tetapi data pribadi warga harus dibatasi sesuai peran.

### 5.4 Pilihan Kontribusi

Setiap kegiatan dapat menyediakan beberapa bentuk kontribusi:

- hadir;
- membayar pengganti;
- menyumbang makanan atau barang;
- membantu administrasi;
- membantu desain, dokumentasi, atau teknologi;
- bertukar jadwal;
- mengajukan dispensasi;
- tidak berpartisipasi dengan alasan tertentu tanpa dipermalukan.

### 5.5 Pengurus Bukan Operator Penuh Waktu

Alur kerja harus sederhana, dapat didelegasikan, dan mengurangi pekerjaan pengurus.

### 5.6 Tidak Menjadi Super App

Produk fokus pada kebutuhan lingkungan. Fitur yang tidak relevan tidak perlu dimasukkan.

### 5.7 Open Source dan Dapat Dipasang Mandiri

Komunitas harus dapat menjalankan WargaHub pada infrastruktur sendiri.

---

## 6. Sasaran Pengguna

### 6.1 Warga Pekerja

Kebutuhan:

- mendapatkan informasi tanpa membaca ratusan pesan;
- membayar iuran dengan mudah;
- mengetahui kewajiban yang benar-benar harus diselesaikan;
- menukar jadwal ronda;
- mengajukan dispensasi;
- memilih bentuk kontribusi;
- melaporkan masalah tanpa berdebat di grup;
- melihat hasil keputusan dan penggunaan dana.

### 6.2 Ketua RT/RW

Kebutuhan:

- mengelola data warga;
- menyampaikan pengumuman resmi;
- melihat status iuran;
- menangani pengaduan;
- memantau kegiatan;
- menyusun laporan pertanggungjawaban;
- mengurangi pekerjaan berulang;
- mendelegasikan tugas ke bendahara, sekretaris, koordinator, dan petugas.

### 6.3 Bendahara

Kebutuhan:

- membuat tagihan;
- mencatat pembayaran;
- melakukan rekonsiliasi;
- mengunggah bukti transaksi;
- menyusun laporan kas;
- mengekspor laporan;
- mengelola dana khusus.

### 6.4 Sekretaris

Kebutuhan:

- mengelola surat;
- menyimpan dokumen;
- membuat berita acara;
- mengelola agenda;
- mencatat hasil rapat;
- mengatur arsip.

### 6.5 Koordinator Keamanan

Kebutuhan:

- menyusun jadwal ronda;
- mencatat pergantian jadwal;
- membuat laporan kejadian;
- melihat petugas aktif;
- mengelola nomor darurat;
- mencatat tamu atau kendaraan bila diperlukan.

### 6.6 Petugas Sampah, Keamanan, Kebersihan, dan Vendor

Kebutuhan:

- melihat jadwal;
- menerima tugas;
- memperbarui status pekerjaan;
- mengunggah bukti;
- melaporkan kendala;
- tidak memiliki akses ke data warga yang tidak diperlukan.

### 6.7 Pemilik Rumah yang Tidak Tinggal di Lokasi

Kebutuhan:

- memantau tagihan;
- menerima pengumuman penting;
- mengelola data penyewa;
- memberikan persetujuan tertentu;
- melihat kondisi fasilitas bersama.

### 6.8 Penyewa atau Penghuni Sementara

Kebutuhan:

- menerima informasi penting;
- mengetahui aturan lingkungan;
- melaporkan masalah;
- mengakses layanan sesuai izin pemilik.

### 6.9 Lansia dan Pengguna Nonteknis

Kebutuhan:

- tampilan sederhana;
- teks mudah dibaca;
- bantuan keluarga atau wali;
- opsi pencatatan manual oleh pengurus;
- tidak diwajibkan menggunakan seluruh fitur.

---

## 7. Tujuan Produk

### 7.1 Tujuan Utama

1. Menurunkan volume administrasi manual pengurus.
2. Menurunkan jumlah penagihan personal melalui chat.
3. Menurunkan jumlah konflik akibat informasi tidak jelas.
4. Meningkatkan transparansi keuangan.
5. Meningkatkan fleksibilitas partisipasi warga.
6. Mempercepat penyelesaian pengaduan.
7. Mengurangi ketergantungan pada grup WhatsApp.
8. Menyediakan data historis yang dapat diperiksa.
9. Memastikan aksesibilitas bagi warga nonteknis.
10. Menyediakan fondasi open source yang mudah dipelihara.

### 7.2 Target Keberhasilan MVP

Dalam tiga bulan setelah implementasi pada satu lingkungan pilot:

- minimal 70% rumah tangga terdaftar;
- minimal 60% pembayaran iuran dicatat melalui sistem;
- minimal 50% pengumuman resmi dipublikasikan melalui WargaHub;
- minimal 80% pengaduan memiliki status dan penanggung jawab;
- waktu penyusunan laporan kas bulanan berkurang 50%;
- jumlah penagihan personal oleh bendahara berkurang 40%;
- tidak ada daftar tunggakan yang terekspos secara publik;
- minimal 30% perubahan jadwal ronda dilakukan tanpa chat manual;
- minimal 90% halaman utama dapat dimuat di jaringan seluler lambat.

---

## 8. Bukan Tujuan Produk

Untuk menjaga sistem tetap ringan, MVP tidak mencakup:

- media sosial penuh;
- chat real-time pengganti WhatsApp;
- video conference;
- marketplace umum;
- dompet digital internal;
- sistem pinjaman;
- sistem absensi biometrik;
- pengenalan wajah;
- pelacakan lokasi warga;
- integrasi CCTV pada tahap awal;
- microservices;
- blockchain;
- AI sebagai komponen inti;
- aplikasi native iOS dan Android;
- sistem ERP kompleks;
- gamifikasi yang mempermalukan warga;
- ranking warga paling rajin;
- skor sosial warga.

---

## 9. Ruang Lingkup Produk

WargaHub terdiri dari tiga area utama.

### 9.1 Halaman Publik

Dapat diakses tanpa login dan berisi informasi yang memang layak diketahui publik.

Fitur:

- profil RT/RW atau lingkungan;
- visi, struktur pengurus, dan masa jabatan;
- pengumuman publik;
- agenda publik;
- aturan lingkungan;
- nomor darurat;
- daftar fasilitas;
- informasi layanan sampah;
- informasi keamanan;
- laporan transparansi yang sudah disanitasi;
- formulir kontak umum;
- halaman donasi atau program lingkungan;
- status fasilitas atau gangguan umum;
- dokumen publik;
- statistik lingkungan tanpa data personal;
- informasi UMKM warga opsional;
- halaman proyek renovasi;
- halaman bantuan bencana atau sosial;
- halaman kehilangan dan penemuan yang dimoderasi.

### 9.2 Portal Warga

Dapat diakses setelah login.

Fitur:

- ringkasan kewajiban;
- pembayaran dan bukti pembayaran;
- riwayat iuran;
- pengumuman khusus warga;
- agenda dan RSVP;
- ronda;
- kerja bakti;
- pengaduan;
- voting dan musyawarah;
- surat pengantar;
- data rumah dan penghuni;
- program jimpitan;
- donasi;
- fasilitas;
- peminjaman barang;
- tamu dan kendaraan opsional;
- dokumen internal;
- preferensi notifikasi;
- mode privasi;
- delegasi akses keluarga;
- dispensasi;
- pertukaran jadwal;
- kanal kontribusi nonfisik.

### 9.3 Dashboard CMS Pengurus

Fitur:

- manajemen warga, rumah, blok, dan keluarga;
- manajemen pengumuman;
- manajemen agenda;
- manajemen pembayaran;
- manajemen laporan keuangan;
- manajemen program;
- manajemen pengaduan;
- manajemen ronda;
- manajemen kerja bakti;
- manajemen surat;
- manajemen voting;
- manajemen fasilitas;
- manajemen vendor;
- manajemen petugas;
- manajemen dokumen;
- manajemen role dan permission;
- audit log;
- konfigurasi lingkungan;
- ekspor dan impor data;
- backup;
- dashboard metrik operasional;
- moderasi konten;
- konfigurasi formulir;
- konfigurasi notifikasi.

---

## 10. Model Organisasi

Satu instalasi WargaHub dapat mendukung satu atau beberapa lingkungan.

Struktur logis:

```text
Organisasi
└── RW
    ├── RT
    │   ├── Blok
    │   │   ├── Rumah
    │   │   │   ├── Keluarga
    │   │   │   └── Penghuni
```

Untuk MVP, deployment dapat menggunakan model satu organisasi agar sederhana. Dukungan multi-tenant dapat disiapkan pada model data, tetapi tidak harus diaktifkan pada versi pertama.

---

## 11. Peran dan Hak Akses

### 11.1 Role Bawaan

- Super Admin Instalasi
- Admin Organisasi
- Ketua RW
- Ketua RT
- Sekretaris
- Bendahara
- Koordinator Keamanan
- Koordinator Kebersihan
- Koordinator Kegiatan
- Petugas
- Auditor Internal
- Warga
- Pemilik Rumah
- Penyewa
- Wali Keluarga
- Vendor
- Tamu Terverifikasi

### 11.2 Prinsip Permission

Menggunakan Role-Based Access Control dengan izin granular.

Contoh permission:

```text
resident.read
resident.create
resident.update
resident.export

billing.read
billing.create
billing.update
billing.reconcile

finance.report.read
finance.report.publish

complaint.read
complaint.assign
complaint.resolve

patrol.schedule.read
patrol.schedule.manage
patrol.swap.approve

announcement.publish
document.public.publish
audit_log.read
```

### 11.3 Batasan Akses

- Vendor hanya melihat pekerjaan yang ditugaskan kepadanya.
- Petugas keamanan tidak otomatis melihat data keuangan.
- Bendahara tidak otomatis dapat mengubah data kependudukan.
- Warga hanya melihat data keluarga atau rumah yang diizinkan.
- Data tunggakan individual tidak boleh tampil pada halaman publik.
- Audit log hanya dapat diakses role tertentu.
- Ekspor data sensitif harus tercatat dalam audit log.

---

## 12. Modul Fungsional

## 12.1 Autentikasi dan Akun

### Kebutuhan

- Login menggunakan nomor telepon atau email.
- Password atau magic link/OTP opsional.
- Verifikasi akun oleh pengurus.
- Undangan anggota keluarga.
- Satu pengguna dapat terkait ke beberapa rumah.
- Satu rumah dapat memiliki beberapa penghuni.
- Dukungan akun wali untuk lansia.
- Reset kredensial.
- Session management.
- Logout dari seluruh perangkat.
- Riwayat login.
- Rate limiting login.
- CAPTCHA hanya saat terdeteksi aktivitas mencurigakan.

### Catatan

OTP melalui WhatsApp atau SMS membutuhkan biaya dan integrasi pihak ketiga. MVP dapat memulai dengan email atau password, sementara WhatsApp bersifat opsional.

---

## 12.2 Data Rumah, Keluarga, dan Penghuni

### Data Rumah

- kode rumah;
- alamat;
- RT;
- RW;
- blok;
- status hunian;
- status kepemilikan;
- pemilik;
- penghuni aktif;
- nomor meter air opsional;
- nomor kendaraan opsional;
- status kosong;
- catatan privat pengurus dengan kontrol akses.

### Data Penghuni

- nama;
- nomor telepon;
- email;
- hubungan dalam keluarga;
- status penghuni;
- tanggal mulai tinggal;
- tanggal selesai tinggal;
- kontak darurat;
- preferensi komunikasi;
- kebutuhan aksesibilitas opsional;
- keahlian yang bersedia dibagikan;
- jadwal kerja opsional;
- preferensi partisipasi;
- persetujuan privasi.

### Aturan Privasi

Nomor identitas pemerintah tidak perlu menjadi data wajib. Jika benar-benar dibutuhkan untuk administrasi, data harus dienkripsi dan aksesnya dibatasi.

---

## 12.3 Pengumuman Terstruktur

### Fitur

- kategori;
- judul;
- isi;
- lampiran;
- target audiens;
- status draft;
- jadwal publikasi;
- masa berlaku;
- tingkat urgensi;
- pin pengumuman;
- acknowledgement atau tanda sudah membaca;
- versi perubahan;
- arsip;
- komentar dimatikan secara default;
- ringkasan singkat untuk notifikasi.

### Kategori

- darurat;
- keamanan;
- air dan listrik;
- sampah;
- keuangan;
- kegiatan;
- fasilitas;
- administrasi;
- kehilangan;
- kematian;
- sosial;
- umum.

### Tujuan

Pengumuman resmi tidak tenggelam di antara percakapan grup.

---

## 12.4 Iuran, Tagihan, dan Pembayaran

### Jenis Tagihan

- iuran RT;
- iuran RW;
- sampah;
- keamanan;
- IPL;
- jimpitan;
- kas sosial;
- renovasi fasilitas;
- masjid atau rumah ibadah;
- kegiatan hari besar;
- dana darurat;
- tagihan insidental;
- kontribusi sukarela.

### Fitur

- tagihan berulang;
- tagihan satu kali;
- tagihan berdasarkan rumah;
- tagihan berdasarkan penghuni;
- periode tagihan;
- tanggal jatuh tempo;
- nominal tetap;
- nominal opsional;
- nominal sukarela;
- diskon atau subsidi;
- pembebasan;
- cicilan;
- denda opsional dan harus dikonfigurasi eksplisit;
- unggah bukti transfer;
- pencatatan tunai;
- verifikasi bendahara;
- pembayaran parsial;
- overpayment;
- saldo kredit;
- catatan koreksi;
- pembatalan dengan audit trail;
- ekspor CSV;
- kuitansi digital;
- pengingat;
- rekonsiliasi rekening manual;
- integrasi payment gateway opsional.

### Prinsip Etis

- Tidak menampilkan “warga menunggak” secara publik.
- Pengingat dikirim privat.
- Pengurus dapat memberi dispensasi atau penjadwalan ulang.
- Sistem membedakan kewajiban, sukarela, dan donasi.
- Setiap tagihan harus memiliki deskripsi penggunaan dana.

---

## 12.5 Kas dan Laporan Keuangan

### Fitur

- akun kas;
- rekening bank;
- pemasukan;
- pengeluaran;
- kategori transaksi;
- dana terikat;
- dana umum;
- bukti transaksi;
- vendor;
- nomor referensi;
- pembuat transaksi;
- pemeriksa transaksi;
- status draft, reviewed, dan posted;
- laporan arus kas;
- laporan per program;
- laporan bulanan;
- saldo awal dan akhir;
- rekonsiliasi;
- koreksi;
- audit trail;
- ekspor PDF dan CSV;
- publikasi laporan yang sudah disanitasi.

### Kontrol

- transaksi di atas batas tertentu memerlukan approval kedua;
- penghapusan transaksi tidak diperbolehkan, hanya reversal;
- perubahan nominal dicatat;
- dokumen bukti tidak dapat diakses publik kecuali dipublikasikan secara sengaja;
- laporan publik tidak menampilkan nomor rekening lengkap atau data pribadi.

---

## 12.6 Ronda dan Keamanan

### Fitur

- jadwal ronda;
- kelompok ronda;
- slot waktu;
- kapasitas;
- penugasan otomatis atau manual;
- preferensi jadwal;
- pengecualian;
- pertukaran jadwal;
- pengganti;
- kontribusi alternatif;
- check-in manual;
- laporan kejadian;
- nomor darurat;
- panic information page;
- log patroli;
- area patroli;
- insiden keamanan;
- status penyelesaian;
- lampiran foto;
- broadcast darurat;
- rekap kehadiran privat.

### Kebijakan

Sistem harus mendukung:

- warga shift malam;
- lansia;
- kondisi kesehatan;
- ibu hamil;
- orang tua dengan bayi;
- warga yang sedang dinas;
- warga yang memilih membayar petugas pengganti;
- warga yang berkontribusi melalui cara lain.

Sistem tidak boleh menampilkan ranking “paling sering absen”.

---

## 12.7 Jimpitan

### Fitur

- konfigurasi nominal atau bentuk barang;
- jadwal pengambilan;
- petugas;
- rute;
- pencatatan;
- rekap;
- tujuan penggunaan dana;
- status rumah;
- pengecualian;
- alternatif pembayaran bulanan;
- laporan transparansi;
- integrasi ke kas.

### Tujuan

Mengurangi pencatatan manual dan menghindari kesalahpahaman mengenai nominal atau penggunaannya.

---

## 12.8 Kerja Bakti dan Kegiatan Warga

### Fitur

- pembuatan kegiatan;
- tujuan;
- lokasi;
- tanggal;
- kapasitas;
- koordinator;
- daftar kebutuhan;
- estimasi biaya;
- RSVP;
- daftar hadir;
- opsi kontribusi;
- pertukaran tugas;
- konsumsi;
- alat dan perlengkapan;
- dokumentasi;
- laporan hasil;
- evaluasi;
- pembatalan;
- pengingat.

### Bentuk Kontribusi

- tenaga fisik;
- konsumsi;
- alat;
- kendaraan;
- dokumentasi;
- desain;
- administrasi;
- dana;
- pekerjaan jarak jauh;
- tidak berpartisipasi dengan dispensasi.

### Contoh

Untuk renovasi masjid, warga dapat memilih:

- ikut kerja fisik;
- membawakan konsumsi;
- membantu pembelian bahan;
- membuat laporan anggaran;
- mendesain poster;
- berdonasi;
- membantu dokumentasi;
- menjadi penghubung vendor.

---

## 12.9 Program dan Proyek Lingkungan

Program adalah kegiatan yang berjalan lebih dari satu hari atau memiliki anggaran khusus.

Contoh:

- renovasi masjid;
- pembangunan pos ronda;
- perbaikan drainase;
- penghijauan;
- perbaikan jalan;
- pengadaan CCTV;
- program sampah;
- bantuan bencana;
- kegiatan Ramadan;
- perayaan kemerdekaan;
- perbaikan taman.

### Fitur

- deskripsi;
- target;
- timeline;
- milestone;
- PIC;
- anggota tim;
- anggaran;
- sumber dana;
- pengeluaran;
- progres;
- kendala;
- dokumentasi;
- update publik;
- daftar kontribusi;
- vendor;
- approval;
- berita acara;
- laporan penutupan.

---

## 12.10 Pengaduan, Aspirasi, dan Permintaan Layanan

### Kategori

- sampah;
- keamanan;
- parkir;
- kebisingan;
- hewan;
- fasilitas;
- saluran air;
- penerangan;
- jalan;
- pohon;
- sosial;
- administrasi;
- pungutan;
- konflik;
- kebersihan;
- layanan petugas;
- pelanggaran aturan;
- lainnya.

### Fitur

- pengaduan privat atau publik;
- pelapor anonim terbatas;
- lokasi;
- foto;
- prioritas;
- status;
- SLA;
- penanggung jawab;
- komentar internal;
- komentar ke pelapor;
- riwayat perubahan;
- eskalasi;
- penggabungan laporan duplikat;
- penutupan;
- rating penyelesaian;
- reopening;
- kategori sensitif;
- moderasi.

### Status

```text
DRAFT
SUBMITTED
VERIFIED
ASSIGNED
IN_PROGRESS
WAITING_FOR_REPORTER
WAITING_FOR_VENDOR
RESOLVED
REJECTED
CLOSED
```

### Perlindungan

- Pengaduan sensitif tidak otomatis terlihat semua pengurus.
- Pelapor dapat menyembunyikan identitas dari pengguna umum.
- Sistem tidak boleh menjadi sarana fitnah.
- Konten harus memiliki mekanisme pelaporan dan moderasi.

---

## 12.11 Musyawarah, Polling, dan Voting

### Fitur

- jenis konsultasi;
- proposal;
- opsi;
- periode diskusi;
- periode voting;
- audiens;
- satu akun per rumah atau satu akun per warga;
- kuorum;
- anonymous ballot opsional;
- hasil;
- berita acara;
- lampiran;
- histori perubahan;
- alasan keputusan;
- publikasi hasil.

### Jenis

- polling informal;
- survei;
- voting rumah tangga;
- voting individu;
- persetujuan anggaran;
- pemilihan jadwal;
- pemilihan vendor;
- persetujuan program;
- musyawarah berbasis komentar terstruktur.

### Catatan

Voting digital tidak menggantikan aturan hukum atau peraturan organisasi yang berlaku. Sistem hanya menjadi alat pencatatan dan partisipasi.

---

## 12.12 Surat dan Administrasi

### Jenis Surat

- surat pengantar;
- surat domisili;
- surat keterangan usaha;
- surat keterangan tidak mampu;
- surat pengantar nikah;
- surat kematian;
- surat kelahiran;
- surat pindah;
- surat lain sesuai kebijakan lokal.

### Fitur

- formulir dinamis;
- upload dokumen;
- verifikasi;
- approval;
- nomor surat;
- template;
- tanda tangan digital sederhana;
- QR verifikasi;
- status;
- estimasi penyelesaian;
- unduh PDF;
- arsip;
- audit log.

### Status

```text
DRAFT
SUBMITTED
REVIEWED
REVISION_REQUIRED
APPROVED
REJECTED
ISSUED
EXPIRED
```

---

## 12.13 Sampah dan Kebersihan

### Fitur

- jadwal pengangkutan;
- area;
- jenis sampah;
- petugas;
- gangguan layanan;
- pengaduan;
- pembayaran;
- bank sampah;
- pencatatan berat opsional;
- program daur ulang;
- permintaan pengangkutan khusus;
- bulk waste;
- laporan petugas;
- status penyelesaian;
- edukasi pemilahan.

### Tambahan Relevan

- warga dapat menandai rumah kosong;
- jadwal dapat berbeda per blok;
- notifikasi bila pengangkutan tertunda;
- dashboard pengurus menunjukkan area dengan pengaduan berulang.

---

## 12.14 Fasilitas dan Peminjaman

### Contoh Fasilitas

- balai warga;
- lapangan;
- kursi;
- tenda;
- sound system;
- alat kebersihan;
- mesin potong rumput;
- tangga;
- gerobak;
- genset;
- aula;
- taman.

### Fitur

- kalender ketersediaan;
- reservasi;
- approval;
- deposit opsional;
- biaya;
- aturan penggunaan;
- check-in;
- check-out;
- kondisi barang;
- foto;
- kerusakan;
- blacklist dengan approval;
- laporan penggunaan.

---

## 12.15 Parkir, Kendaraan, dan Akses

Modul ini opsional agar sistem tetap ringan.

### Fitur

- data kendaraan;
- stiker;
- kendaraan penghuni;
- kendaraan tamu;
- area parkir;
- pengaduan parkir;
- izin parkir sementara;
- kendaraan mencurigakan;
- kontak pemilik melalui pengurus tanpa mengekspos nomor telepon.

### Prinsip Privasi

Nomor polisi kendaraan tidak tampil publik.

---

## 12.16 Tamu dan Keamanan Akses

Modul opsional untuk lingkungan yang membutuhkannya.

### Fitur

- pre-registration tamu;
- QR tamu;
- waktu masuk dan keluar;
- tujuan rumah;
- catatan petugas;
- daftar blokir terbatas;
- masa retensi data;
- penghapusan otomatis;
- emergency override.

Tidak ada pengenalan wajah pada MVP.

---

## 12.17 UMKM dan Jasa Warga

Fitur opsional untuk membantu ekonomi lokal tanpa berubah menjadi marketplace besar.

### Fitur

- direktori usaha warga;
- kategori;
- kontak;
- jam operasional;
- area layanan;
- status verifikasi;
- promo terbatas;
- laporan penyalahgunaan;
- tidak ada pembayaran dalam aplikasi pada MVP.

---

## 12.18 Bantuan Sosial dan Solidaritas

### Fitur

- pengajuan bantuan;
- verifikasi terbatas;
- program bantuan;
- kebutuhan;
- target dana;
- penyaluran;
- bukti;
- penerima;
- anonymization;
- laporan agregat;
- relawan;
- log distribusi.

### Prinsip

Identitas penerima bantuan tidak boleh dipublikasikan tanpa persetujuan.

---

## 12.19 Kehilangan dan Penemuan

### Fitur

- jenis barang;
- lokasi;
- waktu;
- foto;
- kontak melalui sistem;
- status;
- moderasi;
- masa berlaku;
- arsip otomatis.

---

## 12.20 Kalender Lingkungan

Menggabungkan:

- kerja bakti;
- ronda;
- rapat;
- kegiatan sosial;
- jadwal sampah;
- peminjaman fasilitas;
- program;
- jadwal layanan.

Fitur:

- tampilan bulan dan daftar;
- filter;
- ekspor iCalendar;
- reminder;
- timezone;
- recurring event;
- akses publik atau privat.

---

## 12.21 Notifikasi

### Kanal

- in-app;
- email;
- push notification PWA;
- WhatsApp melalui provider opsional;
- SMS opsional.

### Preferensi

Warga dapat memilih:

- jenis notifikasi;
- kanal;
- quiet hours;
- ringkasan harian;
- pengumuman darurat saja;
- tidak menerima promosi UMKM;
- notifikasi per rumah.

### Aturan

- Notifikasi tidak boleh dikirim berlebihan.
- Pengingat tagihan memiliki batas frekuensi.
- Pesan darurat dapat melewati quiet hours.
- Semua pengiriman penting memiliki log.

---

## 12.22 Dokumen dan Arsip

### Jenis

- peraturan;
- SOP;
- laporan;
- notulen;
- berita acara;
- proposal;
- kuitansi;
- kontrak vendor;
- surat;
- dokumentasi program.

### Fitur

- folder;
- tag;
- versi;
- akses publik atau internal;
- tanggal berlaku;
- tanggal kedaluwarsa;
- pemilik dokumen;
- preview;
- download;
- checksum;
- audit akses untuk dokumen sensitif.

---

## 12.23 Dashboard Operasional

### Widget

- tagihan periode berjalan;
- pembayaran belum diverifikasi;
- saldo kas;
- pengaduan terbuka;
- SLA terlewati;
- kegiatan terdekat;
- jadwal ronda kosong;
- surat menunggu approval;
- program aktif;
- fasilitas bermasalah;
- notifikasi gagal;
- pengguna aktif;
- rumah belum terverifikasi.

Dashboard harus dapat disesuaikan berdasarkan role.

---

## 12.24 Audit Log

Audit log wajib untuk tindakan penting.

### Dicatat

- login;
- perubahan role;
- ekspor data;
- perubahan transaksi;
- verifikasi pembayaran;
- penerbitan surat;
- publikasi laporan;
- perubahan data warga;
- penghapusan atau anonimisasi;
- perubahan konfigurasi;
- akses dokumen sensitif;
- approval;
- perubahan status pengaduan.

### Isi Log

- actor;
- action;
- entity;
- entity ID;
- waktu;
- IP;
- user agent;
- nilai lama dan baru bila aman;
- request ID.

---

## 13. Alur Pengguna Utama

## 13.1 Membayar Iuran

1. Warga login.
2. Dashboard menampilkan tagihan aktif.
3. Warga membuka detail tagihan.
4. Sistem menampilkan jenis, periode, nominal, dan penggunaan.
5. Warga memilih metode.
6. Jika transfer manual, warga mengunggah bukti.
7. Status menjadi `PENDING_VERIFICATION`.
8. Bendahara memverifikasi.
9. Status menjadi `PAID`.
10. Sistem menghasilkan kuitansi.
11. Transaksi masuk ke laporan kas.

---

## 13.2 Menukar Jadwal Ronda

1. Warga membuka jadwal.
2. Warga memilih jadwal yang tidak dapat dihadiri.
3. Warga memilih:
   - cari pengganti;
   - tukar dengan jadwal lain;
   - kontribusi pengganti;
   - ajukan dispensasi.
4. Sistem mengirim permintaan.
5. Pengganti menerima.
6. Koordinator menyetujui bila diperlukan.
7. Jadwal diperbarui.
8. Audit log disimpan.

---

## 13.3 Mengikuti Kerja Bakti Secara Alternatif

1. Warga membuka kegiatan.
2. Sistem menampilkan kebutuhan kontribusi.
3. Warga memilih:
   - hadir;
   - konsumsi;
   - alat;
   - dana;
   - bantuan administrasi;
   - dokumentasi;
   - dispensasi.
4. Koordinator melihat distribusi kontribusi.
5. Sistem menandai kebutuhan yang belum terpenuhi.
6. Setelah kegiatan selesai, koordinator mengunggah hasil.

---

## 13.4 Membuat Pengaduan

1. Warga memilih kategori.
2. Warga menulis masalah.
3. Warga menentukan privasi.
4. Warga menambahkan lokasi dan foto.
5. Sistem membuat nomor tiket.
6. Pengurus memverifikasi.
7. Pengurus menetapkan PIC.
8. PIC memperbarui progres.
9. Warga menerima notifikasi.
10. Pengaduan diselesaikan.
11. Warga memberikan penilaian atau membuka kembali.

---

## 13.5 Memublikasikan Laporan Keuangan

1. Bendahara menutup periode.
2. Sistem memeriksa transaksi belum lengkap.
3. Bendahara merekonsiliasi saldo.
4. Pemeriksa melakukan review.
5. Laporan disetujui.
6. Sistem membuat versi publik yang disanitasi.
7. Laporan dipublikasikan.
8. Warga menerima notifikasi.

---

## 14. Functional Requirements

### FR-001 — Organisasi

Sistem harus dapat menyimpan konfigurasi organisasi, RW, RT, blok, dan rumah.

### FR-002 — Pengguna

Sistem harus dapat mengelola akun, profile, role, permission, dan hubungan pengguna dengan rumah.

### FR-003 — Pengumuman

Pengurus harus dapat membuat, menjadwalkan, menerbitkan, dan mengarsipkan pengumuman.

### FR-004 — Tagihan

Bendahara harus dapat membuat tagihan berulang dan satu kali.

### FR-005 — Pembayaran

Warga harus dapat mengunggah bukti pembayaran dan melihat status verifikasi.

### FR-006 — Keuangan

Sistem harus menyimpan pemasukan, pengeluaran, akun kas, kategori, dan bukti transaksi.

### FR-007 — Ronda

Koordinator harus dapat membuat jadwal dan warga harus dapat mengajukan pertukaran.

### FR-008 — Kegiatan

Koordinator harus dapat membuat kegiatan dengan beberapa bentuk kontribusi.

### FR-009 — Pengaduan

Warga harus dapat membuat laporan dan melacak statusnya.

### FR-010 — Voting

Pengurus harus dapat membuat polling atau voting dengan aturan audiens dan kuorum.

### FR-011 — Surat

Warga harus dapat mengajukan surat dan pengurus dapat memprosesnya.

### FR-012 — Dokumen

Pengurus harus dapat menyimpan dan memublikasikan dokumen.

### FR-013 — Notifikasi

Sistem harus mengirim notifikasi in-app dan email.

### FR-014 — Audit

Sistem harus mencatat tindakan sensitif.

### FR-015 — Ekspor

Pengurus harus dapat mengekspor data yang diizinkan ke CSV.

### FR-016 — Impor

Admin harus dapat mengimpor data rumah dan warga melalui CSV tervalidasi.

### FR-017 — Halaman Publik

Admin harus dapat memilih konten yang tampil pada halaman publik.

### FR-018 — PWA

Frontend harus dapat dipasang sebagai PWA.

### FR-019 — Aksesibilitas

Frontend harus mendukung navigasi keyboard dan ukuran teks yang layak.

### FR-020 — Preferensi Partisipasi

Warga harus dapat menyimpan preferensi jadwal dan bentuk kontribusi.

---

## 15. Non-Functional Requirements

## 15.1 Performa

- First Contentful Paint target di bawah 2,5 detik pada jaringan 4G standar.
- API read umum target p95 di bawah 400 ms.
- API write umum target p95 di bawah 700 ms.
- Bundle frontend awal dijaga seramping mungkin.
- Pagination wajib untuk daftar besar.
- Gambar dikompresi.
- Lazy loading untuk modul berat.
- Tidak menggunakan WebSocket kecuali benar-benar diperlukan.

## 15.2 Skalabilitas

Target awal satu instalasi:

- 1 sampai 20 RT;
- 100 sampai 10.000 pengguna;
- 100.000 transaksi per tahun;
- 500.000 notifikasi per tahun;
- 1 juta audit log per tahun.

Skala lebih besar dapat ditangani dengan vertical scaling sebelum memperkenalkan kompleksitas tambahan.

## 15.3 Ketersediaan

- Target uptime komunitas: 99,5%.
- Sistem harus dapat dipulihkan dari backup.
- Maintenance mode.
- Health check endpoint.
- Graceful shutdown.
- Database migration yang dapat dilacak.

## 15.4 Keamanan

- HTTPS wajib di produksi.
- Password di-hash dengan Argon2id.
- Session token aman.
- CSRF protection jika menggunakan cookie.
- Rate limiting.
- Input validation.
- SQL injection protection melalui parameterized query.
- Content Security Policy.
- Secure headers.
- File type validation.
- Antivirus scanning opsional.
- Signed URL untuk file privat.
- Permission check di backend.
- Audit log untuk operasi sensitif.
- Secret tidak disimpan di repository.
- Dependency scanning.
- Backup terenkripsi.

## 15.5 Privasi

- Data minimization.
- Consent untuk data opsional.
- Retention policy.
- Hak akses dan koreksi data.
- Export data pengguna.
- Anonimisasi setelah warga keluar bila memungkinkan.
- Pemisahan data publik dan privat.
- Tidak ada penjualan data.
- Tidak ada iklan berbasis profil.
- Tidak ada social scoring.

## 15.6 Aksesibilitas

Target minimal WCAG 2.1 AA untuk alur utama:

- kontras;
- keyboard navigation;
- label form;
- error message jelas;
- teks dapat diperbesar;
- tidak mengandalkan warna saja;
- screen reader friendly;
- fokus yang terlihat;
- bahasa sederhana.

## 15.7 Observability

- structured logging;
- request ID;
- error tracking opsional;
- basic metrics;
- health endpoint;
- readiness endpoint;
- slow query log;
- admin job status;
- notifikasi gagal.

---

## 16. Arsitektur Teknis

## 16.1 Pendekatan

Gunakan **modular monolith**, bukan microservices.

Alasan:

- lebih mudah dipasang;
- lebih murah;
- lebih mudah dipahami kontributor;
- deployment sederhana;
- transaksi database lebih aman;
- debugging lebih mudah;
- cocok untuk skala RT/RW;
- tetap dapat dipisah menjadi service bila suatu hari diperlukan.

Frontend dan backend tetap dipisahkan secara deployment dan berkomunikasi melalui REST API.

```text
Browser / PWA
      |
      v
Frontend Web
      |
      v
REST API
      |
      +---- PostgreSQL
      |
      +---- Object Storage / Local Storage
      |
      +---- Email Provider
      |
      +---- Optional WhatsApp Provider
```

---

## 16.2 Stack yang Direkomendasikan

### Frontend

- Vue 3
- Vite
- TypeScript
- Vue Router
- Pinia
- Tailwind CSS
- TanStack Query for Vue atau wrapper fetch sederhana
- VeeValidate + Zod
- PWA plugin
- Chart.js hanya untuk grafik yang diperlukan
- Vitest
- Playwright untuk alur kritis

### Backend

- Node.js LTS
- TypeScript
- Fastify
- Zod atau TypeBox
- PostgreSQL
- Drizzle ORM
- Argon2
- Pino logger
- OpenAPI
- Vitest
- Node cron atau job table sederhana

### Storage

- Local filesystem untuk development.
- S3-compatible object storage untuk production.
- MinIO opsional untuk self-hosted.

### Deployment

- Docker Compose
- Reverse proxy Caddy
- PostgreSQL
- frontend container
- backend container
- optional MinIO
- optional SMTP relay

### Mengapa Stack Ini

- satu bahasa untuk frontend dan backend;
- onboarding contributor lebih mudah;
- Fastify ringan dan cepat;
- Vue relatif mudah dipelajari;
- PostgreSQL stabil dan umum;
- Drizzle ringan;
- Docker Compose cukup untuk target pengguna;
- tidak memerlukan Kubernetes;
- tidak memerlukan Redis pada MVP;
- tidak memerlukan message broker pada MVP.

---

## 16.3 Komponen yang Sengaja Tidak Digunakan pada MVP

- Kubernetes;
- Kafka;
- RabbitMQ;
- Elasticsearch;
- Redis;
- GraphQL;
- gRPC;
- service mesh;
- event sourcing;
- CQRS kompleks;
- WebSocket global;
- data warehouse;
- AI inference service;
- blockchain.

Redis dapat ditambahkan kelak untuk cache atau queue hanya jika metrik menunjukkan kebutuhan nyata.

---

## 16.4 Struktur Repository

Monorepo tetap direkomendasikan walaupun aplikasi terpisah.

```text
wargahub/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── api-client/
│   ├── shared-types/
│   ├── validation/
│   ├── ui/
│   └── config/
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── deployment/
│   └── contribution/
├── infra/
│   ├── docker/
│   └── caddy/
├── scripts/
├── docker-compose.yml
├── LICENSE
├── CONTRIBUTING.md
├── SECURITY.md
└── README.md
```

Frontend dan backend tetap dapat dibangun dan dideploy secara terpisah.

---

## 16.5 Boundary Modul Backend

```text
auth
organizations
areas
households
residents
announcements
billing
payments
finance
patrols
activities
programs
complaints
votings
letters
facilities
waste
visitors
vehicles
businesses
social_aid
documents
notifications
audit
settings
reports
```

Setiap modul memiliki:

```text
controller
service
repository
schema
policy
routes
tests
```

---

## 17. Desain API

## 17.1 Gaya API

- REST;
- JSON;
- versioning `/api/v1`;
- OpenAPI generated;
- pagination cursor atau page-based;
- standar error yang konsisten;
- idempotency key untuk operasi pembayaran;
- request ID;
- UTC pada backend;
- ISO 8601;
- soft delete selektif;
- ETag opsional untuk resource publik.

## 17.2 Contoh Endpoint

### Authentication

```http
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
GET    /api/v1/auth/me
```

### Residents and Households

```http
GET    /api/v1/households
POST   /api/v1/households
GET    /api/v1/households/:id
PATCH  /api/v1/households/:id
GET    /api/v1/households/:id/members
POST   /api/v1/households/:id/members
```

### Announcements

```http
GET    /api/v1/announcements
POST   /api/v1/announcements
GET    /api/v1/announcements/:id
PATCH  /api/v1/announcements/:id
POST   /api/v1/announcements/:id/publish
POST   /api/v1/announcements/:id/acknowledge
```

### Billing

```http
GET    /api/v1/bills
POST   /api/v1/bills
GET    /api/v1/bills/:id
POST   /api/v1/bills/:id/payments
POST   /api/v1/payments/:id/verify
POST   /api/v1/payments/:id/reject
GET    /api/v1/households/:id/balance
```

### Complaints

```http
GET    /api/v1/complaints
POST   /api/v1/complaints
GET    /api/v1/complaints/:id
PATCH  /api/v1/complaints/:id
POST   /api/v1/complaints/:id/assign
POST   /api/v1/complaints/:id/status
POST   /api/v1/complaints/:id/comments
```

### Patrol

```http
GET    /api/v1/patrol-schedules
POST   /api/v1/patrol-schedules
POST   /api/v1/patrol-assignments/:id/swap-request
POST   /api/v1/patrol-swap-requests/:id/accept
POST   /api/v1/patrol-swap-requests/:id/approve
POST   /api/v1/patrol-events
```

### Activities

```http
GET    /api/v1/activities
POST   /api/v1/activities
GET    /api/v1/activities/:id
POST   /api/v1/activities/:id/responses
GET    /api/v1/activities/:id/contribution-needs
```

### Letters

```http
GET    /api/v1/letter-requests
POST   /api/v1/letter-requests
GET    /api/v1/letter-requests/:id
POST   /api/v1/letter-requests/:id/review
POST   /api/v1/letter-requests/:id/approve
POST   /api/v1/letter-requests/:id/issue
GET    /api/v1/public/letters/verify/:token
```

### Public

```http
GET    /api/v1/public/site
GET    /api/v1/public/announcements
GET    /api/v1/public/events
GET    /api/v1/public/documents
GET    /api/v1/public/facilities
GET    /api/v1/public/transparency
```

---

## 17.3 Format Response

### Success

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

### List

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 120,
    "requestId": "req_123"
  }
}
```

### Error

```json
{
  "error": {
    "code": "PAYMENT_ALREADY_VERIFIED",
    "message": "Pembayaran sudah diverifikasi.",
    "details": null
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

---

## 18. Model Data Inti

## 18.1 Tabel Utama

```text
organizations
rws
rts
blocks
households
users
user_profiles
household_members
roles
permissions
role_permissions
user_roles
sessions

announcements
announcement_audiences
announcement_reads

billing_types
bills
bill_items
payments
payment_proofs
payment_allocations

cash_accounts
finance_transactions
finance_transaction_lines
finance_categories
funds
vendors

patrol_schedules
patrol_slots
patrol_assignments
patrol_swap_requests
patrol_events

activities
activity_contribution_types
activity_responses
activity_tasks
activity_attendance

programs
program_milestones
program_updates
program_budgets
program_contributions

complaints
complaint_comments
complaint_assignments
complaint_status_histories

polls
poll_options
poll_eligibilities
poll_votes

letter_types
letter_requests
letter_approvals
issued_letters

facilities
facility_bookings
facility_assets
facility_maintenance

waste_schedules
waste_service_reports

documents
document_versions

notifications
notification_preferences
notification_deliveries

audit_logs
files
settings
```

## 18.2 ID

Gunakan UUIDv7 atau ULID agar aman untuk distributed generation dan tetap relatif terurut.

## 18.3 Multi-Tenant Readiness

Semua tabel bisnis utama memiliki `organization_id`.

---

## 19. Halaman Frontend

## 19.1 Public Pages

```text
/
 /pengumuman
 /agenda
 /transparansi
 /program
 /program/:slug
 /fasilitas
 /dokumen
 /umkm
 /kontak
 /darurat
 /surat/verifikasi/:token
```

## 19.2 Warga Pages

```text
/app
/app/tagihan
/app/pembayaran
/app/pengumuman
/app/agenda
/app/ronda
/app/kegiatan
/app/program
/app/pengaduan
/app/voting
/app/surat
/app/fasilitas
/app/keluarga
/app/dokumen
/app/notifikasi
/app/pengaturan
```

## 19.3 CMS Pages

```text
/admin
/admin/warga
/admin/rumah
/admin/pengumuman
/admin/tagihan
/admin/pembayaran
/admin/keuangan
/admin/ronda
/admin/kegiatan
/admin/program
/admin/pengaduan
/admin/voting
/admin/surat
/admin/fasilitas
/admin/sampah
/admin/vendor
/admin/dokumen
/admin/laporan
/admin/pengguna
/admin/role
/admin/audit
/admin/pengaturan
```

---

## 20. UX Guidelines

### 20.1 Dashboard Warga

Dashboard tidak boleh penuh grafik. Prioritas:

1. kewajiban terdekat;
2. pengumuman penting;
3. jadwal pribadi;
4. status pengaduan;
5. tindakan yang membutuhkan respons.

### 20.2 Bahasa

Gunakan bahasa manusia, bukan bahasa sistem.

Contoh:

- “Menunggu pemeriksaan bendahara”
- bukan “PENDING_VERIFICATION”

### 20.3 Informasi Sensitif

- Jangan tampilkan nominal tunggakan orang lain.
- Jangan tampilkan alasan dispensasi.
- Jangan tampilkan identitas pelapor sensitif.
- Jangan tampilkan data keluarga pada halaman publik.

### 20.4 Pengguna Nonteknis

- tombol besar;
- alur pendek;
- bantuan konteks;
- konfirmasi sebelum tindakan penting;
- pesan kesalahan yang menjelaskan perbaikan;
- nomor bantuan lingkungan.

### 20.5 Progressive Disclosure

Fitur lanjutan hanya muncul saat diperlukan agar UI tidak membingungkan.

---

## 21. CMS Requirements

### 21.1 Kemudahan Operasional

- bulk action;
- filter;
- saved view;
- pencarian;
- pagination;
- import CSV;
- export CSV;
- form validation;
- draft;
- approval;
- activity history;
- undo untuk tindakan tertentu;
- preview sebelum publish;
- template;
- duplicate record;
- responsive pada tablet.

### 21.2 Approval Workflow

Approval hanya digunakan untuk area penting:

- pengeluaran besar;
- laporan keuangan;
- surat;
- publikasi sensitif;
- perubahan role;
- penghapusan data;
- program besar.

Jangan menerapkan approval pada semua tindakan karena akan memperlambat pengurus.

---

## 22. Pencarian

MVP menggunakan PostgreSQL full-text search atau pencarian `ILIKE` yang diindeks.

Objek yang dapat dicari:

- pengumuman;
- dokumen;
- warga sesuai hak akses;
- rumah;
- pengaduan;
- transaksi;
- kegiatan;
- program;
- surat.

Elasticsearch tidak diperlukan.

---

## 23. File Upload

### Batasan Awal

- gambar: JPEG, PNG, WebP;
- dokumen: PDF;
- spreadsheet import: CSV;
- batas default per file: 10 MB;
- total storage dipantau;
- nama file disanitasi;
- file privat menggunakan signed URL;
- thumbnail dibuat asinkron bila diperlukan;
- metadata EXIF sensitif dapat dihapus.

---

## 24. Background Jobs

MVP tidak memerlukan message broker.

Gunakan tabel job di PostgreSQL atau scheduler sederhana untuk:

- pengingat tagihan;
- publikasi pengumuman terjadwal;
- pengiriman email;
- pembersihan session;
- retensi data tamu;
- rekap bulanan;
- generate laporan;
- retry notifikasi gagal.

Worker dapat menjadi proses terpisah dari codebase backend yang sama.

---

## 25. Integrasi

## 25.1 Prioritas MVP

- SMTP email;
- S3-compatible storage;
- webhook generik;
- import dan export CSV;
- calendar export.

## 25.2 Opsional Fase Lanjut

- WhatsApp Business API;
- payment gateway;
- QRIS;
- bank statement import;
- Google Calendar;
- SSO;
- bot Telegram;
- printer thermal;
- CCTV event integration;
- layanan tanda tangan elektronik.

Semua integrasi harus opsional dan tidak membuat instalasi inti bergantung pada layanan berbayar.

---

## 26. Keamanan dan Threat Model

### Ancaman Utama

- akses data warga oleh pihak tidak berwenang;
- bendahara mengubah transaksi tanpa jejak;
- warga melihat data rumah lain;
- file berbahaya;
- brute force;
- session theft;
- IDOR;
- spam pengaduan;
- scraping data publik;
- ekspor data berlebihan;
- manipulasi voting;
- kehilangan backup;
- salah konfigurasi permission.

### Mitigasi

- authorization di setiap endpoint;
- policy tests;
- audit log;
- secure cookie;
- CSRF;
- rate limiting;
- file validation;
- signed URL;
- export permission;
- vote uniqueness constraint;
- backup test;
- default privacy;
- secret rotation;
- dependency scanning;
- security headers;
- database least privilege.

---

## 27. Kepatuhan dan Tata Kelola Data

Walaupun proyek open source, implementasi produksi harus memperhatikan peraturan perlindungan data pribadi yang berlaku.

### Fitur Tata Kelola

- privacy notice;
- purpose limitation;
- data inventory;
- consent log;
- retention settings;
- subject access export;
- correction workflow;
- deletion atau anonymization;
- breach response guide;
- administrator responsibility;
- processor configuration;
- data backup policy;
- data sharing log.

---

## 28. Pelaporan dan Analytics

Analytics bersifat operasional, bukan surveillance.

### Metrik yang Diperbolehkan

- jumlah tagihan;
- rasio pembayaran;
- pengaduan per kategori;
- waktu penyelesaian;
- jumlah kegiatan;
- kebutuhan kontribusi;
- jumlah surat;
- performa notifikasi;
- penggunaan fasilitas;
- tren kas;
- statistik agregat warga.

### Metrik yang Dilarang

- skor sosial individu;
- ranking kepatuhan warga;
- ranking warga paling sering absen;
- profiling politik atau agama;
- prediksi konflik individu;
- penilaian karakter.

---

## 29. MVP

## 29.1 Modul MVP Wajib

1. Organisasi, RT, blok, dan rumah.
2. Akun dan role.
3. Data warga dan keluarga.
4. Pengumuman.
5. Tagihan dan pembayaran manual.
6. Kas dan laporan sederhana.
7. Pengaduan.
8. Kegiatan dan kontribusi alternatif.
9. Ronda dan pertukaran jadwal.
10. Dokumen.
11. Dashboard CMS.
12. Halaman publik.
13. Notifikasi in-app dan email.
14. Audit log.
15. Import dan export CSV.
16. Docker Compose deployment.
17. Backup dan restore guide.
18. OpenAPI documentation.

## 29.2 Modul Setelah MVP

- surat;
- voting;
- fasilitas;
- jimpitan khusus;
- program dan proyek;
- sampah;
- UMKM;
- bantuan sosial;
- kendaraan;
- tamu;
- payment gateway;
- WhatsApp;
- advanced report.

---

## 30. Roadmap

## Fase 0 — Foundation

- repository;
- coding standard;
- license;
- contribution guide;
- architecture decision record;
- Docker Compose;
- CI;
- auth;
- organization;
- RBAC;
- audit;
- file storage;
- OpenAPI.

## Fase 1 — Core Resident Operations

- household;
- resident;
- announcement;
- billing;
- payment;
- finance;
- dashboard;
- public page.

## Fase 2 — Community Operations

- complaints;
- activities;
- contribution alternatives;
- patrol;
- documents;
- notifications.

## Fase 3 — Governance

- voting;
- letters;
- program;
- public transparency;
- approval workflow.

## Fase 4 — Optional Services

- waste;
- facilities;
- UMKM;
- social aid;
- visitor;
- vehicle;
- integrations.

---

## 31. Acceptance Criteria MVP

### Authentication

- pengguna dapat login dan logout;
- session kedaluwarsa;
- akun nonaktif tidak dapat login;
- permission dites di backend.

### Announcement

- admin dapat membuat draft;
- admin dapat menjadwalkan;
- warga hanya melihat pengumuman sesuai target;
- halaman publik hanya menampilkan pengumuman publik.

### Billing

- admin dapat membuat tagihan;
- warga melihat tagihan rumahnya;
- warga dapat mengunggah bukti;
- bendahara dapat memverifikasi;
- pembayaran tidak dapat diverifikasi dua kali;
- semua perubahan tercatat.

### Finance

- bendahara dapat mencatat pemasukan dan pengeluaran;
- transaksi memiliki bukti opsional;
- saldo dihitung;
- laporan CSV dapat dibuat;
- reversal tercatat.

### Complaints

- warga dapat mengirim laporan;
- admin dapat assign;
- status memiliki history;
- pengaduan privat tidak terlihat pengguna lain.

### Patrol

- admin dapat membuat jadwal;
- warga dapat meminta tukar;
- pengganti dapat menerima;
- jadwal akhir terbarui.

### Activities

- admin dapat membuat kegiatan;
- warga dapat memilih bentuk kontribusi;
- admin dapat melihat kebutuhan yang belum terpenuhi.

### Public Page

- dapat diakses tanpa login;
- tidak membocorkan data warga;
- mobile friendly;
- metadata dasar tersedia.

---

## 32. Testing Strategy

### Unit Test

- perhitungan tagihan;
- alokasi pembayaran;
- permission;
- status transition;
- vote eligibility;
- saldo kas;
- reminder logic.

### Integration Test

- API dan database;
- login;
- pembayaran;
- pengaduan;
- pertukaran ronda;
- approval.

### End-to-End Test

- warga login;
- melihat tagihan;
- mengunggah bukti;
- bendahara memverifikasi;
- warga membuat pengaduan;
- admin menyelesaikan;
- admin memublikasikan pengumuman.

### Security Test

- unauthorized access;
- IDOR;
- invalid file;
- brute force;
- CSRF;
- privilege escalation;
- export restriction.

---

## 33. Deployment Minimum

### Rekomendasi Minimum Pilot

- 1 vCPU;
- 1–2 GB RAM;
- 20 GB storage;
- PostgreSQL;
- SMTP;
- domain;
- HTTPS.

Untuk deployment sangat kecil, PostgreSQL, API, dan web dapat berada pada satu VPS.

### Docker Compose Services

```text
web
api
worker
postgres
caddy
optional-minio
```

Redis tidak wajib.

---

## 34. Backup dan Pemulihan

### Backup

- database harian;
- file mingguan atau incremental;
- retention 7 harian, 4 mingguan, 6 bulanan;
- backup terenkripsi;
- backup ke lokasi terpisah;
- checksum;
- log keberhasilan.

### Restore

- prosedur restore terdokumentasi;
- test restore berkala;
- versi aplikasi dan database dicatat;
- pemulihan file dan database konsisten.

---

## 35. Open Source Strategy

### Lisensi

AGPL-3.0 direkomendasikan agar modifikasi yang disediakan sebagai layanan jaringan tetap dibagikan sesuai lisensi.

Alternatif:

- Apache-2.0 jika ingin adopsi komersial lebih permisif;
- MIT jika ingin sangat sederhana.

### Repository Harus Memiliki

- README;
- LICENSE;
- CONTRIBUTING;
- CODE_OF_CONDUCT;
- SECURITY;
- issue templates;
- pull request template;
- architecture docs;
- setup guide;
- demo data;
- roadmap;
- changelog;
- release process;
- migration guide.

### Prinsip Kontribusi

- issue kecil untuk pemula;
- dokumentasi bilingual bila komunitas tumbuh;
- keputusan arsitektur melalui ADR;
- tidak menerima fitur yang memperbesar surveillance;
- backward compatibility untuk API;
- semantic versioning;
- public roadmap.

---

## 36. Konfigurasi Lingkungan

Setiap lingkungan dapat mengaktifkan atau menonaktifkan modul.

```yaml
modules:
  billing: true
  finance: true
  patrol: true
  complaints: true
  activities: true
  letters: false
  voting: false
  facilities: false
  waste: false
  visitors: false
```

Konfigurasi ini mencegah UI dipenuhi fitur yang tidak digunakan.

---

## 37. Feature Flags

Feature flag sederhana berbasis database atau environment variable.

Contoh:

```text
FEATURE_PAYMENT_GATEWAY
FEATURE_WHATSAPP
FEATURE_VISITOR_MANAGEMENT
FEATURE_PUBLIC_TRANSPARENCY
FEATURE_ANONYMOUS_COMPLAINT
```

Tidak perlu platform feature flag eksternal pada MVP.

---

## 38. Risiko Produk

### Risiko: Pengurus Menggunakan Sistem untuk Menekan Warga

Mitigasi:

- tidak ada ranking;
- data tunggakan privat;
- audit log;
- alasan dispensasi terbatas;
- role auditor;
- prinsip governance dalam dokumentasi.

### Risiko: Pengurus Tidak Mau Mengisi Data

Mitigasi:

- import CSV;
- form sederhana;
- bulk action;
- template;
- default configuration;
- onboarding wizard.

### Risiko: Warga Tetap Menggunakan WhatsApp

Mitigasi:

- WargaHub menjadi sumber informasi resmi;
- notifikasi dapat mengarahkan ke halaman detail;
- tidak memaksa mengganti chat;
- tautan pengumuman mudah dibagikan.

### Risiko: Sistem Menjadi Terlalu Kompleks

Mitigasi:

- modul dapat dimatikan;
- fokus MVP;
- modular monolith;
- no microservices;
- progressive disclosure;
- evaluasi fitur melalui usage data.

### Risiko: Data Bocor

Mitigasi:

- least privilege;
- encryption;
- signed URL;
- audit log;
- security testing;
- retention.

### Risiko: Biaya Notifikasi

Mitigasi:

- in-app dan email default;
- WhatsApp opsional;
- batasi reminder;
- digest notification.

---

## 39. Pertanyaan Terbuka

- Apakah satu akun mewakili satu orang atau satu rumah untuk voting tertentu?
- Siapa yang berhak memverifikasi penghuni baru?
- Apakah bukti transfer dapat dilihat auditor?
- Berapa lama data tamu disimpan?
- Apakah pengaduan anonim diizinkan?
- Bagaimana kebijakan dispensasi ronda?
- Apakah jimpitan bersifat wajib, sukarela, atau per program?
- Apakah sistem perlu mendukung beberapa rumah ibadah?
- Apakah laporan kas publik menampilkan transaksi satu per satu atau agregat?
- Apakah surat memerlukan tanda tangan elektronik resmi?
- Apakah pemilik dan penyewa memiliki kewajiban berbeda?
- Modul apa yang wajib aktif pada instalasi pertama?

---

## 40. Definition of Done

Sebuah fitur dianggap selesai apabila:

- requirement disetujui;
- desain UI tersedia;
- API terdokumentasi;
- permission diterapkan;
- validation diterapkan;
- audit log diterapkan jika sensitif;
- unit test tersedia;
- integration test tersedia untuk alur penting;
- error state tersedia;
- empty state tersedia;
- loading state tersedia;
- mobile responsive;
- aksesibilitas dasar diperiksa;
- dokumentasi pengguna diperbarui;
- migration tersedia;
- tidak menambah dependency berat tanpa alasan;
- tidak membocorkan data antar rumah atau role.

---

## 41. Prinsip Keputusan Fitur

Sebelum fitur baru diterima, maintainer harus menjawab:

1. Apakah fitur ini mengurangi pekerjaan atau justru menambah pekerjaan pengurus?
2. Apakah fitur ini membantu warga dengan kapasitas waktu berbeda?
3. Apakah fitur ini dapat digunakan tanpa mempermalukan individu?
4. Apakah data yang dikumpulkan benar-benar diperlukan?
5. Apakah fitur dapat dibuat opsional?
6. Apakah fitur dapat berjalan tanpa layanan berbayar?
7. Apakah fitur dapat dibangun dalam modular monolith?
8. Apakah manfaatnya lebih besar daripada biaya pemeliharaan?
9. Apakah fitur berpotensi menjadi alat surveillance?
10. Apakah ada cara yang lebih sederhana?

---

## 42. Kesimpulan

WargaHub bukan sekadar aplikasi pembayaran iuran atau jadwal ronda. Produk ini adalah alat untuk membangun tata kelola lingkungan yang:

- lebih transparan;
- lebih manusiawi;
- lebih fleksibel;
- lebih mudah diaudit;
- lebih inklusif;
- tidak menganggap semua warga mempunyai waktu dan energi yang sama;
- tetap mempertahankan semangat gotong royong tanpa menjadikannya tekanan sosial.

Keberhasilan WargaHub tidak diukur dari seberapa banyak warga dipaksa aktif, tetapi dari seberapa banyak beban administratif, konflik, miskomunikasi, dan ketidakadilan yang berhasil dikurangi.

---

## 43. Tagline Produk

> **Gotong royong tanpa mengorbankan kewarasan.**
