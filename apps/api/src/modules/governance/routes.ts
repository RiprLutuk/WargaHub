import {
  letterRequestCreateSchema,
  letterRequestStatusSchema,
  pollCreateSchema,
  pollVoteSchema,
  programCreateSchema,
} from '@wargahub/contracts';
import type { FastifyInstance } from 'fastify';
import { AppError, success } from '../../lib/http.js';

const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;

export async function governanceRoutes(app: FastifyInstance): Promise<void> {
  // --- 1. POLLS & VOTING (PRD 12.11) ---
  app.get(
    '/polls',
    { preHandler: app.requirePermission('voting.read') },
    async (request) => {
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const polls = await app.database.query<{
        id: string;
        title: string;
        description: string;
        category: string;
        ballot_type: string;
        anonymous: boolean;
        quorum_percentage: number;
        status: string;
        starts_at: string;
        ends_at: string;
      }>(
        `SELECT id, title, description, category, ballot_type, anonymous, quorum_percentage, status, starts_at, ends_at
         FROM polls WHERE organization_id = $1 ORDER BY created_at DESC`,
        [request.auth.organizationId],
      );

      return success(request, polls.rows.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.category,
        ballotType: p.ballot_type,
        anonymous: p.anonymous,
        quorumPercentage: p.quorum_percentage,
        status: p.status,
        startsAt: p.starts_at,
        endsAt: p.ends_at,
      })));
    },
  );

  app.post(
    '/polls',
    { preHandler: app.requirePermission('voting.manage') },
    async (request, reply) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const body = pollCreateSchema.parse(request.body);
      const pollId = newId('poll');

      await app.database.transaction(async (tx) => {
        await tx.query(
          `INSERT INTO polls (id, organization_id, creator_id, title, description, category, ballot_type, anonymous, quorum_percentage, status, ends_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE', $10)`,
          [
            pollId,
            request.auth!.organizationId,
            request.auth!.id,
            body.title,
            body.description,
            body.category,
            body.ballotType,
            body.anonymous,
            body.quorumPercentage,
            body.endsAt,
          ],
        );

        for (const opt of body.options) {
          const optionId = newId('popt');
          await tx.query(
            `INSERT INTO poll_options (id, organization_id, poll_id, label, description)
             VALUES ($1, $2, $3, $4, $5)`,
            [optionId, request.auth!.organizationId, pollId, opt.label, opt.description ?? null],
          );
        }
      });

      return reply.status(201).send(success(request, { id: pollId, title: body.title, status: 'ACTIVE' }));
    },
  );

  app.post(
    '/polls/:id/vote',
    { preHandler: app.requirePermission('voting.cast') },
    async (request) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const { id } = request.params as { id: string };
      const body = pollVoteSchema.parse(request.body);

      const pollRes = await app.database.query<{ id: string; status: string; ends_at: string }>(
        `SELECT id, status, ends_at FROM polls WHERE organization_id = $1 AND id = $2`,
        [request.auth.organizationId, id],
      );
      const poll = pollRes.rows[0];
      if (!poll || poll.status !== 'ACTIVE') {
        throw new AppError(404, 'POLL_NOT_FOUND', 'Polling tidak aktif atau tidak ditemukan.');
      }

      const existing = await app.database.query<{ id: string }>(
        `SELECT id FROM poll_votes WHERE organization_id = $1 AND poll_id = $2 AND user_id = $3`,
        [request.auth.organizationId, id, request.auth.id],
      );
      if (existing.rows.length > 0) {
        throw new AppError(409, 'ALREADY_VOTED', 'Anda sudah memberikan suara pada polling ini.');
      }

      await app.database.transaction(async (tx) => {
        const voteId = newId('vote');
        await tx.query(
          `INSERT INTO poll_votes (id, organization_id, poll_id, option_id, user_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [voteId, request.auth!.organizationId, id, body.optionId, request.auth!.id],
        );
        await tx.query(
          `UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = $1 AND poll_id = $2`,
          [body.optionId, id],
        );
      });

      return success(request, { voted: true });
    },
  );

  // --- 2. SURAT & ADMINISTRASI (PRD 12.12) ---
  app.get(
    '/letters',
    { preHandler: app.requirePermission('letter.request') },
    async (request) => {
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const isManager = request.auth.permissions.includes('letter.manage');
      const query = isManager
        ? `SELECT id, applicant_id, letter_type, purpose, status, letter_number, verification_token, issued_at, created_at FROM letter_requests WHERE organization_id = $1 ORDER BY created_at DESC`
        : `SELECT id, applicant_id, letter_type, purpose, status, letter_number, verification_token, issued_at, created_at FROM letter_requests WHERE organization_id = $1 AND applicant_id = $2 ORDER BY created_at DESC`;
      const params = isManager ? [request.auth.organizationId] : [request.auth.organizationId, request.auth.id];

      const res = await app.database.query<{
        id: string;
        applicant_id: string;
        letter_type: string;
        purpose: string;
        status: string;
        letter_number: string | null;
        verification_token: string;
        issued_at: string | null;
        created_at: string;
      }>(query, params);

      return success(request, res.rows.map((row) => ({
        id: row.id,
        applicantId: row.applicant_id,
        letterType: row.letter_type,
        purpose: row.purpose,
        status: row.status,
        letterNumber: row.letter_number,
        verificationToken: row.status === 'ISSUED' ? row.verification_token : null,
        issuedAt: row.issued_at,
        createdAt: row.created_at,
      })));
    },
  );

  app.post(
    '/letters',
    { preHandler: app.requirePermission('letter.request') },
    async (request, reply) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const body = letterRequestCreateSchema.parse(request.body);
      const letterId = newId('ltr');
      const token = `WRG-LTR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      await app.database.query(
        `INSERT INTO letter_requests (id, organization_id, applicant_id, household_id, letter_type, purpose, fields, attachment_file_id, verification_token)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          letterId,
          request.auth.organizationId,
          request.auth.id,
          body.householdId,
          body.letterType,
          body.purpose,
          JSON.stringify(body.fields),
          body.attachmentFileId ?? null,
          token,
        ],
      );

      return reply.status(201).send(success(request, { id: letterId, status: 'SUBMITTED', verificationToken: token }));
    },
  );

  app.post(
    '/letters/:id/status',
    { preHandler: app.requirePermission('letter.manage') },
    async (request) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const { id } = request.params as { id: string };
      const body = letterRequestStatusSchema.parse(request.body);

      const letterRes = await app.database.query<{ id: string }>(
        `SELECT id FROM letter_requests WHERE organization_id = $1 AND id = $2`,
        [request.auth.organizationId, id],
      );
      if (!letterRes.rows[0]) throw new AppError(404, 'LETTER_NOT_FOUND', 'Permohonan surat tidak ditemukan.');

      await app.database.query(
        `UPDATE letter_requests
         SET status = $1, rejection_reason = $2, letter_number = $3, issued_by = $4, issued_at = CURRENT_TIMESTAMP
         WHERE id = $5 AND organization_id = $6`,
        [
          body.status,
          body.rejectionReason ?? null,
          body.letterNumber ?? (body.status === 'ISSUED' ? `SURAT/${Date.now().toString().slice(-6)}` : null),
          request.auth.id,
          id,
          request.auth.organizationId,
        ],
      );

      return success(request, { id, status: body.status });
    },
  );

  // --- 3. PROGRAM & PROYEK LINGKUNGAN (PRD 12.9) ---
  app.get(
    '/programs',
    { preHandler: app.requirePermission('program.read') },
    async (request) => {
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const res = await app.database.query<{
        id: string;
        title: string;
        description: string;
        category: string;
        budget: string | number;
        spent: string | number;
        status: string;
        starts_at: string;
        ends_at: string;
      }>(
        `SELECT id, title, description, category, budget, spent, status, starts_at, ends_at
         FROM programs WHERE organization_id = $1 ORDER BY created_at DESC`,
        [request.auth.organizationId],
      );

      return success(request, res.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        budget: Number(row.budget),
        spent: Number(row.spent),
        status: row.status,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
      })));
    },
  );

  app.post(
    '/programs',
    { preHandler: app.requirePermission('program.manage') },
    async (request, reply) => {
      app.requireCsrf(request);
      if (!request.auth) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk.');
      const body = programCreateSchema.parse(request.body);
      const programId = newId('prog');

      await app.database.query(
        `INSERT INTO programs (id, organization_id, pic_id, title, description, category, budget, starts_at, ends_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          programId,
          request.auth.organizationId,
          request.auth.id,
          body.title,
          body.description,
          body.category,
          body.budget,
          body.startsAt,
          body.endsAt,
        ],
      );

      return reply.status(201).send(success(request, { id: programId, title: body.title, status: 'PLANNED' }));
    },
  );
}
