import { Router } from 'express';
import {
  createTransfer,
  getTransfers,
  createAssignment,
  getAssignments,
  createExpenditure,
  getExpenditures,
} from '../controllers/transferController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { authorizeRoles, enforceBaseScope } from '../middlewares/rbacMiddleware.js';

const router = Router();

router.use(authenticateToken);

// Transfers
router.get('/transfers',  enforceBaseScope, getTransfers);
router.post('/transfers', authorizeRoles('ADMIN', 'LOGISTICS_OFFICER', 'BASE_COMMANDER'), createTransfer);

// Assignments
router.get('/assignments',  enforceBaseScope, getAssignments);
router.post('/assignments', authorizeRoles('ADMIN', 'BASE_COMMANDER'), createAssignment);

// Expenditures
router.get('/expenditures',  enforceBaseScope, getExpenditures);
router.post('/expenditures', authorizeRoles('ADMIN', 'BASE_COMMANDER'), createExpenditure);

export default router;
