import { Router } from 'express';
import { 
  getInventorySaldo, 
  getMedicationsReport, 
  getTmcReport,
  getMenusReport,
  getChildrenReport,
  getSickChildrenReport,
  getPsychologyReport,
  getAttendanceReport,
  getSpentProductsReport,
  getSpentMedicationsReport,
  getDetailedMenusReport,
  getUtilitiesReport,
  getAuditReport,
} from '../controllers/reports';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/saldo', getInventorySaldo);
router.get('/medications', getMedicationsReport);
router.get('/tmc', getTmcReport);
router.get('/menus', getMenusReport);
router.get('/children', getChildrenReport);
router.get('/sick', getSickChildrenReport);
router.get('/psychology', getPsychologyReport);
router.get('/attendance', getAttendanceReport);
router.get('/spent-products', getSpentProductsReport);
router.get('/spent-medications', getSpentMedicationsReport);
router.get('/detailed-menus', getDetailedMenusReport);
router.get('/utilities', getUtilitiesReport);
router.get('/audit', getAuditReport);

export default router;
