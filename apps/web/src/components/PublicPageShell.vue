<template>
  <div class="container public-page-shell">
    <slot />
  </div>
</template>

<style scoped>
.public-page-shell {
  width: min(calc(100% - 2rem), var(--content));
  display: grid;
  gap: 1.5rem;
  padding-block: clamp(2rem, 4vw, 3.5rem) 4rem;
}
</style>
