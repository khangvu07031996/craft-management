import pool from '../config/database';
import { WorkItemResponse, CreateWorkItemDto, UpdateWorkItemDto } from '../types/work.types';

class WorkItemModel {
  private mapToWorkItemResponse(row: any): WorkItemResponse {
    return {
      id: row.id,
      name: row.name,
      difficultyLevel: row.difficulty_level,
      pricePerWeld: parseFloat(row.price_per_weld),
      totalQuantity: parseInt(row.total_quantity || 0),
      weldsPerItem: parseInt(row.welds_per_item || 0),
      status: (row.status || 'Tạo mới') as 'Tạo mới' | 'Đang sản xuất' | 'Hoàn thành',
      estimatedDeliveryDate: row.estimated_delivery_date ? row.estimated_delivery_date.toISOString().split('T')[0] : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getAllWorkItems(difficultyLevel?: string): Promise<WorkItemResponse[]> {
    let query = 'SELECT * FROM work_items';
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
    const result = await pool.query('SELECT * FROM work_items WHERE id = $1', [id]);
    
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
    const { name, difficultyLevel, pricePerWeld, totalQuantity, weldsPerItem, estimatedDeliveryDate } = workItemData;

    const result = await pool.query(
      `INSERT INTO work_items (name, difficulty_level, price_per_weld, total_quantity, welds_per_item, status, estimated_delivery_date)
       VALUES ($1, $2, $3, $4, $5, 'Tạo mới', $6)
       RETURNING *`,
      [name, difficultyLevel, pricePerWeld, totalQuantity, weldsPerItem, estimatedDeliveryDate || null]
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

    if (updates.length === 0) {
      return this.getWorkItemById(id);
    }

    values.push(id);
    const query = `
      UPDATE work_items 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
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

  async updateWorkItemStatus(workItemId: string): Promise<void> {
    // Get work item to access totalQuantity
    const workItem = await this.getWorkItemById(workItemId);
    if (!workItem) {
      return;
    }

    // Lazy import to avoid circular dependency
    const workRecordModel = (await import('./workRecord.model')).default;
    
    // Calculate totalQuantityMade using workRecord model
    const totalQuantityMade = await workRecordModel.getTotalQuantityMadeByWorkItem(workItemId);

    // Determine status based on totalQuantityMade vs totalQuantity
    let newStatus: 'Tạo mới' | 'Đang sản xuất' | 'Hoàn thành';
    if (totalQuantityMade >= workItem.totalQuantity) {
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

