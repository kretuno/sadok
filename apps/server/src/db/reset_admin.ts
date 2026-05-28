import { db } from './index';
import { users } from './schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function reset() {
  console.log('🔄 Скидання пароля адміністратора...');

  try {
    const passwordHash = await bcrypt.hash('admin123', 10);

    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.username, 'admin'),
    });

    if (existingAdmin) {
      await db.update(users)
        .set({ passwordHash, isActive: true })
        .where(eq(users.id, existingAdmin.id));
      console.log('✅ Пароль адміністратора оновлено!');
    } else {
      await db.insert(users).values({
        fullName: 'Адміністратор Системи',
        username: 'admin',
        passwordHash: passwordHash,
        role: 'admin',
        permissions: JSON.stringify({ all: true }),
        isActive: true,
      });
      console.log('✅ Нового адміністратора створено!');
    }
  } catch (error) {
    console.error('❌ Помилка:', error);
  } finally {
    process.exit();
  }
}

reset();
