import { Router } from 'express';
import { archiveSupplierHandler, createSupplierHandler, getSuppliers, updateSupplierHandler } from '../controllers/suppliers';
import { authenticateToken, authorizeAnyPermission, authorizePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.get(
  '/',
  authorizeAnyPermission(
    { module: 'inventory', action: 'view' },
    { module: 'menu', action: 'view' }
  ),
  getSuppliers
);
router.post('/', authorizePermission('inventory', 'edit'), createSupplierHandler);
router.patch('/:id', authorizePermission('inventory', 'edit'), updateSupplierHandler);
router.delete('/:id', authorizePermission('inventory', 'delete'), archiveSupplierHandler);

export default router;
