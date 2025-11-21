import { Request, Response } from 'express';
import workRecordModel from '../models/workRecord.model';
import workTypeModel from '../models/workType.model';
import { CreateWorkRecordDto, UpdateWorkRecordDto } from '../types/work.types';

export const getAllWorkRecords = async (req: Request, res: Response) => {
  try {
    const { employee_id, date_from, date_to, work_type_id, status, page = '1', page_size = '10' } = req.query;

    const filters = {
      employeeId: employee_id as string | undefined,
      dateFrom: date_from as string | undefined,
      dateTo: date_to as string | undefined,
      workTypeId: work_type_id as string | undefined,
      status: status as string | undefined,
    };

    // Debug logging
    console.log('WorkRecordController.getAllWorkRecords - Query params:', req.query);
    console.log('WorkRecordController.getAllWorkRecords - Filters:', filters);

    const result = await workRecordModel.getAllWorkRecords(
      filters,
      parseInt(page as string),
      parseInt(page_size as string)
    );

    console.log('WorkRecordController.getAllWorkRecords - Result count:', result.workRecords.length);

    return res.json({
      success: true,
      data: result.workRecords,
      pagination: {
        page: parseInt(page as string),
        pageSize: parseInt(page_size as string),
        total: result.total,
        totalPages: Math.ceil(result.total / parseInt(page_size as string)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching work records:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch work records',
      error: error.message,
    });
  }
};

export const getWorkRecordById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workRecord = await workRecordModel.getWorkRecordById(id);

    if (!workRecord) {
      return res.status(404).json({
        success: false,
        message: 'Work record not found',
      });
    }

    return res.json({
      success: true,
      data: workRecord,
    });
  } catch (error: any) {
    console.error('Error fetching work record:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch work record',
      error: error.message,
    });
  }
};

export const createWorkRecord = async (req: Request, res: Response) => {
  try {
    const workRecordData: CreateWorkRecordDto = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!workRecordData.employeeId || !workRecordData.workDate || !workRecordData.workTypeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, work date, and work type ID are required',
      });
    }

    if (workRecordData.quantity === undefined || workRecordData.quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be greater than 0',
      });
    }

    // Validate overtime fields
    if (workRecordData.isOvertime) {
      // Get work type to check calculation type
      const workType = await workTypeModel.getWorkTypeById(workRecordData.workTypeId);
      if (!workType) {
        return res.status(400).json({
          success: false,
          message: 'Work type not found',
        });
      }

      if (workType.calculationType === 'weld_count') {
        if (!workRecordData.overtimeQuantity || workRecordData.overtimeQuantity <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Số lượng hàng tăng ca là bắt buộc và phải lớn hơn 0',
          });
        }
      } else if (workType.calculationType === 'hourly') {
        if (!workRecordData.overtimeHours || workRecordData.overtimeHours <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Số giờ tăng ca là bắt buộc và phải lớn hơn 0',
          });
        }
      }
    }

    const workRecord = await workRecordModel.createWorkRecord(workRecordData, userId);

    return res.status(201).json({
      success: true,
      data: workRecord,
      message: 'Work record created successfully',
    });
  } catch (error: any) {
    console.error('Error creating work record:', error);
    // Check if it's a validation error (quantity exceeded or hours exceeded)
    const isValidationError = error.message && (
      error.message.includes('vượt quá số lượng cần làm') ||
      error.message.includes('vượt quá 24 giờ') ||
      error.message.includes('Work item not found') ||
      error.message.includes('Work item is required')
    );
    const statusCode = isValidationError ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create work record',
      error: error.message,
    });
  }
};

export const updateWorkRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workRecordData: UpdateWorkRecordDto = req.body;

    if (workRecordData.quantity !== undefined && workRecordData.quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be greater than 0',
      });
    }

    // Validate overtime fields
    if (workRecordData.isOvertime) {
      // Get existing record to determine work type
      const existing = await workRecordModel.getWorkRecordById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Work record not found',
        });
      }

      const workTypeId = workRecordData.workTypeId || existing.workTypeId;
      const workType = await workTypeModel.getWorkTypeById(workTypeId);
      if (!workType) {
        return res.status(400).json({
          success: false,
          message: 'Work type not found',
        });
      }

      if (workType.calculationType === 'weld_count') {
        if (!workRecordData.overtimeQuantity || workRecordData.overtimeQuantity <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Số lượng hàng tăng ca là bắt buộc và phải lớn hơn 0',
          });
        }
      } else if (workType.calculationType === 'hourly') {
        if (!workRecordData.overtimeHours || workRecordData.overtimeHours <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Số giờ tăng ca là bắt buộc và phải lớn hơn 0',
          });
        }
      }
    }

    const workRecord = await workRecordModel.updateWorkRecord(id, workRecordData);

    if (!workRecord) {
      return res.status(404).json({
        success: false,
        message: 'Work record not found',
      });
    }

    return res.json({
      success: true,
      data: workRecord,
      message: 'Work record updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating work record:', error);
    // Check if it's a validation error (quantity exceeded or hours exceeded)
    const isValidationError = error.message && (
      error.message.includes('vượt quá số lượng cần làm') ||
      error.message.includes('vượt quá 24 giờ') ||
      error.message.includes('Work item not found') ||
      error.message.includes('Work item is required')
    );
    const statusCode = isValidationError ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update work record',
      error: error.message,
    });
  }
};

export const deleteWorkRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await workRecordModel.deleteWorkRecord(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Work record not found',
      });
    }

    return res.json({
      success: true,
      message: 'Work record deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting work record:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete work record',
      error: error.message,
    });
  }
};

export const getWorkRecordsByEmployeeAndMonth = async (req: Request, res: Response) => {
  try {
    const { employee_id, year, month } = req.query;

    if (!employee_id || !year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, year, and month are required',
      });
    }

    const employeeId = employee_id as string;
    const yearNum = parseInt(year as string);
    const monthNum = parseInt(month as string);

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Month must be between 1 and 12',
      });
    }

    const workRecords = await workRecordModel.getWorkRecordsByEmployeeAndMonth(
      employeeId,
      yearNum,
      monthNum
    );

    return res.json({
      success: true,
      data: workRecords,
    });
  } catch (error: any) {
    console.error('Error fetching work records by employee and month:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch work records',
      error: error.message,
    });
  }
};

export const getWorkRecordsByMonthlySalaryId = async (req: Request, res: Response) => {
  try {
    const { monthly_salary_id } = req.params;

    if (!monthly_salary_id) {
      return res.status(400).json({
        success: false,
        message: 'Monthly salary ID is required',
      });
    }

    const workRecords = await workRecordModel.getWorkRecordsByMonthlySalaryId(monthly_salary_id);

    return res.json({
      success: true,
      data: workRecords,
    });
  } catch (error: any) {
    console.error('Error fetching work records by monthly salary ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch work records',
      error: error.message,
    });
  }
};

export const getTotalQuantityMadeByWorkItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { excludeRecordId } = req.query;
    const totalQuantity = await workRecordModel.getTotalQuantityMadeByWorkItem(
      id,
      excludeRecordId as string | undefined
    );

    return res.json({
      success: true,
      data: {
        workItemId: id,
        totalQuantityMade: totalQuantity,
      },
    });
  } catch (error: any) {
    console.error('Error fetching total quantity made by work item:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch total quantity made',
      error: error.message,
    });
  }
};

export const getTotalHoursWorkedInDay = async (req: Request, res: Response) => {
  try {
    const { employeeId, workDate } = req.params;
    const { excludeRecordId } = req.query;
    const totalHours = await workRecordModel.getTotalHoursWorkedInDay(
      employeeId,
      workDate,
      excludeRecordId as string | undefined
    );

    return res.json({
      success: true,
      data: {
        employeeId,
        workDate,
        totalHoursWorked: totalHours,
      },
    });
  } catch (error: any) {
    console.error('Error fetching total hours worked in day:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch total hours worked',
      error: error.message,
    });
  }
};
