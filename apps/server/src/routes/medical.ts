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
import { authenticateToken, authorizePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Children
router.get('/children', authorizePermission('medical', 'view'), getMedicalChildren);
router.get('/children/:childId', authorizePermission('medical', 'view'), getChildMedicalDetails);
router.put('/children/:childId/card', authorizePermission('medical', 'edit'), updateChildMedicalCard);
router.post('/children/:childId/measurements', authorizePermission('medical', 'edit'), createChildMeasurement);

// Illnesses
router.get('/illnesses', authorizePermission('medical', 'view'), getIllnesses);
router.post('/illnesses', authorizePermission('medical', 'edit'), createIllness);
router.put('/illnesses/:id', authorizePermission('medical', 'edit'), updateIllness);

// Vaccinations
router.get('/vaccinations', authorizePermission('medical', 'view'), getVaccinations);
router.post('/vaccinations', authorizePermission('medical', 'edit'), createVaccination);
router.put('/vaccinations/:id', authorizePermission('medical', 'edit'), updateVaccination);

// Medications
router.get('/medications/movements', authorizePermission('medical', 'view'), getMedicationMovements);
router.get('/medications', authorizePermission('medical', 'view'), getMedications);
router.post('/medications', authorizePermission('medical', 'edit'), createMedication);
router.post('/medications/spend', authorizePermission('medical', 'edit'), spendMedication);

export default router;
