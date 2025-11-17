import pool from '../config/database';
import { MonthlySalaryResponse, CalculateMonthlySalaryDto } from '../types/work.types';
import workRecordModel from './workRecord.model';
import employeeModel from './employee.model';

class MonthlySalaryModel {
  private mapToMonthlySalaryResponse(row: any): MonthlySalaryResponse {
    return {
      id: row.id,
      employeeId: row.employee_id,
      employee: row.employee_first_name ? {
        id: row.employee_id,
        firstName: row.employee_first_name,
        lastName: row.employee_last_name,
        employeeId: row.employee_employee_id,
      } : undefined,
      year: row.year,
      month: row.month,
      totalWorkDays: row.total_work_days,
      totalAmount: parseFloat(row.total_amount),
      allowances: row.allowances !== undefined && row.allowances !== null ? parseFloat(row.allowances) : 0,
      status: (row.status || 'Tạm tính') as 'Tạm tính' | 'Thanh toán',
      paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getAllMonthlySalaries(
    filters: {
      employeeId?: string;
      year?: number;
      month?: number;
    },
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ monthlySalaries: MonthlySalaryResponse[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (filters.employeeId) {
      conditions.push(`ms.employee_id = $${paramCount}`);
      values.push(filters.employeeId);
      paramCount++;
    }

    if (filters.year) {
      conditions.push(`ms.year = $${paramCount}`);
      values.push(filters.year);
      paramCount++;
    }

    if (filters.month) {
      conditions.push(`ms.month = $${paramCount}`);
      values.push(filters.month);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM monthly_salaries ms
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get records with pagination
    const offset = (page - 1) * pageSize;
    values.push(pageSize, offset);
    
    const query = `
      SELECT 
        ms.*,
        e.first_name as employee_first_name,
        e.last_name as employee_last_name,
        e.employee_id as employee_employee_id
      FROM monthly_salaries ms
      LEFT JOIN employees e ON ms.employee_id = e.id
      ${whereClause}
      ORDER BY ms.year DESC, ms.month DESC, e.last_name, e.first_name
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const result = await pool.query(query, values);
    const monthlySalaries = result.rows.map((row) => this.mapToMonthlySalaryResponse(row));

    return { monthlySalaries, total };
  }

  async getMonthlySalaryById(id: string): Promise<MonthlySalaryResponse | null> {
    const query = `
      SELECT 
        ms.*,
        e.first_name as employee_first_name,
        e.last_name as employee_last_name,
        e.employee_id as employee_employee_id
      FROM monthly_salaries ms
      LEFT JOIN employees e ON ms.employee_id = e.id
      WHERE ms.id = $1
    `;

    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToMonthlySalaryResponse(result.rows[0]);
  }

  async getMonthlySalaryByEmployeeAndMonth(
    employeeId: string,
    year: number,
    month: number
  ): Promise<MonthlySalaryResponse | null> {
    const query = `
      SELECT 
        ms.*,
        e.first_name as employee_first_name,
        e.last_name as employee_last_name,
        e.employee_id as employee_employee_id
      FROM monthly_salaries ms
      LEFT JOIN employees e ON ms.employee_id = e.id
      WHERE ms.employee_id = $1 AND ms.year = $2 AND ms.month = $3
    `;

    const result = await pool.query(query, [employeeId, year, month]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToMonthlySalaryResponse(result.rows[0]);
  }

  async calculateAndSaveMonthlySalary(data: CalculateMonthlySalaryDto): Promise<MonthlySalaryResponse> {
    const { employeeId, year, month } = data;

    // Get all work records for the month
    const workRecords = await workRecordModel.getWorkRecordsByEmployeeAndMonth(
      employeeId,
      year,
      month
    );

    let totalAmount: number;
    let totalWorkDays: number;

    // If no work records, use default salary from employees table
    if (workRecords.length === 0) {
      // Get employee to check default salary
      const employee = await employeeModel.getEmployeeById(employeeId);
      if (!employee) {
        throw new Error('Không tìm thấy nhân viên');
      }
      if (!employee.salary || employee.salary === 0) {
        throw new Error(`Không có dữ liệu lương cho nhân viên ${employee.firstName} ${employee.lastName}`);
      }
      // Use default salary
      totalAmount = employee.salary;
      totalWorkDays = 0;
    } else {
      // Calculate total amount and work days from work records
      totalAmount = workRecords.reduce((sum, record) => sum + record.totalAmount, 0);
      const uniqueWorkDays = new Set(workRecords.map((record) => record.workDate)).size;
      totalWorkDays = uniqueWorkDays;
    }

    // Check if monthly salary already exists
    const existing = await this.getMonthlySalaryByEmployeeAndMonth(employeeId, year, month);

    if (existing) {
      // Only allow recalc when status is 'Tạm tính'
      if (existing.status === 'Thanh toán') {
        throw new Error('Không thể tính lại lương đã thanh toán');
      }
      // Update existing
      const result = await pool.query(
        `UPDATE monthly_salaries 
         SET total_work_days = $1, total_amount = $2, status = 'Tạm tính'
         WHERE id = $3
         RETURNING *`,
        [totalWorkDays, totalAmount, existing.id]
      );
      return this.getMonthlySalaryById(result.rows[0].id) as Promise<MonthlySalaryResponse>;
    } else {
      // Create new
      const result = await pool.query(
        `INSERT INTO monthly_salaries (
          employee_id, year, month, total_work_days, total_amount, status
        ) VALUES ($1, $2, $3, $4, $5, 'Tạm tính')
        RETURNING *`,
        [employeeId, year, month, totalWorkDays, totalAmount]
      );
      return this.getMonthlySalaryById(result.rows[0].id) as Promise<MonthlySalaryResponse>;
    }
  }

  async updateAllowances(id: string, allowances: number): Promise<MonthlySalaryResponse | null> {
    const result = await pool.query(
      `UPDATE monthly_salaries
       SET allowances = $1
       WHERE id = $2
       RETURNING *`,
      [allowances, id]
    );
    if (result.rows.length === 0) return null;
    return this.getMonthlySalaryById(id);
  }

  async payMonthlySalary(id: string): Promise<MonthlySalaryResponse | null> {
    // Set status to 'Thanh toán' and paid_at
    const result = await pool.query(
      `UPDATE monthly_salaries
       SET status = 'Thanh toán', paid_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) return null;
    return this.getMonthlySalaryById(id);
  }

  async deleteMonthlySalary(id: string): Promise<boolean> {
    // Check status first
    const ms = await this.getMonthlySalaryById(id);
    if (!ms) return false;
    if (ms.status === 'Thanh toán') {
      const err: any = new Error('Không thể xoá bảng lương đã thanh toán');
      err.code = 'PAID_DELETE_FORBIDDEN';
      throw err;
    }
    await pool.query(`DELETE FROM monthly_salaries WHERE id = $1`, [id]);
    return true;
  }
}

export default new MonthlySalaryModel();

