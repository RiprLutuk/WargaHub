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
import NotificationsPage from './pages/app/NotificationsPage.vue';
import PatrolPage from './pages/app/PatrolPage.vue';
import ResidentAnnouncementsPage from './pages/app/ResidentAnnouncementsPage.vue';
import ResidentDocumentsPage from './pages/app/ResidentDocumentsPage.vue';
import SettingsPage from './pages/app/SettingsPage.vue';
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

const router=createRouter({
  history:createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to,from,saved){if(saved)return saved;if(to.hash)return{el:to.hash,top:96};return{top:0}},
  routes:[
    {path:'/',component:PublicLayout,children:[
      {path:'',component:HomePage,meta:{title:'Beranda'}},
      {path:'pengumuman',component:AnnouncementsPage,meta:{title:'Pengumuman'}},
      {path:'agenda',component:AgendaPage,meta:{title:'Agenda'}},
      {path:'transparansi',component:TransparencyPage,meta:{title:'Transparansi'}},
      {path:'dokumen',component:DocumentsPage,meta:{title:'Dokumen'}},
      {path:'kontak',component:ContactPage,meta:{title:'Kontak'}},
      {path:'darurat',component:EmergencyPage,meta:{title:'Informasi darurat'}},
    ]},
    {path:'/accept-invitation',component:AcceptInvitationPage,meta:{title:'Aktivasi akun'}},
    {path:'/forgot-password',component:ForgotPasswordPage,meta:{title:'Lupa kata sandi'}},
    {path:'/reset-password',component:ResetPasswordPage,meta:{title:'Atur ulang kata sandi'}},
    {path:'/login',component:LoginPage,meta:{title:'Masuk'}},
    {path:'/app',component:AppLayout,meta:{requiresAuth:true},children:[
      {path:'',component:DashboardPage,meta:{title:'Beranda warga'}},
      {path:'tagihan',component:BillsPage,meta:{title:'Tagihan',permission:'billing.read'}},
      {path:'pengumuman',component:ResidentAnnouncementsPage,meta:{title:'Pengumuman warga',permission:'announcement.read'}},
      {path:'pengaduan',component:ComplaintsPage,meta:{title:'Pengaduan',permission:'complaint.read'}},
      {path:'kegiatan',component:ActivitiesPage,meta:{title:'Kegiatan',permission:'activity.read'}},
      {path:'ronda',component:PatrolPage,meta:{title:'Ronda',permission:'patrol.schedule.read'}},
      {path:'dokumen',component:ResidentDocumentsPage,meta:{title:'Dokumen warga',permission:'document.read'}},
      {path:'notifikasi',component:NotificationsPage,meta:{title:'Notifikasi',permission:'notification.read'}},
      {path:'pengaturan',component:SettingsPage,meta:{title:'Pengaturan'}},
    ]},
    {path:'/admin',component:AdminLayout,meta:{requiresAuth:true,requiresAdmin:true},children:[
      {path:'',component:AdminDashboardPage,meta:{title:'CMS Pengurus'}},
      {path:'warga',component:AdminContentPage,props:{section:'residents'},meta:{title:'Warga & rumah',permission:'resident.read'}},
      {path:'pengumuman',component:AdminContentPage,props:{section:'announcements'},meta:{title:'Publikasi',permission:'announcement.create'}},
      {path:'dokumen',component:AdminContentPage,props:{section:'documents'},meta:{title:'Dokumen',permission:'document.manage'}},
      {path:'pengaturan',component:AdminContentPage,props:{section:'settings'},meta:{title:'Pengaturan',permission:'settings.manage'}},
      {path:'tagihan',component:AdminFinancePage,props:{section:'bills'},meta:{title:'Tagihan',permission:'billing.create'}},
      {path:'pembayaran',component:AdminFinancePage,props:{section:'payments'},meta:{title:'Pembayaran',permission:'billing.reconcile'}},
      {path:'keuangan',component:AdminFinancePage,props:{section:'ledger'},meta:{title:'Keuangan',permission:'finance.read'}},
      {path:'operasional',component:AdminOperationsPage,props:{section:'operations'},meta:{title:'Operasional',permission:'complaint.assign'}},
      {path:'audit',component:AdminOperationsPage,props:{section:'audit'},meta:{title:'Audit log',permission:'audit_log.read'}},
    ]},
    {path:'/:pathMatch(.*)*',component:PublicLayout,children:[{path:'',component:NotFoundPage,meta:{title:'Halaman tidak ditemukan'}}]},
  ],
});

function loginRedirect(to:RouteLocationNormalized){return{path:'/login',query:{redirect:to.fullPath}}}

router.beforeEach(async(to)=>{
  const session=useSessionStore();
  if(to.meta.requiresAuth){
    await session.ensureSession();
    if(!session.isAuthenticated)return loginRedirect(to);
    if(to.meta.requiresAdmin&&!session.isAdmin)return'/app';
    if(to.meta.permission&&!session.can(to.meta.permission))return session.isAdmin?'/admin':'/app';
  }
  if(to.path==='/login'){
    await session.ensureSession();
    if(session.isAuthenticated)return session.isAdmin?'/admin':'/app';
  }
  return true;
});

router.afterEach((to)=>{document.title=`${to.meta.title??'WargaHub'} · WargaHub`;});

export default router;
