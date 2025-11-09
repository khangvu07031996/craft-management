import { Request, Response } from 'express';
import userModel from '../models/user.model';
import { CreateUserDto, UpdateUserDto } from '../types/user.types';

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
}

export default new UserController();

