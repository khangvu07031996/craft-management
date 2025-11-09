import jwt from 'jsonwebtoken';
import { UserResponse } from '../types/user.types';

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN: string | number = process.env.JWT_EXPIRES_IN || '7d';

export interface JwtPayload {
  userId: string;
  email: string;
}

export function generateToken(user: UserResponse): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
  };

  // @ts-ignore - JWT types have issues with string | number for expiresIn
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
