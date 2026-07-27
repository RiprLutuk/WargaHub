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

export const demoFallbacks: Record<string, unknown> = {
  '/public/site': demoSite,
  '/public/announcements': demoAnnouncements,
  '/public/events': demoEvents,
  '/public/documents': demoDocuments,
  '/public/transparency': demoTransparency,
  '/announcements': demoAnnouncements,
  '/bills': demoBills,
  '/complaints': demoComplaints,
  '/activities': demoActivities,
  '/patrol-assignments': demoPatrols,
  '/documents': demoDocuments,
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
