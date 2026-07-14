import { Router } from 'express';
import {
  cancelMenuConfirmationHandler,
  confirmMenuHandler,
  getMenuByIdHandler,
  getMenuNeedsHandler,
  getMenusHandler,
  previewMenuHandler,
  upsertMenuHandler,
  getMenuPrintHandler,
} from '../controllers/menus';
import { authenticateToken, authorizePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', authorizePermission('menu', 'view'), getMenusHandler);
router.post('/preview', authorizePermission('menu', 'edit'), previewMenuHandler);
router.get('/:id', authorizePermission('menu', 'view'), getMenuByIdHandler);
router.get('/:id/needs', authorizePermission('menu', 'view'), getMenuNeedsHandler);
router.post('/', authorizePermission('menu', 'edit'), upsertMenuHandler);
router.post('/:id/confirm', authorizePermission('menu', 'edit'), confirmMenuHandler);
router.post('/:id/cancel-confirmation', authorizePermission('menu', 'edit'), cancelMenuConfirmationHandler);
router.get('/:id/print', authorizePermission('menu', 'print'), getMenuPrintHandler);

export default router;
