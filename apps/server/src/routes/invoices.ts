import { Router } from 'express';
import { createInvoiceHandler, deleteInvoiceHandler, getInvoiceById, getInvoices, postInvoiceHandler } from '../controllers/invoices';
import { authenticateToken, authorizeAnyPermission, authorizePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
const viewInvoices = authorizeAnyPermission(
  { module: 'inventory', action: 'view' },
  { module: 'menu', action: 'view' }
);
const editInvoices = authorizeAnyPermission(
  { module: 'inventory', action: 'edit' },
  { module: 'menu', action: 'edit' }
);

router.get('/', viewInvoices, getInvoices);
router.get('/:id', viewInvoices, getInvoiceById);
router.post('/', editInvoices, createInvoiceHandler);
router.post('/:id/post', authorizePermission('inventory', 'edit'), postInvoiceHandler);
router.delete('/:id', authorizePermission('inventory', 'delete'), deleteInvoiceHandler);

export default router;
