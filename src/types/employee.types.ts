export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface Employee {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  position: string;
  department: string;
  salary?: number;
  hire_date: Date;
  manager_id?: string;
  status: EmployeeStatus;
  created_at: Date;
  updated_at: Date;
}

export interface EmployeeResponse {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  position: string;
  department: string;
  salary?: number;
  hireDate: string;
  managerId?: string;
  status: EmployeeStatus;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  created_at: Date;
  updated_at: Date;
}

export interface CreateEmployeeDto {
  employeeId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  position: string;
  department: string;
  salary?: number;
  hireDate: string;
  managerId?: string;
  status?: EmployeeStatus;
}

export interface UpdateEmployeeDto {
  employeeId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  position?: string;
  department?: string;
  salary?: number;
  hireDate?: string;
  managerId?: string;
  status?: EmployeeStatus;
}

