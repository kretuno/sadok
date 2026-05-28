import { db } from './index';
import { users } from './schema';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Починаємо ініціалізацію бази даних...');

  try {
    const passwordHash = await bcrypt.hash('admin123', 10);

    await db.insert(users).values({
      fullName: 'Адміністратор Системи',
      username: 'admin',
      passwordHash: passwordHash,
      role: 'admin',
      permissions: JSON.stringify({
        all: true
      }),
      isActive: true,
    }).onConflictDoNothing();

    console.log('✅ Адміністратора створено успішно!');
    console.log('👤 Логін: admin');
    console.log('🔑 Пароль: admin123');
  } catch (error) {
    console.error('❌ Помилка при ініціалізації:', error);
  } finally {
    process.exit();
  }
}

seed();
