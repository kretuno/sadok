import { db } from './index';
import { children } from './schema';
import { isNull, eq } from 'drizzle-orm';
import crypto from 'crypto';

async function migrate() {
  console.log('Начало миграции QR-токенов...');
  
  const childrenWithoutTokens = await db
    .select()
    .from(children)
    .where(isNull(children.qrToken));

  console.log(`Найдено детей без токенов: ${childrenWithoutTokens.length}`);

  for (const child of childrenWithoutTokens) {
    const newToken = crypto.randomUUID();
    await db
      .update(children)
      .set({ qrToken: newToken })
      .where(eq(children.id, child.id));
    console.log(`Сгенерирован токен для: ${child.fullName}`);
  }

  console.log('Миграция завершена успешно!');
}

migrate().catch((err) => {
  console.error('Помилка міграції:', err);
  process.exit(1);
});
