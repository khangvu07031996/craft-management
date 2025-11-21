import pool from '../config/database';
import { WorkItemResponse, CreateWorkItemDto, UpdateWorkItemDto } from '../types/work.types';

class WorkItemModel {
  private mapToWorkItemResponse(row: any): WorkItemResponse {
    // Format date to avoid timezone issues
    const formatDate = (date: Date | string | null): string | undefined => {
      if (!date) return undefined;
      
      // If it's already a string in YYYY-MM-DD format, return as is
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      
      // If it's a Date object, format using UTC methods to avoid timezone conversion
      // PostgreSQL DATE type doesn't have time, so we use UTC methods
      const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
      
      // Use UTC date methods to avoid timezone conversion
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      id: row.id,
      name: row.name,
      difficultyLevel: row.difficulty_level,
      pricePerWeld: parseFloat(row.price_per_weld),
      totalQuantity: parseInt(row.total_quantity || 0),
      weldsPerItem: parseInt(row.welds_per_item || 0),
      status: (row.status || 'Tạo mới') as 'Tạo mới' | 'Đang sản xuất' | 'Hoàn thành',
      estimatedDeliveryDate: row.estimated_delivery_date_str || formatDate(row.estimated_delivery_date),
      weight: row.weight_kg !== null && row.weight_kg !== undefined ? parseFloat(row.weight_kg) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getAllWorkItems(difficultyLevel?: string): Promise<WorkItemResponse[]> {
    let query = 'SELECT *, TO_CHAR(estimated_delivery_date, \'YYYY-MM-DD\') as estimated_delivery_date_str FROM work_items';
    const values: any[] = [];

    if (difficultyLevel) {
      query += ' WHERE difficulty_level = $1';
      values.push(difficultyLevel);
    }

    query += ' ORDER BY difficulty_level, name';

    const result = await pool.query(query, values);
    const workItems = result.rows.map((row) => this.mapToWorkItemResponse(row));
    
    // Calculate quantityMade for each work item
    const workItemsWithQuantity = await Promise.all(
      workItems.map(async (item) => {
        try {
          // Lazy import to avoid circular dependency
          const workRecordModel = (await import('./workRecord.model')).default;
          const quantityMade = await workRecordModel.getTotalQuantityMadeByWorkItem(item.id);
          return { ...item, quantityMade };
        } catch (error) {
          console.error(`Error fetching quantity made for work item ${item.id}:`, error);
          return { ...item, quantityMade: 0 };
        }
      })
    );
    
    return workItemsWithQuantity;
  }

  async getWorkItemById(id: string): Promise<WorkItemResponse | null> {
    const result = await pool.query('SELECT *, TO_CHAR(estimated_delivery_date, \'YYYY-MM-DD\') as estimated_delivery_date_str FROM work_items WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const workItem = this.mapToWorkItemResponse(result.rows[0]);
    
    // Calculate quantityMade
    try {
      // Lazy import to avoid circular dependency
      const workRecordModel = (await import('./workRecord.model')).default;
      const quantityMade = await workRecordModel.getTotalQuantityMadeByWorkItem(id);
      return { ...workItem, quantityMade };
    } catch (error) {
      console.error(`Error fetching quantity made for work item ${id}:`, error);
      return { ...workItem, quantityMade: 0 };
    }
  }

  async createWorkItem(workItemData: CreateWorkItemDto): Promise<WorkItemResponse> {
    const { name, difficultyLevel, pricePerWeld, totalQuantity, weldsPerItem, estimatedDeliveryDate, weight } = workItemData;

    const result = await pool.query(
      `INSERT INTO work_items (name, difficulty_level, price_per_weld, total_quantity, welds_per_item, status, estimated_delivery_date, weight_kg)
       VALUES ($1, $2, $3, $4, $5, 'Tạo mới', $6, $7)
       RETURNING *, TO_CHAR(estimated_delivery_date, 'YYYY-MM-DD') as estimated_delivery_date_str`,
      [name, difficultyLevel, pricePerWeld, totalQuantity, weldsPerItem, estimatedDeliveryDate || null, weight !== undefined ? weight : null]
    );

    const workItem = this.mapToWorkItemResponse(result.rows[0]);
    // New work item has 0 quantity made
    return { ...workItem, quantityMade: 0 };
  }

  async updateWorkItem(id: string, workItemData: UpdateWorkItemDto): Promise<WorkItemResponse | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (workItemData.name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(workItemData.name);
      paramCount++;
    }

    if (workItemData.difficultyLevel !== undefined) {
      updates.push(`difficulty_level = $${paramCount}`);
      values.push(workItemData.difficultyLevel);
      paramCount++;
    }

    if (workItemData.pricePerWeld !== undefined) {
      updates.push(`price_per_weld = $${paramCount}`);
      values.push(workItemData.pricePerWeld);
      paramCount++;
    }

    if (workItemData.totalQuantity !== undefined) {
      updates.push(`total_quantity = $${paramCount}`);
      values.push(workItemData.totalQuantity);
      paramCount++;
    }

    if (workItemData.weldsPerItem !== undefined) {
      updates.push(`welds_per_item = $${paramCount}`);
      values.push(workItemData.weldsPerItem);
      paramCount++;
    }

    if (workItemData.status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(workItemData.status);
      paramCount++;
    }

    if (workItemData.estimatedDeliveryDate !== undefined) {
      updates.push(`estimated_delivery_date = $${paramCount}`);
      values.push(workItemData.estimatedDeliveryDate || null);
      paramCount++;
    }

    if (workItemData.weight !== undefined) {
      updates.push(`weight_kg = $${paramCount}`);
      values.push(workItemData.weight !== null && workItemData.weight !== undefined ? workItemData.weight : null);
      paramCount++;
    }

    if (updates.length === 0) {
      return this.getWorkItemById(id);
    }

    values.push(id);
    const query = `
      UPDATE work_items 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *, TO_CHAR(estimated_delivery_date, 'YYYY-MM-DD') as estimated_delivery_date_str
    `;

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    const workItem = this.mapToWorkItemResponse(result.rows[0]);
    
    // Calculate quantityMade
    try {
      // Lazy import to avoid circular dependency
      const workRecordModel = (await import('./workRecord.model')).default;
      const quantityMade = await workRecordModel.getTotalQuantityMadeByWorkItem(id);
      
      // If totalQuantity was updated, recalculate status using the new totalQuantity
      if (workItemData.totalQuantity !== undefined) {
        await this.updateWorkItemStatus(id, workItemData.totalQuantity).catch((error) => {
          console.error('Error updating work item status after totalQuantity change:', error);
        });
        
        // Re-fetch work item to get updated status after updateWorkItemStatus
        const updatedWorkItem = await this.getWorkItemById(id);
        if (updatedWorkItem) {
          return { ...updatedWorkItem, quantityMade };
        }
      }
      
      return { ...workItem, quantityMade };
    } catch (error) {
      console.error(`Error fetching quantity made for work item ${id}:`, error);
      return { ...workItem, quantityMade: 0 };
    }
  }

  async deleteWorkItem(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM work_items WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
  }

  async updateWorkItemStatus(workItemId: string, totalQuantity?: number): Promise<void> {
    // Get work item to access totalQuantity if not provided
    let workItem: WorkItemResponse | null = null;
    let finalTotalQuantity: number;
    
    if (totalQuantity !== undefined) {
      // Use provided totalQuantity (from update)
      finalTotalQuantity = totalQuantity;
    } else {
      // Get work item to access totalQuantity
      workItem = await this.getWorkItemById(workItemId);
      if (!workItem) {
        return;
      }
      finalTotalQuantity = workItem.totalQuantity;
    }

    // Lazy import to avoid circular dependency
    const workRecordModel = (await import('./workRecord.model')).default;
    
    // Calculate totalQuantityMade using workRecord model
    const totalQuantityMade = await workRecordModel.getTotalQuantityMadeByWorkItem(workItemId);

    // Determine status based on totalQuantityMade vs totalQuantity
    let newStatus: 'Tạo mới' | 'Đang sản xuất' | 'Hoàn thành';
    if (totalQuantityMade >= finalTotalQuantity) {
      newStatus = 'Hoàn thành';
    } else if (totalQuantityMade > 0) {
      newStatus = 'Đang sản xuất';
    } else {
      newStatus = 'Tạo mới';
    }

    // Update status in database
    await pool.query(
      'UPDATE work_items SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStatus, workItemId]
    );
  }
}

export default new WorkItemModel();

