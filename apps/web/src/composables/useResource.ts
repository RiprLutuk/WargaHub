import { onMounted, ref, type Ref } from 'vue';
import { ApiClientError } from '../lib/api';

export function useResource<T>(loader: () => Promise<T>) {
  const data: Ref<T | null> = ref(null);
  const loading = ref(true);
  const error = ref('');

  async function reload(): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      data.value = await loader();
    } catch (cause) {
      error.value = cause instanceof ApiClientError || cause instanceof Error
        ? cause.message
        : 'Terjadi kendala saat memuat informasi.';
    } finally {
      loading.value = false;
    }
  }

  onMounted(reload);
  return { data, loading, error, reload };
}
