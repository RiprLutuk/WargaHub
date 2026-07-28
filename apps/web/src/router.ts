import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router';
import AdminLayout from './layouts/AdminLayout.vue';
import AppLayout from './layouts/AppLayout.vue';
import PublicLayout from './layouts/PublicLayout.vue';
import AcceptInvitationPage from './pages/AcceptInvitationPage.vue';
import ForgotPasswordPage from './pages/ForgotPasswordPage.vue';
import LoginPage from './pages/LoginPage.vue';
import ResetPasswordPage from './pages/ResetPasswordPage.vue';
import ActivitiesPage from './pages/app/ActivitiesPage.vue';
import BillsPage from './pages/app/BillsPage.vue';
import ComplaintsPage from './pages/app/ComplaintsPage.vue';
import DashboardPage from './pages/app/DashboardPage.vue';
import FacilitiesPage from './pages/app/FacilitiesPage.vue';
import LettersPage from './pages/app/LettersPage.vue';
import NotificationsPage from './pages/app/NotificationsPage.vue';
import PatrolPage from './pages/app/PatrolPage.vue';
import ProgramsPage from './pages/app/ProgramsPage.vue';
import ResidentAnnouncementsPage from './pages/app/ResidentAnnouncementsPage.vue';
import ResidentDocumentsPage from './pages/app/ResidentDocumentsPage.vue';
import ServicesPage from './pages/app/ServicesPage.vue';
import SettingsPage from './pages/app/SettingsPage.vue';
import VotingPage from './pages/app/VotingPage.vue';
import AdminContentPage from './pages/admin/AdminContentPage.vue';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.vue';
import AdminFinancePage from './pages/admin/AdminFinancePage.vue';
import AdminOperationsPage from './pages/admin/AdminOperationsPage.vue';
import AgendaPage from './pages/public/AgendaPage.vue';
import AnnouncementsPage from './pages/public/AnnouncementsPage.vue';
import ContactPage from './pages/public/ContactPage.vue';
import DocumentsPage from './pages/public/DocumentsPage.vue';
import EmergencyPage from './pages/public/EmergencyPage.vue';
import HomePage from './pages/public/HomePage.vue';
import NotFoundPage from './pages/public/NotFoundPage.vue';
import PublicBusinessesPage from './pages/public/PublicBusinessesPage.vue';
import PublicComplaintsPage from './pages/public/PublicComplaintsPage.vue';
import PublicFacilitiesPage from './pages/public/PublicFacilitiesPage.vue';
import PublicProgramsPage from './pages/public/PublicProgramsPage.vue';
import PublicStructurePage from './pages/public/PublicStructurePage.vue';
import PublicVerifyLetterPage from './pages/public/PublicVerifyLetterPage.vue';
import TransparencyPage from './pages/public/TransparencyPage.vue';
import { useSessionStore } from './stores/session';

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
        { path: 'keuangan', component: AdminFinancePage, meta: { title: 'Manajemen keuangan', permission: 'finance.ledger.read' } },
        { path: 'operasional', component: AdminOperationsPage, meta: { title: 'Operasional warga' } },
        { path: 'audit', component: AdminOperationsPage, props: { section: 'audit' }, meta: { title: 'Audit log', permission: 'audit.read' } },
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
