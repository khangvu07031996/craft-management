import { Request, Response } from 'express';
import overtimeConfigModel from '../models/overtimeConfig.model';
import workTypeModel from '../models/workType.model';
import {
  CreateOvertimeConfigDto,
  UpdateOvertimeConfigDto,
} from '../types/work.types';

export const getAllOvertimeConfigs = async (req: Request, res: Response) => {
  try {
    const configs = await overtimeConfigModel.getAllOvertimeConfigs();
    res.json({
      success: true,
      data: configs,
    });
  } catch (error: any) {
    console.error('Error fetching overtime configs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overtime configs',
      error: error.message,
    });
  }
};

export const getOvertimeConfigByWorkTypeId = async (req: Request, res: Response) => {
  try {
    const { workTypeId } = req.params;
    const config = await overtimeConfigModel.getOvertimeConfigByWorkTypeId(workTypeId);

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Overtime config not found for this work type',
      });
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    console.error('Error fetching overtime config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overtime config',
      error: error.message,
    });
  }
};

export const createOvertimeConfig = async (req: Request, res: Response) => {
  try {
    const data: CreateOvertimeConfigDto = req.body;

    // Validate work type exists
    const workType = await workTypeModel.getWorkTypeById(data.workTypeId);
    if (!workType) {
      return res.status(404).json({
        success: false,
        message: 'Work type not found',
      });
    }

    // Validate calculation type matches config type
    if (workType.calculationType === 'weld_count') {
      // For weld_count, overtimePricePerWeld should be set
      if (data.overtimePricePerWeld === undefined || data.overtimePricePerWeld < 0) {
        return res.status(400).json({
          success: false,
          message: 'Overtime price per weld is required and must be >= 0 for weld_count work type',
        });
      }
      // Reset percentage for weld_count
      data.overtimePercentage = 0;
    } else if (workType.calculationType === 'hourly') {
      // For hourly, overtimePercentage should be set
      if (data.overtimePercentage === undefined || data.overtimePercentage < 0 || data.overtimePercentage > 100) {
        return res.status(400).json({
          success: false,
          message: 'Overtime percentage is required and must be between 0-100 for hourly work type',
        });
      }
      // Reset price per weld for hourly
      data.overtimePricePerWeld = 0;
    } else {
      // daily or other types don't support overtime config
      return res.status(400).json({
        success: false,
        message: 'Overtime config is only supported for weld_count and hourly work types',
      });
    }

    // Check if config already exists
    const existingConfig = await overtimeConfigModel.getOvertimeConfigByWorkTypeId(data.workTypeId);
    if (existingConfig) {
      return res.status(409).json({
        success: false,
        message: 'Overtime config already exists for this work type. Use update instead.',
      });
    }

    const config = await overtimeConfigModel.createOvertimeConfig(data);

    res.status(201).json({
      success: true,
      data: config,
      message: 'Overtime config created successfully',
    });
  } catch (error: any) {
    console.error('Error creating overtime config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create overtime config',
      error: error.message,
    });
  }
};

export const updateOvertimeConfig = async (req: Request, res: Response) => {
  try {
    const { workTypeId } = req.params;
    const data: UpdateOvertimeConfigDto = req.body;

    // Validate work type exists
    const workType = await workTypeModel.getWorkTypeById(workTypeId);
    if (!workType) {
      return res.status(404).json({
        success: false,
        message: 'Work type not found',
      });
    }

    // Validate calculation type matches config type
    if (workType.calculationType === 'weld_count') {
      // For weld_count, only overtimePricePerWeld should be updated
      if (data.overtimePricePerWeld !== undefined && data.overtimePricePerWeld < 0) {
        return res.status(400).json({
          success: false,
          message: 'Overtime price per weld must be >= 0',
        });
      }
      // Ignore percentage for weld_count
      if (data.overtimePercentage !== undefined) {
        data.overtimePercentage = 0;
      }
    } else if (workType.calculationType === 'hourly') {
      // For hourly, only overtimePercentage should be updated
      if (data.overtimePercentage !== undefined && (data.overtimePercentage < 0 || data.overtimePercentage > 100)) {
        return res.status(400).json({
          success: false,
          message: 'Overtime percentage must be between 0-100',
        });
      }
      // Ignore price per weld for hourly
      if (data.overtimePricePerWeld !== undefined) {
        data.overtimePricePerWeld = 0;
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Overtime config is only supported for weld_count and hourly work types',
      });
    }

    // Check if config exists, if not create it
    const existingConfig = await overtimeConfigModel.getOvertimeConfigByWorkTypeId(workTypeId);
    let config;

    if (!existingConfig) {
      // Create new config
      const createData: CreateOvertimeConfigDto = {
        workTypeId,
        overtimePricePerWeld: data.overtimePricePerWeld || 0,
        overtimePercentage: data.overtimePercentage || 0,
      };
      config = await overtimeConfigModel.createOvertimeConfig(createData);
    } else {
      // Update existing config
      config = await overtimeConfigModel.updateOvertimeConfig(workTypeId, data);
    }

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Overtime config not found',
      });
    }

    res.json({
      success: true,
      data: config,
      message: 'Overtime config updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating overtime config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update overtime config',
      error: error.message,
    });
  }
};

export const deleteOvertimeConfig = async (req: Request, res: Response) => {
  try {
    const { workTypeId } = req.params;
    const deleted = await overtimeConfigModel.deleteOvertimeConfig(workTypeId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Overtime config not found',
      });
    }

    res.json({
      success: true,
      message: 'Overtime config deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting overtime config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete overtime config',
      error: error.message,
    });
  }
};

