import { Server } from 'socket.io';
import { db } from './db';
import { messages, users } from './db/schema';
import { eq, or, and } from 'drizzle-orm';

export function setupSocket(io: Server) {
  io.on('connection', (socket) => {
    console.log('Користувач підключився:', socket.id);

    // Приєднання до кімнати користувача для особистих повідомлень
    socket.on('join', (userId: number) => {
      socket.join(`user_${userId}`);
      console.log(`Користувач ${userId} приєднався до своєї кімнати`);
    });

    // Приєднання до групових кімнат
    socket.on('join_group', (groupId: string) => {
      socket.join(`group_${groupId}`);
      console.log(`Користувач приєднався до групи: ${groupId}`);
    });

    // Відправка повідомлення
    socket.on('send_message', async (data: { 
      senderId: number, 
      recipientId?: number, 
      groupId?: string, 
      content: string 
    }) => {
      try {
        const [newMessage] = await db.insert(messages).values({
          senderId: data.senderId,
          recipientId: data.recipientId,
          groupId: data.groupId,
          content: data.content,
        }).returning();

        // Отримуємо дані відправника
        const sender = await db.query.users.findFirst({
          where: eq(users.id, data.senderId),
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

        if (data.groupId) {
          // Відправка в групу
          io.to(`group_${data.groupId}`).emit('new_message', messageToSend);
        } else if (data.recipientId) {
          // Особисте повідомлення
          io.to(`user_${data.recipientId}`).to(`user_${data.senderId}`).emit('new_message', messageToSend);
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
