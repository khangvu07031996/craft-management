import { Request, Response } from 'express';
import userModel from '../models/user.model';
import { RegisterDto, LoginDto, UserRole } from '../types/user.types';
import { generateToken } from '../utils/jwt';
import { sanitizeError } from '../utils/sanitize';

class AuthController {
  // POST /api/auth/register - Register new user
  async register(req: Request, res: Response): Promise<void> {
    try {
      const userData: RegisterDto = req.body;

      // Validate input data
      if (!userData.email || !userData.password || !userData.firstName || !userData.lastName) {
        res.status(400).json({
          success: false,
          message: 'Email, password, firstName, and lastName are required',
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        res.status(400).json({
          success: false,
          message: 'Invalid email format',
        });
        return;
      }

      // Validate password length
      if (userData.password.length < 6) {
        res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long',
        });
        return;
      }

      // Check if email already exists
      const existingUser = await userModel.findByEmail(userData.email);
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'Email is already registered',
        });
        return;
      }

      // Set default role to 'member' if not provided
      const userDataWithRole = {
        ...userData,
        role: userData.role || UserRole.MEMBER,
      };

      // Create user
      const newUser = await userModel.createUser(userDataWithRole);

      // Generate JWT token
      const token = generateToken(newUser);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: newUser,
          token,
        },
      });
    } catch (error) {
      // Sanitize error to prevent exposing sensitive data
      const sanitizedError = sanitizeError(error);
      console.error('Register error:', sanitizedError);
      res.status(500).json({
        success: false,
        message: 'Server error during registration',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // POST /api/auth/login - Login user
  async login(req: Request, res: Response): Promise<void> {
    try {
      const loginData: LoginDto = req.body;

      // Validate input data
      if (!loginData.email || !loginData.password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
        return;
      }

      // Find user by email (with password)
      const user = await userModel.getUserByEmail(loginData.email);
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      // Verify password
      const isPasswordValid = await userModel.verifyPassword(
        loginData.password,
        user.password
      );

      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      // Remove password from user object
      const { password, ...userWithoutPassword } = user;

      // Generate JWT token
      const token = generateToken(userWithoutPassword);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: userWithoutPassword,
          token,
        },
      });
    } catch (error) {
      // Sanitize error to prevent exposing sensitive data (like password)
      const sanitizedError = sanitizeError(error);
      console.error('Login error:', sanitizedError);
      res.status(500).json({
        success: false,
        message: 'Server error during login',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // GET /api/auth/me - Get current user profile
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      const user = await userModel.getUserById(req.user.userId);
      
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching profile',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default new AuthController();

