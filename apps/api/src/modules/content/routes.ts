import type { FastifyInstance } from 'fastify';
import { announcementRoutes } from '../announcements/routes.js';
import { documentRoutes } from '../documents/routes.js';
import { householdRoutes } from '../households/routes.js';
import { organizationRoutes } from '../organizations/routes.js';
import { publicRoutes } from '../public/routes.js';

export async function contentRoutes(app: FastifyInstance): Promise<void> {
  await app.register(organizationRoutes);
  await app.register(householdRoutes);
  await app.register(announcementRoutes);
  await app.register(documentRoutes);
  await app.register(publicRoutes);
}
