import { Router } from 'express';
import { createPurchase, getPurchases, deletePurchase } from '../controllers/purchaseController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { authorizeRoles, enforceBaseScope } from '../middlewares/rbacMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/',    enforceBaseScope, getPurchases);
router.post('/',   authorizeRoles('ADMIN', 'LOGISTICS_OFFICER', 'BASE_COMMANDER'), createPurchase);
router.delete('/:id', authorizeRoles('ADMIN'), deletePurchase);

export default router;
