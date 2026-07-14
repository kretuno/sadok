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
import { authenticateToken, authorizeAnyPermission, authorizePermission } from '../middleware/auth';

const router = Router();
const tempUploadDir = uploadPath('tmp');
fs.mkdirSync(tempUploadDir, { recursive: true });
const upload = multer({
  dest: tempUploadDir,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    callback(null, allowedTypes.has(file.mimetype));
  },
});

router.use(authenticateToken);

router.get(
  '/groups',
  authorizeAnyPermission(
    { module: 'children', action: 'view' },
    { module: 'menu', action: 'view' },
    { module: 'property', action: 'view' },
    { module: 'attendance', action: 'view' },
    { module: 'psychologist', action: 'view' }
  ),
  getGroupsHandler
);
router.post('/groups', authorizePermission('children', 'edit'), createGroupHandler);
router.get('/groups/:id', authorizePermission('children', 'view'), getGroupDetailsHandler);
router.put('/groups/:id', authorizePermission('children', 'edit'), updateGroupHandler);
router.get('/', authorizePermission('children', 'view'), getChildrenHandler);
router.post('/', authorizePermission('children', 'edit'), createChildHandler);
router.patch(
  '/:id/archive',
  authorizeAnyPermission(
    { module: 'children', action: 'delete' },
    { module: 'medical', action: 'delete' }
  ),
  archiveChildHandler
);
router.post('/:id/regenerate-qr', authorizePermission('children', 'edit'), regenerateQRTokenHandler);
router.post(
  '/:id/photo',
  authorizeAnyPermission(
    { module: 'children', action: 'edit' },
    { module: 'medical', action: 'edit' }
  ),
  upload.single('photo'),
  uploadChildPhotoHandler
);
router.patch(
  '/:id',
  authorizeAnyPermission(
    { module: 'children', action: 'edit' },
    { module: 'medical', action: 'edit' }
  ),
  updateChildHandler
);

export default router;
