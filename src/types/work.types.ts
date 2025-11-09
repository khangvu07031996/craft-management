// Work Type Types
export interface WorkTypeResponse {
  id: string;
  name: string;
  department: string;
  calculationType: 'hourly' | 'daily' | 'weld_count';
  unitPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

// Work Item Types
export interface WorkItemResponse {
  id: string;
  name: string;
  difficultyLevel: string;
  pricePerWeld: number;
  totalQuantity: number;
  weldsPerItem: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkItemDto {
  name: string;
  difficultyLevel: string;
  pricePerWeld: number;
  totalQuantity: number;
  weldsPerItem: number;
}

export interface UpdateWorkItemDto {
  name?: string;
  difficultyLevel?: string;
  pricePerWeld?: number;
  totalQuantity?: number;
  weldsPerItem?: number;
}

// Work Record Types
export interface WorkRecordResponse {
  id: string;
  employeeId: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  workDate: string;
  workTypeId: string;
  workType?: {
    id: string;
    name: string;
    calculationType: string;
  };
  workItemId?: string;
  workItem?: {
    id: string;
    name: string;
    difficultyLevel: string;
  };
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  notes?: string;
  createdBy: string;
  createdByUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkRecordDto {
  employeeId: string;
  workDate: string;
  workTypeId: string;
  workItemId?: string;
  quantity: number;
  unitPrice?: number;
  notes?: string;
}

export interface UpdateWorkRecordDto {
  employeeId?: string;
  workDate?: string;
  workTypeId?: string;
  workItemId?: string;
  quantity?: number;
  unitPrice?: number;
  notes?: string;
}

// Monthly Salary Types
export interface MonthlySalaryResponse {
  id: string;
  employeeId: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  year: number;
  month: number;
  totalWorkDays: number;
  totalAmount: number;
  status: 'draft' | 'confirmed' | 'paid';
  createdAt: Date;
  updatedAt: Date;
}

export interface CalculateMonthlySalaryDto {
  employeeId: string;
  year: number;
  month: number;
}

// Work Report Types
export interface WorkReport {
  period: string;
  totalEmployees: number;
  totalWorkDays: number;
  totalAmount: number;
  byDepartment: Array<{
    department: string;
    totalAmount: number;
    totalWorkDays: number;
  }>;
  byWorkType: Array<{
    workTypeName: string;
    totalAmount: number;
    count: number;
  }>;
}

// Overtime Config Types
export interface OvertimeConfigResponse {
  id: string;
  workTypeId: string;
  workType?: {
    id: string;
    name: string;
    department: string;
    calculationType: string;
  };
  overtimePricePerWeld: number;
  overtimePercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOvertimeConfigDto {
  workTypeId: string;
  overtimePricePerWeld?: number;
  overtimePercentage?: number;
}

export interface UpdateOvertimeConfigDto {
  overtimePricePerWeld?: number;
  overtimePercentage?: number;
}

