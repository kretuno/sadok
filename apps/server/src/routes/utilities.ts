import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createMeter,
  createReading,
  createTariff,
  getMeters,
  getReadings,
  getTariffs,
  updateMeter,
  updateTariff,
} from '../controllers/utilities';

const router = Router();

router.use(authenticateToken);

router.get('/meters', getMeters);
router.post('/meters', createMeter);
router.put('/meters/:id', updateMeter);

router.get('/readings', getReadings);
router.post('/readings', createReading);

router.get('/tariffs', getTariffs);
router.post('/tariffs', createTariff);
router.put('/tariffs/:id', updateTariff);

export default router;
