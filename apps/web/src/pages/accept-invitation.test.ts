// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AcceptInvitationPage from './AcceptInvitationPage.vue';
import ForgotPasswordPage from './ForgotPasswordPage.vue';
import ResetPasswordPage from './ResetPasswordPage.vue';

const routerPush = vi.fn();

vi.mock('vue-router', async (importOriginal) => ({
  ...await importOriginal<typeof import('vue-router')>(),
  useRoute: () => ({ query: { token: 'a'.repeat(40) } }),
  useRouter: () => ({ push: routerPush }),
}));

describe('invitation onboarding', () => {
  beforeEach(() => {
    routerPush.mockReset();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { message: 'Akun berhasil diaktifkan.' },
    }), { status: 200, headers: { 'content-type': 'application/json' } })));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('validates a strong password and activates the invitation through the API', async () => {
    const wrapper = mount(AcceptInvitationPage, {
      global: { stubs: { RouterLink: { template: '<a href="#"><slot /></a>' } } },
    });

    expect(wrapper.get('label[for="invitation-password"]').text()).toContain('Kata sandi baru');
    await wrapper.get('#invitation-password').setValue('lemah');
    await wrapper.get('#invitation-password-confirmation').setValue('lemah');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.get('[role="alert"]').text()).toContain('12 karakter');
    expect(fetch).not.toHaveBeenCalled();

    await wrapper.get('#invitation-password').setValue('WargaHubAman2026');
    await wrapper.get('#invitation-password-confirmation').setValue('WargaHubAman2026');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(url).toBe('/api/v1/auth/accept-invitation');
    expect(JSON.parse(String(init?.body))).toEqual({ token: 'a'.repeat(40), password: 'WargaHubAman2026' });
    expect(routerPush).toHaveBeenCalledWith({ path: '/login', query: { invitation: 'accepted' } });
  });

  it('requests recovery without revealing whether an account exists', async () => {
    const wrapper = mount(ForgotPasswordPage, {
      global: { stubs: { RouterLink: { template: '<a href="#"><slot /></a>' } } },
    });
    await wrapper.get('#recovery-email').setValue('warga@example.id');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('/api/v1/auth/forgot-password');
    expect(wrapper.get('[role="status"]').text()).toContain('Jika akun terdaftar');
  });

  it('sets a new password from a one-time recovery token', async () => {
    const wrapper = mount(ResetPasswordPage, {
      global: { stubs: { RouterLink: { template: '<a href="#"><slot /></a>' } } },
    });
    await wrapper.get('#reset-password').setValue('WargaHubBaru2026');
    await wrapper.get('#reset-password-confirmation').setValue('WargaHubBaru2026');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(url).toBe('/api/v1/auth/reset-password');
    expect(JSON.parse(String(init?.body))).toEqual({ token: 'a'.repeat(40), password: 'WargaHubBaru2026' });
    expect(routerPush).toHaveBeenCalledWith({ path: '/login', query: { password: 'reset' } });
  });
});
