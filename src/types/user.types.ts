export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  EMPLOYEE = 'employee',
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
  employeeId?: string;
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
  employeeId?: string;
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
  employeeId?: string;
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

export interface CreateEmployeeAccountDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  address?: string;
  // Option 1: Link with existing employee
  employeeId?: string;
  // Option 2: Create new employee (if employeeId not provided)
  employeeData?: {
    employeeId?: string;
    email: string;
    phoneNumber?: string;
    position: string;
    department: string;
    salary?: number;
    hireDate: string;
    managerId?: string;
  };
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  newPassword: string;
}
