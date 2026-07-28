import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../app.js';
import { formatWahaChatId, WahaService } from '../../services/waha.js';

describe('WAHA WhatsApp API Integration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('formats phone numbers into valid WAHA chat IDs correctly', () => {
    expect(formatWahaChatId('081234567890')).toBe('6281234567890@c.us');
    expect(formatWahaChatId('+62812-3456-7890')).toBe('6281234567890@c.us');
    expect(formatWahaChatId('6281234567890@c.us')).toBe('6281234567890@c.us');
    expect(formatWahaChatId('120363025547926123@g.us')).toBe('120363025547926123@g.us');
  });

  it('sends formatted text messages via WAHA API endpoint', async () => {
    const config = {
      NODE_ENV: 'test' as const,
      HOST: '0.0.0.0',
      PORT: 3000,
      WEB_ORIGIN: 'http://localhost:5173',
      PGLITE_DATA_DIR: '.data/test',
      SESSION_TTL_HOURS: 8,
      UPLOAD_DIR: 'uploads',
      MAX_UPLOAD_BYTES: 10485760,
      SMTP_PORT: 587,
      SMTP_FROM: 'WargaHub <noreply@example.org>',
      PUBLIC_BASE_URL: 'http://localhost:5173',
      LOG_LEVEL: 'silent' as const,
      WAHA_BASE_URL: 'http://localhost:3001',
      WAHA_SESSION: 'default',
      WAHA_ENABLED: true,
    };

    const service = new WahaService(config);

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'waha_msg_123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const res = await service.sendFormattedNotification({
      phone: '081234567890',
      title: 'Iuran Juli 2026',
      message: 'Tagihan iuran lingkungan bulan Juli sebesar Rp 150.000 telah terbit.',
      actionUrl: 'http://localhost:5173/app/tagihan',
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.id).toBe('waha_msg_123');
    }
    expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/sendText', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('6281234567890@c.us'),
    }));
  });

  it('handles WAHA webhook inbound events gracefully', async () => {
    const app = await buildApp({ logger: false });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/public/waha/webhook',
      payload: {
        event: 'message',
        session: 'default',
        payload: {
          from: '6281234567890@c.us',
          body: 'bantuan',
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toEqual({ received: true, event: 'message' });

    await app.close();
  });
});
