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
import { authenticateToken, authorizeAnyPermission, authorizePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get(
  '/',
  authorizeAnyPermission(
    { module: 'employees', action: 'view' },
    { module: 'children', action: 'view' },
    { module: 'property', action: 'view' }
  ),
  getEmployeesHandler
);
router.get('/inventory/registry', authorizePermission('property', 'view'), getInventoryRegistryHandler);
router.post('/inventory', authorizePermission('property', 'edit'), createInventoryItemHandler);
router.post('/inventory/reassign', authorizePermission('property', 'edit'), reassignInventoryItemHandler);
router.get('/:id', authorizePermission('employees', 'view'), getEmployeeDetailsHandler);
router.post('/', authorizePermission('employees', 'edit'), createEmployeeHandler);
router.put('/:id', authorizePermission('employees', 'edit'), updateEmployeeHandler);
router.post('/:id/documents', authorizePermission('employees', 'edit'), addEmployeeDocumentHandler);
router.post('/:id/inventory', authorizePermission('property', 'edit'), createInventoryForEmployeeHandler);
router.post('/:id/inventory/assign', authorizePermission('property', 'edit'), assignInventoryToEmployeeHandler);
router.post('/:id/inventory/transfer', authorizePermission('property', 'edit'), transferInventoryBetweenEmployeesHandler);

export default router;
