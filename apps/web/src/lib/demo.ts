export interface PublicSite {
  name: string;
  shortName: string;
  slug: string;
  description: string;
  address: string;
  emergencyPhone: string;
  timezone: string;
  locale: string;
  households?: number;
  activePrograms?: number;
}

export interface Announcement {
  id: string;
  category: string;
  title: string;
  summary: string;
  publishedAt: string;
  urgency: 'NORMAL' | 'IMPORTANT' | 'EMERGENCY';
  visibility: 'PUBLIC' | 'RESIDENT';
}

export interface Bill {
  id: string;
  title: string;
  period: string;
  amount: number;
  dueAt: string;
  status: 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'WAIVED';
  description: string;
}

export interface Complaint {
  id: string;
  title: string;
  category: string;
  status: string;
  updatedAt: string;
  visibility: 'PRIVATE' | 'PUBLIC';
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  location: string;
  contribution: string;
  remainingNeeds: number;
}

export const demoSite: PublicSite = {
  name: 'WargaHub Taman Rukun',
  shortName: 'Taman Rukun',
  slug: 'taman-rukun',
  description: 'Ruang resmi untuk informasi, layanan, dan gotong royong yang lebih ringan bagi setiap warga.',
  address: 'RW 06, Kelurahan Sukamaju, Indonesia',
  emergencyPhone: '112',
  timezone: 'Asia/Jakarta',
  locale: 'id-ID',
  households: 184,
  activePrograms: 4,
};

export const demoAnnouncements: Announcement[] = [
  {
    id: 'ann-publik-air',
    category: 'AIR & LISTRIK',
    title: 'Pemeliharaan pompa air blok utara',
    summary: 'Aliran air akan dihentikan sementara Selasa pukul 09.00–12.00 untuk pemeliharaan rutin.',
    publishedAt: '2026-07-27T02:00:00.000Z',
    urgency: 'IMPORTANT',
    visibility: 'PUBLIC',
  },
  {
    id: 'ann-publik-posyandu',
    category: 'KEGIATAN',
    title: 'Layanan Posyandu bulan Agustus',
    summary: 'Posyandu dibuka Sabtu pagi di Balai Warga. Pendaftaran dapat dilakukan saat kedatangan.',
    publishedAt: '2026-07-25T03:30:00.000Z',
    urgency: 'NORMAL',
    visibility: 'PUBLIC',
  },
  {
    id: 'ann-publik-keamanan',
    category: 'KEAMANAN',
    title: 'Pembaruan penerangan gerbang selatan',
    summary: 'Lampu gerbang telah diganti dan kembali berfungsi. Terima kasih atas laporan warga.',
    publishedAt: '2026-07-23T11:00:00.000Z',
    urgency: 'NORMAL',
    visibility: 'PUBLIC',
  },
];

export const demoEvents = [
  { id: 'event-1', title: 'Kerja bakti taman bermain', description: 'Membersihkan taman bersama.', startsAt: '2026-08-02T00:30:00.000Z', endsAt: '2026-08-02T03:30:00.000Z', location: 'Taman RW', capacity: 40 },
  { id: 'event-2', title: 'Rapat terbuka laporan kas', description: 'Pemaparan laporan agregat.', startsAt: '2026-08-08T12:30:00.000Z', endsAt: '2026-08-08T14:00:00.000Z', location: 'Balai Warga', capacity: null },
  { id: 'event-3', title: 'Posyandu balita', description: 'Layanan rutin balita.', startsAt: '2026-08-15T01:00:00.000Z', endsAt: '2026-08-15T04:00:00.000Z', location: 'Balai Warga', capacity: 60 },
];

export const demoDocuments = [
  { id: 'doc-1', title: 'Tata tertib lingkungan', description: 'Peraturan bersama.', category: 'Peraturan', visibility: 'PUBLIC', publishedAt: '2026-06-18T03:00:00.000Z', downloadUrl: '/api/v1/public/documents/doc-1/download' },
  { id: 'doc-2', title: 'Jadwal layanan sampah', description: 'Jadwal pengangkutan.', category: 'Layanan', visibility: 'PUBLIC', publishedAt: '2026-07-01T03:00:00.000Z', downloadUrl: '/api/v1/public/documents/doc-2/download' },
  { id: 'doc-3', title: 'Ringkasan rapat warga Juli', description: 'Notulen tersanitasi.', category: 'Notulen', visibility: 'PUBLIC', publishedAt: '2026-07-21T03:00:00.000Z', downloadUrl: null },
];

export const demoTransparency = {
  currency: 'IDR',
  income: 8_425_000,
  expense: 5_280_000,
  balance: 3_145_000,
  monthly: [{ period: '2026-07', income: 8_425_000, expense: 5_280_000 }],
  note: 'Laporan publik hanya menampilkan nilai agregat yang sudah disanitasi.',
};

export const demoBills: Bill[] = [
  { id: 'bill-jul', title: 'Iuran lingkungan', period: 'Juli 2026', amount: 150_000, dueAt: '2026-07-31T16:59:59.000Z', status: 'OPEN', description: 'Keamanan, kebersihan, dan kas sosial.' },
  { id: 'bill-jun', title: 'Iuran lingkungan', period: 'Juni 2026', amount: 150_000, dueAt: '2026-06-30T16:59:59.000Z', status: 'PAID', description: 'Keamanan, kebersihan, dan kas sosial.' },
];

export const demoComplaints: Complaint[] = [
  { id: 'complaint-1', title: 'Lampu jalan depan blok C padam', category: 'Fasilitas', status: 'IN_PROGRESS', updatedAt: '2026-07-26T09:20:00.000Z', visibility: 'PRIVATE' },
  { id: 'complaint-2', title: 'Saluran air mulai tersumbat', category: 'Saluran air', status: 'ASSIGNED', updatedAt: '2026-07-24T08:00:00.000Z', visibility: 'PRIVATE' },
];

export const demoActivities: Activity[] = [
  { id: 'activity-1', title: 'Kerja bakti taman bermain', description: 'Membersihkan area bermain dan mengecat ulang bangku taman.', startsAt: '2026-08-02T00:30:00.000Z', location: 'Taman RW', contribution: 'Belum memilih', remainingNeeds: 7 },
  { id: 'activity-2', title: 'Dokumentasi malam kemerdekaan', description: 'Membantu foto, video, atau menyusun album digital dari rumah.', startsAt: '2026-08-17T11:30:00.000Z', location: 'Lapangan RW', contribution: 'Dokumentasi', remainingNeeds: 2 },
];

export const demoPatrols = [
  { id: 'patrol-1', userId: 'demo-user-resident', startsAt: '2026-07-30T15:00:00.000Z', endsAt: '2026-07-30T18:00:00.000Z', area: 'Gerbang utara', status: 'SCHEDULED' },
  { id: 'patrol-2', userId: 'demo-user-other', startsAt: '2026-08-06T15:00:00.000Z', endsAt: '2026-08-06T18:00:00.000Z', area: 'Blok B–D', status: 'SCHEDULED' },
];

export const demoPublicComplaints = [
  { id: 'pub-comp-1', ticketNumber: 'TKT-2026-081', category: 'FASILITAS', title: 'Lampu jalan penerangan gerbang utama mati', description: 'Lampu sorot LED di gerbang utama mati sejak semalam, perlu perbaikan fitting.', location: 'Gerbang Utama RT 01', priority: 'MEDIUM', status: 'IN_PROGRESS', createdAt: '2026-07-27T10:00:00.000Z', updatedAt: '2026-07-27T14:30:00.000Z' },
  { id: 'pub-comp-2', ticketNumber: 'TKT-2026-079', category: 'DRAINASE', title: 'Sedimentasi saluran air blok B perlunya pengerukan', description: 'Sedimen tanah mulai menebal menjelang musim hujan.', location: 'Saluran Air Blok B No. 01-12', priority: 'NORMAL', status: 'RESOLVED', createdAt: '2026-07-20T08:00:00.000Z', updatedAt: '2026-07-22T11:00:00.000Z' },
];

export const demoPublicFacilities = [
  { id: 'fac-1', name: 'Balai Warga Serbaguna', description: 'Gedung balai warga untuk rapat, resepsi pernikahan warga, dan posyandu.', category: 'Gedung & Ruang', fee: 0, deposit: 100000, capacity: 150, active: true },
  { id: 'fac-2', name: 'Lapangan Olahraga & Serbaguna', description: 'Lapangan luar ruang untuk bulutangkis, voli, dan upacara lingkungan.', category: 'Olahraga', fee: 0, deposit: 0, capacity: 200, active: true },
  { id: 'fac-3', name: 'Set Tenda & Kursi Lipat (50 Unit)', description: 'Inventaris tenda hajatan dan kursi lipat besi untuk kegiatan rumah warga.', category: 'Inventaris', fee: 50000, deposit: 50000, capacity: null, active: true },
];

export const demoPublicPrograms = [
  { id: 'prog-1', title: 'Pemasangan CCTV & Smart Gate Gerbang Masuk', description: 'Program pengadaan 4 unit kamera CCTV 4K dan palang otomatis gerbang utama untuk keamanan 24 jam.', category: 'Keamanan', targetBudget: 15000000, currentBudget: 11200000, status: 'IN_PROGRESS', startDate: '2026-06-01', endDate: '2026-08-31' },
  { id: 'prog-2', title: 'Penghijauan & Taman Herbal Komunitas', description: 'Revitalisasi lahan kosong menjadi taman tanaman obat keluarga (TOGA) dan tempat kumpul warga.', category: 'Lingkungan', targetBudget: 5000000, currentBudget: 5000000, status: 'COMPLETED', startDate: '2026-05-10', endDate: '2026-07-15' },
];

export const demoPublicBusinesses = [
  { id: 'umkm-1', name: 'Warung Sembako Ibu Siti', category: 'Kuliner & Sembako', description: 'Menyediakan beras, minyak, galon aqua, gas LPG 3kg, dan kebutuhan dapur harian. Layanan antar gratis untuk warga blok A-D.', phone: '081234567890', operatingHours: '06.00 - 21.00 WIB', verified: true },
  { id: 'umkm-2', name: 'Katering Rumahan Mbak Rina', category: 'Kuliner', description: 'Menerima pesanan nasi kotak, snack box acara warga, dan lauk harian tanpa pengawet.', phone: '081987654321', operatingHours: '07.00 - 18.00 WIB', verified: true },
  { id: 'umkm-3', name: 'Servis AC & Elektronik Pak Agus', category: 'Jasa & Perbaikan', description: 'Jasa cuci AC, isi freon, dan perbaikan instalasi listrik rumah berpengalaman warga sendiri.', phone: '085711223344', operatingHours: '08.00 - 17.00 WIB', verified: true },
];

export const demoFallbacks: Record<string, unknown> = {
  '/public/site': demoSite,
  '/public/announcements': demoAnnouncements,
  '/public/events': demoEvents,
  '/public/documents': demoDocuments,
  '/public/transparency': demoTransparency,
  '/public/complaints': demoPublicComplaints,
  '/public/facilities': demoPublicFacilities,
  '/public/programs': demoPublicPrograms,
  '/public/businesses': demoPublicBusinesses,
  '/announcements': demoAnnouncements,
  '/bills': demoBills,
  '/complaints': demoComplaints,
  '/activities': demoActivities,
  '/patrol-assignments': demoPatrols,
  '/documents': demoDocuments,
  '/facilities': demoPublicFacilities,
  '/programs': demoPublicPrograms,
  '/businesses': demoPublicBusinesses,
  '/umkms': demoPublicBusinesses,
  '/notifications': [
    { id: 'notification-1', title: 'Bukti pembayaran diterima', message: 'Bendahara akan memeriksa bukti Anda.', readAt: null, actionUrl: '/app/tagihan', createdAt: '2026-07-27T05:10:00.000Z' },
    { id: 'notification-2', title: 'Jadwal ronda mendatang', message: 'Jadwal Anda tiga hari lagi di gerbang utara.', readAt: '2026-07-26T05:20:00.000Z', actionUrl: '/app/ronda', createdAt: '2026-07-26T05:10:00.000Z' },
  ],
  '/households': [
    { id: 'home-a12', code: 'A-12', address: 'Blok A No. 12', members: 4, status: 'Terverifikasi' },
    { id: 'home-b07', code: 'B-07', address: 'Blok B No. 7', members: 2, status: 'Terverifikasi' },
    { id: 'home-c03', code: 'C-03', address: 'Blok C No. 3', members: 3, status: 'Perlu diperiksa' },
  ],
  '/residents': [
    { id: 'resident-1', name: 'Dimas Pratama', household: 'A-12', role: 'Kepala keluarga', status: 'Aktif' },
    { id: 'resident-2', name: 'Siti Rahma', household: 'B-07', role: 'Pemilik', status: 'Aktif' },
    { id: 'resident-3', name: 'Nadia Putri', household: 'C-03', role: 'Penyewa', status: 'Menunggu verifikasi' },
  ],
  '/payments': [
    { id: 'payment-1', resident: 'Dimas Pratama', bill: 'Iuran Juli 2026', amount: 150_000, status: 'PENDING_VERIFICATION', submittedAt: '2026-07-27T04:15:00.000Z' },
    { id: 'payment-2', resident: 'Siti Rahma', bill: 'Iuran Juli 2026', amount: 150_000, status: 'PAID', submittedAt: '2026-07-26T07:40:00.000Z' },
  ],
  '/finance/transactions': [
    { id: 'trx-1', date: '2026-07-26', description: 'Iuran lingkungan', category: 'Iuran', kind: 'INCOME', amount: 2_850_000 },
    { id: 'trx-2', date: '2026-07-25', description: 'Perbaikan lampu gerbang', category: 'Pemeliharaan', kind: 'EXPENSE', amount: 780_000 },
  ],
  '/audit-logs': [
    { id: 'audit-1', actor: 'Ratna Wulandari', action: 'PAYMENT_VERIFIED', entity: 'Pembayaran #P-1028', createdAt: '2026-07-27T04:30:00.000Z' },
    { id: 'audit-2', actor: 'Budi Santoso', action: 'ANNOUNCEMENT_PUBLISHED', entity: 'Pemeliharaan pompa air', createdAt: '2026-07-27T02:00:00.000Z' },
  ],
};
