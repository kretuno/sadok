import { Router } from 'express';
import { login, register, getUsers } from '../controllers/auth';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { createRateLimit } from '../middleware/rateLimit';
import { validateCreateUserInput, validateLoginInput } from '../middleware/validation';

const router = Router();

const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Забагато спроб входу. Спробуйте ще раз через 15 хвилин',
});

router.post('/login', loginRateLimit, validateLoginInput, login);
router.post('/register', authenticateToken, authorizeRoles('admin'), validateCreateUserInput, register);
router.get('/users', authenticateToken, getUsers);

export default router;
