<script setup lang="ts">
import { Check, ChevronDown, Search, X } from 'lucide-vue-next';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

interface OptionItem {
  value: string | number;
  label: string;
  sublabel?: string;
  icon?: any;
  disabled?: boolean;
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null;
    options: OptionItem[] | string[];
    placeholder?: string;
    searchable?: boolean;
    clearable?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }>(),
  {
    modelValue: '',
    placeholder: 'Pilih opsi...',
    searchable: true,
    clearable: false,
    disabled: false,
    size: 'md',
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void;
  (e: 'change', value: string | number): void;
}>();

const isOpen = ref(false);
const searchQuery = ref('');
const rootRef = ref<HTMLElement | null>(null);

const normalizedOptions = computed<OptionItem[]>(() => {
  return props.options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: opt, label: String(opt) };
    }
    return opt;
  });
});

const selectedOption = computed(() => {
  return normalizedOptions.value.find((opt) => opt.value === props.modelValue) ?? null;
});

const filteredOptions = computed(() => {
  if (!searchQuery.value.trim()) return normalizedOptions.value;
  const q = searchQuery.value.toLowerCase();
  return normalizedOptions.value.filter(
    (opt) => opt.label.toLowerCase().includes(q) || (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
  );
});

function selectOption(opt: OptionItem) {
  if (opt.disabled) return;
  emit('update:modelValue', opt.value);
  emit('change', opt.value);
  isOpen.value = false;
  searchQuery.value = '';
}

function clearValue(e: MouseEvent) {
  e.stopPropagation();
  emit('update:modelValue', '');
  emit('change', '');
}

function handleClickOutside(e: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div
    ref="rootRef"
    class="app-select-shell"
    :class="[
      `size-${size}`,
      { open: isOpen, disabled: disabled }
    ]"
  >
    <!-- Select Trigger Control -->
    <div
      class="select-trigger"
      tabindex="0"
      role="combobox"
      :aria-expanded="isOpen"
      @click="!disabled && (isOpen = !isOpen)"
      @keydown.space.prevent="!disabled && (isOpen = !isOpen)"
      @keydown.esc="isOpen = false"
    >
      <div class="trigger-content">
        <component :is="selectedOption.icon" v-if="selectedOption?.icon" :size="16" class="select-icon" />
        <span v-if="selectedOption" class="selected-label">{{ selectedOption.label }}</span>
        <span v-else class="placeholder">{{ placeholder }}</span>
      </div>

      <div class="trigger-actions">
        <button
          v-if="clearable && selectedOption"
          type="button"
          class="clear-btn"
          title="Hapus pilihan"
          @click="clearValue"
        >
          <X :size="14" />
        </button>
        <ChevronDown :size="16" class="chevron-icon" :class="{ rotate: isOpen }" />
      </div>
    </div>

    <!-- Dropdown Menu Popover -->
    <div v-if="isOpen" class="select-dropdown">
      <div v-if="searchable && normalizedOptions.length > 5" class="search-box">
        <Search :size="14" class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari opsi..."
          class="search-input"
          @click.stopPropagation
        />
      </div>

      <ul class="option-list" role="listbox">
        <li
          v-for="opt in filteredOptions"
          :key="String(opt.value)"
          class="option-item"
          :class="{ selected: opt.value === modelValue, disabled: opt.disabled }"
          role="option"
          :aria-selected="opt.value === modelValue"
          @click="selectOption(opt)"
        >
          <div class="option-info">
            <component :is="opt.icon" v-if="opt.icon" :size="15" class="opt-icon" />
            <span>{{ opt.label }}</span>
            <small v-if="opt.sublabel" class="opt-sub">{{ opt.sublabel }}</small>
          </div>
          <Check v-if="opt.value === modelValue" :size="15" class="check-icon" />
        </li>

        <li v-if="filteredOptions.length === 0" class="no-options">
          Tidak ada opsi ditemukan.
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.app-select-shell {
  position: relative;
  width: 100%;
  display: inline-block;
}

.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  border: 1px solid var(--line-strong, #cbd5e1);
  border-radius: var(--radius-md, 0.65rem);
  background: var(--paper, #ffffff);
  color: var(--ink-900, #0f172a);
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
}

.app-select-shell.size-sm .select-trigger {
  min-height: 2.25rem;
  padding: 0.35rem 0.75rem;
  font-size: 0.82rem;
}

.app-select-shell.size-md .select-trigger {
  min-height: 2.75rem;
  padding: 0.5rem 0.9rem;
  font-size: 0.88rem;
}

.app-select-shell.size-lg .select-trigger {
  min-height: 3.1rem;
  padding: 0.65rem 1.1rem;
  font-size: 0.96rem;
}

.select-trigger:hover {
  border-color: var(--teal-600, #0d9488);
}

.app-select-shell.open .select-trigger {
  border-color: var(--teal-600, #0d9488);
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
}

.app-select-shell.disabled .select-trigger {
  opacity: 0.6;
  cursor: not-allowed;
}

.trigger-content {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  overflow: hidden;
}

.selected-label {
  font-weight: 750;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.placeholder {
  color: var(--ink-500, #64748b);
  font-weight: 500;
}

.select-icon {
  color: var(--teal-600, #0d9488);
  flex: none;
}

.trigger-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--ink-500, #64748b);
}

.chevron-icon {
  transition: transform 0.2s ease;
}

.chevron-icon.rotate {
  transform: rotate(180deg);
}

.clear-btn {
  background: transparent;
  border: 0;
  color: var(--ink-500);
  cursor: pointer;
  padding: 0.1rem;
  display: grid;
  place-items: center;
}

.clear-btn:hover {
  color: var(--ink-900);
}

/* Dropdown */
.select-dropdown {
  position: absolute;
  top: calc(100% + 0.35rem);
  left: 0;
  right: 0;
  z-index: 90;
  background: white;
  border: 1px solid var(--line, #e2e8f0);
  border-radius: var(--radius-md, 0.65rem);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--line, #e2e8f0);
  background: var(--cream-50, #f8fafc);
}

.search-icon {
  color: var(--ink-500);
}

.search-input {
  width: 100%;
  border: 0;
  background: transparent;
  outline: none;
  font-size: 0.82rem;
  color: var(--ink-900);
}

.option-list {
  list-style: none;
  margin: 0;
  padding: 0.35rem;
  max-height: 14rem;
  overflow-y: auto;
}

.option-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.45rem;
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--ink-800);
  cursor: pointer;
  transition: background 0.15s ease;
}

.option-item:hover {
  background: var(--teal-50, #f0fdf4);
  color: var(--teal-900, #134e4a);
}

.option-item.selected {
  background: var(--teal-100, #ccfbf1);
  color: var(--teal-900, #134e4a);
}

.option-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.option-info {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.opt-sub {
  color: var(--ink-500);
  font-weight: 500;
  font-size: 0.75rem;
}

.check-icon {
  color: var(--teal-700);
}

.no-options {
  padding: 0.75rem;
  font-size: 0.8rem;
  color: var(--ink-500);
  text-align: center;
}
</style>
