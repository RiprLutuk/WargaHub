import type { Permission, SafeUser } from '@wargahub/contracts';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api } from '../lib/api';

interface LoginResult { user: SafeUser }

export const useSessionStore = defineStore('session', () => {
  const user = ref<SafeUser | null>(null);
  const loading = ref(false);
  const initialized = ref(false);
  let sessionRequest: Promise<void> | null = null;

  const isAuthenticated = computed(() => user.value !== null);
  const permissions = computed(() => user.value?.permissions ?? []);
  const isAdmin = computed(() => permissions.value.some((permission) => [
    'resident.read', 'billing.create', 'finance.read', 'complaint.assign', 'settings.manage',
  ].includes(permission)));

  async function ensureSession(): Promise<void> {
    if (initialized.value) return;
    if (sessionRequest) return sessionRequest;
    sessionRequest = (async () => {
      loading.value = true;
      try {
        const result = await api.get<LoginResult>('/auth/me');
        user.value = result.user;
      } catch {
        // A 401 on a public page means simply “not signed in”, not a page error.
        user.value = null;
      } finally {
        loading.value = false;
        initialized.value = true;
        sessionRequest = null;
      }
    })();
    return sessionRequest;
  }

  async function login(email: string, password: string): Promise<SafeUser> {
    loading.value = true;
    try {
      const result = await api.post<LoginResult>('/auth/login', { email, password });
      user.value = result.user;
      initialized.value = true;
      return result.user;
    } finally {
      loading.value = false;
    }
  }

  async function logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      user.value = null;
      initialized.value = true;
    }
  }

  function can(permission: Permission | string): boolean {
    return permissions.value.includes(permission as Permission);
  }

  return { user, loading, initialized, isAuthenticated, permissions, isAdmin, ensureSession, login, logout, can };
});
