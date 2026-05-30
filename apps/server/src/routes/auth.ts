import { Router } from 'express';
import { login, register, getUsers } from '../controllers/auth';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/register', authenticateToken, authorizeRoles('admin'), register);
router.get('/users', authenticateToken, getUsers);

export default router;
