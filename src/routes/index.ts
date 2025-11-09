import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import employeeRoutes from './employee.routes';
import workRoutes from './work.routes';

const router = Router();

// Register routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/employees', employeeRoutes);
router.use('/work', workRoutes);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
