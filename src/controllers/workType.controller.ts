import { Request, Response } from 'express';
import workTypeModel from '../models/workType.model';

export const getAllWorkTypes = async (req: Request, res: Response) => {
  try {
    const { department } = req.query;
    const workTypes = await workTypeModel.getAllWorkTypes(
      department as string | undefined
    );

    return res.json({
      success: true,
      data: workTypes,
    });
  } catch (error: any) {
    console.error('Error fetching work types:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch work types',
      error: error.message,
    });
  }
};

export const getWorkTypeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workType = await workTypeModel.getWorkTypeById(id);

    if (!workType) {
      return res.status(404).json({
        success: false,
        message: 'Work type not found',
      });
    }

    return res.json({
      success: true,
      data: workType,
    });
  } catch (error: any) {
    console.error('Error fetching work type:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch work type',
      error: error.message,
    });
  }
};

export const createWorkType = async (req: Request, res: Response) => {
  try {
    const { name, department, calculationType, unitPrice } = req.body;
    
    // Validation
    if (!name || !department || !calculationType || unitPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, department, calculation type, and unit price are required',
      });
    }

    if (!['weld_count', 'hourly', 'daily'].includes(calculationType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid calculation type. Must be weld_count, hourly, or daily',
      });
    }

    if (unitPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Unit price must be non-negative',
      });
    }

    const workType = await workTypeModel.createWorkType({
      name,
      department,
      calculationType,
      unitPrice,
    });

    return res.status(201).json({
      success: true,
      data: workType,
      message: 'Work type created successfully',
    });
  } catch (error: any) {
    console.error('Error creating work type:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create work type',
      error: error.message,
    });
  }
};

export const updateWorkType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, department, calculationType, unitPrice } = req.body;

    if (calculationType && !['weld_count', 'hourly', 'daily'].includes(calculationType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid calculation type. Must be weld_count, hourly, or daily',
      });
    }

    if (unitPrice !== undefined && unitPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Unit price must be non-negative',
      });
    }

    const workType = await workTypeModel.updateWorkType(id, {
      name,
      department,
      calculationType,
      unitPrice,
    });

    if (!workType) {
      return res.status(404).json({
        success: false,
        message: 'Work type not found',
      });
    }

    return res.json({
      success: true,
      data: workType,
      message: 'Work type updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating work type:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update work type',
      error: error.message,
    });
  }
};

export const deleteWorkType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await workTypeModel.deleteWorkType(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Work type not found',
      });
    }

    return res.json({
      success: true,
      message: 'Work type deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting work type:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete work type',
      error: error.message,
    });
  }
};

