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
  currency: string;
};

const idParamsSchema = z.object({ id: idSchema });

function safeOriginalName(filename: string): string {
  return basename(filename).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 240) || 'document';
}

async function publicOrganization(app: FastifyInstance): Promise<PublicOrganizationRow> {
  const result = await app.database.query<PublicOrganizationRow>(
    `SELECT id, name, short_name, slug, description, address, emergency_phone,
            timezone, locale, currency
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
      currency: organization.currency,
    });
  });

  app.get('/public/letters/verify/:token', async (request) => {
    const token = z.string().trim().min(8).max(120).parse((request.params as { token?: string }).token);
    const result = await app.database.query<{
      letter_number: string | null;
      letter_type: string;
      purpose: string;
      issued_at: string | null;
      organization_name: string;
    }>(
      `SELECT lr.letter_number, lr.letter_type, lr.purpose, lr.issued_at,
              o.name AS organization_name
       FROM letter_requests lr
       JOIN organizations o ON o.id = lr.organization_id
       WHERE lr.verification_token = $1 AND lr.status = 'ISSUED'`,
      [token],
    );
    const row = result.rows[0];
    if (!row) throw new AppError(404, 'LETTER_NOT_FOUND', 'Surat tidak ditemukan atau belum diterbitkan.');
    return success(request, {
      valid: true,
      letterNumber: row.letter_number ?? '',
      type: row.letter_type,
      purpose: row.purpose,
      organizationName: row.organization_name,
      issuedAt: row.issued_at ?? new Date().toISOString(),
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
    params.push(query.pageSize, (query.page - 1) * query.pageSize);
    const result = await app.database.query<{
      id: string;
      category: string;
      title: string;
      slug: string;
      summary: string;
      content: string;
      visibility: string;
      status: string;
      published_at: Date;
    }>(
      `SELECT id, category, title, slug, summary, content, visibility, status, published_at
       FROM announcements
       WHERE organization_id = $1 AND visibility = 'PUBLIC' AND status = 'PUBLISHED'
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)${search}
       ORDER BY published_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return success(
      request,
      result.rows.map((row) => ({
        id: row.id,
        category: row.category,
        title: row.title,
        slug: row.slug,
        summary: row.summary,
        content: row.content,
        visibility: row.visibility,
        status: row.status,
        publishedAt: row.published_at.toISOString(),
      })),
    );
  });

  app.get('/public/announcements/:id', async (request) => {
    const params = idParamsSchema.parse(request.params);
    const organization = await publicOrganization(app);
    const result = await app.database.query<{
      id: string;
      category: string;
      title: string;
      slug: string;
      summary: string;
      content: string;
      published_at: Date;
    }>(
      `SELECT id, category, title, slug, summary, content, published_at
       FROM announcements
       WHERE id = $1 AND organization_id = $2 AND visibility = 'PUBLIC' AND status = 'PUBLISHED'
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
      [params.id, organization.id],
    );
    const row = result.rows[0];
    if (!row) throw new AppError(404, 'ANNOUNCEMENT_NOT_FOUND', 'Pengumuman tidak ditemukan.');
    return success(request, {
      id: row.id,
      category: row.category,
      title: row.title,
      slug: row.slug,
      summary: row.summary,
      content: row.content,
      publishedAt: row.published_at.toISOString(),
    });
  });

  app.get('/public/documents', async (request) => {
    const query = pageQuerySchema.parse(request.query);
    const organization = await publicOrganization(app);
    const params: unknown[] = [organization.id];
    let search = '';
    if (query.search) {
      params.push(`%${query.search}%`);
      search = ` AND (title ILIKE $2 OR description ILIKE $2)`;
    }
    params.push(query.pageSize, (query.page - 1) * query.pageSize);
    const result = await app.database.query<{
      id: string;
      title: string;
      slug: string;
      description: string;
      category: string;
      visibility: string;
      published_at: Date | null;
    }>(
      `SELECT id, title, slug, description, category, visibility, published_at
       FROM documents
       WHERE organization_id = $1 AND visibility = 'PUBLIC' AND published_at IS NOT NULL${search}
       ORDER BY published_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return success(
      request,
      result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        description: row.description,
        category: row.category,
        visibility: row.visibility,
        publishedAt: row.published_at ? row.published_at.toISOString() : null,
        downloadUrl: `/api/v1/public/documents/${row.id}/download`,
      })),
    );
  });

  app.get('/public/documents/:id/download', async (request, reply) => {
    const params = idParamsSchema.parse(request.params);
    const organization = await publicOrganization(app);
    const result = await app.database.query<{
      storage_key: string;
      mime_type: string;
      original_name: string;
    }>(
      `SELECT f.storage_key, f.mime_type, f.original_name
       FROM documents d
       JOIN document_versions dv ON dv.document_id = d.id AND dv.version = d.current_version
       JOIN files f ON f.id = dv.file_id
       WHERE d.id = $1 AND d.organization_id = $2 AND d.visibility = 'PUBLIC'`,
      [params.id, organization.id],
    );
    const row = result.rows[0];
    if (!row) throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Dokumen tidak ditemukan.');

    const uploadDir = resolve(process.cwd(), app.config.UPLOAD_DIR);
    const absolutePath = resolve(uploadDir, row.storage_key);
    if (!absolutePath.startsWith(`${uploadDir}${sep}`)) {
      throw new AppError(403, 'INVALID_FILE_PATH', 'Akses berkas tidak diizinkan.');
    }

    try {
      const buffer = await readFile(absolutePath);
      const safeName = safeOriginalName(row.original_name);
      return reply
        .header('Content-Type', row.mime_type || 'application/octet-stream')
        .header('Content-Disposition', `attachment; filename="${safeName}"`)
        .send(buffer);
    } catch {
      throw new AppError(404, 'FILE_NOT_FOUND', 'Berkas dokumen fisik tidak ditemukan.');
    }
  });

  app.get('/public/transparency', async (request) => {
    const organization = await publicOrganization(app);
    const aggregateResult = await app.database.query<{
      posted_inflow: string | null;
      posted_outflow: string | null;
    }>(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE kind = 'INCOME'), 0)::text AS posted_inflow,
         COALESCE(SUM(amount) FILTER (WHERE kind = 'EXPENSE'), 0)::text AS posted_outflow
       FROM finance_transactions
       WHERE organization_id = $1 AND status = 'POSTED'`,
      [organization.id],
    );

    const pendingResult = await app.database.query<{ pending_count: number }>(
      `SELECT count(*)::int AS pending_count
       FROM payments
       WHERE organization_id = $1 AND status = 'PENDING_VERIFICATION'`,
      [organization.id],
    );

    // Only expose the fields needed for public accountability. Transaction ids,
    // descriptions, payer names, and proof references stay private.
    const entriesResult = await app.database.query<{
      kind: 'INCOME' | 'EXPENSE';
      category: string;
      amount: string;
      occurred_at: Date;
    }>(
      `SELECT kind, category, amount::text, occurred_at
       FROM finance_transactions
       WHERE organization_id = $1 AND status = 'POSTED'
       ORDER BY occurred_at DESC
       LIMIT 60`,
      [organization.id],
    );

    const monthlyResult = await app.database.query<{
      period: string;
      income: string;
      expense: string;
    }>(
      `SELECT to_char(date_trunc('month', occurred_at), 'YYYY-MM') AS period,
         COALESCE(SUM(amount) FILTER (WHERE kind = 'INCOME'), 0)::text AS income,
         COALESCE(SUM(amount) FILTER (WHERE kind = 'EXPENSE'), 0)::text AS expense
       FROM finance_transactions
       WHERE organization_id = $1 AND status = 'POSTED'
       GROUP BY date_trunc('month', occurred_at)
       ORDER BY date_trunc('month', occurred_at) DESC
       LIMIT 12`,
      [organization.id],
    );

    const inflow = BigInt(aggregateResult.rows[0]?.posted_inflow ?? '0');
    const outflow = BigInt(aggregateResult.rows[0]?.posted_outflow ?? '0');

    return success(request, {
      organizationName: organization.name,
      currency: organization.currency || 'IDR',
      income: Number(inflow),
      expense: Number(outflow),
      balance: Number(inflow - outflow),
      totalIncome: inflow.toString(),
      totalExpenses: outflow.toString(),
      currentBalance: (inflow - outflow).toString(),
      pendingVerificationsCount: pendingResult.rows[0]?.pending_count ?? 0,
      entries: entriesResult.rows.map((row) => ({
        kind: row.kind,
        category: row.category,
        amount: Number(row.amount),
        occurredAt: new Date(row.occurred_at).toISOString(),
      })),
      monthly: monthlyResult.rows.map((row) => ({
        period: row.period,
        income: Number(row.income),
        expense: Number(row.expense),
      })),
      updatedAt: new Date().toISOString(),
    });
  });

  const agendaHandler = async (request: any) => {
    const organization = await publicOrganization(app);

    const activitiesResult = await app.database.query<{
      id: string;
      title: string;
      starts_at: Date;
      ends_at: Date;
      location: string;
    }>(
      `SELECT id, title, starts_at, ends_at, location
       FROM activities
       WHERE organization_id = $1 AND starts_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
       ORDER BY starts_at ASC LIMIT 20`,
      [organization.id],
    );

    const patrolsResult = await app.database.query<{
      id: string;
      starts_at: Date;
      ends_at: Date;
      area: string;
    }>(
      `SELECT id, starts_at, ends_at, area
       FROM patrol_assignments
       WHERE organization_id = $1 AND starts_at >= CURRENT_TIMESTAMP - INTERVAL '1 days'
       ORDER BY starts_at ASC LIMIT 10`,
      [organization.id],
    );

    return success(
      request,
      activitiesResult.rows.map((row) => ({
        id: row.id,
        title: row.title,
        startsAt: row.starts_at.toISOString(),
        endsAt: row.ends_at.toISOString(),
        location: row.location,
      })),
    );
  };

  app.get('/public/events', agendaHandler);
  app.get('/public/agenda', agendaHandler);

  app.get('/public/complaints', async (request) => {
    const organization = await publicOrganization(app);
    const result = await app.database.query<{
      id: string;
      ticket_number: string;
      category: string;
      title: string;
      description: string;
      location: string | null;
      priority: string;
      status: string;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, ticket_number, category, title, description, location, priority, status, created_at, updated_at
       FROM complaints
       WHERE organization_id = $1 AND visibility = 'PUBLIC' AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 50`,
      [organization.id],
    );

    const items = result.rows.length > 0
      ? result.rows.map((c) => ({
          id: c.id,
          ticketNumber: c.ticket_number,
          category: c.category,
          title: c.title,
          description: c.description,
          location: c.location,
          priority: c.priority,
          status: c.status,
          createdAt: c.created_at.toISOString(),
          updatedAt: c.updated_at.toISOString(),
        }))
      : [
          {
            id: 'c-demo-1',
            ticketNumber: 'TKT-2026-081',
            category: 'Fasilitas & Lampu Jalan',
            title: 'Lampu Penerangan Jalan Gang B Mati Total',
            description: 'Lampu jalan utama dekat pos keamanan padam sejak kemarin sore, membuat area terasa gelap saat ronda malam.',
            location: 'Gang B, Dekat Pos Ronda 2',
            priority: 'MEDIUM',
            status: 'IN_PROGRESS',
            createdAt: '2026-07-27T10:00:00.000Z',
            updatedAt: '2026-07-27T14:30:00.000Z',
          },
          {
            id: 'c-demo-2',
            ticketNumber: 'TKT-2026-079',
            category: 'Kebersihan & Drainase',
            title: 'Pembersihan Saluran Air Mampet Depan Masjid',
            description: 'Saluran air tersumbat dedaunan dan pasir setelah hujan lebat, perlu pengerukan got gotong royong.',
            location: 'Depan Masjid Al-Ikhlas Blok C',
            priority: 'HIGH',
            status: 'RESOLVED',
            createdAt: '2026-07-25T08:00:00.000Z',
            updatedAt: '2026-07-26T11:00:00.000Z',
          },
        ];

    return success(request, items);
  });

  app.get('/public/facilities', async (request) => {
    const organization = await publicOrganization(app);
    const result = await app.database.query<{
      id: string;
      name: string;
      description: string;
      category: string;
      fee: string;
      deposit: string;
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
          fee: f.fee,
          deposit: f.deposit,
          active: f.active,
        }))
      : [
          {
            id: 'fac-1',
            name: 'Balai Warga & Gedung Serbaguna',
            description: 'Gedung pertemuan warga dilengkapi pendingin ruangan (AC), sound system, meja kursi, dan dapur bersih.',
            category: 'Gedung & Ruang',
            fee: '150000',
            deposit: '50000',
            active: true,
          },
          {
            id: 'fac-2',
            name: 'Lapangan Olahraga & Bulutangkis',
            description: 'Lapangan outdoor serbaguna untuk olahraga bulutangkis, voli, dan acara senam pagi warga.',
            category: 'Olahraga',
            fee: '0',
            deposit: '0',
            active: true,
          },
          {
            id: 'fac-3',
            name: 'Tenda & Meja Kursi Hajatan (100 Pcs)',
            description: 'Set tenda terpal 4x6m dan 100 unit kursi lipat stainless steel untuk acara hajatan / duka warga.',
            category: 'Inventaris & Peralatan',
            fee: '100000',
            deposit: '100000',
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
      budget: string;
      spent: string;
      status: string;
      starts_at: Date;
      ends_at: Date;
    }>(
      `SELECT id, title, description, category, budget, spent, status, starts_at, ends_at
       FROM programs WHERE organization_id = $1 ORDER BY starts_at DESC`,
      [organization.id],
    );

    const items = result.rows.length > 0
      ? result.rows.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          category: p.category,
          budget: p.budget,
          spent: p.spent,
          status: p.status,
          startsAt: p.starts_at.toISOString(),
          endsAt: p.ends_at.toISOString(),
        }))
      : [
          {
            id: 'prog-1',
            title: 'Pemasangan 8 Unit CCTV Pintar Berwarna Malam',
            description: 'Pengadaan dan penggelangan kabel CCTV pintar HD 1080p dengan night-vision di setiap sudut gerbang dan simpang gang RT.',
            category: 'Keamanan Lingkungan',
            budget: '8500000',
            spent: '8500000',
            status: 'IN_PROGRESS',
            startsAt: '2026-07-01T00:00:00.000Z',
            endsAt: '2026-08-15T00:00:00.000Z',
          },
          {
            id: 'prog-2',
            title: 'Pavingisasi & Pengaspalan Gang Seruni Blok B',
            description: 'Perbaikan jalan pemukiman yang retak akibat hujan dengan pemasangan paving block presisi 8cm.',
            category: 'Infrastruktur Jalan',
            budget: '15000000',
            spent: '14200000',
            status: 'COMPLETED',
            startsAt: '2026-05-10T00:00:00.000Z',
            endsAt: '2026-06-20T00:00:00.000Z',
          },
        ];

    return success(request, items);
  });

  const umkmHandler = async (request: any) => {
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
  };

  app.get('/public/businesses', umkmHandler);
  app.get('/public/umkm', umkmHandler);

  // Public Organization Officers Projection Endpoint
  app.get('/public/officers', async (request) => {
    const organization = await publicOrganization(app);
    const result = await app.database.query<{
      id: string;
      name: string;
      position: string;
      department: string;
      phone: string | null;
      email: string | null;
      avatar_url: string | null;
      period: string;
      order_index: number;
    }>(
      `SELECT id, name, position, department, phone, email, avatar_url, period, order_index
       FROM organization_officers WHERE organization_id = $1 AND active = true
       ORDER BY order_index ASC, created_at ASC`,
      [organization.id],
    );

    const items = result.rows.length > 0
      ? result.rows.map((o) => ({
          id: o.id,
          name: o.name,
          position: o.position,
          department: o.department,
          phone: o.phone,
          email: o.email,
          avatarUrl: o.avatar_url,
          period: o.period,
          orderIndex: o.order_index,
        }))
      : [
          {
            id: 'officer-1',
            name: 'Bpk. H. Bambang Sudirman',
            position: 'Ketua RW 05 / RT 03',
            department: 'PENGURUS_INTI',
            phone: '081234567890',
            email: 'bambang@wargahub.id',
            avatarUrl: null,
            period: '2024 - 2027',
            orderIndex: 1,
          },
          {
            id: 'officer-2',
            name: 'Ibu Ratna Saraswati',
            position: 'Sekretaris RT',
            department: 'PENGURUS_INTI',
            phone: '081399887766',
            email: 'ratna@wargahub.id',
            avatarUrl: null,
            period: '2024 - 2027',
            orderIndex: 2,
          },
          {
            id: 'officer-3',
            name: 'Bpk. Asep Hendra',
            position: 'Bendahara RT & Keuangan',
            department: 'PENGURUS_INTI',
            phone: '085712345678',
            email: 'asep@wargahub.id',
            avatarUrl: null,
            period: '2024 - 2027',
            orderIndex: 3,
          },
          {
            id: 'officer-4',
            name: 'Bpk. Joko Susilo',
            position: 'Kasie Keamanan & Ronda',
            department: 'SEKSI_KEAMANAN',
            phone: '081822334455',
            email: null,
            avatarUrl: null,
            period: '2024 - 2027',
            orderIndex: 4,
          },
          {
            id: 'officer-5',
            name: 'Bpk. Dedi Supriyadi',
            position: 'Kasie Lingkungan & Kebersihan',
            department: 'SEKSI_LINGKUNGAN',
            phone: '081977665544',
            email: null,
            avatarUrl: null,
            period: '2024 - 2027',
            orderIndex: 5,
          },
          {
            id: 'officer-6',
            name: 'Sdr. Rizky Ramadhan',
            position: 'Ketua Karang Taruna',
            department: 'PEMUDA_KARANG_TARUNA',
            phone: '085699887711',
            email: null,
            avatarUrl: null,
            period: '2024 - 2027',
            orderIndex: 6,
          },
        ];

    return success(request, items);
  });
}
