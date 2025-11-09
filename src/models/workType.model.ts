import pool from '../config/database';
import { WorkTypeResponse } from '../types/work.types';

class WorkTypeModel {
  private mapToWorkTypeResponse(row: any): WorkTypeResponse {
    return {
      id: row.id,
      name: row.name,
      department: row.department,
      calculationType: row.calculation_type,
      unitPrice: parseFloat(row.unit_price),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getAllWorkTypes(department?: string): Promise<WorkTypeResponse[]> {
    let query = 'SELECT * FROM work_types';
    const values: any[] = [];

    if (department) {
      query += ' WHERE department = $1';
      values.push(department);
    }

    query += ' ORDER BY department, name';

    const result = await pool.query(query, values);
    
    // Remove duplicates by (name, department) pair - defensive programming
    const uniqueMap = new Map<string, WorkTypeResponse>();
    result.rows.forEach((row) => {
      const key = `${row.name}|${row.department}`;
      const workType = this.mapToWorkTypeResponse(row);
      // Keep the one with earlier created_at if duplicate exists
      if (!uniqueMap.has(key) || new Date(workType.createdAt) < new Date(uniqueMap.get(key)!.createdAt)) {
        uniqueMap.set(key, workType);
      }
    });
    
    return Array.from(uniqueMap.values());
  }

  async getWorkTypeById(id: string): Promise<WorkTypeResponse | null> {
    const result = await pool.query('SELECT * FROM work_types WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToWorkTypeResponse(result.rows[0]);
  }

  async getWorkTypeByCalculationType(
    calculationType: string,
    department?: string
  ): Promise<WorkTypeResponse[]> {
    let query = 'SELECT * FROM work_types WHERE calculation_type = $1';
    const values: any[] = [calculationType];

    if (department) {
      query += ' AND department = $2';
      values.push(department);
    }

    query += ' ORDER BY department, name';

    const result = await pool.query(query, values);
    return result.rows.map((row) => this.mapToWorkTypeResponse(row));
  }

  async createWorkType(workTypeData: { name: string; department: string; calculationType: string; unitPrice: number }): Promise<WorkTypeResponse> {
    const { name, department, calculationType, unitPrice } = workTypeData;

    // Check if work type with same name (case-insensitive) and department already exists
    const existing = await pool.query(
      'SELECT * FROM work_types WHERE LOWER(name) = LOWER($1) AND department = $2',
      [name, department]
    );

    if (existing.rows.length > 0) {
      throw new Error(`Work type with name "${name}" and department "${department}" already exists`);
    }

    const result = await pool.query(
      `INSERT INTO work_types (name, department, calculation_type, unit_price)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, department, calculationType, unitPrice]
    );

    return this.mapToWorkTypeResponse(result.rows[0]);
  }

  async updateWorkType(id: string, workTypeData: { name?: string; department?: string; calculationType?: string; unitPrice?: number }): Promise<WorkTypeResponse | null> {
    // Get existing work type to check for duplicates
    const existing = await this.getWorkTypeById(id);
    if (!existing) {
      return null;
    }

    // Check for duplicate if name or department is being updated
    if (workTypeData.name !== undefined || workTypeData.department !== undefined) {
      const newName = workTypeData.name !== undefined ? workTypeData.name : existing.name;
      const newDepartment = workTypeData.department !== undefined ? workTypeData.department : existing.department;
      
      // Check if another work type with same name (case-insensitive) and department exists (excluding current one)
      const duplicate = await pool.query(
        'SELECT * FROM work_types WHERE LOWER(name) = LOWER($1) AND department = $2 AND id != $3',
        [newName, newDepartment, id]
      );

      if (duplicate.rows.length > 0) {
        throw new Error(`Work type with name "${newName}" and department "${newDepartment}" already exists`);
      }
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (workTypeData.name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(workTypeData.name);
      paramCount++;
    }

    if (workTypeData.department !== undefined) {
      updates.push(`department = $${paramCount}`);
      values.push(workTypeData.department);
      paramCount++;
    }

    if (workTypeData.calculationType !== undefined) {
      updates.push(`calculation_type = $${paramCount}`);
      values.push(workTypeData.calculationType);
      paramCount++;
    }

    if (workTypeData.unitPrice !== undefined) {
      updates.push(`unit_price = $${paramCount}`);
      values.push(workTypeData.unitPrice);
      paramCount++;
    }

    if (updates.length === 0) {
      return existing;
    }

    values.push(id);
    const query = `
      UPDATE work_types 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToWorkTypeResponse(result.rows[0]);
  }

  async deleteWorkType(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM work_types WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
  }
}

export default new WorkTypeModel();

