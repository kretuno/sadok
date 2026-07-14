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
import { authenticateToken, authorizeAnyPermission, authorizePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

const canViewReports = authorizePermission('reports', 'view');

router.get('/saldo', canViewReports, getInventorySaldo);
router.get('/medications', canViewReports, getMedicationsReport);
router.get('/tmc', canViewReports, getTmcReport);
router.get('/menus', canViewReports, getMenusReport);
router.get('/children', canViewReports, getChildrenReport);
router.get('/sick', canViewReports, getSickChildrenReport);
router.get('/psychology', canViewReports, getPsychologyReport);
router.get('/attendance', canViewReports, getAttendanceReport);
router.get('/spent-products', canViewReports, getSpentProductsReport);
router.get('/spent-medications', canViewReports, getSpentMedicationsReport);
router.get('/detailed-menus', canViewReports, getDetailedMenusReport);
router.get(
  '/utilities',
  authorizeAnyPermission(
    { module: 'reports', action: 'view' },
    { module: 'utilities', action: 'print' }
  ),
  getUtilitiesReport
);
router.get('/audit', canViewReports, getAuditReport);

export default router;
