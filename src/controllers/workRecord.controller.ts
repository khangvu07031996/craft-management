import { Request, Response } from 'express';
import workRecordModel from '../models/workRecord.model';
import { CreateWorkRecordDto, UpdateWorkRecordDto } from '../types/work.types';

export const getAllWorkRecords = async (req: Request, res: Response) => {
  try {
    const { employee_id, date_from, date_to, work_type_id, page = '1', page_size = '10' } = req.query;

    const filters = {
      employeeId: employee_id as string | undefined,
      dateFrom: date_from as string | undefined,
      dateTo: date_to as string | undefined,
      workTypeId: work_type_id as string | undefined,
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

    res.json({
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
    res.status(500).json({
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

    res.json({
      success: true,
      data: workRecord,
    });
  } catch (error: any) {
    console.error('Error fetching work record:', error);
    res.status(500).json({
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

    const workRecord = await workRecordModel.createWorkRecord(workRecordData, userId);

    res.status(201).json({
      success: true,
      data: workRecord,
      message: 'Work record created successfully',
    });
  } catch (error: any) {
    console.error('Error creating work record:', error);
    res.status(500).json({
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

    const workRecord = await workRecordModel.updateWorkRecord(id, workRecordData);

    if (!workRecord) {
      return res.status(404).json({
        success: false,
        message: 'Work record not found',
      });
    }

    res.json({
      success: true,
      data: workRecord,
      message: 'Work record updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating work record:', error);
    res.status(500).json({
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

    res.json({
      success: true,
      message: 'Work record deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting work record:', error);
    res.status(500).json({
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

    res.json({
      success: true,
      data: workRecords,
    });
  } catch (error: any) {
    console.error('Error fetching work records by employee and month:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch work records',
      error: error.message,
    });
  }
};
