import { Request, Response } from 'express';
import userModel from '../models/user.model';
import employeeModel from '../models/employee.model';
import { CreateUserDto, UpdateUserDto, CreateEmployeeAccountDto, UserRole } from '../types/user.types';

class UserController {
  // GET /api/users - Get all users
  async getAllUsers(_req: Request, res: Response): Promise<void> {
    try {
      const users = await userModel.getAllUsers();
      res.status(200).json({
        success: true,
        data: users,
        count: users.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error while fetching users',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // GET /api/users/:id - Get user by ID
  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await userModel.getUserById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          message: `User not found with ID: ${id}`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error while fetching user',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // POST /api/users - Create new user
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const userData: CreateUserDto = req.body;

      // Validate input data
      if (!userData.email || !userData.firstName || !userData.lastName || !userData.password) {
        res.status(400).json({
          success: false,
          message: 'Email, firstName, lastName, and password are required',
        });
        return;
      }

      // Check if email already exists
      const existingUser = await userModel.findByEmail(userData.email);
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'Email is already in use',
        });
        return;
      }

      const newUser = await userModel.createUser(userData);
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: newUser,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error while creating user',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // PUT /api/users/:id - Update user
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userData: UpdateUserDto = req.body;

      // Check if user exists
      const existingUser = await userModel.getUserById(id);
      if (!existingUser) {
        res.status(404).json({
          success: false,
          message: `User not found with ID: ${id}`,
        });
        return;
      }

      // If updating email, check if new email is already taken
      if (userData.email && userData.email !== existingUser.email) {
        const emailExists = await userModel.findByEmail(userData.email);
        if (emailExists) {
          res.status(409).json({
            success: false,
            message: 'Email is already in use',
          });
          return;
        }
      }

      const updatedUser = await userModel.updateUser(id, userData);
      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error while updating user',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // DELETE /api/users/:id - Delete user
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await userModel.deleteUser(id);
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: `User not found with ID: ${id}`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error while deleting user',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // POST /api/users/create-employee-account - Create employee account
  async createEmployeeAccount(req: Request, res: Response): Promise<void> {
    try {
      const accountData: CreateEmployeeAccountDto = req.body;

      // Validate input data
      if (!accountData.email || !accountData.firstName || !accountData.lastName || !accountData.password) {
        res.status(400).json({
          success: false,
          message: 'Email, firstName, lastName, and password are required',
        });
        return;
      }

      // Check if email already exists
      const existingUser = await userModel.findByEmail(accountData.email);
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'Email is already in use',
        });
        return;
      }

      let employeeId: string | undefined;

      // Option 1: Link with existing employee
      if (accountData.employeeId) {
        const employee = await employeeModel.getEmployeeById(accountData.employeeId);
        if (!employee) {
          res.status(404).json({
            success: false,
            message: `Employee not found with ID: ${accountData.employeeId}`,
          });
          return;
        }

        // Check if employee already has an account
        const existingEmployeeUser = await userModel.getAllUsers();
        const hasAccount = existingEmployeeUser.some(u => u.employeeId === accountData.employeeId);
        if (hasAccount) {
          res.status(409).json({
            success: false,
            message: 'Employee already has an account',
          });
          return;
        }

        employeeId = accountData.employeeId;
      } 
      // Option 2: Create new employee
      else if (accountData.employeeData) {
        const { employeeData } = accountData;
        
        // Validate employee data
        if (!employeeData.email || !employeeData.position || !employeeData.department || !employeeData.hireDate) {
          res.status(400).json({
            success: false,
            message: 'Employee email, position, department, and hireDate are required',
          });
          return;
        }

        // Check if employee email already exists
        const existingEmployee = await employeeModel.findByEmail(employeeData.email);
        if (existingEmployee) {
          res.status(409).json({
            success: false,
            message: 'Employee email is already in use',
          });
          return;
        }

        // Create new employee
        const newEmployee = await employeeModel.createEmployee({
          employeeId: employeeData.employeeId,
          firstName: accountData.firstName,
          lastName: accountData.lastName,
          email: employeeData.email,
          phoneNumber: employeeData.phoneNumber || accountData.phoneNumber,
          position: employeeData.position,
          department: employeeData.department,
          salary: employeeData.salary,
          hireDate: employeeData.hireDate,
          managerId: employeeData.managerId,
        });

        employeeId = newEmployee.id;
      } else {
        res.status(400).json({
          success: false,
          message: 'Either employeeId or employeeData must be provided',
        });
        return;
      }

      // Create user with employee role
      const newUser = await userModel.createUser({
        email: accountData.email,
        password: accountData.password,
        firstName: accountData.firstName,
        lastName: accountData.lastName,
        phoneNumber: accountData.phoneNumber,
        address: accountData.address,
        role: UserRole.EMPLOYEE,
        employeeId: employeeId,
      });

      // Get employee info to return
      const employee = await employeeModel.getEmployeeById(employeeId!);

      res.status(201).json({
        success: true,
        message: 'Employee account created successfully',
        data: {
          user: newUser,
          employee: employee,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error while creating employee account',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default new UserController();

