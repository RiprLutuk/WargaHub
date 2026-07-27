// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from './HomePage.vue';
import ContactPage from './ContactPage.vue';
import EmergencyPage from './EmergencyPage.vue';
import PublicLayout from '../../layouts/PublicLayout.vue';
import { ApiClientError, ApiUnavailableError, createApiClient } from '../../lib/api';

const routerLinkStub = {
  template: '<a href="#"><slot /></a>',
};

describe('public WargaHub experience', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the public identity without exposing resident data', async () => {
    const wrapper = mount(HomePage, {
      global: { stubs: { RouterLink: routerLinkStub } },
    });

    await flushPromises();

    expect(wrapper.get('h1').text()).toContain('WargaHub');
    expect(wrapper.text()).toContain('Pengumuman terbaru');
    expect(wrapper.text()).not.toContain('warga@demo.local');
  });

  it('offers keyboard users a skip link and named navigation', () => {
    const wrapper = mount(PublicLayout, {
      global: {
        stubs: {
          RouterLink: routerLinkStub,
          RouterView: { template: '<main id="konten-utama">Konten</main>' },
        },
      },
    });

    expect(wrapper.get('a.skip-link').attributes('href')).toBe('#konten-utama');
    expect(wrapper.get('nav').attributes('aria-label')).toBe('Navigasi utama');
    expect(wrapper.text()).toContain('Darurat');
  });

  it('renders local contact and emergency details from the public site API', async () => {
    const site = {
      name: 'RW API', shortName: 'RW API', slug: 'rw-api', description: 'Lingkungan dari API.',
      address: 'Balai Warga dari API', emergencyPhone: '+62211234567', timezone: 'Asia/Jakarta', locale: 'id-ID',
    };
    vi.mocked(fetch).mockImplementation(async () => new Response(JSON.stringify({ data: site }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));

    const emergency = mount(EmergencyPage);
    const contact = mount(ContactPage, { global: { stubs: { RouterLink: routerLinkStub } } });
    await flushPromises();

    expect(emergency.get(`a[href="tel:${site.emergencyPhone}"]`).text()).toBe(site.emergencyPhone);
    expect(contact.text()).toContain(site.address);
    expect(`${emergency.text()} ${contact.text()}`).not.toContain('021-555-0168');
  });

  it('uses read-only demo data only for network failures, never for writes or API rejections', async () => {
    const fallback = { name: 'Lingkungan Demo' };
    const client = createApiClient({ fallback: { '/public/site': fallback } });

    await expect(client.get('/public/site')).resolves.toEqual(fallback);
    await expect(client.post('/public/site', { name: 'Tidak boleh tersimpan' }))
      .rejects.toBeInstanceOf(ApiUnavailableError);

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Tidak diizinkan' } }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(client.get('/public/site')).rejects.toBeInstanceOf(ApiClientError);
  });
});
