import { Router } from 'express';
import { login, getMe, register, getUsers } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/rbacMiddleware.js';

const router = Router();

router.post('/login',    login);
router.get('/me',        authenticateToken, getMe);
router.post('/register', authenticateToken, authorizeRoles('ADMIN'), register);
router.get('/users',     authenticateToken, authorizeRoles('ADMIN'), getUsers);

export default router;
