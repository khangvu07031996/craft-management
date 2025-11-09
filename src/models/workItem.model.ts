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
    return result.rows.map((row) => this.mapToWorkItemResponse(row));
  }

  async getWorkItemById(id: string): Promise<WorkItemResponse | null> {
    const result = await pool.query('SELECT * FROM work_items WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToWorkItemResponse(result.rows[0]);
  }

  async createWorkItem(workItemData: CreateWorkItemDto): Promise<WorkItemResponse> {
    const { name, difficultyLevel, pricePerWeld, totalQuantity, weldsPerItem } = workItemData;

    const result = await pool.query(
      `INSERT INTO work_items (name, difficulty_level, price_per_weld, total_quantity, welds_per_item)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, difficultyLevel, pricePerWeld, totalQuantity, weldsPerItem]
    );

    return this.mapToWorkItemResponse(result.rows[0]);
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

    return this.mapToWorkItemResponse(result.rows[0]);
  }

  async deleteWorkItem(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM work_items WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
  }
}

export default new WorkItemModel();

