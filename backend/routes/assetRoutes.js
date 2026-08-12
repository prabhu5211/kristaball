import { Router } from 'express';
import {
  getDashboardMetrics,
  getInventorySummary,
  getBases,
  getEquipmentTypes,
  getAuditLogs,
} from '../controllers/assetController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { enforceBaseScope, authorizeRoles } from '../middlewares/rbacMiddleware.js';

const router = Router();

// All routes require auth
router.use(authenticateToken);

router.get('/dashboard',        enforceBaseScope, getDashboardMetrics);
router.get('/summary',          enforceBaseScope, getInventorySummary);
router.get('/bases',            getBases);
router.get('/equipment-types',  getEquipmentTypes);
router.get('/audit-logs',       authorizeRoles('ADMIN'), getAuditLogs);

export default router;
