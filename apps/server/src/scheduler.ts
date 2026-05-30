import { createCompressedBackup } from './controllers/system';
import { db } from './db';
import { kindergartenSettings } from './db/schema';
import { eq } from 'drizzle-orm';
import { logAuditEvent } from './services/audit';

let lastAutoBackupDateString = ''; // Формат: YYYY-MM-DD

export const startBackupScheduler = () => {
  console.log('Scheduler: Фоновий планувальник резервного копіювання запущено.');
  
  // Перевірка кожну хвилину
  setInterval(async () => {
    try {
      const now = new Date();
      const currentDateString = now.toISOString().slice(0, 10);
      
      // Якщо сьогодні вже робили автоматичний бекап, пропускаємо
      if (lastAutoBackupDateString === currentDateString) {
        return;
      }

      // Отримуємо налаштування з БД
      let settings = await db.select().from(kindergartenSettings).where(eq(kindergartenSettings.id, 1)).limit(1);
      
      // Якщо налаштувань немає, використовуємо значення за замовчуванням
      const backupTime = settings[0]?.backupTime ?? '03:00';
      
      // Поточний час у форматі HH:MM
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeString = `${currentHours}:${currentMinutes}`;

      if (currentTimeString === backupTime) {
        console.log(`Scheduler: Настав час автоматичного бекапу (${backupTime}). Створення копії...`);
        
        const backup = await createCompressedBackup('auto');
        
        await logAuditEvent({
          actionType: 'create',
          entity: 'backup_auto',
          newValue: {
            fileName: backup.fileName,
            size: backup.size,
            reason: 'Автоматичне щоденне резервне копіювання за розкладом',
          },
          userId: null,
          ipAddress: '127.0.0.1',
        });

        lastAutoBackupDateString = currentDateString;
        console.log(`Scheduler: Автоматичний бекап успішно створено: ${backup.fileName}`);
      }
    } catch (error) {
      console.error('Scheduler: Помилка автоматичного резервного копіювання:', error);
    }
  }, 60000); // 1 хвилина
};
