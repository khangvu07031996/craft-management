export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  address?: string;
  role: UserRole;
  age?: number;
  created_at: Date;
  updated_at: Date;
}

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  address?: string;
  role: UserRole;
  age?: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  address?: string;
  role?: UserRole;
  age?: number;
}

export interface UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
  age?: number;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  address?: string;
  role?: UserRole;
  age?: number;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}
