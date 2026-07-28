import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router';
import AdminLayout from './layouts/AdminLayout.vue';
import AppLayout from './layouts/AppLayout.vue';
import PublicLayout from './layouts/PublicLayout.vue';
import { useSessionStore } from './stores/session';

const AcceptInvitationPage = () => import('./pages/AcceptInvitationPage.vue');
const ForgotPasswordPage = () => import('./pages/ForgotPasswordPage.vue');
const LoginPage = () => import('./pages/LoginPage.vue');
const ResetPasswordPage = () => import('./pages/ResetPasswordPage.vue');
const ActivitiesPage = () => import('./pages/app/ActivitiesPage.vue');
const BillsPage = () => import('./pages/app/BillsPage.vue');
const ComplaintsPage = () => import('./pages/app/ComplaintsPage.vue');
const DashboardPage = () => import('./pages/app/DashboardPage.vue');
const FacilitiesPage = () => import('./pages/app/FacilitiesPage.vue');
const LettersPage = () => import('./pages/app/LettersPage.vue');
const NotificationsPage = () => import('./pages/app/NotificationsPage.vue');
const PatrolPage = () => import('./pages/app/PatrolPage.vue');
const ProgramsPage = () => import('./pages/app/ProgramsPage.vue');
const ResidentAnnouncementsPage = () => import('./pages/app/ResidentAnnouncementsPage.vue');
const ResidentDocumentsPage = () => import('./pages/app/ResidentDocumentsPage.vue');
const ServicesPage = () => import('./pages/app/ServicesPage.vue');
const SettingsPage = () => import('./pages/app/SettingsPage.vue');
const VotingPage = () => import('./pages/app/VotingPage.vue');
const AdminContentPage = () => import('./pages/admin/AdminContentPage.vue');
const AdminDashboardPage = () => import('./pages/admin/AdminDashboardPage.vue');
const AdminFinancePage = () => import('./pages/admin/AdminFinancePage.vue');
const AdminOperationsPage = () => import('./pages/admin/AdminOperationsPage.vue');
const AgendaPage = () => import('./pages/public/AgendaPage.vue');
const AnnouncementsPage = () => import('./pages/public/AnnouncementsPage.vue');
const ContactPage = () => import('./pages/public/ContactPage.vue');
const DocumentsPage = () => import('./pages/public/DocumentsPage.vue');
const EmergencyPage = () => import('./pages/public/EmergencyPage.vue');
const HomePage = () => import('./pages/public/HomePage.vue');
const NotFoundPage = () => import('./pages/public/NotFoundPage.vue');
const PublicBusinessesPage = () => import('./pages/public/PublicBusinessesPage.vue');
const PublicComplaintsPage = () => import('./pages/public/PublicComplaintsPage.vue');
const PublicFacilitiesPage = () => import('./pages/public/PublicFacilitiesPage.vue');
const PublicProgramsPage = () => import('./pages/public/PublicProgramsPage.vue');
const PublicStructurePage = () => import('./pages/public/PublicStructurePage.vue');
const PublicVerifyLetterPage = () => import('./pages/public/PublicVerifyLetterPage.vue');
const TransparencyPage = () => import('./pages/public/TransparencyPage.vue');

declare module 'vue-router' {
  interface RouteMeta {
    title?: string;
    requiresAuth?: boolean;
    requiresAdmin?: boolean;
    permission?: string;
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, saved) {
    if (saved) return saved;
    if (to.hash) return { el: to.hash, top: 96 };
    return { top: 0 };
  },
  routes: [
    {
      path: '/',
      component: PublicLayout,
      children: [
        { path: '', component: HomePage, meta: { title: 'Beranda' } },
        { path: 'pengumuman', component: AnnouncementsPage, meta: { title: 'Pengumuman' } },
        { path: 'struktur', component: PublicStructurePage, meta: { title: 'Struktur Organisasi RT/RW' } },
        { path: 'laporan', component: PublicComplaintsPage, meta: { title: 'Status Laporan Publik' } },
        { path: 'agenda', component: AgendaPage, meta: { title: 'Agenda' } },
        { path: 'transparansi', component: TransparencyPage, meta: { title: 'Transparansi' } },
        { path: 'fasilitas', component: PublicFacilitiesPage, meta: { title: 'Fasilitas publik' } },
        { path: 'fasilitas/cctv', component: PublicFacilitiesPage, props: { defaultTab: 'CCTV' }, meta: { title: 'CCTV Lingkungan (Live)' } },
        { path: 'cctv', redirect: '/fasilitas/cctv' },
        { path: 'program', component: PublicProgramsPage, meta: { title: 'Program & proyek' } },
        { path: 'umkm', component: PublicBusinessesPage, meta: { title: 'Direktori UMKM' } },
        { path: 'dokumen', component: DocumentsPage, meta: { title: 'Dokumen' } },
        { path: 'kontak', component: ContactPage, meta: { title: 'Kontak' } },
        { path: 'darurat', component: EmergencyPage, meta: { title: 'Informasi darurat' } },
        { path: 'surat/verifikasi/:token', component: PublicVerifyLetterPage, meta: { title: 'Verifikasi surat digital' } },
        { path: 'verifikasi', redirect: '/surat/verifikasi/sample' },
      ],
    },
    { path: '/accept-invitation', component: AcceptInvitationPage, meta: { title: 'Aktivasi akun' } },
    { path: '/forgot-password', component: ForgotPasswordPage, meta: { title: 'Lupa kata sandi' } },
    { path: '/reset-password', component: ResetPasswordPage, meta: { title: 'Atur ulang kata sandi' } },
    { path: '/login', component: LoginPage, meta: { title: 'Masuk' } },
    {
      path: '/app',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', component: DashboardPage, meta: { title: 'Beranda warga' } },
        { path: 'tagihan', component: BillsPage, meta: { title: 'Tagihan', permission: 'billing.read' } },
        { path: 'pengumuman', component: ResidentAnnouncementsPage, meta: { title: 'Pengumuman warga', permission: 'announcement.read' } },
        { path: 'pengaduan', component: ComplaintsPage, meta: { title: 'Pengaduan', permission: 'complaint.read' } },
        { path: 'kegiatan', component: ActivitiesPage, meta: { title: 'Kegiatan', permission: 'activity.read' } },
        { path: 'ronda', component: PatrolPage, meta: { title: 'Ronda', permission: 'patrol.schedule.read' } },
        { path: 'surat', component: LettersPage, meta: { title: 'Surat Pengantar' } },
        { path: 'voting', component: VotingPage, meta: { title: 'Musyawarah & Polling' } },
        { path: 'fasilitas', component: FacilitiesPage, meta: { title: 'Fasilitas & Peminjaman' } },
        { path: 'program', component: ProgramsPage, meta: { title: 'Program Lingkungan' } },
        { path: 'layanan', component: ServicesPage, meta: { title: 'Layanan & UMKM Warga' } },
        { path: 'dokumen', component: ResidentDocumentsPage, meta: { title: 'Dokumen warga', permission: 'document.read' } },
        { path: 'struktur', component: PublicStructurePage, meta: { title: 'Struktur Pengurus RT/RW' } },
        { path: 'organisasi', redirect: '/app/struktur' },
        { path: 'notifikasi', component: NotificationsPage, meta: { title: 'Notifikasi', permission: 'notification.read' } },
        { path: 'pengaturan', component: SettingsPage, meta: { title: 'Pengaturan' } },
      ],
    },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        { path: '', component: AdminDashboardPage, meta: { title: 'Dashboard admin' } },
        { path: 'konten', component: AdminContentPage, meta: { title: 'Manajemen konten', permission: 'announcement.read' } },
        { path: 'warga', component: AdminContentPage, props: { section: 'residents' }, meta: { title: 'Kelola warga', permission: 'resident.read' } },
        { path: 'organisasi', component: AdminContentPage, props: { section: 'officers' }, meta: { title: 'Struktur pengurus', permission: 'organization.update' } },
        { path: 'pengumuman', component: AdminContentPage, props: { section: 'announcements' }, meta: { title: 'Publikasi pengumuman', permission: 'announcement.create' } },
        { path: 'dokumen', component: AdminContentPage, props: { section: 'documents' }, meta: { title: 'Kelola dokumen', permission: 'document.manage' } },
        { path: 'pengaturan', component: AdminContentPage, props: { section: 'settings' }, meta: { title: 'Pengaturan CMS', permission: 'settings.manage' } },

        { path: 'keuangan', component: AdminFinancePage, props: { section: 'ledger' }, meta: { title: 'Buku kas & ledger', permission: 'finance.read' } },
        { path: 'tagihan', component: AdminFinancePage, props: { section: 'bills' }, meta: { title: 'Kelola tagihan', permission: 'billing.create' } },
        { path: 'pembayaran', component: AdminFinancePage, props: { section: 'payments' }, meta: { title: 'Verifikasi pembayaran', permission: 'billing.reconcile' } },

        { path: 'operasional', component: AdminOperationsPage, props: { section: 'operations' }, meta: { title: 'Operasional & ronda' } },
        { path: 'cctv', component: AdminOperationsPage, props: { section: 'cctv' }, meta: { title: 'Kelola Kamera CCTV' } },
        { path: 'surat', component: AdminOperationsPage, props: { section: 'operations' }, meta: { title: 'Kelola surat' } },
        { path: 'voting', component: AdminOperationsPage, props: { section: 'operations' }, meta: { title: 'Musyawarah warga' } },
        { path: 'fasilitas', component: AdminOperationsPage, props: { section: 'operations' }, meta: { title: 'Kelola fasilitas' } },
        { path: 'program', component: AdminOperationsPage, props: { section: 'operations' }, meta: { title: 'Program lingkungan' } },
        { path: 'layanan', component: AdminOperationsPage, props: { section: 'operations' }, meta: { title: 'Direktori UMKM' } },
        { path: 'audit', component: AdminOperationsPage, props: { section: 'audit' }, meta: { title: 'Audit log system', permission: 'audit.read' } },
      ],
    },
    { path: '/:pathMatch(.*)*', component: NotFoundPage, meta: { title: 'Halaman tidak ditemukan' } },
  ],
});

router.beforeEach(async (to: RouteLocationNormalized) => {
  const session = useSessionStore();
  if (to.meta.requiresAuth || to.meta.requiresAdmin) {
    await session.ensureSession();
    if (!session.isAuthenticated) {
      return { path: '/login', query: { redirect: to.fullPath } };
    }
    if (to.meta.requiresAdmin && !session.isAdmin) {
      return { path: '/app' };
    }
  }
  return true;
});

router.afterEach((to) => {
  const title = to.meta.title ? `${to.meta.title} · WargaHub` : 'WargaHub';
  document.title = title;
});

export default router;
