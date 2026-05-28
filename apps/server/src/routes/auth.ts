import { Router } from 'express';
import { login, register, getUsers } from '../controllers/auth';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/register', register); // У майбутньому закрити лише для адміна
router.get('/users', authenticateToken, getUsers);

export default router;
