import { Router } from 'express';
import { archiveSupplierHandler, createSupplierHandler, getSuppliers, updateSupplierHandler } from '../controllers/suppliers';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.get('/', getSuppliers);
router.post('/', createSupplierHandler);
router.patch('/:id', updateSupplierHandler);
router.delete('/:id', archiveSupplierHandler);

export default router;
