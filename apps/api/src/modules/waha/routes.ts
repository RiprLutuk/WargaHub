import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError, success } from '../../lib/http.js';
import { WahaService } from '../../services/waha.js';

const testMessageSchema = z.object({
  phone: z.string().min(5, 'Nomor HP tidak valid'),
  message: z.string().min(1, 'Pesan tidak boleh kosong'),
});

const webhookSchema = z.object({
  event: z.string(),
  session: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
});

export async function wahaRoutes(app: FastifyInstance): Promise<void> {
  const waha = new WahaService(app.config);

  // 1. Check WAHA connection and session status
  app.get(
    '/waha/status',
    { preHandler: app.requirePermission('organization.update') },
    async (request) => {
      const status = await waha.getSessionStatus();
      return success(request, {
        enabled: app.config.WAHA_ENABLED,
        baseUrl: app.config.WAHA_BASE_URL,
        session: app.config.WAHA_SESSION,
        ...status,
      });
    },
  );

  // 2. Send test WhatsApp message
  app.post(
    '/waha/send-test',
    { preHandler: app.requirePermission('organization.update') },
    async (request) => {
      const body = testMessageSchema.parse(request.body);
      const result = await waha.sendFormattedNotification({
        phone: body.phone,
        title: 'Tes Koneksi WAHA WargaHub',
        message: body.message,
        actionUrl: `${app.config.PUBLIC_BASE_URL}`,
      });

      if (!result.success) {
        throw new AppError(502, 'WAHA_SEND_FAILED', `Gagal mengirim WhatsApp via WAHA: ${result.error}`);
      }

      return success(request, {
        sent: true,
        phone: body.phone,
        message: 'Pesan tes WhatsApp berhasil terkirim melalui API WAHA.',
      });
    },
  );

  // 3. WAHA Inbound Webhook Endpoint
  app.post('/public/waha/webhook', async (request) => {
    const body = webhookSchema.safeParse(request.body);
    if (!body.success) {
      return success(request, { received: true, note: 'Ignored malformed payload' });
    }

    const { event, session, payload } = body.data;
    app.log.info({ event, session, payload }, 'WAHA Webhook Event Received');

    // Auto-respond or process inbound resident WhatsApp messages if needed
    if (event === 'message' && payload && typeof payload === 'object') {
      const from = (payload.from as string) || '';
      const bodyText = (payload.body as string) || '';

      if (bodyText.trim().toLowerCase() === 'help' || bodyText.trim().toLowerCase() === 'bantuan') {
        const replyPhone = from.replace('@c.us', '');
        await waha.sendText({
          phone: replyPhone,
          text: `*Halo! Ini Layanan Otomatis WargaHub*\n\nSilakan kunjungi portal publik WargaHub untuk informasi pengumuman, tagihan, dan laporan:\n🔗 ${app.config.PUBLIC_BASE_URL}`,
        });
      }
    }

    return success(request, { received: true, event });
  });
}
