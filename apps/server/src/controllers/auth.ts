import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getClientIp, logAuditEvent } from '../services/audit';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-sadok';

export const register = async (req: Request, res: Response) => {
  try {
    const { fullName, username, password, role } = req.body;

    // Перевірка чи існує користувач
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Користувач з таким логіном вже існує' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await db.insert(users).values({
      fullName,
      username,
      passwordHash,
      role: role || 'admin',
      permissions: JSON.stringify({
        dashboard: 'view',
        inventory: 'edit',
        reports: 'view'
      }),
    }).returning();

    await logAuditEvent({
      actionType: 'register',
      entity: 'auth',
      entityId: newUser[0].id,
      newValue: {
        userId: newUser[0].id,
        fullName,
        username,
        role: role || 'admin',
      },
      ipAddress: getClientIp(req),
    });

    res.status(201).json({ message: 'Користувача створено', userId: newUser[0].id });
  } catch (error) {
    res.status(500).json({ message: 'Помилка при реєстрації', error });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    console.log(`[Auth] Вхід для: ${username}`);

    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!user) {
      console.log(`[Auth Error] Користувача ${username} не знайдено`);
      await logAuditEvent({
        actionType: 'login_failed',
        entity: 'auth',
        newValue: { username, reason: 'user_not_found' },
        ipAddress: getClientIp(req),
      });
      return res.status(401).json({ message: 'Невірний логін або пароль' });
    }

    if (!user.isActive) {
      console.log(`[Auth Error] Користувач ${username} неактивний`);
      await logAuditEvent({
        userId: user.id,
        actionType: 'login_failed',
        entity: 'auth',
        entityId: user.id,
        newValue: { username, reason: 'inactive_user' },
        ipAddress: getClientIp(req),
      });
      return res.status(401).json({ message: 'Обліковий запис заблоковано' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      console.log(`[Auth Error] Невірний пароль для ${username}`);
      await logAuditEvent({
        userId: user.id,
        actionType: 'login_failed',
        entity: 'auth',
        entityId: user.id,
        newValue: { username, reason: 'invalid_password' },
        ipAddress: getClientIp(req),
      });
      return res.status(401).json({ message: 'Невірний логін або пароль' });
    }

    console.log(`[Auth Success] Користувач ${username} увійшов`);

    await logAuditEvent({
      userId: user.id,
      actionType: 'login_success',
      entity: 'auth',
      entityId: user.id,
      newValue: {
        username: user.username,
        role: user.role,
      },
      ipAddress: getClientIp(req),
    });

    const token = jwt.sign(
      { id: user.id, role: user.role, username: user.username },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Помилка при вході', error });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const allUsers = await db.query.users.findMany({
      where: eq(users.isActive, true),
      columns: {
        id: true,
        fullName: true,
        username: true,
        role: true,
      }
    });
    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при отриманні списку користувачів', error });
  }
};
