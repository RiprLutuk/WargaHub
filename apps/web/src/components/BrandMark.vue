<script setup lang="ts">
withDefaults(defineProps<{ compact?: boolean; inverse?: boolean }>(), {
  compact: false,
  inverse: false,
});
</script>

<template>
  <span class="brand" :class="{ 'brand-inverse': inverse }">
    <span class="brand-symbol" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
    <span v-if="!compact" class="brand-copy">
      <strong>WargaHub</strong>
      <small>Rukun dalam satu ruang</small>
    </span>
    <span v-else class="sr-only">WargaHub</span>
  </span>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.68rem;
  color: var(--ink-950);
  text-decoration: none;
}

.brand-symbol {
  position: relative;
  display: grid;
  width: 2.45rem;
  height: 2.45rem;
  place-items: center;
  overflow: hidden;
  border-radius: 0.8rem 0.8rem 1.2rem;
  background: linear-gradient(135deg, #0f766e, #0d9488) !important;
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.3) !important;
  flex: none;
}

.brand-symbol::before {
  position: absolute;
  inset: 0.42rem;
  border: 2px solid #ffffff !important;
  border-top: 0;
  border-radius: 0.16rem 0.16rem 0.55rem 0.55rem;
  content: '';
  transform: rotate(45deg);
}

.brand-symbol span {
  position: absolute;
  bottom: 0.48rem;
  width: 0.22rem;
  border-radius: 1rem 1rem 0 0;
  background: #f59e0b !important;
  transform-origin: bottom;
}

.brand-symbol span:nth-child(1) { height: 0.62rem; transform: translateX(-0.46rem) rotate(-20deg); }
.brand-symbol span:nth-child(2) { height: 0.92rem; }
.brand-symbol span:nth-child(3) { height: 0.62rem; transform: translateX(0.46rem) rotate(20deg); }

.brand-copy {
  display: grid;
  line-height: 1.05;
}

.brand-copy strong {
  font-size: 1.04rem;
  font-weight: 850;
  letter-spacing: -0.025em;
  color: var(--ink-950);
}

.brand-copy small {
  margin-top: 0.28rem;
  color: var(--ink-650);
  font-size: 0.68rem;
  font-weight: 600;
}

.brand-inverse .brand-copy strong {
  color: #ffffff;
}

.brand-inverse .brand-copy small {
  color: rgba(255, 255, 255, 0.72);
}
</style>
