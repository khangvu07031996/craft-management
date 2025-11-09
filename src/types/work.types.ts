export enum CalculationType {
  WELD_COUNT = 'weld_count',
  HOURLY = 'hourly',
  DAILY = 'daily',
}

export enum DifficultyLevel {
  EASY = 'dễ',
  MEDIUM = 'trung bình',
  HARD = 'khó',
}

export enum MonthlySalaryStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  PAID = 'paid',
}

// Work Type
export interface WorkType {
  id: string;
  name: string;
  department: string;
  calculationType: CalculationType;
  unitPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkTypeResponse {
  id: string;
  name: string;
  department: string;
  calculationType: CalculationType;
  unitPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkTypeDto {
  name: string;
  department: string;
  calculationType: CalculationType;
  unitPrice: number;
}

export interface UpdateWorkTypeDto {
  name?: string;
  department?: string;
  calculationType?: CalculationType;
  unitPrice?: number;
}

// Work Item
export interface WorkItem {
  id: string;
  name: string;
  difficultyLevel: DifficultyLevel;
  pricePerWeld: number;
  totalQuantity: number;
  weldsPerItem: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkItemResponse {
  id: string;
  name: string;
  difficultyLevel: DifficultyLevel;
  pricePerWeld: number;
  totalQuantity: number;
  weldsPerItem: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkItemDto {
  name: string;
  difficultyLevel: DifficultyLevel;
  pricePerWeld: number;
  totalQuantity: number;
  weldsPerItem: number;
}

export interface UpdateWorkItemDto {
  name?: string;
  difficultyLevel?: DifficultyLevel;
  pricePerWeld?: number;
  totalQuantity?: number;
  weldsPerItem?: number;
}

// Work Record
export interface WorkRecord {
  id: string;
  employeeId: string;
  workDate: Date;
  workTypeId: string;
  workItemId?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

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
    calculationType: CalculationType;
  };
  workItemId?: string;
  workItem?: {
    id: string;
    name: string;
    difficultyLevel: DifficultyLevel;
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
  createdAt: string;
  updatedAt: string;
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

// Monthly Salary
export interface MonthlySalary {
  id: string;
  employeeId: string;
  year: number;
  month: number;
  totalWorkDays: number;
  totalAmount: number;
  status: MonthlySalaryStatus;
  createdAt: Date;
  updatedAt: Date;
}

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
  status: MonthlySalaryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CalculateMonthlySalaryDto {
  employeeId: string;
  year: number;
  month: number;
}

// Work Report
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

export interface WorkReportParams {
  year: number;
  month?: number;
  week?: number;
  department?: string;
  employeeId?: string;
}

