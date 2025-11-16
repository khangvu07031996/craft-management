import { Request, Response } from 'express';
import monthlySalaryModel from '../models/monthlySalary.model';
import { CalculateMonthlySalaryDto } from '../types/work.types';

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
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate monthly salary',
      error: error.message,
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

