import { Router } from 'express';
import employeeController from '../controllers/employee.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

// All employee routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// GET /api/employees - Get all employees
router.get('/', employeeController.getAllEmployees.bind(employeeController));

// GET /api/employees/stats/departments - Get employees statistics by department
router.get('/stats/departments', employeeController.getEmployeesByDepartment.bind(employeeController));

// GET /api/employees/:id - Get employee by ID
router.get('/:id', employeeController.getEmployeeById.bind(employeeController));

// POST /api/employees - Create new employee
router.post('/', employeeController.createEmployee.bind(employeeController));

// PUT /api/employees/:id - Update employee
router.put('/:id', employeeController.updateEmployee.bind(employeeController));

// DELETE /api/employees/:id - Delete employee
router.delete('/:id', employeeController.deleteEmployee.bind(employeeController));

export default router;

