import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import { AuthRequest } from '../middleware/auth';
import { getClientIp, logAuditEvent } from '../services/audit';

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const list = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        role: users.role,
        permissions: users.permissions,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users);
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Помилка отримання користувачів' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, username, password, role, permissions } = req.body;

    const allUsers = await db.select().from(users);
    if (allUsers.length >= 10) {
      return res.status(400).json({
        message:
          'Досягнуто ліміт користувачів (максимум 10). Зверніться до розробника для розширення ліцензії.',
      });
    }

    const existing = await db.select().from(users).where(eq(users.username, username));
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Користувач з таким логіном вже існує' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const inserted = await db
      .insert(users)
      .values({
        fullName,
        username,
        passwordHash,
        role,
        permissions: JSON.stringify(permissions),
      })
      .returning({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        role: users.role,
      });

    await logAuditEvent({
      userId: req.user?.id,
      actionType: 'create',
      entity: 'users',
      entityId: inserted[0].id,
      newValue: {
        ...inserted[0],
        permissions,
      },
      ipAddress: getClientIp(req),
    });

    res.status(201).json({ message: 'Користувача створено' });
  } catch (error) {
    res.status(500).json({ message: 'Помилка створення користувача' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, password, role, permissions, isActive } = req.body;
    const userId = Number(id);

    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        fullName: true,
        username: true,
        role: true,
        permissions: true,
        isActive: true,
      },
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'Користувача не знайдено' });
    }

    const dataToUpdate: {
      fullName: string;
      role: string;
      permissions: string;
      isActive: boolean;
      passwordHash?: string;
    } = {
      fullName,
      role,
      permissions: JSON.stringify(permissions),
      isActive,
    };

    if (password) {
      const salt = await bcrypt.genSalt(10);
      dataToUpdate.passwordHash = await bcrypt.hash(password, salt);
    }

    await db.update(users).set(dataToUpdate).where(eq(users.id, userId));

    await logAuditEvent({
      userId: req.user?.id,
      actionType: 'update',
      entity: 'users',
      entityId: userId,
      oldValue: existingUser,
      newValue: {
        id: userId,
        fullName,
        role,
        permissions,
        isActive,
        passwordChanged: Boolean(password),
      },
      ipAddress: getClientIp(req),
    });

    res.json({ message: 'Користувача оновлено' });
  } catch (error) {
    res.status(500).json({ message: 'Помилка оновлення користувача' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = Number(id);

    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        fullName: true,
        username: true,
        role: true,
        isActive: true,
      },
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'Користувача не знайдено' });
    }

    await db.delete(users).where(eq(users.id, userId));

    await logAuditEvent({
      userId: req.user?.id,
      actionType: 'delete',
      entity: 'users',
      entityId: userId,
      oldValue: existingUser,
      ipAddress: getClientIp(req),
    });

    res.json({ message: 'Користувача видалено' });
  } catch (error) {
    res.status(500).json({ message: 'Помилка видалення користувача' });
  }
};
