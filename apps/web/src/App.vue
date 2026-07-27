<script setup lang="ts">
import { FlaskConical, WifiOff, X } from 'lucide-vue-next';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterView } from 'vue-router';

const online=ref(typeof navigator==='undefined'?true:navigator.onLine);
const demoMode=ref(false);const showDemo=ref(true);
const setOnline=()=>{online.value=true};const setOffline=()=>{online.value=false};const enableDemo=()=>{demoMode.value=true};
onMounted(()=>{window.addEventListener('online',setOnline);window.addEventListener('offline',setOffline);document.addEventListener('wargahub:demo-mode',enableDemo)});
onBeforeUnmount(()=>{window.removeEventListener('online',setOnline);window.removeEventListener('offline',setOffline);document.removeEventListener('wargahub:demo-mode',enableDemo)});
</script>
<template><RouterView/><div v-if="!online" class="connection-banner offline" role="status"><WifiOff :size="16"/>Anda sedang offline. Data privat tidak disimpan untuk akses offline.</div><div v-else-if="demoMode&&showDemo" class="connection-banner demo" role="status"><FlaskConical :size="16"/><span>API tidak tersedia—menampilkan data demo lokal.</span><button type="button" aria-label="Tutup pemberitahuan mode demo" @click="showDemo=false"><X :size="15"/></button></div></template>
<style scoped>.connection-banner{position:fixed;z-index:100;right:1rem;bottom:1rem;display:flex;max-width:min(30rem,calc(100% - 2rem));align-items:center;gap:.5rem;padding:.65rem .8rem;border-radius:.75rem;box-shadow:var(--shadow-lg);font-size:.76rem;font-weight:750}.connection-banner.offline{background:var(--amber-700);color:white}.connection-banner.demo{border:1px solid var(--teal-100);background:var(--paper);color:var(--teal-800)}.connection-banner button{display:grid;width:2rem;height:2rem;place-items:center;border:0;border-radius:.5rem;background:transparent;color:inherit;cursor:pointer}@media(max-width:820px){.connection-banner{bottom:5.4rem}}</style>
