import { Request, Response } from 'express';
import { db } from '../db';
import { messages, users } from '../db/schema';
import { eq, or, and, isNull, asc, sql } from 'drizzle-orm';

export const getUnreadCounts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const unreadMessages = await db.query.messages.findMany({
      where: and(
        eq(messages.recipientId, userId),
        eq(messages.isRead, false)
      ),
      columns: {
        senderId: true,
      }
    });

    const publicUnreadList = await db.query.messages.findMany({
       where: and(
        isNull(messages.recipientId),
        isNull(messages.groupId),
        eq(messages.isRead, false)
      ),
      columns: {
        id: true,
      }
      // Note: for public chat we don't have a reliable per-user read track without a separate linking table in Drizzle.
      // So we will just handle direct messages mostly. If public unread is needed, it should track last read time per user.
    });

    // Count per sender
    const userCounts: Record<number, number> = {};
    unreadMessages.forEach(msg => {
      userCounts[msg.senderId] = (userCounts[msg.senderId] || 0) + 1;
    });

    res.json({
      userCounts,
      totalUnread: unreadMessages.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Помилка отримання підрахунку', error });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { senderId } = req.body;

    if (!senderId) {
       return res.status(400).json({ message: 'senderId is required' });
    }

    await db.update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.recipientId, userId),
          eq(messages.senderId, senderId),
          eq(messages.isRead, false)
        )
      );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Помилка', error });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { recipientId, groupId } = req.query;
    const userId = (req as any).user.id;

    let whereClause;

    if (groupId) {
      whereClause = eq(messages.groupId, groupId as string);
    } else if (recipientId) {
      const recipientIdNum = parseInt(recipientId as string);
      whereClause = or(
        and(eq(messages.senderId, userId), eq(messages.recipientId, recipientIdNum)),
        and(eq(messages.senderId, recipientIdNum), eq(messages.recipientId, userId))
      );
    } else {
      // Публічні повідомлення (де recipientId та groupId порожні)
      whereClause = and(isNull(messages.recipientId), isNull(messages.groupId));
    }

    const history = await db.query.messages.findMany({
      where: whereClause,
      with: {
        sender: {
          columns: {
            id: true,
            fullName: true,
            role: true
          }
        }
      },
      orderBy: [asc(messages.timestamp)],
      limit: 50
    });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Помилка при отриманні повідомлень', error });
  }
};
