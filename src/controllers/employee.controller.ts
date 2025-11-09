import { Request, Response } from 'express';
import employeeModel from '../models/employee.model';
import { CreateEmployeeDto, UpdateEmployeeDto } from '../types/employee.types';

class EmployeeController {
  // GET /api/employees - Get all employees
  async getAllEmployees(req: Request, res: Response): Promise<void> {
    try {
      const { department, managerId, email, name, phoneNumber, page, pageSize, sortBy, sortOrder } = req.query;

      // Parse pagination parameters with defaults
      const pageNum = page ? Math.max(1, parseInt(page as string, 10)) : 1;
      const pageSizeNum = pageSize ? Math.max(1, Math.min(100, parseInt(pageSize as string, 10))) : 10; // Max 100 per page

      const result = await employeeModel.getAllEmployees(
        department as string | undefined,
        managerId as string | undefined,
        email as string | undefined,
        name as string | undefined,
        phoneNumber as string | undefined,
        pageNum,
        pageSizeNum,
        sortBy as string | undefined,
        (sortOrder as 'asc' | 'desc') || 'desc'
      );

      const totalPages = Math.ceil(result.total / pageSizeNum);

      res.status(200).json({
        success: true,
        data: result.employees,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total: result.total,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPreviousPage: pageNum > 1,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error while fetching employees',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // GET /api/employees/stats/departments - Get employees statistics by department
  async getEmployeesByDepartment(req: Request, res: Response): Promise<void> {
    try {
      console.log('getEmployeesByDepartment: Fetching department stats...');
      const stats = await employeeModel.getEmployeesByDepartment();
      console.log('getEmployeesByDepartment: Stats retrieved:', stats);
      
      // Set headers to prevent caching
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('getEmployeesByDepartment: Error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching department statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // GET /api/employees/:id - Get employee by ID
  async getEmployeeById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const employee = await employeeModel.getEmployeeById(id);

      if (!employee) {
        res.status(404).json({
          success: false,
          message: `Employee not found with ID: ${id}`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: employee,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error while fetching employee',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // POST /api/employees - Create new employee
  async createEmployee(req: Request, res: Response): Promise<void> {
    try {
      const employeeData: CreateEmployeeDto = req.body;

      // Validate required fields
      if (!employeeData.firstName || !employeeData.lastName || !employeeData.email ||
          !employeeData.position || !employeeData.department || !employeeData.hireDate) {
        res.status(400).json({
          success: false,
          message: 'firstName, lastName, email, position, department, and hireDate are required',
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(employeeData.email)) {
        res.status(400).json({
          success: false,
          message: 'Invalid email format',
        });
        return;
      }

      // Validate hire date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(employeeData.hireDate)) {
        res.status(400).json({
          success: false,
          message: 'Invalid hireDate format. Use YYYY-MM-DD',
        });
        return;
      }

      // Check if email already exists
      const existingEmployeeByEmail = await employeeModel.findByEmail(employeeData.email);
      if (existingEmployeeByEmail) {
        res.status(409).json({
          success: false,
          message: 'Email is already registered',
        });
        return;
      }

      // Check if employee_id already exists (if provided)
      if (employeeData.employeeId) {
        const existingEmployeeById = await employeeModel.findByEmployeeId(employeeData.employeeId);
        if (existingEmployeeById) {
          res.status(409).json({
            success: false,
            message: 'Employee ID is already in use',
          });
          return;
        }
      }

      // Validate manager_id if provided
      if (employeeData.managerId) {
        const managerExists = await employeeModel.managerExists(employeeData.managerId);
        if (!managerExists) {
          res.status(400).json({
            success: false,
            message: `Manager not found with ID: ${employeeData.managerId}`,
          });
          return;
        }
      }

      const newEmployee = await employeeModel.createEmployee(employeeData);

      res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        data: newEmployee,
      });
    } catch (error) {
      console.error('Create employee error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while creating employee',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // PUT /api/employees/:id - Update employee
  async updateEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const employeeData: UpdateEmployeeDto = req.body;

      // Check if employee exists
      const existingEmployee = await employeeModel.getEmployeeById(id);
      if (!existingEmployee) {
        res.status(404).json({
          success: false,
          message: `Employee not found with ID: ${id}`,
        });
        return;
      }

      // Validate email format if provided
      if (employeeData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(employeeData.email)) {
          res.status(400).json({
            success: false,
            message: 'Invalid email format',
          });
          return;
        }

        // Check if email is already used by another employee
        const employeeWithEmail = await employeeModel.findByEmail(employeeData.email);
        if (employeeWithEmail && employeeWithEmail.id !== id) {
          res.status(409).json({
            success: false,
            message: 'Email is already registered to another employee',
          });
          return;
        }
      }

      // Validate hire date format if provided
      if (employeeData.hireDate) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(employeeData.hireDate)) {
          res.status(400).json({
            success: false,
            message: 'Invalid hireDate format. Use YYYY-MM-DD',
          });
          return;
        }
      }

      // Validate employee_id if provided
      if (employeeData.employeeId) {
        const employeeWithId = await employeeModel.findByEmployeeId(employeeData.employeeId);
        if (employeeWithId && employeeWithId.id !== id) {
          res.status(409).json({
            success: false,
            message: 'Employee ID is already in use',
          });
          return;
        }
      }

      // Validate manager_id if provided
      if (employeeData.managerId) {
        // Prevent employee from being their own manager
        if (employeeData.managerId === id) {
          res.status(400).json({
            success: false,
            message: 'Employee cannot be their own manager',
          });
          return;
        }

        const managerExists = await employeeModel.managerExists(employeeData.managerId);
        if (!managerExists) {
          res.status(400).json({
            success: false,
            message: `Manager not found with ID: ${employeeData.managerId}`,
          });
          return;
        }
      }

      const updatedEmployee = await employeeModel.updateEmployee(id, employeeData);

      res.status(200).json({
        success: true,
        message: 'Employee updated successfully',
        data: updatedEmployee,
      });
    } catch (error) {
      console.error('Update employee error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while updating employee',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // DELETE /api/employees/:id - Delete employee
  async deleteEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await employeeModel.deleteEmployee(id);
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: `Employee not found with ID: ${id}`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Employee deleted successfully',
      });
    } catch (error) {
      console.error('Delete employee error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while deleting employee',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default new EmployeeController();

