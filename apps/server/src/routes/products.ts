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
import { authenticateToken, authorizeAnyPermission, authorizePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.get(
  '/',
  authorizeAnyPermission(
    { module: 'inventory', action: 'view' },
    { module: 'menu', action: 'view' }
  ),
  getProducts
);
router.post('/', authorizePermission('inventory', 'edit'), createProductHandler);
router.get('/:id/card', authorizePermission('inventory', 'view'), getProductCardHandler);
router.post(
  '/:id/manual-restock',
  authorizeAnyPermission(
    { module: 'inventory', action: 'edit' },
    { module: 'menu', action: 'edit' }
  ),
  addProductStockManuallyHandler
);
router.post('/:id/adjustments', authorizePermission('inventory', 'edit'), adjustProductStockHandler);
router.patch('/:id', authorizePermission('inventory', 'edit'), updateProductHandler);
router.delete('/:id', authorizePermission('inventory', 'delete'), archiveProductHandler);

export default router;
