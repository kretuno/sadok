import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import { uploadPath } from '../paths';
import {
  createChildHandler,
  createGroupHandler,
  getChildrenHandler,
  getGroupDetailsHandler,
  getGroupsHandler,
  updateGroupHandler,
  archiveChildHandler,
  regenerateQRTokenHandler,
  updateChildHandler,
  uploadChildPhotoHandler,
} from '../controllers/children';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const tempUploadDir = uploadPath('tmp');
fs.mkdirSync(tempUploadDir, { recursive: true });
const upload = multer({ dest: tempUploadDir });

router.use(authenticateToken);

router.get('/groups', getGroupsHandler);
router.post('/groups', createGroupHandler);
router.get('/groups/:id', getGroupDetailsHandler);
router.put('/groups/:id', updateGroupHandler);
router.get('/', getChildrenHandler);
router.post('/', createChildHandler);
router.patch('/:id/archive', archiveChildHandler);
router.post('/:id/regenerate-qr', regenerateQRTokenHandler);
router.post('/:id/photo', upload.single('photo'), uploadChildPhotoHandler);
router.patch('/:id', updateChildHandler);

export default router;
