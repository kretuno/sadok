import { Router } from 'express';
import {
  getAttendanceHandler,
  getAttendanceSummaryHandler,
  saveAttendanceHandler,
} from '../controllers/attendance';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getAttendanceHandler);
router.post('/', saveAttendanceHandler);
router.get('/summary', getAttendanceSummaryHandler);

export default router;
