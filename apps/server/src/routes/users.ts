import { Router } from 'express';
import { 
  getAllUsers, 
  createUser, 
  updateUser, 
  deleteUser 
} from '../controllers/users';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import {
  validateCreateUserInput,
  validateNumericId,
  validateUpdateUserInput,
} from '../middleware/validation';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles('admin'));

router.get('/', getAllUsers);
router.post('/', validateCreateUserInput, createUser);
router.put('/:id', validateNumericId, validateUpdateUserInput, updateUser);
router.delete('/:id', validateNumericId, deleteUser);

export default router;
