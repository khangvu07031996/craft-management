import { Router } from 'express';
import employeeController from '../controllers/employee.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin, requireEmployee } from '../middleware/role.middleware';
import userModel from '../models/user.model';

const router = Router();

// All employee routes require authentication
router.use(authenticate);

// GET /api/employees - Get all employees (Admin only)
router.get('/', requireAdmin, employeeController.getAllEmployees.bind(employeeController));

// GET /api/employees/stats/departments - Get employees statistics by department (Admin only)
router.get('/stats/departments', requireAdmin, employeeController.getEmployeesByDepartment.bind(employeeController));

// GET /api/employees/me - Get current employee's own info (Employee only)
router.get('/me', requireEmployee, async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const user = await userModel.getUserById(userId);
    if (!user || !user.employeeId) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    // Set params.id to user's employeeId so controller can use it
    req.params.id = user.employeeId;
    return employeeController.getEmployeeById(req, res, next);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch employee info',
      error: error.message,
    });
  }
});

// GET /api/employees/:id - Get employee by ID (Admin only, or employee getting their own)
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const employeeId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    const user = await userModel.getUserById(userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    // If user is employee, they can only get their own info
    if (user.role === 'employee') {
      if (user.employeeId !== employeeId) {
        return res.status(403).json({ success: false, message: 'You can only access your own employee information' });
      }
    } else if (user.role !== 'admin') {
      // Non-admin, non-employee users cannot access
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Use the existing controller method
    return employeeController.getEmployeeById(req, res, next);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch employee info',
      error: error.message,
    });
  }
});

// POST /api/employees - Create new employee
router.post('/', employeeController.createEmployee.bind(employeeController));

// PUT /api/employees/:id - Update employee
router.put('/:id', employeeController.updateEmployee.bind(employeeController));

// DELETE /api/employees/:id - Delete employee
router.delete('/:id', employeeController.deleteEmployee.bind(employeeController));

export default router;

