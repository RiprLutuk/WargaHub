import { createPinia } from 'pinia';
import { inject as injectVercelAnalytics } from '@vercel/analytics';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './styles/base.css';

const app=createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');

// Vercel Web Analytics is production-only by default and automatically tracks
// SPA route changes in Vue via pushState/popstate.
injectVercelAnalytics({ framework: 'vue' });
