import { Router } from 'express';
import { authenticateToken, authorizePermission } from '../middleware/auth';
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

router.get('/meters', authorizePermission('utilities', 'view'), getMeters);
router.post('/meters', authorizePermission('utilities', 'edit'), createMeter);
router.put('/meters/:id', authorizePermission('utilities', 'edit'), updateMeter);

router.get('/readings', authorizePermission('utilities', 'view'), getReadings);
router.post('/readings', authorizePermission('utilities', 'edit'), createReading);

router.get('/tariffs', authorizePermission('utilities', 'view'), getTariffs);
router.post('/tariffs', authorizePermission('utilities', 'edit'), createTariff);
router.put('/tariffs/:id', authorizePermission('utilities', 'edit'), updateTariff);

export default router;
