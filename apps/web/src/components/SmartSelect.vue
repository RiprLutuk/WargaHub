<script setup lang="ts">
import { Check, ChevronDown } from 'lucide-vue-next';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

export interface SmartSelectOption { value: string; label: string }

const props = withDefaults(defineProps<{
  modelValue: string;
  options: SmartSelectOption[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
}>(), { placeholder: 'Pilih opsi', searchable: true, searchPlaceholder: 'Cari…', disabled: false });

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const open = ref(false);
const query = ref('');
const root = ref<HTMLElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
const selected = computed(() => props.options.find((option) => option.value === props.modelValue));
const filtered = computed(() => {
  const term = query.value.trim().toLowerCase();
  return term ? props.options.filter((option) => option.label.toLowerCase().includes(term)) : props.options;
});

function toggle() {
  if (props.disabled) return;
  open.value = !open.value;
  if (open.value) requestAnimationFrame(() => searchInput.value?.focus());
}
function choose(value: string) {
  emit('update:modelValue', value);
  open.value = false;
  query.value = '';
}
function closeOnOutside(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false;
}
onMounted(() => document.addEventListener('click', closeOnOutside));
onBeforeUnmount(() => document.removeEventListener('click', closeOnOutside));
</script>

<template>
  <div ref="root" class="smart-select" :class="{ open, disabled }">
    <button type="button" class="smart-select-trigger" role="combobox" :aria-expanded="open" :disabled="disabled" @click.stop="toggle">
      <span>{{ selected?.label ?? placeholder }}</span><ChevronDown :size="17" aria-hidden="true" />
    </button>
    <div v-if="open" class="smart-select-options" role="listbox">
      <input v-if="searchable" ref="searchInput" v-model="query" class="smart-select-search" type="search" :placeholder="searchPlaceholder" @click.stop />
      <button v-for="option in filtered" :key="option.value" type="button" role="option" :aria-selected="modelValue === option.value" :class="{ selected: modelValue === option.value }" @click="choose(option.value)">
        <span>{{ option.label }}</span><Check v-if="modelValue === option.value" :size="16" aria-hidden="true" />
      </button>
      <span v-if="!filtered.length" class="smart-select-empty">Tidak ada pilihan yang cocok.</span>
    </div>
  </div>
</template>

<style scoped>
.smart-select { position: relative; }
.smart-select-trigger { display: flex; width: 100%; min-height: 2.8rem; align-items: center; justify-content: space-between; gap: .75rem; padding: .7rem .82rem; border: 1px solid var(--line-strong); border-radius: .72rem; background: var(--paper); color: var(--ink-950); font: inherit; text-align: left; cursor: pointer; }
.smart-select-trigger:focus, .smart-select.open .smart-select-trigger { border-color: var(--teal-600); box-shadow: 0 0 0 3px var(--teal-100); outline: 0; }
.smart-select-trigger svg { flex: none; color: var(--ink-500); transition: transform .15s ease; }
.smart-select.open .smart-select-trigger svg { transform: rotate(180deg); }
.smart-select.disabled { opacity: .6; }
.smart-select-options { position: absolute; z-index: 30; top: calc(100% + .35rem); right: 0; left: 0; display: grid; max-height: 16rem; overflow-y: auto; padding: .35rem; border: 1px solid var(--line); border-radius: .7rem; background: var(--paper); box-shadow: var(--shadow-lg); }
.smart-select-search { width: 100%; min-height: 2.3rem; margin-bottom: .25rem; padding: .5rem .65rem; border: 1px solid var(--line); border-radius: .45rem; background: var(--cream-50); color: var(--ink-800); font: inherit; font-size: .84rem; outline: 0; }
.smart-select-search:focus { border-color: var(--teal-600); box-shadow: 0 0 0 2px var(--teal-100); }
.smart-select-options button { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: .65rem .7rem; border: 0; border-radius: .45rem; background: transparent; color: var(--ink-800); font: inherit; font-size: .88rem; text-align: left; cursor: pointer; }
.smart-select-options button:hover, .smart-select-options button.selected { background: var(--teal-50); color: var(--teal-800); }
.smart-select-options button.selected { font-weight: 750; }
.smart-select-empty { padding: .7rem; color: var(--ink-600); font-size: .84rem; }
</style>
