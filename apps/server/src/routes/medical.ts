import { Router } from 'express';
import {
  getMedicalChildren,
  getChildMedicalDetails,
  updateChildMedicalCard,
  createChildMeasurement,
  getIllnesses,
  createIllness,
  updateIllness,
  getVaccinations,
  createVaccination,
  updateVaccination,
  getMedications,
  getMedicationMovements,
  createMedication,
  spendMedication
} from '../controllers/medical';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Children
router.get('/children', getMedicalChildren);
router.get('/children/:childId', getChildMedicalDetails);
router.put('/children/:childId/card', updateChildMedicalCard);
router.post('/children/:childId/measurements', createChildMeasurement);

// Illnesses
router.get('/illnesses', getIllnesses);
router.post('/illnesses', createIllness);
router.put('/illnesses/:id', updateIllness);

// Vaccinations
router.get('/vaccinations', getVaccinations);
router.post('/vaccinations', createVaccination);
router.put('/vaccinations/:id', updateVaccination);

// Medications
router.get('/medications/movements', getMedicationMovements);
router.get('/medications', getMedications);
router.post('/medications', createMedication);
router.post('/medications/spend', spendMedication);

export default router;
