import { Router } from 'express';
import { 
  getAllUsers, 
  createUser, 
  updateUser, 
  deleteUser 
} from '../controllers/users';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

// Middleware для перевірки, що користувач - адмін. 
// В реальному проекті тут би була інтеграція з authMiddleware.
// Для демо ми можемо пропускати перевірку тут або зробити її в майбутньому.

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles('admin'));

router.get('/', getAllUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
