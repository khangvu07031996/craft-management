import { Request, Response } from 'express';
import workItemModel from '../models/workItem.model';
import { CreateWorkItemDto, UpdateWorkItemDto } from '../types/work.types';

export const getAllWorkItems = async (req: Request, res: Response) => {
  try {
    const { difficulty_level } = req.query;
    const workItems = await workItemModel.getAllWorkItems(
      difficulty_level as string | undefined
    );

    return res.json({
      success: true,
      data: workItems,
    });
  } catch (error: any) {
    console.error('Error fetching work items:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch work items',
      error: error.message,
    });
  }
};

export const getWorkItemById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workItem = await workItemModel.getWorkItemById(id);

    if (!workItem) {
      return res.status(404).json({
        success: false,
        message: 'Work item not found',
      });
    }

    return res.json({
      success: true,
      data: workItem,
    });
  } catch (error: any) {
    console.error('Error fetching work item:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch work item',
      error: error.message,
    });
  }
};

export const createWorkItem = async (req: Request, res: Response) => {
  try {
    const workItemData: CreateWorkItemDto = req.body;
    
    // Validation
    if (!workItemData.name || !workItemData.difficultyLevel || workItemData.pricePerWeld === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, difficulty level, and price per weld are required',
      });
    }

    if (workItemData.pricePerWeld < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price per weld must be non-negative',
      });
    }

    if (workItemData.totalQuantity === undefined || workItemData.totalQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Total quantity must be non-negative',
      });
    }

    if (workItemData.weldsPerItem === undefined || workItemData.weldsPerItem < 0) {
      return res.status(400).json({
        success: false,
        message: 'Welds per item must be non-negative',
      });
    }

    if (workItemData.weight !== undefined && workItemData.weight < 0) {
      return res.status(400).json({
        success: false,
        message: 'Weight must be non-negative',
      });
    }

    const workItem = await workItemModel.createWorkItem(workItemData);

    return res.status(201).json({
      success: true,
      data: workItem,
      message: 'Work item created successfully',
    });
  } catch (error: any) {
    console.error('Error creating work item:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create work item',
      error: error.message,
    });
  }
};

export const updateWorkItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workItemData: UpdateWorkItemDto = req.body;

    if (workItemData.pricePerWeld !== undefined && workItemData.pricePerWeld < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price per weld must be non-negative',
      });
    }

    if (workItemData.totalQuantity !== undefined && workItemData.totalQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Total quantity must be non-negative',
      });
    }

    if (workItemData.weldsPerItem !== undefined && workItemData.weldsPerItem < 0) {
      return res.status(400).json({
        success: false,
        message: 'Welds per item must be non-negative',
      });
    }

    if (workItemData.weight !== undefined && workItemData.weight < 0) {
      return res.status(400).json({
        success: false,
        message: 'Weight must be non-negative',
      });
    }

    const workItem = await workItemModel.updateWorkItem(id, workItemData);

    if (!workItem) {
      return res.status(404).json({
        success: false,
        message: 'Work item not found',
      });
    }

    return res.json({
      success: true,
      data: workItem,
      message: 'Work item updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating work item:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update work item',
      error: error.message,
    });
  }
};

export const deleteWorkItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await workItemModel.deleteWorkItem(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Work item not found',
      });
    }

    return res.json({
      success: true,
      message: 'Work item deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting work item:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete work item',
      error: error.message,
    });
  }
};

