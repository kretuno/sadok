import { Router } from 'express';
import {
  addEmployeeDocumentHandler,
  assignInventoryToEmployeeHandler,
  createInventoryItemHandler,
  createEmployeeHandler,
  createInventoryForEmployeeHandler,
  getEmployeeDetailsHandler,
  getEmployeesHandler,
  getInventoryRegistryHandler,
  reassignInventoryItemHandler,
  transferInventoryBetweenEmployeesHandler,
  updateEmployeeHandler,
} from '../controllers/employees';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getEmployeesHandler);
router.get('/inventory/registry', getInventoryRegistryHandler);
router.post('/inventory', createInventoryItemHandler);
router.post('/inventory/reassign', reassignInventoryItemHandler);
router.get('/:id', getEmployeeDetailsHandler);
router.post('/', createEmployeeHandler);
router.put('/:id', updateEmployeeHandler);
router.post('/:id/documents', addEmployeeDocumentHandler);
router.post('/:id/inventory', createInventoryForEmployeeHandler);
router.post('/:id/inventory/assign', assignInventoryToEmployeeHandler);
router.post('/:id/inventory/transfer', transferInventoryBetweenEmployeesHandler);

export default router;
