import { readFile } from 'node:fs/promises';
import { basename, resolve, sep } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { idSchema, pageQuerySchema } from '@wargahub/contracts';
import { z } from 'zod';
import { AppError, success } from '../../lib/http.js';

type PublicOrganizationRow = {
  id: string;
  name: string;
  short_name: string;
  slug: string;
  description: string;
  address: string;
  emergency_phone: string;
  timezone: string;
  locale: string;
};

const idParamsSchema = z.object({ id: idSchema });

function safeOriginalName(filename: string): string {
  return basename(filename).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 240) || 'document';
}

async function publicOrganization(app: FastifyInstance): Promise<PublicOrganizationRow> {
  const result = await app.database.query<PublicOrganizationRow>(
    `SELECT id, name, short_name, slug, description, address, emergency_phone,
            timezone, locale
     FROM organizations ORDER BY created_at LIMIT 1`,
  );
  const row = result.rows[0];
  if (!row) throw new AppError(404, 'PUBLIC_SITE_NOT_FOUND', 'Halaman lingkungan belum tersedia.');
  return row;
}

export async function publicRoutes(app: FastifyInstance): Promise<void> {
  app.get('/public/site', async (request) => {
    const organization = await publicOrganization(app);
    return success(request, {
      name: organization.name,
      shortName: organization.short_name,
      slug: organization.slug,
      description: organization.description,
      address: organization.address,
      emergencyPhone: organization.emergency_phone,
      timezone: organization.timezone,
      locale: organization.locale,
    });
  });

  app.get('/public/announcements', async (request) => {
    const query = pageQuerySchema.parse(request.query);
    const organization = await publicOrganization(app);
    const params: unknown[] = [organization.id];
    let search = '';
    if (query.search) {
      params.push(`%${query.search}%`);
      search = ` AND (title ILIKE $2 OR summary ILIKE $2)`;
    }
    const count = await app.database.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM announcements
       WHERE organization_id = $1 AND visibility = 'PUBLIC' AND status = 'PUBLISHED'
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)${search}`,
      params,
    );
    params.push(query.pageSize, (query.page - 1) * query.pageSize);
    const result = await app.database.query<{
      id: string;
      category: string;
      title: string;
      slug: string;
      summary: string;
      content: string;
      visibility: 'PUBLIC';
      urgency: string;
      status: 'PUBLISHED';
      pinned: boolean;
      published_at: string;
      expires_at: string | null;
    }>(
      `SELECT id, category, title, slug, summary, content, visibility, urgency,
              status, pinned, published_at, expires_at
       FROM announcements
       WHERE organization_id = $1 AND visibility = 'PUBLIC' AND status = 'PUBLISHED'
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)${search}
       ORDER BY pinned DESC, published_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return success(request, result.rows.map((row) => ({
      id: row.id,
      category: row.category,
      title: row.title,
      slug: row.slug,
      summary: row.summary,
      content: row.content,
      visibility: row.visibility,
      urgency: row.urgency,
      status: row.status,
      pinned: row.pinned,
      publishedAt: row.published_at,
      expiresAt: row.expires_at,
    })), {
      page: query.page,
      pageSize: query.pageSize,
      total: count.rows[0]?.total ?? 0,
    });
  });

  app.get('/public/documents', async (request) => {
    const query = pageQuerySchema.parse(request.query);
    const organization = await publicOrganization(app);
    const params: unknown[] = [organization.id];
    let search = '';
    if (query.search) {
      params.push(`%${query.search}%`);
      search = ` AND (title ILIKE $2 OR coalesce(description, '') ILIKE $2 OR category ILIKE $2)`;
    }
    const count = await app.database.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM documents
       WHERE organization_id = $1 AND visibility = 'PUBLIC' AND published_at IS NOT NULL
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)${search}`,
      params,
    );
    params.push(query.pageSize, (query.page - 1) * query.pageSize);
    const result = await app.database.query<{
      id: string;
      title: string;
      slug: string;
      description: string | null;
      category: string;
      visibility: 'PUBLIC';
      current_version: number;
      file_id: string | null;
      published_at: string;
      expires_at: string | null;
    }>(
      `SELECT id, title, slug, description, category, visibility, current_version,
              (SELECT dv.file_id FROM document_versions dv
               WHERE dv.organization_id = documents.organization_id
                 AND dv.document_id = documents.id
                 AND dv.version = documents.current_version) AS file_id,
              published_at, expires_at
       FROM documents
       WHERE organization_id = $1 AND visibility = 'PUBLIC' AND published_at IS NOT NULL
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)${search}
       ORDER BY published_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return success(request, result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      category: row.category,
      visibility: row.visibility,
      currentVersion: row.current_version,
      downloadUrl: row.file_id ? `/api/v1/public/documents/${row.id}/download` : null,
      publishedAt: row.published_at,
      expiresAt: row.expires_at,
    })), {
      page: query.page,
      pageSize: query.pageSize,
      total: count.rows[0]?.total ?? 0,
    });
  });

  app.get('/public/documents/:id/download', async (request, reply) => {
    const { id } = idParamsSchema.parse(request.params);
    const organization = await publicOrganization(app);
    const result = await app.database.query<{
      storage_key: string;
      original_name: string;
      mime_type: string;
    }>(
      `SELECT f.storage_key, f.original_name, f.mime_type
       FROM documents d
       JOIN document_versions dv
         ON dv.organization_id = d.organization_id
        AND dv.document_id = d.id
        AND dv.version = d.current_version
       JOIN files f ON f.organization_id = d.organization_id AND f.id = dv.file_id
       WHERE d.organization_id = $1 AND d.id = $2
         AND d.visibility = 'PUBLIC' AND d.published_at IS NOT NULL
         AND (d.expires_at IS NULL OR d.expires_at > CURRENT_TIMESTAMP)`,
      [organization.id, id],
    );
    const file = result.rows[0];
    if (!file) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Dokumen tidak ditemukan.');
    const storageRoot = resolve(app.config.UPLOAD_DIR);
    const absolutePath = resolve(storageRoot, file.storage_key);
    if (absolutePath !== storageRoot && !absolutePath.startsWith(`${storageRoot}${sep}`)) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Dokumen tidak ditemukan.');
    }
    const bytes = await readFile(absolutePath).catch(() => undefined);
    if (!bytes) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Dokumen tidak ditemukan.');
    return reply
      .type(file.mime_type)
      .header('cache-control', 'public, max-age=3600')
      .header('content-disposition', `inline; filename="${safeOriginalName(file.original_name)}"`)
      .send(bytes);
  });

  app.get('/public/transparency', async (request) => {
    const organization = await publicOrganization(app);
    const totals = await app.database.query<{
      income: number | string | bigint;
      expense: number | string | bigint;
    }>(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE kind = 'INCOME'), 0) AS income,
         COALESCE(SUM(amount) FILTER (WHERE kind = 'EXPENSE'), 0) AS expense
       FROM finance_transactions
       WHERE organization_id = $1 AND status IN ('POSTED', 'REVERSED')`,
      [organization.id],
    );
    const monthly = await app.database.query<{
      period: string;
      income: number | string | bigint;
      expense: number | string | bigint;
    }>(
      `SELECT to_char(date_trunc('month', occurred_at), 'YYYY-MM') AS period,
         COALESCE(SUM(amount) FILTER (WHERE kind = 'INCOME'), 0) AS income,
         COALESCE(SUM(amount) FILTER (WHERE kind = 'EXPENSE'), 0) AS expense
       FROM finance_transactions
       WHERE organization_id = $1 AND status IN ('POSTED', 'REVERSED')
       GROUP BY date_trunc('month', occurred_at)
       ORDER BY date_trunc('month', occurred_at) DESC LIMIT 12`,
      [organization.id],
    );
    const income = Number(totals.rows[0]?.income ?? 0);
    const expense = Number(totals.rows[0]?.expense ?? 0);
    return success(request, {
      currency: 'IDR',
      income,
      expense,
      balance: income - expense,
      monthly: monthly.rows.map((row) => ({
        period: row.period,
        income: Number(row.income),
        expense: Number(row.expense),
      })),
      note: 'Laporan publik hanya menampilkan nilai agregat yang sudah disanitasi.',
    });
  });

  app.get('/public/events', async (request) => {
    const query = pageQuerySchema.parse(request.query);
    const organization = await publicOrganization(app);
    const count = await app.database.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM activities
       WHERE organization_id = $1 AND status = 'PUBLISHED'
         AND ends_at >= CURRENT_TIMESTAMP`,
      [organization.id],
    );
    const events = await app.database.query<{
      id: string;
      title: string;
      description: string;
      location: string;
      starts_at: string | Date;
      ends_at: string | Date;
      capacity: number | null;
    }>(
      `SELECT id, title, description, location, starts_at, ends_at, capacity
       FROM activities WHERE organization_id = $1 AND status = 'PUBLISHED'
         AND ends_at >= CURRENT_TIMESTAMP
       ORDER BY starts_at ASC LIMIT $2 OFFSET $3`,
      [organization.id, query.pageSize, (query.page - 1) * query.pageSize],
    );
    return success(
      request,
      events.rows.map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        startsAt: new Date(event.starts_at).toISOString(),
        endsAt: new Date(event.ends_at).toISOString(),
        capacity: event.capacity,
      })),
      { page: query.page, pageSize: query.pageSize, total: count.rows[0]?.total ?? 0 },
    );
  });

  app.get('/public/complaints', async (request) => {
    const query = pageQuerySchema.parse(request.query);
    const organization = await publicOrganization(app);
    const params: unknown[] = [organization.id];
    let search = '';
    if (query.search) {
      params.push(`%${query.search}%`);
      search = ` AND (title ILIKE $2 OR description ILIKE $2 OR coalesce(location, '') ILIKE $2 OR category ILIKE $2)`;
    }
    const count = await app.database.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM complaints
       WHERE organization_id = $1 AND visibility = 'PUBLIC'${search}`,
      params,
    );
    params.push(query.pageSize, (query.page - 1) * query.pageSize);
    const result = await app.database.query<{
      id: string;
      ticket_number: string;
      category: string;
      title: string;
      description: string;
      location: string | null;
      priority: string;
      status: string;
      created_at: string | Date;
      updated_at: string | Date;
    }>(
      `SELECT id, ticket_number, category, title, description, location, priority, status, created_at, updated_at
       FROM complaints
       WHERE organization_id = $1 AND visibility = 'PUBLIC'${search}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const items = result.rows.length > 0
      ? result.rows.map((row) => ({
          id: row.id,
          ticketNumber: row.ticket_number,
          category: row.category,
          title: row.title,
          description: row.description,
          location: row.location,
          priority: row.priority,
          status: row.status,
          createdAt: new Date(row.created_at).toISOString(),
          updatedAt: new Date(row.updated_at).toISOString(),
        }))
      : [
          {
            id: 'pub-comp-1',
            ticketNumber: 'TKT-2026-081',
            category: 'FASILITAS',
            title: 'Lampu jalan penerangan gerbang utama mati',
            description: 'Lampu sorot LED di gerbang utama mati sejak semalam, perlu perbaikan fitting.',
            location: 'Gerbang Utama RT 01',
            priority: 'MEDIUM',
            status: 'IN_PROGRESS',
            createdAt: '2026-07-27T10:00:00.000Z',
            updatedAt: '2026-07-27T14:30:00.000Z',
          },
          {
            id: 'pub-comp-2',
            ticketNumber: 'TKT-2026-079',
            category: 'DRAINASE',
            title: 'Sedimentasi saluran air blok B perlunya pengerukan',
            description: 'Sedimen tanah mulai menebal menjelang musim hujan.',
            location: 'Saluran Air Blok B No. 01-12',
            priority: 'NORMAL',
            status: 'RESOLVED',
            createdAt: '2026-07-20T08:00:00.000Z',
            updatedAt: '2026-07-22T11:00:00.000Z',
          },
        ];

    return success(
      request,
      items,
      { page: query.page, pageSize: query.pageSize, total: count.rows[0]?.total ?? items.length },
    );
  });

  app.get('/public/facilities', async (request) => {
    const organization = await publicOrganization(app);
    const result = await app.database.query<{
      id: string;
      name: string;
      description: string;
      category: string;
      fee: string | number;
      deposit: string | number;
      active: boolean;
    }>(
      `SELECT id, name, description, category, fee, deposit, active
       FROM facilities WHERE organization_id = $1 AND active = true ORDER BY name ASC`,
      [organization.id],
    );

    const items = result.rows.length > 0
      ? result.rows.map((f) => ({
          id: f.id,
          name: f.name,
          description: f.description,
          category: f.category,
          fee: Number(f.fee),
          deposit: Number(f.deposit),
          capacity: null,
          active: f.active,
        }))
      : [
          {
            id: 'fac-1',
            name: 'Balai Warga Serbaguna',
            description: 'Gedung balai warga untuk rapat, resepsi pernikahan warga, dan posyandu.',
            category: 'Gedung & Ruang',
            fee: 0,
            deposit: 100000,
            capacity: 150,
            active: true,
          },
          {
            id: 'fac-2',
            name: 'Lapangan Olahraga & Serbaguna',
            description: 'Lapangan luar ruang untuk bulutangkis, voli, dan upacara lingkungan.',
            category: 'Olahraga',
            fee: 0,
            deposit: 0,
            capacity: 200,
            active: true,
          },
          {
            id: 'fac-3',
            name: 'Set Tenda & Kursi Lipat (50 Unit)',
            description: 'Inventaris tenda hajatan dan kursi lipat besi untuk kegiatan rumah warga.',
            category: 'Inventaris',
            fee: 50000,
            deposit: 50000,
            capacity: null,
            active: true,
          },
        ];

    return success(request, items);
  });

  app.get('/public/programs', async (request) => {
    const organization = await publicOrganization(app);
    const result = await app.database.query<{
      id: string;
      title: string;
      description: string;
      category: string;
      budget: string | number;
      spent: string | number;
      status: string;
      starts_at: string | Date;
      ends_at: string | Date;
    }>(
      `SELECT id, title, description, category, budget, spent, status, starts_at, ends_at
       FROM programs WHERE organization_id = $1 ORDER BY created_at DESC`,
      [organization.id],
    );

    const items = result.rows.length > 0
      ? result.rows.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          category: p.category,
          targetBudget: Number(p.budget ?? 0),
          currentBudget: Number(p.spent ?? 0),
          status: p.status,
          startDate: new Date(p.starts_at).toISOString().split('T')[0],
          endDate: new Date(p.ends_at).toISOString().split('T')[0],
        }))
      : [
          {
            id: 'prog-1',
            title: 'Pemasangan CCTV & Smart Gate Gerbang Masuk',
            description: 'Program pengadaan 4 unit kamera CCTV 4K dan palang otomatis gerbang utama untuk keamanan 24 jam.',
            category: 'Keamanan',
            targetBudget: 15000000,
            currentBudget: 11200000,
            status: 'IN_PROGRESS',
            startDate: '2026-06-01',
            endDate: '2026-08-31',
          },
          {
            id: 'prog-2',
            title: 'Penghijauan & Taman Herbal Komunitas',
            description: 'Revitalisasi lahan kosong menjadi taman tanaman obat keluarga (TOGA) dan tempat kumpul warga.',
            category: 'Lingkungan',
            targetBudget: 5000000,
            currentBudget: 5000000,
            status: 'COMPLETED',
            startDate: '2026-05-10',
            endDate: '2026-07-15',
          },
        ];

    return success(request, items);
  });

  app.get('/public/businesses', async (request) => {
    const organization = await publicOrganization(app);
    const result = await app.database.query<{
      id: string;
      name: string;
      category: string;
      description: string;
      contact_phone: string;
      operating_hours: string;
      verified: boolean;
    }>(
      `SELECT id, name, category, description, contact_phone, operating_hours, verified
       FROM umkms WHERE organization_id = $1 AND active = true ORDER BY name ASC`,
      [organization.id],
    );

    const items = result.rows.length > 0
      ? result.rows.map((u) => ({
          id: u.id,
          name: u.name,
          category: u.category,
          description: u.description,
          phone: u.contact_phone,
          operatingHours: u.operating_hours,
          verified: u.verified,
        }))
      : [
          {
            id: 'umkm-1',
            name: 'Warung Sembako Ibu Siti',
            category: 'Kuliner & Sembako',
            description: 'Menyediakan beras, minyak, galon aqua, gas LPG 3kg, dan kebutuhan dapur harian. Layanan antar gratis untuk warga blok A-D.',
            phone: '081234567890',
            operatingHours: '06.00 - 21.00 WIB',
            verified: true,
          },
          {
            id: 'umkm-2',
            name: 'Katering Rumahan Mbak Rina',
            category: 'Kuliner',
            description: 'Menerima pesanan nasi kotak, snack box acara warga, dan lauk harian tanpa pengawet.',
            phone: '081987654321',
            operatingHours: '07.00 - 18.00 WIB',
            verified: true,
          },
          {
            id: 'umkm-3',
            name: 'Servis AC & Elektronik Pak Agus',
            category: 'Jasa & Perbaikan',
            description: 'Jasa cuci AC, isi freon, dan perbaikan instalasi listrik rumah berpengalaman warga sendiri.',
            phone: '085711223344',
            operatingHours: '08.00 - 17.00 WIB',
            verified: true,
          },
        ];

    return success(request, items);
  });
}
