import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { ensureDir, uploadPath } from '../paths';
import { 
  getSettings, 
  updateSettings, 
  downloadBackup, 
  getBackupList,
  createBackup,
  downloadBackupArchive,
  deleteBackupArchive,
  restoreBackupArchive,
  restoreBackup,
  getMachineId,
  activateApp,
  checkRemoteActivation
} from '../controllers/system';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();
const systemUploadDir = ensureDir(uploadPath('tmp'));
const upload = multer({
  dest: systemUploadDir,
  limits: { fileSize: 250 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, ['.db', '.sqlite', '.sqlite3', '.gz'].includes(extension));
  },
});

router.get('/', getSettings);
router.put('/', authenticateToken, authorizeRoles('admin'), updateSettings);
router.post('/activate', authenticateToken, authorizeRoles('admin'), activateApp);
router.post('/activation-status', authenticateToken, authorizeRoles('admin'), checkRemoteActivation);
router.get('/hwid', getMachineId);
router.get('/backup/download', authenticateToken, authorizeRoles('admin'), downloadBackup);
router.get('/backup/list', authenticateToken, authorizeRoles('admin'), getBackupList);
router.post('/backup/create', authenticateToken, authorizeRoles('admin'), createBackup);
router.get('/backup/archive/:fileName', authenticateToken, authorizeRoles('admin'), downloadBackupArchive);
router.delete('/backup/archive/:fileName', authenticateToken, authorizeRoles('admin'), deleteBackupArchive);
router.post('/backup/archive/:fileName/restore', authenticateToken, authorizeRoles('admin'), restoreBackupArchive);
router.post('/backup/restore', authenticateToken, authorizeRoles('admin'), upload.single('dbfile'), restoreBackup);

export default router;
