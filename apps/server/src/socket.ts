import { Server } from 'socket.io';
import { db } from './db';
import { childGroups, messages, users } from './db/schema';
import { eq } from 'drizzle-orm';
import { type AuthenticatedUser, verifyAuthToken } from './middleware/auth';
import { hasPermission } from './services/permissions';

interface SendMessagePayload {
  recipientId?: number;
  groupId?: string;
  content: string;
}

const canUseGroupChat = (user: AuthenticatedUser) =>
  hasPermission(user.role, user.permissions, 'children', 'view') ||
  hasPermission(user.role, user.permissions, 'attendance', 'view') ||
  hasPermission(user.role, user.permissions, 'medical', 'view') ||
  hasPermission(user.role, user.permissions, 'psychologist', 'view');

const getAuthorizedGroupId = async (user: AuthenticatedUser, rawGroupId: unknown) => {
  if (!canUseGroupChat(user)) return null;

  const groupId = Number(rawGroupId);
  if (!Number.isSafeInteger(groupId) || groupId <= 0) return null;

  const group = await db.query.childGroups.findFirst({
    where: eq(childGroups.id, groupId),
    columns: { id: true },
  });

  return group ? String(group.id) : null;
};

export function setupSocket(io: Server) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (typeof token !== 'string' || !token) {
      return next(new Error('Authentication required'));
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
        return next(new Error('Account disabled'));
      }

      socket.data.user = {
        ...tokenUser,
        role: account.role,
        permissions: account.permissions,
      };
      next();
    } catch {
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as AuthenticatedUser;
    const userRoom = `user_${user.id}`;

    socket.join(userRoom);
    console.log(`Користувач ${user.username} підключився:`, socket.id);

    // Приєднання до групових кімнат
    socket.on('join_group', async (rawGroupId: unknown) => {
      const groupId = await getAuthorizedGroupId(user, rawGroupId);
      if (!groupId) return;

      await socket.join(`group_${groupId}`);
      console.log(`Користувач приєднався до групи: ${groupId}`);
    });

    // Відправка повідомлення
    socket.on('send_message', async (data: SendMessagePayload) => {
      try {
        const content = typeof data?.content === 'string' ? data.content.trim() : '';

        if (!content) {
          return;
        }

        const groupId = data.groupId
          ? await getAuthorizedGroupId(user, data.groupId)
          : undefined;
        if (data.groupId && !groupId) return;

        const [newMessage] = await db.insert(messages).values({
          senderId: user.id,
          recipientId: data.recipientId,
          groupId,
          content,
        }).returning();

        // Отримуємо дані відправника
        const sender = await db.query.users.findFirst({
          where: eq(users.id, user.id),
          columns: {
            id: true,
            fullName: true,
            role: true
          }
        });

        const messageToSend = {
          ...newMessage,
          sender
        };

        if (groupId) {
          // Відправка в групу
          io.to(`group_${groupId}`).emit('new_message', messageToSend);
        } else if (data.recipientId) {
          // Особисте повідомлення
          io.to(`user_${data.recipientId}`).to(userRoom).emit('new_message', messageToSend);
        } else {
          // Публічне повідомлення (всім)
          io.emit('new_message', messageToSend);
        }
      } catch (error) {
        console.error('Помилка надсилання повідомлення:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('Користувач відключився');
    });
  });
}
