import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/user.types';
import userModel from '../models/user.model';

// Middleware to check if user has required role(s)
export const requireRole = (...allowedRoles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      // Get user from database to check current role
      const user = await userModel.getUserById(req.user.userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Check if user has one of the allowed roles
      if (!allowedRoles.includes(user.role)) {
        res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
          currentRole: user.role,
        });
        return;
      }

      // User has required role, proceed
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error checking user authorization',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
};

// Shorthand for admin-only routes
export const requireAdmin = requireRole(UserRole.ADMIN);

// Shorthand for member or admin routes
export const requireMember = requireRole(UserRole.MEMBER, UserRole.ADMIN);

