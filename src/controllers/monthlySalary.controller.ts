import { Request, Response } from 'express';
import monthlySalaryModel from '../models/monthlySalary.model';
import employeeModel from '../models/employee.model';
import { CalculateMonthlySalaryDto } from '../types/work.types';
import { EmployeeStatus } from '../types/employee.types';

export const getAllMonthlySalaries = async (req: Request, res: Response) => {
  try {
    const { employee_id, year, month, page = '1', page_size = '10' } = req.query;

    const filters = {
      employeeId: employee_id as string | undefined,
      year: year ? parseInt(year as string) : undefined,
      month: month ? parseInt(month as string) : undefined,
    };

    const result = await monthlySalaryModel.getAllMonthlySalaries(
      filters,
      parseInt(page as string),
      parseInt(page_size as string)
    );

    return res.json({
      success: true,
      data: result.monthlySalaries,
      pagination: {
        page: parseInt(page as string),
        pageSize: parseInt(page_size as string),
        total: result.total,
        totalPages: Math.ceil(result.total / parseInt(page_size as string)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching monthly salaries:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly salaries',
      error: error.message,
    });
  }
};

export const getMonthlySalaryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const monthlySalary = await monthlySalaryModel.getMonthlySalaryById(id);

    if (!monthlySalary) {
      return res.status(404).json({
        success: false,
        message: 'Monthly salary not found',
      });
    }

    return res.json({
      success: true,
      data: monthlySalary,
    });
  } catch (error: any) {
    console.error('Error fetching monthly salary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly salary',
      error: error.message,
    });
  }
};

export const calculateMonthlySalary = async (req: Request, res: Response) => {
  try {
    const data: CalculateMonthlySalaryDto = req.body;

    if (!data.employeeId || !data.year || !data.month) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, year, and month are required',
      });
    }

    if (data.month < 1 || data.month > 12) {
      return res.status(400).json({
        success: false,
        message: 'Month must be between 1 and 12',
      });
    }

    const monthlySalary = await monthlySalaryModel.calculateAndSaveMonthlySalary(data);

    return res.json({
      success: true,
      data: monthlySalary,
      message: 'Monthly salary calculated and saved successfully',
    });
  } catch (error: any) {
    console.error('Error calculating monthly salary:', error);
    // If error message contains specific error about no salary data, return 400 instead of 500
    const errorMessage = error.message || 'Failed to calculate monthly salary';
    const statusCode = errorMessage.includes('Không có dữ liệu lương') || errorMessage.includes('Không tìm thấy nhân viên') ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: errorMessage,
    });
  }
};

export const updateMonthlySalaryStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { allowances } = req.body;
    if (allowances === undefined || allowances === null || Number(allowances) < 0) {
      return res.status(400).json({ success: false, message: 'allowances must be >= 0' });
    }
    const updated = await monthlySalaryModel.updateAllowances(id, Number(allowances));
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Monthly salary not found' });
    }
    return res.json({ success: true, data: updated, message: 'Allowances updated' });
  } catch (error: any) {
    console.error('Error updating monthly salary allowances:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update monthly salary',
      error: error.message,
    });
  }
};

export const payMonthlySalary = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const paid = await monthlySalaryModel.payMonthlySalary(id);
    if (!paid) {
      return res.status(404).json({ success: false, message: 'Monthly salary not found' });
    }
    return res.json({ success: true, data: paid, message: 'Đã thanh toán bảng lương' });
  } catch (error: any) {
    console.error('Error paying monthly salary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to pay monthly salary',
      error: error.message,
    });
  }
};

export const deleteMonthlySalary = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    try {
      const ok = await monthlySalaryModel.deleteMonthlySalary(id);
      if (!ok) {
        return res.status(404).json({ success: false, message: 'Monthly salary not found' });
      }
    } catch (err: any) {
      if (err.code === 'PAID_DELETE_FORBIDDEN') {
        return res.status(409).json({ success: false, message: err.message });
      }
      throw err;
    }
    return res.json({ success: true, message: 'Đã xoá bảng lương' });
  } catch (error: any) {
    console.error('Error deleting monthly salary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete monthly salary',
      error: error.message,
    });
  }
};

export const calculateMonthlySalaryForAll = async (req: Request, res: Response) => {
  try {
    const { year, month } = req.body;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Year and month are required',
      });
    }

    if (month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: 'Month must be between 1 and 12',
      });
    }

    // Get all active employees
    const result = await employeeModel.getAllEmployees(
      undefined, // department
      undefined, // managerId
      undefined, // email
      undefined, // name
      undefined, // phoneNumber
      1, // page
      10000, // pageSize - large number to get all
      undefined, // sortBy
      'asc' // sortOrder
    );

    // Filter to only active employees
    const activeEmployees = result.employees.filter(emp => emp.status === EmployeeStatus.ACTIVE);

    const results: Array<{ employeeId: string; employeeName: string; success: boolean; message?: string }> = [];

    // Calculate salary for each active employee
    for (const employee of activeEmployees) {
      try {
        await monthlySalaryModel.calculateAndSaveMonthlySalary({
          employeeId: employee.id,
          year,
          month,
        });
        results.push({
          employeeId: employee.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          success: true,
        });
      } catch (error: any) {
        results.push({
          employeeId: employee.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          success: false,
          message: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return res.json({
      success: true,
      data: {
        total: activeEmployees.length,
        success: successCount,
        failed: failCount,
        results,
      },
      message: `Đã tính lương cho ${successCount}/${activeEmployees.length} nhân viên`,
    });
  } catch (error: any) {
    console.error('Error calculating monthly salary for all:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate monthly salary for all employees',
      error: error.message,
    });
  }
};

