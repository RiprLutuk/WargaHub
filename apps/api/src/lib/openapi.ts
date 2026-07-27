import type {
  FastifyDynamicSwaggerOptions,
  SwaggerTransform,
} from '@fastify/swagger';
import type { FastifySchema } from 'fastify';

type JsonSchema = Record<string, unknown>;
type TagName = 'Auth' | 'Billing' | 'Finance' | 'Complaints' | 'Files' | 'Public';

const requestIdReference = { $ref: '#/components/schemas/RequestId' };
const successEnvelopeReference = { $ref: '#/components/schemas/SuccessEnvelope' };
const errorEnvelopeReference = { $ref: '#/components/schemas/ErrorEnvelope' };
const sessionSecurity = [{ sessionCookie: [] }];

const resourceIdSchema = {
  type: 'string',
  minLength: 10,
  maxLength: 40,
  description: 'WargaHub resource identifier.',
};

const idParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: { id: resourceIdSchema },
};

const paginationQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  },
};

const searchPaginationQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    search: { type: 'string', maxLength: 120 },
  },
};

const moneySchema = {
  type: 'integer',
  minimum: 1,
  maximum: Number.MAX_SAFE_INTEGER,
  description: 'Amount in Indonesian rupiah (IDR).',
};

const isoDateSchema = { type: 'string', format: 'date-time' };

function requestHeaders(options: { csrf?: boolean; idempotency?: boolean } = {}) {
  const required: string[] = [];
  const properties: Record<string, JsonSchema> = {
    'x-request-id': {
      ...requestIdReference,
      description: 'Optional caller-provided correlation identifier.',
    },
  };
  if (options.csrf) {
    required.push('x-csrf-token');
    properties['x-csrf-token'] = {
      type: 'string',
      minLength: 1,
      description: 'CSRF token returned by the login response and cookie.',
    };
  }
  if (options.idempotency) {
    required.push('Idempotency-Key');
    properties['Idempotency-Key'] = {
      type: 'string',
      minLength: 8,
      maxLength: 100,
      description: 'Unique key that makes payment submission safe to retry.',
    };
  }
  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

function jsonResponses(successStatus: 200 | 201) {
  return {
    [successStatus]: {
      description: successStatus === 201 ? 'Resource created.' : 'Successful response.',
      content: {
        'application/json': { schema: successEnvelopeReference },
      },
    },
    default: {
      description: 'Error response.',
      content: {
        'application/json': { schema: errorEnvelopeReference },
      },
    },
  };
}

function jsonOperation(options: {
  tag: TagName;
  summary: string;
  successStatus?: 200 | 201;
  secured?: boolean;
  csrf?: boolean;
  idempotency?: boolean;
  params?: JsonSchema;
  querystring?: JsonSchema;
  body?: JsonSchema;
}): FastifySchema {
  return {
    tags: [options.tag],
    summary: options.summary,
    headers: requestHeaders({
      ...(options.csrf ? { csrf: true } : {}),
      ...(options.idempotency ? { idempotency: true } : {}),
    }),
    ...(options.secured ? { security: sessionSecurity } : {}),
    ...(options.params ? { params: options.params } : {}),
    ...(options.querystring ? { querystring: options.querystring } : {}),
    ...(options.body ? { body: options.body } : {}),
    response: jsonResponses(options.successStatus ?? 200),
  };
}

const binaryMediaTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/csv',
];

function binaryDownload(options: {
  tag: TagName;
  summary: string;
  secured?: boolean;
}): FastifySchema {
  return {
    tags: [options.tag],
    summary: options.summary,
    headers: requestHeaders(),
    params: idParamsSchema,
    ...(options.secured ? { security: sessionSecurity } : {}),
    response: {
      200: {
        description: 'Binary file content.',
        content: Object.fromEntries(
          binaryMediaTypes.map((mediaType) => [
            mediaType,
            { schema: { type: 'string', format: 'binary' } },
          ]),
        ),
      },
      default: {
        description: 'Error response.',
        content: {
          'application/json': { schema: errorEnvelopeReference },
        },
      },
    },
  };
}

const loginBodySchema = {
  oneOf: [
    {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', maxLength: 254 },
        password: { type: 'string', format: 'password', minLength: 8, maxLength: 128 },
      },
    },
    {
      type: 'object',
      required: ['phone', 'password'],
      properties: {
        phone: { type: 'string', pattern: '^\\+?[1-9]\\d{7,14}$' },
        password: { type: 'string', format: 'password', minLength: 8, maxLength: 128 },
      },
    },
  ],
};

const invitationBodySchema = {
  type: 'object',
  required: ['token', 'password'],
  properties: {
    token: { type: 'string', minLength: 32, maxLength: 200 },
    password: {
      type: 'string',
      format: 'password',
      minLength: 12,
      maxLength: 128,
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$',
    },
  },
};

const billBodySchema = {
  type: 'object',
  required: ['householdId', 'title', 'description', 'period', 'dueAt', 'amount'],
  properties: {
    householdId: resourceIdSchema,
    title: { type: 'string', minLength: 4, maxLength: 160 },
    description: { type: 'string', minLength: 10, maxLength: 1000 },
    period: { type: 'string', minLength: 4, maxLength: 30 },
    dueAt: isoDateSchema,
    amount: moneySchema,
    kind: {
      type: 'string',
      enum: ['MANDATORY', 'VOLUNTARY', 'DONATION'],
      default: 'MANDATORY',
    },
    recurrence: { type: 'string', enum: ['ONE_TIME', 'MONTHLY'], default: 'ONE_TIME' },
  },
};

const paymentBodySchema = {
  type: 'object',
  required: ['amount', 'method'],
  properties: {
    amount: moneySchema,
    method: { type: 'string', enum: ['BANK_TRANSFER', 'CASH'] },
    proofFileId: resourceIdSchema,
    note: { type: 'string', maxLength: 500 },
  },
};

const reasonBodySchema = {
  type: 'object',
  required: ['reason'],
  properties: { reason: { type: 'string', minLength: 5 } },
};

const complaintBodySchema = {
  type: 'object',
  required: ['category', 'title', 'description'],
  properties: {
    category: { type: 'string', minLength: 2, maxLength: 60 },
    title: { type: 'string', minLength: 4, maxLength: 120 },
    description: { type: 'string', minLength: 10, maxLength: 5000 },
    visibility: { type: 'string', enum: ['PRIVATE', 'PUBLIC'], default: 'PRIVATE' },
    location: { type: 'string', maxLength: 240 },
    priority: {
      type: 'string',
      enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
      default: 'NORMAL',
    },
  },
};

const complaintStatusValues = [
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
];

const criticalRoutes: Record<string, FastifySchema> = {
  'POST /api/v1/auth/login': jsonOperation({
    tag: 'Auth',
    summary: 'Create a session with email or phone credentials',
    body: loginBodySchema,
  }),
  'POST /api/v1/auth/accept-invitation': jsonOperation({
    tag: 'Auth',
    summary: 'Activate an invited account and set its password',
    body: invitationBodySchema,
  }),
  'GET /api/v1/bills': jsonOperation({
    tag: 'Billing',
    summary: 'List bills visible to the current user',
    secured: true,
    querystring: searchPaginationQuerySchema,
  }),
  'GET /api/v1/bills/:id': jsonOperation({
    tag: 'Billing',
    summary: 'Get one bill visible to the current user',
    secured: true,
    params: idParamsSchema,
  }),
  'POST /api/v1/bills': jsonOperation({
    tag: 'Billing',
    summary: 'Create a household bill',
    successStatus: 201,
    secured: true,
    csrf: true,
    body: billBodySchema,
  }),
  'POST /api/v1/bills/:id/payments': jsonOperation({
    tag: 'Billing',
    summary: 'Submit a payment for a bill',
    successStatus: 201,
    secured: true,
    csrf: true,
    idempotency: true,
    params: idParamsSchema,
    body: paymentBodySchema,
  }),
  'GET /api/v1/payments': jsonOperation({
    tag: 'Billing',
    summary: 'List payments awaiting or completing reconciliation',
    secured: true,
    querystring: paginationQuerySchema,
  }),
  'POST /api/v1/payments/:id/verify': jsonOperation({
    tag: 'Billing',
    summary: 'Verify a submitted payment',
    secured: true,
    csrf: true,
    params: idParamsSchema,
  }),
  'POST /api/v1/payments/:id/reject': jsonOperation({
    tag: 'Billing',
    summary: 'Reject a submitted payment with a reason',
    secured: true,
    csrf: true,
    params: idParamsSchema,
    body: reasonBodySchema,
  }),
  'POST /api/v1/finance/transactions/:id/reverse': jsonOperation({
    tag: 'Finance',
    summary: 'Reverse a posted non-payment finance transaction',
    secured: true,
    csrf: true,
    params: idParamsSchema,
    body: reasonBodySchema,
  }),
  'GET /api/v1/complaints': jsonOperation({
    tag: 'Complaints',
    summary: 'List complaints visible to the current user',
    secured: true,
    querystring: paginationQuerySchema,
  }),
  'POST /api/v1/complaints': jsonOperation({
    tag: 'Complaints',
    summary: 'Submit a complaint',
    successStatus: 201,
    secured: true,
    csrf: true,
    body: complaintBodySchema,
  }),
  'GET /api/v1/complaints/:id': jsonOperation({
    tag: 'Complaints',
    summary: 'Get a privacy-filtered complaint detail',
    secured: true,
    params: idParamsSchema,
  }),
  'POST /api/v1/complaints/:id/comments': jsonOperation({
    tag: 'Complaints',
    summary: 'Add a reporter-visible or internal complaint comment',
    successStatus: 201,
    secured: true,
    csrf: true,
    params: idParamsSchema,
    body: {
      type: 'object',
      required: ['body'],
      properties: {
        body: { type: 'string', minLength: 2, maxLength: 3000 },
        visibility: {
          type: 'string',
          enum: ['REPORTER', 'INTERNAL'],
          default: 'REPORTER',
        },
      },
    },
  }),
  'POST /api/v1/complaints/:id/assign': jsonOperation({
    tag: 'Complaints',
    summary: 'Assign an eligible complaint handler',
    secured: true,
    csrf: true,
    params: idParamsSchema,
    body: {
      type: 'object',
      required: ['assigneeId'],
      properties: { assigneeId: resourceIdSchema },
    },
  }),
  'POST /api/v1/complaints/:id/status': jsonOperation({
    tag: 'Complaints',
    summary: 'Move an assigned complaint to an allowed status',
    secured: true,
    csrf: true,
    params: idParamsSchema,
    body: {
      type: 'object',
      required: ['status'],
      properties: {
        status: { type: 'string', enum: complaintStatusValues },
        message: { type: 'string' },
      },
    },
  }),
  'POST /api/v1/files': {
    ...jsonOperation({
      tag: 'Files',
      summary: 'Upload a private file',
      successStatus: 201,
      secured: true,
      csrf: true,
      body: {
        type: 'object',
        required: ['file'],
        properties: {
          file: {
            type: 'string',
            contentEncoding: 'binary',
            description: 'JPEG, PNG, WebP, PDF, or CSV file up to the configured limit.',
          },
        },
      },
    }),
    consumes: ['multipart/form-data'],
  },
  'GET /api/v1/files/:id': binaryDownload({
    tag: 'Files',
    summary: 'Download an authorized private file',
    secured: true,
  }),
  'GET /api/v1/public/files/:id': binaryDownload({
    tag: 'Files',
    summary: 'Download a directly public file',
  }),
  'GET /api/v1/public/site': jsonOperation({
    tag: 'Public',
    summary: 'Get the sanitized public organization profile',
  }),
  'GET /api/v1/public/announcements': jsonOperation({
    tag: 'Public',
    summary: 'List current public announcements',
    querystring: searchPaginationQuerySchema,
  }),
  'GET /api/v1/public/documents': jsonOperation({
    tag: 'Public',
    summary: 'List current public documents',
    querystring: searchPaginationQuerySchema,
  }),
  'GET /api/v1/public/documents/:id/download': binaryDownload({
    tag: 'Public',
    summary: 'Download the current version of a public document',
  }),
  'GET /api/v1/public/transparency': jsonOperation({
    tag: 'Public',
    summary: 'Get sanitized aggregate financial transparency data',
  }),
  'GET /api/v1/public/events': jsonOperation({
    tag: 'Public',
    summary: 'List upcoming public community events',
    querystring: paginationQuerySchema,
  }),
};

export const openApiDocument: NonNullable<FastifyDynamicSwaggerOptions['openapi']> = {
  openapi: '3.0.3',
  info: {
    title: 'WargaHub REST API',
    description: 'API tata kelola lingkungan yang privat dan dapat diaudit.',
    version: '0.1.0',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Auth', description: 'Account activation and session creation.' },
    { name: 'Billing', description: 'Bills and payment reconciliation.' },
    { name: 'Finance', description: 'Auditable cash transactions and reversals.' },
    { name: 'Complaints', description: 'Privacy-aware complaint workflow.' },
    { name: 'Files', description: 'Private and explicitly public file transfer.' },
    { name: 'Public', description: 'Sanitized unauthenticated public projections.' },
  ],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'wargahub_session',
        description: 'HttpOnly WargaHub session cookie set by the login endpoint.',
      },
    },
    schemas: {
      RequestId: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: 'Correlation identifier echoed in response metadata.',
      },
      SuccessEnvelope: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: {},
          meta: {
            type: 'object',
            required: ['requestId'],
            properties: { requestId: requestIdReference },
            additionalProperties: true,
          },
        },
      },
      ErrorEnvelope: {
        type: 'object',
        required: ['error', 'meta'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message', 'details'],
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: {},
            },
          },
          meta: {
            type: 'object',
            required: ['requestId'],
            properties: { requestId: requestIdReference },
          },
        },
      },
    },
  },
};

export const openApiTransform: SwaggerTransform = ({ schema, url, route }) => {
  const method = Array.isArray(route.method) ? route.method[0] : route.method;
  const documented = method
    ? criticalRoutes[`${method.toUpperCase()} ${url}`]
    : undefined;
  return {
    schema: documented ? { ...schema, ...documented } : schema,
    url,
  };
};

export const documentedOpenApiOperations = Object.freeze(Object.keys(criticalRoutes));
