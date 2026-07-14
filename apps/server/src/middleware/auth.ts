import { Request, Response, NextFunction } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sadok-default-local-jwt-secret-key-2026';

export interface AuthenticatedUser {
  id: number;
  role: string;
  username: string;
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

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const [scheme, token] = authHeader?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Доступ заборонено: відсутній токен' });
  }

  try {
    req.user = verifyAuthToken(token);
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
