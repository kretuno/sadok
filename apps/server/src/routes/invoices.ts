import { Router } from 'express';
import { createInvoiceHandler, deleteInvoiceHandler, getInvoiceById, getInvoices, postInvoiceHandler } from '../controllers/invoices';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.get('/', getInvoices);
router.get('/:id', getInvoiceById);
router.post('/', createInvoiceHandler);
router.post('/:id/post', postInvoiceHandler);
router.delete('/:id', deleteInvoiceHandler);

export default router;
