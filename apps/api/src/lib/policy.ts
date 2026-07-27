import {
  permissions,
  type Permission,
  type Role,
} from '@wargahub/contracts';

const residentPermissions: Permission[] = [
  'organization.read',
  'announcement.read',
  'billing.read',
  'complaint.read',
  'activity.read',
  'patrol.schedule.read',
  'document.read',
  'notification.read',
  'voting.read',
  'voting.cast',
  'letter.request',
  'program.read',
  'facility.read',
  'facility.reserve',
  'vehicle.manage',
  'guest.manage',
  'umkm.read',
  'umkm.manage',
  'lost_found.read',
  'lost_found.manage',
];

export const rolePermissions: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: permissions,
  ADMIN_ORGANIZATION: permissions,
  CHAIR_RW: permissions,
  CHAIR_RT: permissions,
  SECRETARY: [
    ...residentPermissions,
    'resident.read',
    'announcement.create',
    'announcement.publish',
    'document.manage',
  ],
  TREASURER: [
    ...residentPermissions,
    'billing.create',
    'billing.update',
    'billing.reconcile',
    'finance.read',
    'finance.create',
    'finance.review',
    'finance.report.publish',
  ],
  SECURITY_COORDINATOR: [
    ...residentPermissions,
    'patrol.schedule.manage',
    'patrol.swap.approve',
    'complaint.assign',
    'complaint.resolve',
  ],
  CLEANLINESS_COORDINATOR: [
    ...residentPermissions,
    'complaint.assign',
    'complaint.resolve',
  ],
  ACTIVITY_COORDINATOR: [
    ...residentPermissions,
    'activity.manage',
    'announcement.create',
  ],
  OFFICER: [...residentPermissions, 'complaint.resolve'],
  AUDITOR: [
    ...residentPermissions,
    'resident.read',
    'finance.read',
    'audit_log.read',
  ],
  RESIDENT: residentPermissions,
  HOMEOWNER: residentPermissions,
  TENANT: residentPermissions,
  FAMILY_GUARDIAN: residentPermissions,
  VENDOR: ['complaint.read', 'complaint.resolve', 'notification.read'],
  VERIFIED_GUEST: ['organization.read', 'announcement.read'],
};

export function hasPermission(
  assigned: readonly string[],
  required: Permission,
): boolean {
  return assigned.includes(required);
}

export function permissionsForRoles(roles: readonly Role[]): Permission[] {
  return [...new Set(roles.flatMap((role) => rolePermissions[role]))];
}
