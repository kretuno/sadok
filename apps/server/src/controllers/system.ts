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
import { assertValidSadokDatabase } from '../services/backupValidation';
import { verifyLicenseToken } from '../services/licenseToken';

const LICENSE_SALT = process.env.LICENSE_SALT || 'SADOK-MACHINE-SALT-2026';
const BACKUP_PREFIX = 'sadok_backup';
const LICENSE_PUBLIC_KEY = process.env.LICENSE_PUBLIC_KEY || '';
const LICENSE_ISSUER = process.env.LICENSE_ISSUER || 'activator-license-server';
const LICENSE_PRODUCT_CODE = 'SADOK';
const ACTIVATOR_API_URL = (process.env.ACTIVATOR_API_URL || '').trim().replace(/\/+$/, '');

const getDbPath = () => path.resolve(dataDir, 'sqlite.db');
const getBackupsDir = () => path.resolve(dataDir, 'backups');
const getActivationStatePath = () => path.resolve(dataDir, 'activation-client.json');

interface ActivationClientState {
  requestSecret: string;
  requestCode?: string;
}

const readActivationState = (): ActivationClientState => {
  const statePath = getActivationStatePath();
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8')) as ActivationClientState;
    if (typeof parsed.requestSecret === 'string' && parsed.requestSecret.length >= 32) return parsed;
  } catch {}

  const state: ActivationClientState = { requestSecret: crypto.randomBytes(32).toString('hex') };
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), { encoding: 'utf8', mode: 0o600 });
  return state;
};

const writeActivationState = (state: ActivationClientState) => {
  const statePath = getActivationStatePath();
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), { encoding: 'utf8', mode: 0o600 });
};

const postActivator = async <T>(endpoint: string, body: Record<string, unknown>): Promise<T> => {
  if (!ACTIVATOR_API_URL) throw new Error('Сервіс онлайн-активації ще не налаштовано');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${ACTIVATOR_API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw new Error(String(data.message || 'Сервіс активації відхилив запит'));
    return data as T;
  } finally {
    clearTimeout(timeout);
  }
};

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

const rotateAutoBackups = async () => {
  try {
    const settings = await db.select().from(kindergartenSettings).where(eq(kindergartenSettings.id, 1)).limit(1);
    const maxCount = settings[0]?.maxBackupsCount ?? 7;

    const backupsDir = ensureBackupsDir();
    const files = fs.readdirSync(backupsDir)
      .filter((file) => file.startsWith(BACKUP_PREFIX) && file.endsWith('_auto.sqlite.gz'))
      .map((file) => {
        const fullPath = path.resolve(backupsDir, file);
        const stats = fs.statSync(fullPath);
        return { file, fullPath, mtime: stats.mtime.getTime() };
      })
      .sort((a, b) => b.mtime - a.mtime); // новые сверху

    if (files.length > maxCount) {
      const extraFiles = files.slice(maxCount);
      for (const item of extraFiles) {
        fs.unlinkSync(item.fullPath);
        console.log(`Rotated (deleted) old auto-backup file: ${item.file}`);
      }
    }
  } catch (error) {
    console.error('Помилка ротації резервних копій:', error);
  }
};

export const createCompressedBackup = async (label?: string) => {
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

  if (label === 'auto') {
    await rotateAutoBackups();
  }

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
  assertValidSadokDatabase(buffer);
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
        const durationDays = config.licenseType === 'monthly' ? 31
          : config.licenseType === 'quarterly' ? 92
          : config.licenseType === 'halfyear' ? 183
          : config.licenseType === 'demo' ? 14
          : 365;
        const expiryDate = config.licenseExpiresAt
          ? new Date(config.licenseExpiresAt)
          : new Date(activatedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
        
        isExpired = now > expiryDate;
        activatedDaysRemaining = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }
    } else {
      isExpired = daysRemaining <= 0;
    }

    let lastBackupDate: Date | null = null;
    try {
      const backupsDir = ensureBackupsDir();
      const files = fs.readdirSync(backupsDir)
        .filter((file) => file.startsWith(BACKUP_PREFIX) && file.endsWith('.sqlite.gz'));
      if (files.length > 0) {
        const stats = files.map(file => fs.statSync(path.resolve(backupsDir, file)));
        const latestStats = stats.reduce((latest, current) => current.mtime > latest.mtime ? current : latest, stats[0]);
        lastBackupDate = latestStats.mtime;
      }
    } catch (e) {
      console.error('Error finding last backup date:', e);
    }

    // Зчитуємо версію з package.json сервера
    let appVersion = '1.0.0';
    try {
      const pkgPath = path.resolve(__dirname, '../../package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        appVersion = pkg.version;
      }
    } catch (e) {
      console.error('Error reading package.json version:', e);
    }

    res.json({
      ...config,
      appVersion,
      daysRemaining: isActivated && config.licenseType !== 'lifetime' ? activatedDaysRemaining : daysRemaining,
      isActivated,
      isExpired,
      lastBackupDate: lastBackupDate ? lastBackupDate.toISOString() : null
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
    const backup = await createCompressedBackup('manual');

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

    const safetyBackup = await createCompressedBackup('before_restore');
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
    const isCompressed = originalName.toLowerCase().endsWith('.gz');
    const restoredBuffer = isCompressed
      ? zlib.gunzipSync(uploadedBuffer, { maxOutputLength: 500 * 1024 * 1024 })
      : uploadedBuffer;
    assertValidSadokDatabase(restoredBuffer);
    const safetyBackup = await createCompressedBackup('before_upload_restore');
    const dbPath = restoreDbFromBuffer(restoredBuffer);

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
    res.status(400).json({ message: 'Файл резервної копії пошкоджений або має некоректний формат' });
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
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

const getMachineIdentity = () => {
  const rawUuid = getSystemUuid();
  const machineId = crypto
    .createHash('sha256')
    .update(rawUuid + LICENSE_SALT)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();
  return { rawUuid, machineId };
};

const ensureRemoteActivationRequest = async () => {
  const { machineId } = getMachineIdentity();
  const state = readActivationState();
  const response = await postActivator<{
    requestCode: string;
    status: string;
    expiresAt?: string;
  }>('/api/activation-requests', {
    productCode: LICENSE_PRODUCT_CODE,
    machineId,
    requestSecret: state.requestSecret,
    deviceName: os.hostname(),
    osName: `${os.platform()} ${os.release()} ${os.arch()}`,
  });
  if (response.requestCode !== state.requestCode) {
    state.requestCode = response.requestCode;
    writeActivationState(state);
  }
  return { ...response, machineId, state };
};

export const getMachineId = async (req: Request, res: Response) => {
  try {
    const { rawUuid, machineId } = getMachineIdentity();
    try {
      const remote = await ensureRemoteActivationRequest();
      return res.json({ machineId: rawUuid, requestCode: remote.requestCode, localMachineCode: machineId, status: remote.status, online: true });
    } catch (remoteError) {
      console.warn('Online activation request is unavailable:', remoteError);
      return res.json({ machineId: rawUuid, requestCode: machineId, localMachineCode: machineId, status: 'offline', online: false });
    }
  } catch (error: any) {
    console.error('Error getting machine id:', error);
    res.status(500).json({ 
      message: '(v2) Системна помилка сервера при отриманні ID',
      details: error.message 
    });
  }
};

const applyLicenseToken = async (licenseKey: string, req: Request) => {
    if (!LICENSE_PUBLIC_KEY.trim()) {
      throw new Error('На сервері не налаштовано публічний ключ ліцензії');
    }

    const { rawUuid, machineId: requestCode } = getMachineIdentity();
    const verification = verifyLicenseToken(String(licenseKey).trim(), LICENSE_PUBLIC_KEY);

    if (!verification.valid || !verification.payload) {
      throw new Error(verification.reason || 'Невірний токен активації');
    }

    const payload = verification.payload;

    if (payload.iss !== LICENSE_ISSUER) {
      throw new Error('Токен видано іншим сервером активації');
    }

    if (String(payload.productCode || '').trim().toUpperCase() !== LICENSE_PRODUCT_CODE) {
      throw new Error('Цей токен не призначений для продукту SADOK');
    }

    if (String(payload.aud || '').trim().toUpperCase() !== LICENSE_PRODUCT_CODE) {
      throw new Error('Некоректна аудиторія токена ліцензії');
    }

    if (String(payload.machineId || '').trim().toUpperCase() !== requestCode) {
      throw new Error('Токен не належить цьому компʼютеру');
    }

    const normalizedPlan = String(payload.planCode || '').trim().toUpperCase();
    const typeMap: Record<string, 'lifetime' | 'annual' | 'halfyear' | 'quarterly' | 'monthly' | 'demo'> = {
      LIFETIME: 'lifetime',
      ANNUAL: 'annual',
      HALFYEAR: 'halfyear',
      QUARTERLY: 'quarterly',
      MONTHLY: 'monthly',
      DEMO: 'demo',
    };
    const type = typeMap[normalizedPlan];

    if (!type) {
      throw new Error('Невідомий тариф у токені ліцензії');
    }

    const activatedAt = typeof payload.iat === 'number'
      ? new Date(payload.iat * 1000)
      : new Date();

    const licenseData = {
      licenseKey: String(licenseKey).trim(),
      licenseType: type,
      activatedAt,
      licenseExpiresAt: payload.exp ? new Date(payload.exp * 1000) : null,
    };
    const existingSettings = await db.select({ id: kindergartenSettings.id })
      .from(kindergartenSettings)
      .where(eq(kindergartenSettings.id, 1))
      .limit(1);

    if (existingSettings.length === 0) {
      await db.insert(kindergartenSettings).values({
        id: 1,
        name: 'Заклад дошкільної освіти',
        installationDate: new Date(),
        ...licenseData,
      });
    } else {
      await db.update(kindergartenSettings)
        .set(licenseData)
        .where(eq(kindergartenSettings.id, 1));
    }

    await logAuditEvent({
      actionType: 'activate',
      entity: 'license',
      entityId: 1,
      newValue: {
        licenseType: type,
        issuer: payload.iss,
        tokenId: payload.jti,
        productCode: payload.productCode,
        customerName: payload.customerName,
        requestCode: payload.machineId,
        machineId: rawUuid,
        expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
      },
      ipAddress: getClientIp(req),
    });

    return { message: 'Програму успішно активовано!', type };
};

export const activateApp = async (req: Request, res: Response) => {
  try {
    const enteredValue = String(req.body.licenseKey || '').trim();
    if (!enteredValue) return res.status(400).json({ message: 'Ключ активації обовʼязковий' });

    let token = enteredValue;
    if (enteredValue.split('.').length !== 3) {
      const { machineId } = getMachineIdentity();
      const redeemed = await postActivator<{ token: string }>('/api/redeem', {
        activationKey: enteredValue,
        machineId,
      });
      token = redeemed.token;
    }

    const result = await applyLicenseToken(token, req);
    res.json(result);
  } catch (error) {
    console.error('Activation error:', error);
    res.status(400).json({ message: error instanceof Error ? error.message : 'Помилка при активації' });
  }
};

export const checkRemoteActivation = async (req: Request, res: Response) => {
  try {
    const remote = await ensureRemoteActivationRequest();
    const status = await postActivator<{ status: string; token?: string | null; activationKey?: string | null }>(
      '/api/activation-requests/status',
      { requestCode: remote.requestCode, requestSecret: remote.state.requestSecret },
    );

    if (status.status !== 'approved' || !status.token) {
      return res.status(202).json({
        activated: false,
        status: status.status,
        requestCode: remote.requestCode,
        message: 'Запит ще очікує підтвердження. Спробуйте ще раз трохи пізніше.',
      });
    }

    const result = await applyLicenseToken(status.token, req);
    return res.json({ ...result, activated: true, activationKey: status.activationKey || null });
  } catch (error) {
    console.error('Remote activation check failed:', error);
    return res.status(400).json({ message: error instanceof Error ? error.message : 'Не вдалося перевірити активацію' });
  }
};
