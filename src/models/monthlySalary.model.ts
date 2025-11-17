import pool from '../config/database';
import { MonthlySalaryResponse, CalculateMonthlySalaryDto } from '../types/work.types';
import workRecordModel from './workRecord.model';
import employeeModel from './employee.model';

class MonthlySalaryModel {
  /**
   * Format PostgreSQL timestamp to UTC ISO string
   * PostgreSQL returns timestamp without timezone, we need to treat it as UTC
   * When pg returns a Date object, it's parsed as local time, but database stores UTC
   * So we need to get LOCAL components and treat them as UTC
   */
  private formatTimestampToUTC(timestamp: any): string {
    if (!timestamp) return null as any;
    
    // If it's already a Date object from pg, it was parsed as local time
    // But the database stores UTC, so we need to get LOCAL components and treat them as UTC
    if (timestamp instanceof Date) {
      // Get LOCAL components (because pg parsed UTC timestamp as local time)
      // These local components actually represent the UTC time stored in database
      const year = timestamp.getFullYear();
      const month = timestamp.getMonth();
      const day = timestamp.getDate();
      const hours = timestamp.getHours();
      const minutes = timestamp.getMinutes();
      const seconds = timestamp.getSeconds();
      const ms = timestamp.getMilliseconds();
      
      // Create a new Date object treating these LOCAL components as UTC
      const utcDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds, ms));
      return utcDate.toISOString();
    }
    
    // If it's a string, handle it
    const timestampStr = timestamp.toString();
    // If already has timezone (Z, +, -), parse as is
    if (timestampStr.includes('Z') || timestampStr.includes('+') || timestampStr.match(/-\d{2}:\d{2}$/)) {
      return new Date(timestampStr).toISOString();
    }
    // PostgreSQL timestamp without timezone - treat as UTC by adding 'Z'
    // Format: "2025-11-17 17:51:57.524249" -> "2025-11-17T17:51:57.524249Z"
    const isoString = timestampStr.replace(' ', 'T') + 'Z';
    return new Date(isoString).toISOString();
  }

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
      paidAt: row.paid_at ? this.formatTimestampToUTC(row.paid_at) : null,
      calculatedAt: row.calculated_at ? this.formatTimestampToUTC(row.calculated_at) : null,
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
      // Calculate total amount from work records
      totalAmount = workRecords.reduce((sum, record) => sum + record.totalAmount, 0);
      
      // Calculate unique work days directly from database using SQL
      // This ensures accurate counting of distinct work dates
      const uniqueDaysQuery = await pool.query(
        `SELECT COUNT(DISTINCT work_date) as unique_days
         FROM work_records
         WHERE employee_id = $1
           AND EXTRACT(YEAR FROM work_date) = $2
           AND EXTRACT(MONTH FROM work_date) = $3`,
        [employeeId, year, month]
      );
      totalWorkDays = parseInt(uniqueDaysQuery.rows[0].unique_days) || 0;
    }

    // Check if monthly salary already exists
    const existing = await this.getMonthlySalaryByEmployeeAndMonth(employeeId, year, month);

    if (existing) {
      // Only allow recalc when status is 'Tạm tính'
      if (existing.status === 'Thanh toán') {
        throw new Error('Không thể tính lại lương đã thanh toán');
      }
      // Update existing - set calculated_at to current timestamp
      const result = await pool.query(
        `UPDATE monthly_salaries 
         SET total_work_days = $1, total_amount = $2, status = 'Tạm tính', calculated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [totalWorkDays, totalAmount, existing.id]
      );
      return this.getMonthlySalaryById(result.rows[0].id) as Promise<MonthlySalaryResponse>;
    } else {
      // Create new - set calculated_at to current timestamp
      const result = await pool.query(
        `INSERT INTO monthly_salaries (
          employee_id, year, month, total_work_days, total_amount, status, calculated_at
        ) VALUES ($1, $2, $3, $4, $5, 'Tạm tính', NOW())
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

