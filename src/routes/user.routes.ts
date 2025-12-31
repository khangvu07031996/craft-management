import { Router } from 'express';
import userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin, requireMember } from '../middleware/role.middleware';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// GET /api/users - Get all users (Admin only)
router.get('/', requireAdmin, userController.getAllUsers.bind(userController));

// POST /api/users - Create new user (Admin only)
router.post('/', requireAdmin, userController.createUser.bind(userController));

// POST /api/users/create-employee-account - Create employee account (Admin only)
router.post('/create-employee-account', requireAdmin, userController.createEmployeeAccount.bind(userController));

// POST /api/users/:id/reset-password - Reset user password (Admin only)
router.post('/:id/reset-password', requireAdmin, userController.resetUserPassword.bind(userController));

// GET /api/users/:id - Get user by ID (Member or Admin)
router.get('/:id', requireMember, userController.getUserById.bind(userController));

// PUT /api/users/:id - Update user (Admin only)
router.put('/:id', requireAdmin, userController.updateUser.bind(userController));

// DELETE /api/users/:id - Delete user (Admin only)
router.delete('/:id', requireAdmin, userController.deleteUser.bind(userController));

export default router;
