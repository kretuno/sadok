import { Request, Response } from 'express';
import { db } from '../db';
import { kindergartenSettings } from '../db/schema';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import crypto from 'crypto';
import os from 'os';
import zlib from 'zlib';
import { getClientIp, logAuditEvent } from '../services/audit';
import { dataDir } from '../paths';

const LICENSE_SALT = 'SADOK-MACHINE-SALT-2026';
const ACTIVATION_SECRET = 'SADOK-LICENSE-SECRET-V1';
const BACKUP_PREFIX = 'sadok_backup';

const getDbPath = () => path.resolve(dataDir, 'sqlite.db');
const getBackupsDir = () => path.resolve(dataDir, 'backups');

const ensureBackupsDir = () => {
  const backupsDir = getBackupsDir();
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  return backupsDir;
};

const buildBackupFileName = (label?: string) => {
  const iso = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+/, '');
  const safeLabel = label ? `_${label.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32)}` : '';
  return `${BACKUP_PREFIX}_${iso}${safeLabel}.sqlite.gz`;
};

const toBackupSummary = (fileName: string) => {
  const fullPath = path.resolve(getBackupsDir(), fileName);
  const stats = fs.statSync(fullPath);

  return {
    fileName,
    size: stats.size,
    createdAt: stats.birthtime,
    updatedAt: stats.mtime,
  };
};

const getBackupFilePath = (fileName: string) => {
  const backupsDir = ensureBackupsDir();
  const safeName = path.basename(fileName);
  const resolved = path.resolve(backupsDir, safeName);
  if (!resolved.startsWith(backupsDir)) {
    throw new Error('Некоректне імʼя файлу резервної копії');
  }

  return resolved;
};

const createCompressedBackup = (label?: string) => {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    throw new Error('Файл бази даних не знайдено');
  }

  const backupsDir = ensureBackupsDir();
  const fileName = buildBackupFileName(label);
  const backupPath = path.resolve(backupsDir, fileName);
  const dbBuffer = fs.readFileSync(dbPath);
  const compressed = zlib.gzipSync(dbBuffer, { level: zlib.constants.Z_BEST_COMPRESSION });
  fs.writeFileSync(backupPath, compressed);

  return {
    fileName,
    backupPath,
    size: compressed.length,
  };
};

const listBackups = () => {
  const backupsDir = ensureBackupsDir();
  return fs
    .readdirSync(backupsDir)
    .filter((fileName) => fileName.endsWith('.sqlite.gz'))
    .map((fileName) => toBackupSummary(fileName))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const restoreDbFromBuffer = (buffer: Buffer) => {
  const dbPath = getDbPath();
  fs.writeFileSync(dbPath, buffer);
  return dbPath;
};

export const getSettings = async (req: Request, res: Response) => {
  try {
    let settings = await db.select().from(kindergartenSettings).where(eq(kindergartenSettings.id, 1)).limit(1);
    
    // Якщо налаштувань ще немає (перший запуск) - створюємо рядок за замовчуванням
    if (settings.length === 0) {
      await db.insert(kindergartenSettings).values({
        id: 1,
        name: 'Заклад дошкільної освіти',
        installationDate: new Date(),
      });
      settings = await db.select().from(kindergartenSettings).where(eq(kindergartenSettings.id, 1)).limit(1);
    }
    
    const config = settings[0];
    
    // Якщо інсталяція вже була, але дата чомусь пуста (після апдейту схеми)
    if (!config.installationDate) {
      await db.update(kindergartenSettings)
        .set({ installationDate: new Date() })
        .where(eq(kindergartenSettings.id, 1));
      config.installationDate = new Date();
    }

    // Розрахунок днів тріалу (14 днів)
    const trialDays = 14;
    const now = new Date();
    const installDate = new Date(config.installationDate);
    const diffTime = now.getTime() - installDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, trialDays - diffDays);
    
    // Перевірка активації
    const isActivated = !!config.licenseKey;
    let isExpired = false;
    let activatedDaysRemaining = 0;

    if (isActivated) {
      if (config.licenseType !== 'lifetime') {
        const activatedAt = config.activatedAt ? new Date(config.activatedAt) : now;
        const durationDays = 
          config.licenseType === 'monthly' ? 31 : 
          (config.licenseType === 'quarterly' ? 92 : 
          (config.licenseType === 'halfyear' ? 183 : 
          (config.licenseType === 'demo' ? 14 : 365)));
        const expiryDate = new Date(activatedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
        
        isExpired = now > expiryDate;
        activatedDaysRemaining = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }
    } else {
      isExpired = daysRemaining <= 0;
    }

    res.json({
      ...config,
      daysRemaining: isActivated && config.licenseType !== 'lifetime' ? activatedDaysRemaining : daysRemaining,
      isActivated,
      isExpired
    });
  } catch (error) {
    console.error('Помилка отримання налаштувань:', error);
    res.status(500).json({ message: 'Помилка отримання налаштувань' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    
    // Перевіряємо чи існує
    const existing = await db.select().from(kindergartenSettings).where(eq(kindergartenSettings.id, 1)).limit(1);
    
    if (existing.length === 0) {
      await db.insert(kindergartenSettings).values({ ...data, id: 1 });
    } else {
      await db.update(kindergartenSettings)
        .set(data)
        .where(eq(kindergartenSettings.id, 1));
    }

    await logAuditEvent({
      actionType: 'update',
      entity: 'settings',
      entityId: 1,
      oldValue: existing[0] ?? null,
      newValue: data,
      ipAddress: getClientIp(req),
    });
    
    res.status(200).json({ message: 'Налаштування оновлено' });
  } catch (error) {
    console.error('Помилка оновлення налаштувань:', error);
    res.status(500).json({ message: 'Помилка збереження налаштувань' });
  }
};

export const downloadBackup = async (req: Request, res: Response) => {
  try {
    const dbPath = getDbPath();
    
    if (fs.existsSync(dbPath)) {
      res.download(dbPath, `sadok_backup_${new Date().toISOString().slice(0,10)}.db`);
    } else {
      res.status(404).json({ message: 'Файл бази даних не знайдено' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Помилка скачування бекапу' });
  }
};

export const getBackupList = async (req: Request, res: Response) => {
  try {
    res.json(listBackups());
  } catch (error) {
    console.error('Помилка отримання списку резервних копій:', error);
    res.status(500).json({ message: 'Помилка отримання списку резервних копій' });
  }
};

export const createBackup = async (req: Request, res: Response) => {
  try {
    const backup = createCompressedBackup('manual');

    await logAuditEvent({
      actionType: 'create',
      entity: 'backup',
      newValue: {
        fileName: backup.fileName,
        size: backup.size,
      },
      ipAddress: getClientIp(req),
    });

    res.status(201).json({
      message: 'Резервну копію створено',
      backup: toBackupSummary(backup.fileName),
    });
  } catch (error) {
    console.error('Помилка створення резервної копії:', error);
    res.status(500).json({ message: 'Помилка створення резервної копії' });
  }
};

export const downloadBackupArchive = async (req: Request, res: Response) => {
  try {
    const backupPath = getBackupFilePath(String(req.params.fileName));
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ message: 'Файл резервної копії не знайдено' });
    }

    res.download(backupPath, path.basename(backupPath));
  } catch (error) {
    console.error('Помилка завантаження резервної копії:', error);
    res.status(400).json({ message: 'Помилка завантаження резервної копії' });
  }
};

export const deleteBackupArchive = async (req: Request, res: Response) => {
  try {
    const fileName = String(req.params.fileName);
    const backupPath = getBackupFilePath(fileName);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ message: 'Файл резервної копії не знайдено' });
    }

    fs.unlinkSync(backupPath);

    await logAuditEvent({
      actionType: 'delete',
      entity: 'backup',
      oldValue: { fileName },
      ipAddress: getClientIp(req),
    });

    res.json({ message: 'Резервну копію видалено' });
  } catch (error) {
    console.error('Помилка видалення резервної копії:', error);
    res.status(400).json({ message: 'Помилка видалення резервної копії' });
  }
};

export const restoreBackupArchive = async (req: Request, res: Response) => {
  try {
    const fileName = String(req.params.fileName);
    const backupPath = getBackupFilePath(fileName);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ message: 'Файл резервної копії не знайдено' });
    }

    const safetyBackup = createCompressedBackup('before_restore');
    const compressed = fs.readFileSync(backupPath);
    const restoredBuffer = zlib.gunzipSync(compressed);
    const dbPath = restoreDbFromBuffer(restoredBuffer);

    await logAuditEvent({
      actionType: 'restore',
      entity: 'backup',
      newValue: {
        restoredFrom: fileName,
        safetyBackup: safetyBackup.fileName,
        restoredTo: dbPath,
      },
      ipAddress: getClientIp(req),
    });

    res.json({
      message: 'Резервну копію відновлено. Перед відновленням створено страховий архів поточної бази.',
      safetyBackup: toBackupSummary(safetyBackup.fileName),
    });
  } catch (error) {
    console.error('Помилка відновлення резервної копії:', error);
    res.status(400).json({ message: 'Помилка відновлення резервної копії' });
  }
};

export const restoreBackup = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Файл не завантажено' });
    }
    
    const uploadedBuffer = fs.readFileSync(req.file.path);
    const originalName = req.file.originalname || 'uploaded_backup.db';
    const isCompressed = originalName.endsWith('.gz');
    const restoredBuffer = isCompressed ? zlib.gunzipSync(uploadedBuffer) : uploadedBuffer;
    const safetyBackup = createCompressedBackup('before_upload_restore');
    const dbPath = restoreDbFromBuffer(restoredBuffer);
    fs.unlinkSync(req.file.path);

    await logAuditEvent({
      actionType: 'restore',
      entity: 'backup',
      newValue: {
        uploadedFile: originalName,
        uploadedCompressed: isCompressed,
        safetyBackup: safetyBackup.fileName,
        restoredTo: dbPath,
      },
      ipAddress: getClientIp(req),
    });
    
    res.status(200).json({
      message: 'Базу успішно відновлено із завантаженого файлу. Перед відновленням створено страховий архів поточної бази.',
      safetyBackup: toBackupSummary(safetyBackup.fileName),
    });
  } catch (error) {
    console.error('Помилка відновлення:', error);
    res.status(500).json({ message: 'Помилка при відновленні з бекапу' });
  }
};

const getSystemUuid = (): string => {
  try {
    // Спробуємо отримати UUID, але якщо ні - миттєво повернемо стабільний фолбек
    const commands = [
      'powershell.exe -NoProfile -Command "(Get-CimInstance Win32_ComputerSystemProduct).UUID"',
      'wmic csproduct get uuid'
    ];

    for (const cmd of commands) {
      try {
        const output = execSync(cmd, { encoding: 'utf8', timeout: 3000, windowsHide: true }).trim();
        if (output && output.length > 8 && !output.includes('Error')) {
          // Якщо це wmic, прибираємо заголовок
          const clean = output.split(/\r?\n/).filter(l => l.trim() && !l.toUpperCase().includes('UUID'))[0]?.trim();
          if (clean) return clean;
          return output;
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  // Гарантований фолбек, який ніколи не підведе
  return crypto.createHash('md5').update(os.hostname() || 'fallback-host').digest('hex').toUpperCase();
};

export const getMachineId = async (req: Request, res: Response) => {
  try {
    const rawUuid = getSystemUuid();
    const requestCode = crypto
      .createHash('sha256')
      .update(rawUuid + LICENSE_SALT)
      .digest('hex')
      .slice(0, 16)
      .toUpperCase();

    res.json({ machineId: rawUuid, requestCode });
  } catch (error: any) {
    console.error('Error getting machine id:', error);
    res.status(500).json({ 
      message: '(v2) Системна помилка сервера при отриманні ID',
      details: error.message 
    });
  }
};

export const activateApp = async (req: Request, res: Response) => {
  try {
    const { licenseKey } = req.body;
    
    if (!licenseKey) {
      return res.status(400).json({ message: 'Ключ активації обов\'язковий' });
    }

    const rawUuid = getSystemUuid();
    const requestCode = crypto
      .createHash('sha256')
      .update(rawUuid + LICENSE_SALT)
      .digest('hex')
      .slice(0, 16)
      .toUpperCase();

    // Генерація очікуваних ключів
    const expectedLifetime = crypto
      .createHash('sha256')
      .update(requestCode + 'LIFETIME' + ACTIVATION_SECRET)
      .digest('hex')
      .toUpperCase();
      
    const expectedAnnual = crypto
      .createHash('sha256')
      .update(requestCode + 'ANNUAL' + ACTIVATION_SECRET)
      .digest('hex')
      .toUpperCase();

    const expectedHalfYear = crypto
      .createHash('sha256')
      .update(requestCode + 'HALFYEAR' + ACTIVATION_SECRET)
      .digest('hex')
      .toUpperCase();

    const expectedMonthly = crypto
      .createHash('sha256')
      .update(requestCode + 'MONTHLY' + ACTIVATION_SECRET)
      .digest('hex')
      .toUpperCase();

    const expectedQuarterly = crypto
      .createHash('sha256')
      .update(requestCode + 'QUARTERLY' + ACTIVATION_SECRET)
      .digest('hex')
      .toUpperCase();

    const expectedDemo = crypto
      .createHash('sha256')
      .update(requestCode + 'DEMO' + ACTIVATION_SECRET)
      .digest('hex')
      .toUpperCase();

    let type: 'lifetime' | 'annual' | 'halfyear' | 'quarterly' | 'monthly' | 'demo' | null = null;
    
    // Перевірка
    const cleanKey = licenseKey.replace(/-/g, '').toUpperCase();
    if (cleanKey.startsWith(expectedLifetime.slice(0, 16))) {
      type = 'lifetime';
    } else if (cleanKey.startsWith(expectedAnnual.slice(0, 16))) {
      type = 'annual';
    } else if (cleanKey.startsWith(expectedHalfYear.slice(0, 16))) {
      type = 'halfyear';
    } else if (cleanKey.startsWith(expectedQuarterly.slice(0, 16))) {
      type = 'quarterly';
    } else if (cleanKey.startsWith(expectedMonthly.slice(0, 16))) {
      type = 'monthly';
    } else if (cleanKey.startsWith(expectedDemo.slice(0, 16))) {
      type = 'demo';
    }

    if (!type) {
      return res.status(400).json({ message: 'Невірний ключ активації' });
    }

    // Зберігаємо активацію
    await db.update(kindergartenSettings)
      .set({ 
        licenseKey: licenseKey,
        licenseType: type,
        activatedAt: new Date()
      })
      .where(eq(kindergartenSettings.id, 1));

    await logAuditEvent({
      actionType: 'activate',
      entity: 'license',
      entityId: 1,
      newValue: {
        licenseType: type,
        requestCode,
      },
      ipAddress: getClientIp(req),
    });

    res.json({ message: 'Програму успішно активовано!', type });
  } catch (error) {
    console.error('Activation error:', error);
    res.status(500).json({ message: 'Помилка при активації' });
  }
};
