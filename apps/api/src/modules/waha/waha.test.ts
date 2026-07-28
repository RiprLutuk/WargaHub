import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../../app.js';
import { formatWahaChatId, WahaService } from '../../services/waha.js';

describe('WAHA WhatsApp API Integration', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn() as unknown as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
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
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'msg_123', status: 'PENDING' }), { status: 201 }),
    );

    const result = await service.sendText({ phone: '081234567890', text: 'Halo WargaHub' });
    expect(result).toEqual({ success: true, id: 'msg_123' });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/sendText',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          session: 'default',
          chatId: '6281234567890@c.us',
          text: 'Halo WargaHub',
        }),
      }),
    );
  });

  it('handles WAHA webhook inbound events gracefully', async () => {
    const app = await buildApp({ logger: false });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/public/waha/webhook',
      payload: {
        event: 'message',
        session: 'default',
        payload: {
          id: 'waha_msg_99',
          from: '6281234567890@c.us',
          body: 'Halo admin RT',
          hasMedia: false,
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        received: true,
        event: 'message',
      },
    });

    await app.close();
  });
});
