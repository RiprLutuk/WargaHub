<script setup lang="ts">
import { Inbox } from 'lucide-vue-next';

withDefaults(defineProps<{ title: string; description?: string; compact?: boolean }>(), {
  description: 'Belum ada informasi untuk ditampilkan.',
  compact: false,
});
</script>

<template>
  <div class="empty-state" :class="{ compact }" role="status">
    <span class="empty-icon" aria-hidden="true"><Inbox :size="22" /></span>
    <div>
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.empty-state { display: grid; min-height: 13rem; place-content: center; justify-items: center; gap: 0.8rem; padding: 2rem; border: 1px dashed var(--line-strong); border-radius: var(--radius-lg); background: rgb(255 253 248 / 0.62); text-align: center; }
.empty-state.compact { min-height: 7rem; grid-template-columns: auto 1fr; place-content: center stretch; justify-items: start; padding: 1rem; text-align: left; }
.empty-icon { display: grid; width: 2.8rem; height: 2.8rem; place-items: center; border-radius: 50%; background: var(--teal-100); color: var(--teal-700); }
h3 { margin-bottom: 0.2rem; }
p { max-width: 30rem; margin-bottom: 0; color: var(--ink-650); }
</style>
