import { z } from 'zod';

export const idSchema = z.string().min(10).max(40);
export const isoDateSchema = z.string().datetime({ offset: true });
export const moneySchema = z.number().int().nonnegative().max(9_007_199_254_740_991);
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
});

export const roleSchema = z.enum([
  'SUPER_ADMIN',
  'ADMIN_ORGANIZATION',
  'CHAIR_RW',
  'CHAIR_RT',
  'SECRETARY',
  'TREASURER',
  'SECURITY_COORDINATOR',
  'CLEANLINESS_COORDINATOR',
  'ACTIVITY_COORDINATOR',
  'OFFICER',
  'AUDITOR',
  'RESIDENT',
  'HOMEOWNER',
  'TENANT',
  'FAMILY_GUARDIAN',
  'VENDOR',
  'VERIFIED_GUEST',
]);
export type Role = z.infer<typeof roleSchema>;

export const permissions = [
  'organization.read',
  'organization.update',
  'resident.read',
  'resident.create',
  'resident.update',
  'resident.export',
  'announcement.read',
  'announcement.create',
  'announcement.publish',
  'billing.read',
  'billing.create',
  'billing.update',
  'billing.reconcile',
  'finance.read',
  'finance.create',
  'finance.review',
  'finance.report.publish',
  'complaint.read',
  'complaint.assign',
  'complaint.resolve',
  'activity.read',
  'activity.manage',
  'patrol.schedule.read',
  'patrol.schedule.manage',
  'patrol.swap.approve',
  'document.read',
  'document.manage',
  'notification.read',
  'audit_log.read',
  'settings.manage',
  'voting.read',
  'voting.manage',
  'voting.cast',
  'letter.request',
  'letter.manage',
  'letter.issue',
  'program.read',
  'program.manage',
  'facility.read',
  'facility.manage',
  'facility.reserve',
  'vehicle.manage',
  'guest.manage',
  'umkm.read',
  'umkm.manage',
  'social_aid.manage',
  'lost_found.read',
  'lost_found.manage',
] as const;
export type Permission = (typeof permissions)[number];
export const permissionSchema = z.enum(permissions);

const loginPasswordSchema = z.string().min(8).max(128);
export const loginSchema = z.union([
  z.object({
    email: z.string().trim().toLowerCase().email().max(254),
    phone: z.never().optional(),
    password: loginPasswordSchema,
  }),
  z.object({
    phone: z.string().trim().regex(/^\+?[1-9]\d{7,14}$/),
    email: z.never().optional(),
    password: loginPasswordSchema,
  }),
]);

export const safeUserSchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  householdIds: z.array(idSchema),
  email: z.string().email(),
  name: z.string(),
  roles: z.array(roleSchema),
  permissions: z.array(permissionSchema),
});
export type SafeUser = z.infer<typeof safeUserSchema>;

export const organizationUpdateSchema = z.object({
  name: z.string().trim().min(3).max(120),
  shortName: z.string().trim().min(2).max(30),
  description: z.string().trim().min(10).max(1000),
  address: z.string().trim().min(5).max(300),
  emergencyPhone: z.string().trim().min(3).max(30),
  timezone: z.string().default('Asia/Jakarta'),
  locale: z.literal('id-ID').default('id-ID'),
});

export const householdCreateSchema = z.object({
  code: z.string().trim().min(2).max(30),
  address: z.string().trim().min(5).max(300),
  rw: z.string().trim().min(1).max(5),
  rt: z.string().trim().min(1).max(5),
  block: z.string().trim().max(30).optional(),
  occupancyStatus: z.enum(['OCCUPIED', 'EMPTY']).default('OCCUPIED'),
  ownershipStatus: z.enum(['OWNER_OCCUPIED', 'RENTED', 'OTHER']),
});

export const residentCreateSchema = z.object({
  householdId: idSchema,
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().min(8).max(30).optional(),
  relationship: z.enum(['HEAD', 'SPOUSE', 'CHILD', 'PARENT', 'RELATIVE', 'TENANT', 'OTHER']),
  participationPreferences: z.array(z.string().trim().min(2).max(60)).max(12).default([]),
});

export const announcementStatusSchema = z.enum([
  'DRAFT',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED',
]);
export const announcementCreateSchema = z.object({
  category: z.enum([
    'DARURAT',
    'KEAMANAN',
    'AIR_LISTRIK',
    'SAMPAH',
    'KEUANGAN',
    'KEGIATAN',
    'FASILITAS',
    'ADMINISTRASI',
    'KEHILANGAN',
    'KEMATIAN',
    'SOSIAL',
    'UMUM',
  ]),
  title: z.string().trim().min(4).max(180),
  summary: z.string().trim().min(10).max(240),
  content: z.string().trim().min(20).max(20_000),
  visibility: z.enum(['PUBLIC', 'RESIDENT']),
  urgency: z.enum(['NORMAL', 'IMPORTANT', 'EMERGENCY']).default('NORMAL'),
  publishAt: isoDateSchema.optional(),
  expiresAt: isoDateSchema.optional(),
  pinned: z.boolean().default(false),
});

export const billStatusSchema = z.enum(['OPEN', 'PARTIALLY_PAID', 'PAID', 'WAIVED', 'VOID']);
export const billCreateSchema = z.object({
  householdId: idSchema,
  title: z.string().trim().min(4).max(160),
  description: z.string().trim().min(10).max(1000),
  period: z.string().trim().min(4).max(30),
  dueAt: isoDateSchema,
  amount: moneySchema.positive(),
  kind: z.enum(['MANDATORY', 'VOLUNTARY', 'DONATION']).default('MANDATORY'),
  recurrence: z.enum(['ONE_TIME', 'MONTHLY']).default('ONE_TIME'),
});

export const paymentStatusSchema = z.enum([
  'PENDING_VERIFICATION',
  'PAID',
  'REJECTED',
]);
export const paymentCreateSchema = z.object({
  amount: moneySchema.positive(),
  method: z.enum(['BANK_TRANSFER', 'CASH']),
  proofFileId: idSchema.optional(),
  note: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().trim().min(8).max(100),
});

export const financeTransactionCreateSchema = z.object({
  kind: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().min(5).max(500),
  amount: moneySchema.positive(),
  occurredAt: isoDateSchema,
  proofFileId: idSchema.optional(),
});

export const complaintStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'VERIFIED',
  'ASSIGNED',
  'IN_PROGRESS',
  'WAITING_FOR_REPORTER',
  'WAITING_FOR_VENDOR',
  'RESOLVED',
  'REJECTED',
  'CLOSED',
]);
export type ComplaintStatus = z.infer<typeof complaintStatusSchema>;
export const complaintCreateSchema = z.object({
  category: z.string().trim().min(2).max(60),
  title: z.string().trim().min(4).max(120),
  description: z.string().trim().min(10).max(5000),
  visibility: z.enum(['PRIVATE', 'PUBLIC']).default('PRIVATE'),
  location: z.string().trim().max(240).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
});

export const contributionTypeSchema = z.enum([
  'HADIR',
  'KONSUMSI',
  'ALAT',
  'DANA',
  'ADMINISTRASI',
  'DOKUMENTASI',
  'JARAK_JAUH',
  'DISPENSASI',
]);
export const activityCreateSchema = z.object({
  title: z.string().trim().min(4).max(160),
  description: z.string().trim().min(10).max(3000),
  location: z.string().trim().min(2).max(240),
  startsAt: isoDateSchema,
  endsAt: isoDateSchema,
  capacity: z.number().int().positive().max(10_000).optional(),
  needs: z.array(z.object({ type: contributionTypeSchema, target: z.number().int().positive() })).min(1),
});

export const activityResponseSchema = z.object({
  contributionType: contributionTypeSchema,
  quantity: z.number().int().positive().default(1),
  note: z.string().trim().max(500).optional(),
});

export const patrolAssignmentCreateSchema = z.object({
  userId: idSchema,
  startsAt: isoDateSchema,
  endsAt: isoDateSchema,
  area: z.string().trim().min(2).max(120),
});

export const patrolSwapCreateSchema = z.object({
  targetAssignmentId: idSchema,
  reason: z.string().trim().min(5).max(500),
});

export const documentCreateSchema = z.object({
  title: z.string().trim().min(4).max(180),
  description: z.string().trim().max(1000).optional(),
  category: z.string().trim().min(2).max(80),
  visibility: z.enum(['PUBLIC', 'INTERNAL', 'SENSITIVE']),
  fileId: idSchema.optional(),
});

// Governance & Extended Module Schemas
export const pollCreateSchema = z.object({
  title: z.string().trim().min(4).max(180),
  description: z.string().trim().min(10).max(2000),
  category: z.string().trim().min(2).max(60).default('GENERAL'),
  ballotType: z.enum(['PER_RESIDENT', 'PER_HOUSEHOLD']).default('PER_RESIDENT'),
  anonymous: z.boolean().default(false),
  quorumPercentage: z.number().int().min(1).max(100).default(50),
  endsAt: isoDateSchema,
  options: z.array(z.object({
    label: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).optional(),
  })).min(2).max(10),
});

export const pollVoteSchema = z.object({
  optionId: idSchema,
});

export const letterRequestCreateSchema = z.object({
  householdId: idSchema,
  letterType: z.enum([
    'DOMICILE',
    'BUSINESS_INFO',
    'LOW_INCOME',
    'MARRIAGE_INTRO',
    'DEATH_NOTICE',
    'BIRTH_NOTICE',
    'MOVE_NOTICE',
    'GENERAL',
  ]),
  purpose: z.string().trim().min(5).max(500),
  fields: z.record(z.unknown()).default({}),
  attachmentFileId: idSchema.optional(),
});

export const letterRequestStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'ISSUED']),
  rejectionReason: z.string().trim().max(500).optional(),
  letterNumber: z.string().trim().max(100).optional(),
});

export const programCreateSchema = z.object({
  title: z.string().trim().min(4).max(180),
  description: z.string().trim().min(10).max(2000),
  category: z.string().trim().min(2).max(60).default('INFRASTRUCTURE'),
  budget: moneySchema,
  startsAt: isoDateSchema,
  endsAt: isoDateSchema,
});

export const facilityCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(5).max(1000),
  category: z.string().trim().min(2).max(60).default('GENERAL'),
  fee: moneySchema.default(0),
  deposit: moneySchema.default(0),
  requiresApproval: z.boolean().default(true),
});

export const facilityReservationCreateSchema = z.object({
  facilityId: idSchema,
  householdId: idSchema,
  purpose: z.string().trim().min(5).max(500),
  startsAt: isoDateSchema,
  endsAt: isoDateSchema,
});

export const vehicleCreateSchema = z.object({
  householdId: idSchema,
  plateNumber: z.string().trim().min(3).max(20),
  type: z.enum(['CAR', 'MOTORCYCLE', 'OTHER']),
  brandModel: z.string().trim().min(2).max(100),
});

export const guestCreateSchema = z.object({
  householdId: idSchema,
  guestName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional(),
  purpose: z.string().trim().min(2).max(300),
  expectedArrival: isoDateSchema,
});

export const umkmCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(60),
  description: z.string().trim().min(5).max(1000),
  contactPhone: z.string().trim().min(6).max(30),
  operatingHours: z.string().trim().min(2).max(100),
});

export const socialAidCreateSchema = z.object({
  title: z.string().trim().min(4).max(180),
  description: z.string().trim().min(10).max(2000),
  targetAmount: moneySchema,
});

export const lostFoundCreateSchema = z.object({
  kind: z.enum(['LOST', 'FOUND']),
  title: z.string().trim().min(4).max(180),
  description: z.string().trim().min(5).max(1000),
  location: z.string().trim().min(2).max(200),
  photoFileId: idSchema.optional(),
});

export type ApiSuccess<T> = {
  data: T;
  meta: { requestId: string } & Record<string, unknown>;
};

export type ApiError = {
  error: { code: string; message: string; details: unknown };
  meta: { requestId: string };
};
