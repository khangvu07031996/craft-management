import pool from '../config/database';
import {
  OvertimeConfigResponse,
  CreateOvertimeConfigDto,
  UpdateOvertimeConfigDto,
} from '../types/work.types';

class OvertimeConfigModel {
  private mapToOvertimeConfigResponse(row: any): OvertimeConfigResponse {
    return {
      id: row.id,
      workTypeId: row.work_type_id,
      workType: row.work_type_name
        ? {
            id: row.work_type_id,
            name: row.work_type_name,
            department: row.work_type_department,
            calculationType: row.work_type_calculation_type,
          }
        : undefined,
      overtimePricePerWeld: parseFloat(row.overtime_price_per_weld || 0),
      overtimePercentage: parseFloat(row.overtime_percentage || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getOvertimeConfigByWorkTypeId(workTypeId: string): Promise<OvertimeConfigResponse | null> {
    const query = `
      SELECT 
        oc.*,
        wt.name as work_type_name,
        wt.department as work_type_department,
        wt.calculation_type as work_type_calculation_type
      FROM overtime_configs oc
      LEFT JOIN work_types wt ON oc.work_type_id = wt.id
      WHERE oc.work_type_id = $1
    `;

    const result = await pool.query(query, [workTypeId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToOvertimeConfigResponse(result.rows[0]);
  }

  async getAllOvertimeConfigs(): Promise<OvertimeConfigResponse[]> {
    const query = `
      SELECT 
        oc.*,
        wt.name as work_type_name,
        wt.department as work_type_department,
        wt.calculation_type as work_type_calculation_type
      FROM overtime_configs oc
      LEFT JOIN work_types wt ON oc.work_type_id = wt.id
      ORDER BY wt.department, wt.name
    `;

    const result = await pool.query(query);
    return result.rows.map((row) => this.mapToOvertimeConfigResponse(row));
  }

  async createOvertimeConfig(
    data: CreateOvertimeConfigDto
  ): Promise<OvertimeConfigResponse> {
    const { workTypeId, overtimePricePerWeld = 0, overtimePercentage = 0 } = data;

    const query = `
      INSERT INTO overtime_configs (work_type_id, overtime_price_per_weld, overtime_percentage)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await pool.query(query, [workTypeId, overtimePricePerWeld, overtimePercentage]);

    // Get work type info
    const workTypeQuery = `
      SELECT name, department, calculation_type
      FROM work_types
      WHERE id = $1
    `;
    const workTypeResult = await pool.query(workTypeQuery, [workTypeId]);

    const row = result.rows[0];
    if (workTypeResult.rows.length > 0) {
      row.work_type_name = workTypeResult.rows[0].name;
      row.work_type_department = workTypeResult.rows[0].department;
      row.work_type_calculation_type = workTypeResult.rows[0].calculation_type;
    }

    return this.mapToOvertimeConfigResponse(row);
  }

  async updateOvertimeConfig(
    workTypeId: string,
    data: UpdateOvertimeConfigDto
  ): Promise<OvertimeConfigResponse | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.overtimePricePerWeld !== undefined) {
      updates.push(`overtime_price_per_weld = $${paramCount}`);
      values.push(data.overtimePricePerWeld);
      paramCount++;
    }

    if (data.overtimePercentage !== undefined) {
      updates.push(`overtime_percentage = $${paramCount}`);
      values.push(data.overtimePercentage);
      paramCount++;
    }

    if (updates.length === 0) {
      // No updates, just return existing config
      return this.getOvertimeConfigByWorkTypeId(workTypeId);
    }

    values.push(workTypeId);

    const query = `
      UPDATE overtime_configs
      SET ${updates.join(', ')}
      WHERE work_type_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    // Get work type info
    const workTypeQuery = `
      SELECT name, department, calculation_type
      FROM work_types
      WHERE id = $1
    `;
    const workTypeResult = await pool.query(workTypeQuery, [workTypeId]);

    const row = result.rows[0];
    if (workTypeResult.rows.length > 0) {
      row.work_type_name = workTypeResult.rows[0].name;
      row.work_type_department = workTypeResult.rows[0].department;
      row.work_type_calculation_type = workTypeResult.rows[0].calculation_type;
    }

    return this.mapToOvertimeConfigResponse(row);
  }

  async deleteOvertimeConfig(workTypeId: string): Promise<boolean> {
    const query = 'DELETE FROM overtime_configs WHERE work_type_id = $1';
    const result = await pool.query(query, [workTypeId]);
    return result.rowCount !== null && result.rowCount > 0;
  }
}

export default new OvertimeConfigModel();

