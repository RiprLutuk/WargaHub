// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppSidebar from '../components/AppSidebar.vue';
import StatusBadge from '../components/StatusBadge.vue';
import DashboardPage from './app/DashboardPage.vue';
import ComplaintsPage from './app/ComplaintsPage.vue';
import PatrolPage from './app/PatrolPage.vue';
import SettingsPage from './app/SettingsPage.vue';
import AdminFinancePage from './admin/AdminFinancePage.vue';
import AdminContentPage from './admin/AdminContentPage.vue';

const routerLinkStub = {
  template: '<a href="#"><slot /></a>',
};

const residentGlobal = {
  plugins: [createPinia()],
  stubs: { RouterLink: routerLinkStub },
};

describe('role-aware portal', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prioritizes obligations and actions on the resident dashboard', async () => {
    const wrapper = mount(DashboardPage, { global: residentGlobal });

    await flushPromises();

    const headings = wrapper.findAll('h2').map((node) => node.text());
    expect(headings.slice(0, 2)).toEqual(['Perlu perhatian', 'Pengumuman penting']);
    expect(wrapper.text()).not.toContain('Rumah A-12');
  });

  it('does not display admin navigation to a resident', () => {
    const wrapper = mount(AppSidebar, {
      props: { permissions: ['billing.read'] },
      global: { stubs: { RouterLink: routerLinkStub } },
    });

    expect(wrapper.text()).not.toContain('Kelola warga');
  });

  it('shows CMS navigation only when the matching permission exists', () => {
    const wrapper = mount(AppSidebar, {
      props: { permissions: ['resident.read', 'finance.read'] },
      global: { stubs: { RouterLink: routerLinkStub } },
    });

    expect(wrapper.text()).toContain('Kelola warga');
    expect(wrapper.text()).toContain('Keuangan');
  });

  it('communicates state with text rather than color alone', () => {
    const wrapper = mount(StatusBadge, { props: { status: 'PENDING_VERIFICATION' } });

    expect(wrapper.text()).toContain('Menunggu pemeriksaan');
    expect(wrapper.get('[role="status"]').attributes('aria-label')).toContain('Menunggu pemeriksaan');
  });

  it('explains complaint privacy before submission', () => {
    const wrapper = mount(ComplaintsPage, { global: residentGlobal });

    expect(wrapper.text()).toContain('Identitas Anda tidak ditampilkan kepada warga lain');
    expect(wrapper.get('button[type="submit"]').text()).toContain('Kirim pengaduan');
  });

  it('loads patrol assignments from the registered backend endpoint', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      data: [],
      meta: { page: 1, pageSize: 20, total: 0, requestId: 'req-patrol' },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    mount(PatrolPage, { global: residentGlobal });
    await flushPromises();

    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).endsWith('/api/v1/patrol-assignments'))).toBe(true);
  });

  it('creates a bill for an explicit household required by the API', async () => {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      const data = url.endsWith('/api/v1/households')
        ? [{ id: 'household-01', code: 'A-01', address: 'Jalan API 1', occupancyStatus: 'OCCUPIED' }]
        : [];
      return new Response(JSON.stringify({ data: init?.method === 'POST' ? { id: 'bill-new' } : data }), {
        status: init?.method === 'POST' ? 201 : 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const wrapper = mount(AdminFinancePage, { props: { section: 'bills' } });
    await flushPromises();
    await wrapper.get('button').trigger('click');
    await wrapper.get('#bill-household').setValue('household-01');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    const billRequest = vi.mocked(fetch).mock.calls.find(([url, init]) => String(url).endsWith('/api/v1/bills') && init?.method === 'POST');
    expect(JSON.parse(String(billRequest?.[1]?.body))).toMatchObject({ householdId: 'household-01' });
  });

  it('loads and persists notification preferences with the backend schema', async () => {
    vi.mocked(fetch).mockImplementation(async (_input, init) => new Response(JSON.stringify({
      data: init?.method === 'PUT'
        ? { inApp: true, email: true, quietHoursStart: '21:00', quietHoursEnd: '06:00', digest: 'DAILY' }
        : { inApp: true, email: true, quietHoursStart: '21:00', quietHoursEnd: '06:00', digest: 'IMMEDIATE' },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const wrapper = mount(SettingsPage);
    await flushPromises();
    await wrapper.get('#notification-digest').setValue('DAILY');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    const update = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(update?.[0]).toBe('/api/v1/notification-preferences');
    expect(JSON.parse(String(update?.[1]?.body))).toEqual({
      inApp: true, email: true, quietHoursStart: '21:00', quietHoursEnd: '06:00', digest: 'DAILY',
    });
  });

  it('edits organization identity through the protected API', async () => {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      const data = url.endsWith('/api/v1/organization')
        ? { id: 'organization-01', name: 'RW API', shortName: 'RW API', slug: 'rw-api', description: 'Deskripsi lingkungan API.', address: 'Alamat dari API', emergencyPhone: '021123456', timezone: 'Asia/Jakarta', locale: 'id-ID', modules: {} }
        : url.endsWith('/api/v1/settings/modules')
          ? { billing: true, finance: true, patrol: true, complaints: true, activities: true, documents: true }
          : [];
      return new Response(JSON.stringify({ data }), { status: 200, headers: { 'content-type': 'application/json' } });
    });

    const wrapper = mount(AdminContentPage, { props: { section: 'settings' } });
    await flushPromises();
    expect((wrapper.get('#org-name').element as HTMLInputElement).value).toBe('RW API');
    await wrapper.get('#org-name').setValue('RW API Diperbarui');
    await wrapper.findAll('form')[0]!.trigger('submit');
    await flushPromises();

    const update = vi.mocked(fetch).mock.calls.find(([url, init]) => String(url).endsWith('/api/v1/organization') && init?.method === 'PATCH');
    expect(JSON.parse(String(update?.[1]?.body))).toMatchObject({ name: 'RW API Diperbarui', emergencyPhone: '021123456' });
  });
});
