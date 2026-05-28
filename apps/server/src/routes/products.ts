import { Router } from 'express';
import {
  archiveProductHandler,
  createProductHandler,
  getProductCardHandler,
  getProducts,
  updateProductHandler,
  addProductStockManuallyHandler,
  adjustProductStockHandler,
} from '../controllers/products';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.get('/', getProducts);
router.post('/', createProductHandler);
router.get('/:id/card', getProductCardHandler);
router.post('/:id/manual-restock', addProductStockManuallyHandler);
router.post('/:id/adjustments', adjustProductStockHandler);
router.patch('/:id', updateProductHandler);
router.delete('/:id', archiveProductHandler);

export default router;
