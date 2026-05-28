import { Router } from 'express';
import { getMessages, getUnreadCounts, markAsRead } from '../controllers/chat';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/unread', authenticateToken, getUnreadCounts);
router.patch('/read', authenticateToken, markAsRead);
router.get('/', authenticateToken, getMessages);

export default router;
