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
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getMenusHandler);
router.post('/preview', previewMenuHandler);
router.get('/:id', getMenuByIdHandler);
router.get('/:id/needs', getMenuNeedsHandler);
router.post('/', upsertMenuHandler);
router.post('/:id/confirm', confirmMenuHandler);
router.post('/:id/cancel-confirmation', cancelMenuConfirmationHandler);
router.get('/:id/print', getMenuPrintHandler);

export default router;
