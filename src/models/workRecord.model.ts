import pool from '../config/database';
import { WorkRecordResponse, CreateWorkRecordDto, UpdateWorkRecordDto } from '../types/work.types';
import workTypeModel from './workType.model';
import workItemModel from './workItem.model';
import overtimeConfigModel from './overtimeConfig.model';

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
      isOvertime: row.is_overtime || false,
      overtimeQuantity: row.overtime_quantity ? parseFloat(row.overtime_quantity) : undefined,
      overtimeHours: row.overtime_hours ? parseFloat(row.overtime_hours) : undefined,
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

    // Handle date filtering
    console.log('WorkRecordModel.getAllWorkRecords - Date filters:', {
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      areEqual: filters.dateFrom === filters.dateTo,
    });

    if (filters.dateFrom && filters.dateTo) {
      // If dateFrom equals dateTo, filter for exact date
      if (filters.dateFrom === filters.dateTo) {
        console.log('WorkRecordModel - Using exact date filter:', filters.dateFrom);
        // work_date is already DATE type, so we can compare directly
        conditions.push(`wr.work_date = $${paramCount}::date`);
        values.push(filters.dateFrom);
        paramCount++;
      } else {
        // Date range filter
        console.log('WorkRecordModel - Using date range filter:', filters.dateFrom, 'to', filters.dateTo);
        conditions.push(`wr.work_date >= $${paramCount}::date`);
        values.push(filters.dateFrom);
        paramCount++;
        conditions.push(`wr.work_date <= $${paramCount}::date`);
        values.push(filters.dateTo);
        paramCount++;
      }
    } else if (filters.dateFrom) {
      // Only dateFrom specified
      console.log('WorkRecordModel - Using dateFrom filter:', filters.dateFrom);
      conditions.push(`wr.work_date >= $${paramCount}::date`);
      values.push(filters.dateFrom);
      paramCount++;
    } else if (filters.dateTo) {
      // Only dateTo specified
      console.log('WorkRecordModel - Using dateTo filter:', filters.dateTo);
      conditions.push(`wr.work_date <= $${paramCount}::date`);
      values.push(filters.dateTo);
      paramCount++;
    } else {
      console.log('WorkRecordModel - No date filters applied');
    }

    if (filters.workTypeId) {
      conditions.push(`wr.work_type_id = $${paramCount}`);
      values.push(filters.workTypeId);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total - use separate values array
    const countQuery = `
      SELECT COUNT(*) as total
      FROM work_records wr
      ${whereClause}
    `;
    console.log('WorkRecordModel - Count query:', countQuery);
    console.log('WorkRecordModel - Count values:', values);
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);
    console.log('WorkRecordModel - Total count:', total);

    // Get records with pagination - add pagination params
    const offset = (page - 1) * pageSize;
    const dataValues = [...values]; // Copy values array
    const limitParam = paramCount;
    const offsetParam = paramCount + 1;
    dataValues.push(pageSize, offset);
    
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
      ORDER BY wr.work_date DESC, e.last_name ASC, e.first_name ASC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    console.log('WorkRecordModel - Data query:', query);
    console.log('WorkRecordModel - Data values:', dataValues);
    const result = await pool.query(query, dataValues);
    console.log('WorkRecordModel - Result rows:', result.rows.length);
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
    const { employeeId, workDate, workTypeId, workItemId, quantity, unitPrice, notes, isOvertime, overtimeQuantity, overtimeHours } = workRecordData;

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
      
      // Calculate base amount: số sản phẩm × số mối hàn/SP × giá/mối hàn
      let totalAmount = quantity * workItem.weldsPerItem * workItem.pricePerWeld;
      
      // Add overtime amount if applicable
      if (isOvertime && overtimeQuantity && overtimeQuantity > 0) {
        // Get overtime config
        const overtimeConfig = await overtimeConfigModel.getOvertimeConfigByWorkTypeId(workTypeId);
        if (overtimeConfig && overtimeConfig.overtimePricePerWeld > 0) {
          // Tiền tăng ca = số lượng hàng tăng ca × số mối hàn/SP × (giá/mối hàn + giá tăng ca/mối hàn)
          const overtimeAmount = overtimeQuantity * workItem.weldsPerItem * (workItem.pricePerWeld + overtimeConfig.overtimePricePerWeld);
          totalAmount += overtimeAmount;
        }
      }
      
      const result = await pool.query(
        `INSERT INTO work_records (
          employee_id, work_date, work_type_id, work_item_id,
          quantity, unit_price, total_amount, notes, created_by,
          is_overtime, overtime_quantity, overtime_hours
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
          isOvertime || false,
          overtimeQuantity || null,
          null, // overtime_hours is null for weld_count
        ]
      );

      return this.getWorkRecordById(result.rows[0].id) as Promise<WorkRecordResponse>;
    } else {
      // For hourly or daily, use provided unitPrice or workType.unitPrice
      finalUnitPrice = unitPrice !== undefined ? unitPrice : workType.unitPrice;
      
      // Calculate base amount: quantity × unitPrice
      let totalAmount = quantity * finalUnitPrice;
      
      // Add overtime amount if applicable (only for hourly)
      if (workType.calculationType === 'hourly' && isOvertime && overtimeHours && overtimeHours > 0) {
        // Get overtime config
        const overtimeConfig = await overtimeConfigModel.getOvertimeConfigByWorkTypeId(workTypeId);
        if (overtimeConfig && overtimeConfig.overtimePercentage > 0) {
          // Tiền tăng ca = số giờ tăng ca × (unitPrice + unitPrice × overtime_percentage/100)
          // = số giờ tăng ca × unitPrice × (1 + overtime_percentage/100)
          const overtimeAmount = overtimeHours * finalUnitPrice * (1 + overtimeConfig.overtimePercentage / 100);
          totalAmount += overtimeAmount;
        }
      }
      
      const result = await pool.query(
        `INSERT INTO work_records (
          employee_id, work_date, work_type_id, work_item_id,
          quantity, unit_price, total_amount, notes, created_by,
          is_overtime, overtime_quantity, overtime_hours
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
          isOvertime || false,
          null, // overtime_quantity is null for hourly/daily
          overtimeHours || null,
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
      isOvertime = existing.isOvertime,
      overtimeQuantity = existing.overtimeQuantity,
      overtimeHours = existing.overtimeHours,
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
      
      // Calculate base amount: số sản phẩm × số mối hàn/SP × giá/mối hàn
      let totalAmount = quantity * workItem.weldsPerItem * workItem.pricePerWeld;
      
      // Add overtime amount if applicable
      if (isOvertime && overtimeQuantity && overtimeQuantity > 0) {
        // Get overtime config
        const overtimeConfig = await overtimeConfigModel.getOvertimeConfigByWorkTypeId(workTypeId);
        if (overtimeConfig && overtimeConfig.overtimePricePerWeld > 0) {
          // Tiền tăng ca = số lượng hàng tăng ca × số mối hàn/SP × (giá/mối hàn + giá tăng ca/mối hàn)
          const overtimeAmount = overtimeQuantity * workItem.weldsPerItem * (workItem.pricePerWeld + overtimeConfig.overtimePricePerWeld);
          totalAmount += overtimeAmount;
        }
      }
      
      const result = await pool.query(
        `UPDATE work_records 
         SET employee_id = $1, work_date = $2, work_type_id = $3, work_item_id = $4,
             quantity = $5, unit_price = $6, total_amount = $7, notes = $8, updated_at = CURRENT_TIMESTAMP,
             is_overtime = $9, overtime_quantity = $10, overtime_hours = $11
         WHERE id = $12
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
          isOvertime || false,
          overtimeQuantity || null,
          null, // overtime_hours is null for weld_count
          id,
        ]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.getWorkRecordById(id);
    } else {
      finalUnitPrice = unitPrice !== undefined ? unitPrice : workType.unitPrice;
      
      // Calculate base amount: quantity × unitPrice
      let totalAmount = quantity * finalUnitPrice;
      
      // Add overtime amount if applicable (only for hourly)
      if (workType.calculationType === 'hourly' && isOvertime && overtimeHours && overtimeHours > 0) {
        // Get overtime config
        const overtimeConfig = await overtimeConfigModel.getOvertimeConfigByWorkTypeId(workTypeId);
        if (overtimeConfig && overtimeConfig.overtimePercentage > 0) {
          // Tiền tăng ca = số giờ tăng ca × (unitPrice + unitPrice × overtime_percentage/100)
          // = số giờ tăng ca × unitPrice × (1 + overtime_percentage/100)
          const overtimeAmount = overtimeHours * finalUnitPrice * (1 + overtimeConfig.overtimePercentage / 100);
          totalAmount += overtimeAmount;
        }
      }
      
      const result = await pool.query(
        `UPDATE work_records 
         SET employee_id = $1, work_date = $2, work_type_id = $3, work_item_id = $4,
             quantity = $5, unit_price = $6, total_amount = $7, notes = $8, updated_at = CURRENT_TIMESTAMP,
             is_overtime = $9, overtime_quantity = $10, overtime_hours = $11
         WHERE id = $12
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
          isOvertime || false,
          null, // overtime_quantity is null for hourly/daily
          overtimeHours || null,
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

