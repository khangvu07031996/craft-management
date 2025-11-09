import pool from '../config/database';
import { WorkRecordResponse, CreateWorkRecordDto, UpdateWorkRecordDto } from '../types/work.types';
import workTypeModel from './workType.model';
import workItemModel from './workItem.model';

class WorkRecordModel {
  private mapToWorkRecordResponse(row: any): WorkRecordResponse {
    return {
      id: row.id,
      employeeId: row.employee_id,
      employee: row.employee_first_name ? {
        id: row.employee_id,
        firstName: row.employee_first_name,
        lastName: row.employee_last_name,
        employeeId: row.employee_employee_id,
      } : undefined,
      workDate: row.work_date,
      workTypeId: row.work_type_id,
      workType: row.work_type_name ? {
        id: row.work_type_id,
        name: row.work_type_name,
        calculationType: row.work_type_calculation_type,
      } : undefined,
      workItemId: row.work_item_id || undefined,
      workItem: row.work_item_name ? {
        id: row.work_item_id,
        name: row.work_item_name,
        difficultyLevel: row.work_item_difficulty_level,
      } : undefined,
      quantity: parseFloat(row.quantity),
      unitPrice: parseFloat(row.unit_price),
      totalAmount: parseFloat(row.total_amount),
      notes: row.notes || undefined,
      createdBy: row.created_by,
      createdByUser: row.created_by_first_name ? {
        id: row.created_by,
        firstName: row.created_by_first_name,
        lastName: row.created_by_last_name,
      } : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getAllWorkRecords(
    filters: {
      employeeId?: string;
      dateFrom?: string;
      dateTo?: string;
      workTypeId?: string;
    },
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ workRecords: WorkRecordResponse[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (filters.employeeId) {
      conditions.push(`wr.employee_id = $${paramCount}`);
      values.push(filters.employeeId);
      paramCount++;
    }

    if (filters.dateFrom) {
      conditions.push(`wr.work_date >= $${paramCount}`);
      values.push(filters.dateFrom);
      paramCount++;
    }

    if (filters.dateTo) {
      conditions.push(`wr.work_date <= $${paramCount}`);
      values.push(filters.dateTo);
      paramCount++;
    }

    if (filters.workTypeId) {
      conditions.push(`wr.work_type_id = $${paramCount}`);
      values.push(filters.workTypeId);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM work_records wr
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get records with pagination
    const offset = (page - 1) * pageSize;
    values.push(pageSize, offset);
    
    const query = `
      SELECT 
        wr.*,
        e.first_name as employee_first_name,
        e.last_name as employee_last_name,
        e.employee_id as employee_employee_id,
        wt.name as work_type_name,
        wt.calculation_type as work_type_calculation_type,
        wi.name as work_item_name,
        wi.difficulty_level as work_item_difficulty_level,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name
      FROM work_records wr
      LEFT JOIN employees e ON wr.employee_id = e.id
      LEFT JOIN work_types wt ON wr.work_type_id = wt.id
      LEFT JOIN work_items wi ON wr.work_item_id = wi.id
      LEFT JOIN users u ON wr.created_by = u.id
      ${whereClause}
      ORDER BY wr.work_date DESC, wr.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const result = await pool.query(query, values);
    const workRecords = result.rows.map((row) => this.mapToWorkRecordResponse(row));

    return { workRecords, total };
  }

  async getWorkRecordById(id: string): Promise<WorkRecordResponse | null> {
    const query = `
      SELECT 
        wr.*,
        e.first_name as employee_first_name,
        e.last_name as employee_last_name,
        e.employee_id as employee_employee_id,
        wt.name as work_type_name,
        wt.calculation_type as work_type_calculation_type,
        wi.name as work_item_name,
        wi.difficulty_level as work_item_difficulty_level,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name
      FROM work_records wr
      LEFT JOIN employees e ON wr.employee_id = e.id
      LEFT JOIN work_types wt ON wr.work_type_id = wt.id
      LEFT JOIN work_items wi ON wr.work_item_id = wi.id
      LEFT JOIN users u ON wr.created_by = u.id
      WHERE wr.id = $1
    `;

    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToWorkRecordResponse(result.rows[0]);
  }

  async createWorkRecord(workRecordData: CreateWorkRecordDto, createdBy: string): Promise<WorkRecordResponse> {
    const { employeeId, workDate, workTypeId, workItemId, quantity, unitPrice, notes } = workRecordData;

    // Get work type to determine calculation
    const workType = await workTypeModel.getWorkTypeById(workTypeId);
    if (!workType) {
      throw new Error('Work type not found');
    }

    let finalUnitPrice: number;
    let finalWorkItemId: string | null = null;

    // Determine unit price based on work type
    if (workType.calculationType === 'weld_count') {
      // For welders, must have work_item_id
      if (!workItemId) {
        throw new Error('Work item is required for weld count calculation');
      }
      const workItem = await workItemModel.getWorkItemById(workItemId);
      if (!workItem) {
        throw new Error('Work item not found');
      }
      // For welders: quantity is number of products
      // totalAmount = quantity (số sản phẩm) × weldsPerItem (số mối hàn/SP) × pricePerWeld (giá/mối hàn)
      finalUnitPrice = workItem.pricePerWeld;
      finalWorkItemId = workItemId;
      
      // Calculate total amount: số sản phẩm × số mối hàn/SP × giá/mối hàn
      const totalAmount = quantity * workItem.weldsPerItem * workItem.pricePerWeld;
      
      const result = await pool.query(
        `INSERT INTO work_records (
          employee_id, work_date, work_type_id, work_item_id,
          quantity, unit_price, total_amount, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          employeeId,
          workDate,
          workTypeId,
          finalWorkItemId,
          quantity,
          finalUnitPrice,
          totalAmount,
          notes || null,
          createdBy,
        ]
      );

      return this.getWorkRecordById(result.rows[0].id) as Promise<WorkRecordResponse>;
    } else {
      // For hourly or daily, use provided unitPrice or workType.unitPrice
      finalUnitPrice = unitPrice !== undefined ? unitPrice : workType.unitPrice;
      
      // Calculate total amount: quantity × unitPrice
      const totalAmount = quantity * finalUnitPrice;
      
      const result = await pool.query(
        `INSERT INTO work_records (
          employee_id, work_date, work_type_id, work_item_id,
          quantity, unit_price, total_amount, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          employeeId,
          workDate,
          workTypeId,
          finalWorkItemId,
          quantity,
          finalUnitPrice,
          totalAmount,
          notes || null,
          createdBy,
        ]
      );

      return this.getWorkRecordById(result.rows[0].id) as Promise<WorkRecordResponse>;
    }
  }

  async updateWorkRecord(id: string, workRecordData: UpdateWorkRecordDto, updatedBy?: string): Promise<WorkRecordResponse | null> {
    // Get existing record
    const existing = await this.getWorkRecordById(id);
    if (!existing) {
      return null;
    }

    const {
      employeeId = existing.employeeId,
      workDate = existing.workDate,
      workTypeId = existing.workTypeId,
      workItemId = existing.workItemId,
      quantity = existing.quantity,
      unitPrice,
      notes = existing.notes,
    } = workRecordData;

    // Get work type
    const workType = await workTypeModel.getWorkTypeById(workTypeId);
    if (!workType) {
      throw new Error('Work type not found');
    }

    let finalUnitPrice: number;
    let finalWorkItemId: string | null = null;

    // Determine unit price
    if (workType.calculationType === 'weld_count') {
      if (!workItemId) {
        throw new Error('Work item is required for weld count calculation');
      }
      const workItem = await workItemModel.getWorkItemById(workItemId);
      if (!workItem) {
        throw new Error('Work item not found');
      }
      // For welders: quantity is number of products
      // totalAmount = quantity (số sản phẩm) × weldsPerItem (số mối hàn/SP) × pricePerWeld (giá/mối hàn)
      finalUnitPrice = workItem.pricePerWeld;
      finalWorkItemId = workItemId;
      
      // Calculate total amount: số sản phẩm × số mối hàn/SP × giá/mối hàn
      const totalAmount = quantity * workItem.weldsPerItem * workItem.pricePerWeld;
      
      const result = await pool.query(
        `UPDATE work_records 
         SET employee_id = $1, work_date = $2, work_type_id = $3, work_item_id = $4,
             quantity = $5, unit_price = $6, total_amount = $7, notes = $8, updated_at = CURRENT_TIMESTAMP
         WHERE id = $9
         RETURNING *`,
        [
          employeeId,
          workDate,
          workTypeId,
          finalWorkItemId,
          quantity,
          finalUnitPrice,
          totalAmount,
          notes || null,
          id,
        ]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.getWorkRecordById(id);
    } else {
      finalUnitPrice = unitPrice !== undefined ? unitPrice : workType.unitPrice;
      
      // Calculate total amount: quantity × unitPrice
      const totalAmount = quantity * finalUnitPrice;
      
      const result = await pool.query(
        `UPDATE work_records 
         SET employee_id = $1, work_date = $2, work_type_id = $3, work_item_id = $4,
             quantity = $5, unit_price = $6, total_amount = $7, notes = $8, updated_at = CURRENT_TIMESTAMP
         WHERE id = $9
         RETURNING *`,
        [
          employeeId,
          workDate,
          workTypeId,
          finalWorkItemId,
          quantity,
          finalUnitPrice,
          totalAmount,
          notes || null,
          id,
        ]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.getWorkRecordById(id);
    }
  }

  async deleteWorkRecord(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM work_records WHERE id = $1 RETURNING id', [id]);
    return result.rows.length > 0;
  }

  async getWorkRecordsByEmployeeAndMonth(
    employeeId: string,
    year: number,
    month: number
  ): Promise<WorkRecordResponse[]> {
    const query = `
      SELECT 
        wr.*,
        e.first_name as employee_first_name,
        e.last_name as employee_last_name,
        e.employee_id as employee_employee_id,
        wt.name as work_type_name,
        wt.calculation_type as work_type_calculation_type,
        wi.name as work_item_name,
        wi.difficulty_level as work_item_difficulty_level,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name
      FROM work_records wr
      LEFT JOIN employees e ON wr.employee_id = e.id
      LEFT JOIN work_types wt ON wr.work_type_id = wt.id
      LEFT JOIN work_items wi ON wr.work_item_id = wi.id
      LEFT JOIN users u ON wr.created_by = u.id
      WHERE wr.employee_id = $1 
        AND EXTRACT(YEAR FROM wr.work_date) = $2
        AND EXTRACT(MONTH FROM wr.work_date) = $3
      ORDER BY wr.work_date DESC
    `;

    const result = await pool.query(query, [employeeId, year, month]);
    return result.rows.map((row) => this.mapToWorkRecordResponse(row));
  }
}

export default new WorkRecordModel();

