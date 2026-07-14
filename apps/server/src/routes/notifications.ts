import { Router } from 'express';
import {
  dismissNotificationHandler,
  getNotifications,
  readAllNotifications,
  readNotification,
  snoozeNotificationHandler,
} from '../controllers/notifications';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.get('/', getNotifications);
router.post('/read-all', readAllNotifications);
router.patch('/:id/read', readNotification);
router.patch('/:id/snooze', snoozeNotificationHandler);
router.patch('/:id/dismiss', dismissNotificationHandler);

export default router;
