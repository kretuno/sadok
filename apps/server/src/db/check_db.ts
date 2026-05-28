import { db } from './index';
import { users } from './schema';

async function check() {
  try {
    const allUsers = await db.select().from(users);
    console.log('Кількість користувачів у базі:', allUsers.length);
    console.log('Список:', allUsers.map(u => u.username));
  } catch (error) {
    console.error('Помилка при перевірці:', error);
  } finally {
    process.exit();
  }
}

check();
