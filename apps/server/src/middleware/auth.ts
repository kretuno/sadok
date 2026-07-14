import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../db/schema';
import {
  hasPermission,
  type PermissionAction,
  type PermissionModule,
} from '../services/permissions';

const JWT_SECRET = process.env.JWT_SECRET || 'sadok-default-local-jwt-secret-key-2026';

export interface AuthenticatedUser {
  id: number;
  role: string;
  username: string;
  permissions?: unknown;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

const isAuthenticatedUser = (payload: string | JwtPayload): payload is JwtPayload & AuthenticatedUser => {
  if (typeof payload === 'string') {
    return false;
  }

  return (
    typeof payload.id === 'number' &&
    typeof payload.role === 'string' &&
    typeof payload.username === 'string'
  );
};

export const verifyAuthToken = (token: string): AuthenticatedUser => {
  const payload = jwt.verify(token, JWT_SECRET);

  if (!isAuthenticatedUser(payload)) {
    throw new Error('Invalid token payload');
  }

  return {
    id: payload.id,
    role: payload.role,
    username: payload.username,
  };
};

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const [scheme, token] = authHeader?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Доступ заборонено: відсутній токен' });
  }

  try {
    const tokenUser = verifyAuthToken(token);
    const account = await db.query.users.findFirst({
      where: eq(users.id, tokenUser.id),
      columns: {
        role: true,
        permissions: true,
        isActive: true,
      },
    });

    if (!account?.isActive) {
      return res.status(403).json({ message: 'Обліковий запис заблоковано' });
    }

    req.user = {
      ...tokenUser,
      role: account.role,
      permissions: account.permissions,
    };
    next();
  } catch {
    return res.status(403).json({ message: 'Токен недійсний' });
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Недостатньо прав для виконання цієї дії' });
    }
    next();
  };
};

export interface PermissionRequirement {
  module: PermissionModule;
  action: PermissionAction;
}

export const authorizeAnyPermission = (...requirements: PermissionRequirement[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Доступ заборонено: відсутній токен' });
    }

    const isAllowed = requirements.some(({ module, action }) =>
      hasPermission(req.user!.role, req.user!.permissions, module, action)
    );

    if (!isAllowed) {
      return res.status(403).json({ message: 'Недостатньо прав для виконання цієї дії' });
    }

    next();
  };
};

export const authorizePermission = (module: PermissionModule, action: PermissionAction) =>
  authorizeAnyPermission({ module, action });
