<script setup lang="ts">
import { Bell, Check, CheckCheck, Inbox, Megaphone, ReceiptText, ShieldCheck, UserCheck } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import EmptyState from '../../components/EmptyState.vue';
import StatePanel from '../../components/StatePanel.vue';
import { useResource } from '../../composables/useResource';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  actionUrl: string | null;
  category?: string;
}

const notifications = useResource(() => api.get<NotificationItem[]>('/notifications'));
const filter = ref<'ALL' | 'UNREAD'>('ALL');
const busy = ref(false);

const filteredNotifications = computed(() => {
  const list = notifications.data.value ?? [];
  if (filter.value === 'UNREAD') {
    return list.filter((item) => !item.readAt);
  }
  return list;
});

const unreadCount = computed(() => {
  return (notifications.data.value ?? []).filter((item) => !item.readAt).length;
});

async function markRead(item: NotificationItem) {
  if (item.readAt) return;
  await api.post(`/notifications/${item.id}/read`);
  item.readAt = new Date().toISOString();
}

async function markAllRead() {
  const unreadItems = (notifications.data.value ?? []).filter((item) => !item.readAt);
  if (!unreadItems.length) return;
  busy.value = true;
  try {
    await Promise.all(unreadItems.map((item) => api.post(`/notifications/${item.id}/read`)));
    unreadItems.forEach((item) => {
      item.readAt = new Date().toISOString();
    });
  } finally {
    busy.value = false;
  }
}

function getIcon(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes('tagihan') || lower.includes('bayar') || lower.includes('iuran')) return ReceiptText;
  if (lower.includes('ronda') || lower.includes('patroli') || lower.includes('pos')) return ShieldCheck;
  if (lower.includes('pengaduan') || lower.includes('laporan') || lower.includes('pic')) return UserCheck;
  return Megaphone;
}
</script>

<template>
  <div class="portal-page">
    <header class="portal-page-heading">
      <div>
        <span class="eyebrow">Pembaruan & Pemberitahuan</span>
        <h1>Notifikasi</h1>
        <p>Semua informasi aktivitas warga, jadwal ronda, pengaduan, dan kewajiban tagihan dalam satu tempat.</p>
      </div>

      <div class="header-actions">
        <button
          v-if="unreadCount > 0"
          class="button button-secondary button-sm"
          type="button"
          :disabled="busy"
          @click="markAllRead"
        >
          <CheckCheck :size="16" /> {{ busy ? 'Memproses…' : 'Tandai semua dibaca' }}
        </button>
      </div>
    </header>

    <!-- Notification Filters -->
    <div class="notification-tabs" role="tablist">
      <button :class="{ active: filter === 'ALL' }" type="button" @click="filter = 'ALL'">
        <Inbox :size="16" /> Semua Notifikasi
      </button>
      <button :class="{ active: filter === 'UNREAD' }" type="button" @click="filter = 'UNREAD'">
        <Bell :size="16" /> Belum Dibaca
        <span v-if="unreadCount > 0" class="badge-unread">{{ unreadCount }}</span>
      </button>
    </div>

    <StatePanel v-if="notifications.loading.value" state="loading" />
    <StatePanel v-else-if="notifications.error.value" state="error" :message="notifications.error.value" @retry="notifications.reload" />
    <EmptyState
      v-else-if="!filteredNotifications.length"
      title="Tidak ada notifikasi"
      :message="filter === 'UNREAD' ? 'Semua notifikasi penting Anda sudah dibaca.' : 'Belum ada notifikasi baru untuk rumah Anda.'"
    />

    <div v-else class="notification-list">
      <article
        v-for="item in filteredNotifications"
        :key="item.id"
        class="card notification-card"
        :class="{ unread: !item.readAt }"
      >
        <span class="notification-icon" :class="{ 'icon-unread': !item.readAt }">
          <component :is="getIcon(item.title)" :size="20" />
        </span>

        <div class="notification-content">
          <div class="notification-meta">
            <span class="time-stamp">{{ formatDateTime(item.createdAt) }}</span>
            <span v-if="!item.readAt" class="status-chip">Baru</span>
          </div>
          <h2>{{ item.title }}</h2>
          <p>{{ item.message }}</p>

          <div class="notification-actions">
            <a v-if="item.actionUrl" :href="item.actionUrl" class="action-link">Lihat Detail →</a>
            <button v-if="!item.readAt" type="button" class="mark-btn" @click="markRead(item)">
              <Check :size="14" /> Tandai Dibaca
            </button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.portal-page { display: grid; max-width: 78rem; gap: 1.2rem; margin-inline: auto; }
.portal-page-heading { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 1rem; }
.portal-page-heading h1 { margin-bottom: .45rem; font-size: clamp(2rem, 4.5vw, 3rem); }
.portal-page-heading p { max-width: 44rem; margin: 0; color: var(--ink-650); }
.notification-tabs { display: flex; gap: .4rem; padding: .35rem; border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--paper); }
.notification-tabs button { display: inline-flex; min-height: 2.6rem; align-items: center; gap: .45rem; padding: .55rem .85rem; border: 0; border-radius: .65rem; background: transparent; color: var(--ink-650); font-size: .8rem; font-weight: 750; cursor: pointer; }
.notification-tabs button.active { background: var(--teal-100); color: var(--teal-800); }
.badge-unread { padding: .1rem .45rem; border-radius: 999px; background: var(--coral-500); color: white; font-size: .68rem; font-weight: 850; }
.notification-list { display: grid; gap: .7rem; }
.notification-card { display: flex; gap: 1rem; padding: 1.1rem; border-left: 4px solid transparent; transition: border-color .2s; }
.notification-card.unread { border-left-color: var(--teal-600); background: var(--cream-50); }
.notification-icon { display: grid; width: 2.8rem; height: 2.8rem; flex: none; place-items: center; border-radius: .8rem; background: var(--cream-100); color: var(--ink-700); }
.notification-icon.icon-unread { background: var(--teal-100); color: var(--teal-700); }
.notification-content { display: grid; flex: 1; gap: .25rem; }
.notification-meta { display: flex; align-items: center; gap: .5rem; font-size: .75rem; }
.time-stamp { color: var(--ink-500); }
.status-chip { padding: .08rem .4rem; border-radius: 999px; background: var(--teal-600); color: white; font-size: .65rem; font-weight: 850; }
.notification-content h2 { margin: 0; font-size: 1.02rem; font-weight: 750; }
.notification-content p { margin: 0; color: var(--ink-650); font-size: .84rem; line-height: 1.45; }
.notification-actions { display: flex; flex-wrap: wrap; align-items: center; gap: .85rem; margin-top: .5rem; }
.action-link { color: var(--teal-700); font-size: .78rem; font-weight: 850; text-decoration: none; }
.action-link:hover { text-decoration: underline; }
.mark-btn { display: inline-flex; align-items: center; gap: .25rem; padding: .25rem .55rem; border: 1px solid var(--line); border-radius: .5rem; background: white; color: var(--ink-650); font-size: .73rem; font-weight: 700; cursor: pointer; }
.mark-btn:hover { background: var(--cream-100); color: var(--ink-900); }
@media (max-width: 600px) { .portal-page-heading { flex-direction: column; align-items: flex-start; } .notification-card { flex-direction: column; } }
</style>
