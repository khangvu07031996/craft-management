import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// POST /api/auth/register - Register new user
router.post('/register', authController.register.bind(authController));

// POST /api/auth/login - Login user
router.post('/login', authController.login.bind(authController));

// GET /api/auth/me - Get current user profile (protected route)
router.get('/me', authenticate, authController.getProfile.bind(authController));

// PUT /api/auth/change-password - Change password (protected route)
router.put('/change-password', authenticate, authController.changePassword.bind(authController));

export default router;
