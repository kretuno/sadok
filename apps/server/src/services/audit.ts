import { desc, eq, gte, lte, and, type SQL } from 'drizzle-orm';
import type { Request } from 'express';
import { db } from '../db';
import { auditLog, users } from '../db/schema';

type AuditPrimitive = string | number | boolean | null;
type AuditValue = AuditPrimitive | AuditValue[] | { [key: string]: AuditValue };

const REDACTED_FIELDS = new Set([
  'password',
  'passwordhash',
  'token',
  'authorization',
  'licensekey',
  'secret',
]);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);

const sanitizeAuditValue = (value: unknown, seen = new WeakSet<object>()): AuditValue => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditValue(item, seen));
  }

  if (isPlainObject(value)) {
    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);

    const entries = Object.entries(value).map(([key, item]) => {
      const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
      if (REDACTED_FIELDS.has(normalizedKey)) {
        return [key, '[REDACTED]'] as const;
      }

      return [key, sanitizeAuditValue(item, seen)] as const;
    });

    return Object.fromEntries(entries);
  }

  return String(value);
};

export const serializeAuditValue = (value: unknown): string | null => {
  if (value === undefined) {
    return null;
  }

  return JSON.stringify(sanitizeAuditValue(value));
};

export const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
};

export const logAuditEvent = async (input: {
  userId?: number | null;
  actionType: string;
  entity: string;
  entityId?: number | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
}) => {
  try {
    await db.insert(auditLog).values({
      userId: input.userId ?? null,
      actionType: input.actionType,
      entity: input.entity,
      entityId: input.entityId ?? null,
      oldValue: serializeAuditValue(input.oldValue),
      newValue: serializeAuditValue(input.newValue),
      ipAddress: input.ipAddress ?? null,
    });
  } catch (error) {
    console.error('Audit log write failed:', error);
  }
};

export const getAuditReportEntries = async (filters: {
  start?: Date;
  end?: Date;
  userId?: number;
  entity?: string;
  actionType?: string;
  limit?: number;
}) => {
  const whereClauses: SQL[] = [];

  if (filters.start) {
    whereClauses.push(gte(auditLog.timestamp, filters.start));
  }

  if (filters.end) {
    whereClauses.push(lte(auditLog.timestamp, filters.end));
  }

  if (filters.userId) {
    whereClauses.push(eq(auditLog.userId, filters.userId));
  }

  if (filters.entity) {
    whereClauses.push(eq(auditLog.entity, filters.entity));
  }

  if (filters.actionType) {
    whereClauses.push(eq(auditLog.actionType, filters.actionType));
  }

  if (whereClauses.length > 0) {
    return db
      .select({
        id: auditLog.id,
        timestamp: auditLog.timestamp,
        actionType: auditLog.actionType,
        entity: auditLog.entity,
        entityId: auditLog.entityId,
        oldValue: auditLog.oldValue,
        newValue: auditLog.newValue,
        ipAddress: auditLog.ipAddress,
        userId: auditLog.userId,
        username: users.username,
        userFullName: users.fullName,
      })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.userId, users.id))
      .where(and(...whereClauses))
      .orderBy(desc(auditLog.timestamp))
      .limit(filters.limit ?? 300);
  }

  return db
    .select({
      id: auditLog.id,
      timestamp: auditLog.timestamp,
      actionType: auditLog.actionType,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      oldValue: auditLog.oldValue,
      newValue: auditLog.newValue,
      ipAddress: auditLog.ipAddress,
      userId: auditLog.userId,
      username: users.username,
      userFullName: users.fullName,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .orderBy(desc(auditLog.timestamp))
    .limit(filters.limit ?? 300);
};
