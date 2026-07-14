import { Router } from 'express';
import {
  getAttendanceHandler,
  getAttendanceSummaryHandler,
  saveAttendanceHandler,
} from '../controllers/attendance';
import { authenticateToken, authorizeAnyPermission, authorizePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', authorizePermission('attendance', 'view'), getAttendanceHandler);
router.post('/', authorizePermission('attendance', 'edit'), saveAttendanceHandler);
router.get(
  '/summary',
  authorizeAnyPermission(
    { module: 'attendance', action: 'view' },
    { module: 'menu', action: 'view' }
  ),
  getAttendanceSummaryHandler
);

export default router;
