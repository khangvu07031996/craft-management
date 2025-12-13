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

    let workRecords: any[];
    let finalYear: number;
    let finalMonth: number;

    // If year and month are provided, use them
    if (year && month) {
      workRecords = await workRecordModel.getWorkRecordsByEmployeeAndMonth(
        employeeId,
        year,
        month
      );
      finalYear = year;
      finalMonth = month;
    } else {
      // Auto-detect: get all work records with status "Tạo mới"
      workRecords = await workRecordModel.getWorkRecordsByEmployeeWithStatus(
        employeeId,
        'Tạo mới'
      );

      if (workRecords.length === 0) {
        const employee = await employeeModel.getEmployeeById(employeeId);
        if (!employee) {
          throw new Error('Không tìm thấy nhân viên');
        }
        throw new Error(`Nhân viên ${employee.firstName} ${employee.lastName} không có bản ghi công việc nào ở trạng thái "Tạo mới" để tính lương`);
      }

      // Get date range from work records to determine year/month
      const recordIds = workRecords.map(r => r.id);
      const dateRange = await workRecordModel.getWorkRecordDateRange(recordIds);
      
      if (!dateRange) {
        throw new Error('Không thể xác định ngày từ bản ghi công việc');
      }

      // Use the month with the most work records, or the latest month
      // Group by year/month and find the one with most records
      const monthCounts: Record<string, number> = {};
      workRecords.forEach(record => {
        const recordDate = new Date(record.workDate);
        const key = `${recordDate.getFullYear()}-${recordDate.getMonth() + 1}`;
        monthCounts[key] = (monthCounts[key] || 0) + 1;
      });

      // Find month with most records, or use the latest date
      let maxCount = 0;
      let selectedKey = '';
      for (const [key, count] of Object.entries(monthCounts)) {
        if (count > maxCount) {
          maxCount = count;
          selectedKey = key;
        }
      }

      // If no clear winner, use the latest date
      if (!selectedKey) {
        finalYear = dateRange.maxDate.getFullYear();
        finalMonth = dateRange.maxDate.getMonth() + 1;
      } else {
        const [y, m] = selectedKey.split('-').map(Number);
        finalYear = y;
        finalMonth = m;
      }
    }

    // If no work records, throw error (no default salary)
    if (workRecords.length === 0) {
      const employee = await employeeModel.getEmployeeById(employeeId);
      if (!employee) {
        throw new Error('Không tìm thấy nhân viên');
      }
      throw new Error(`Nhân viên ${employee.firstName} ${employee.lastName} không có bản ghi công việc nào ở trạng thái "Tạo mới" để tính lương`);
    }

    // Calculate total amount from work records
    const totalAmount = workRecords.reduce((sum, record) => sum + record.totalAmount, 0);
    
    // Calculate unique work days directly from database using SQL
    // This ensures accurate counting of distinct work dates
    // Only count records with status = 'Tạo mới'
    const recordIds = workRecords.map(r => r.id);
    const uniqueDaysQuery = await pool.query(
      `SELECT COUNT(DISTINCT work_date) as unique_days
       FROM work_records
       WHERE id = ANY($1::uuid[])
         AND status = 'Tạo mới'`,
      [recordIds]
    );
    const totalWorkDays = parseInt(uniqueDaysQuery.rows[0].unique_days) || 0;

    // Check if there's already a "Tạm tính" salary for this employee and month/year
    const existingTemporarySalaries = await this.getAllTemporarySalariesByEmployee(
      employeeId,
      finalYear,
      finalMonth
    );
    if (existingTemporarySalaries.length > 0) {
      throw new Error(
        `Nhân viên này đã có bảng lương tạm tính cho tháng ${finalMonth}/${finalYear}. Vui lòng xóa bảng lương cũ trước khi tính lại.`
      );
    }

    // Always create new record (no checking for existing since UNIQUE constraint is removed)
    const result = await pool.query(
      `INSERT INTO monthly_salaries (
        employee_id, year, month, total_work_days, total_amount, status, calculated_at
      ) VALUES ($1, $2, $3, $4, $5, 'Tạm tính', NOW())
      RETURNING *`,
      [employeeId, finalYear, finalMonth, totalWorkDays, totalAmount]
    );
    
    const monthlySalaryId = result.rows[0].id;
    
    // Save work record IDs to junction table
    if (recordIds.length > 0) {
      // Use unnest to insert multiple rows efficiently
      await pool.query(
        `INSERT INTO monthly_salary_work_records (monthly_salary_id, work_record_id)
         SELECT $1::uuid, unnest($2::uuid[])
         ON CONFLICT (monthly_salary_id, work_record_id) DO NOTHING`,
        [monthlySalaryId, recordIds]
      );
    }
    
    return this.getMonthlySalaryById(monthlySalaryId) as Promise<MonthlySalaryResponse>;
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

  async getAllTemporarySalariesByEmployee(
    employeeId: string,
    year?: number,
    month?: number
  ): Promise<MonthlySalaryResponse[]> {
    const conditions: string[] = ['ms.employee_id = $1', "ms.status = 'Tạm tính'"];
    const values: any[] = [employeeId];
    let paramCount = 2;

    if (year !== undefined) {
      conditions.push(`ms.year = $${paramCount}`);
      values.push(year);
      paramCount++;
    }

    if (month !== undefined) {
      conditions.push(`ms.month = $${paramCount}`);
      values.push(month);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');

    const query = `
      SELECT ms.*,
        e.first_name as employee_first_name,
        e.last_name as employee_last_name,
        e.employee_id as employee_employee_id
      FROM monthly_salaries ms
      LEFT JOIN employees e ON ms.employee_id = e.id
      WHERE ${whereClause}
      ORDER BY ms.year DESC, ms.month DESC
    `;

    const result = await pool.query(query, values);
    return result.rows.map((row) => this.mapToMonthlySalaryResponse(row));
  }

  async getAllPaidSalariesByEmployee(
    employeeId: string,
    year?: number,
    month?: number
  ): Promise<MonthlySalaryResponse[]> {
    const conditions: string[] = ['ms.employee_id = $1', "ms.status = 'Thanh toán'"];
    const values: any[] = [employeeId];
    let paramCount = 2;

    if (year !== undefined) {
      conditions.push(`ms.year = $${paramCount}`);
      values.push(year);
      paramCount++;
    }

    if (month !== undefined) {
      conditions.push(`ms.month = $${paramCount}`);
      values.push(month);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');

    const query = `
      SELECT ms.*,
        e.first_name as employee_first_name,
        e.last_name as employee_last_name,
        e.employee_id as employee_employee_id
      FROM monthly_salaries ms
      LEFT JOIN employees e ON ms.employee_id = e.id
      WHERE ${whereClause}
      ORDER BY ms.year DESC, ms.month DESC
    `;

    const result = await pool.query(query, values);
    return result.rows.map((row) => this.mapToMonthlySalaryResponse(row));
  }

  async mergeAndPaySalaries(
    primarySalaryId: string,
    employeeId: string
  ): Promise<MonthlySalaryResponse> {
    // Get primary salary to use its year/month for the merged record
    const primarySalary = await this.getMonthlySalaryById(primarySalaryId);
    if (!primarySalary) {
      throw new Error('Không tìm thấy bảng lương chính');
    }

    // Check if primary salary is already paid
    if (primarySalary.status === 'Thanh toán') {
      throw new Error('Bảng lương này đã được thanh toán');
    }

    // Check if primary salary is temporary
    if (primarySalary.status !== 'Tạm tính') {
      throw new Error('Chỉ có thể thanh toán bảng lương ở trạng thái "Tạm tính"');
    }

    // Get all temporary salaries for this employee in the same month (to be paid)
    const temporarySalaries = await this.getAllTemporarySalariesByEmployee(
      employeeId,
      primarySalary.year,
      primarySalary.month
    );

    if (temporarySalaries.length === 0) {
      throw new Error('Không có bảng lương tạm tính nào để thanh toán');
    }

    // Ensure primary salary is included in the list (it should be, but double-check)
    const primaryIncluded = temporarySalaries.some(s => s.id === primarySalaryId);
    if (!primaryIncluded) {
      temporarySalaries.push(primarySalary);
    }

    // Get all paid salaries for this employee in the same month (to be merged)
    const paidSalaries = await this.getAllPaidSalariesByEmployee(
      employeeId,
      primarySalary.year,
      primarySalary.month
    );

    // Combine all salaries to merge (temporary + paid)
    const allSalariesToMerge = [...temporarySalaries, ...paidSalaries];

    // If only one temporary salary and no paid salaries, just pay it
    if (temporarySalaries.length === 1 && paidSalaries.length === 0) {
      const singleSalary = temporarySalaries[0];
      
      // Get all work record IDs from junction table
      const junctionResult = await pool.query(
        `SELECT work_record_id FROM monthly_salary_work_records
         WHERE monthly_salary_id = $1`,
        [singleSalary.id]
      );
      const workRecordIds = junctionResult.rows.map(row => row.work_record_id);

      // Update work records status
      if (workRecordIds.length > 0) {
        await workRecordModel.updateWorkRecordsStatus(workRecordIds, 'Đã thanh toán');
      }

      // Update salary status
      const result = await pool.query(
        `UPDATE monthly_salaries
         SET status = 'Thanh toán', paid_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [singleSalary.id]
      );
      
      return this.getMonthlySalaryById(result.rows[0].id) as Promise<MonthlySalaryResponse>;
    }

    // Multiple salaries - merge them (both temporary and paid)
    const totalAmount = allSalariesToMerge.reduce((sum, s) => sum + s.totalAmount + (s.allowances || 0), 0);
    const totalWorkDays = allSalariesToMerge.reduce((sum, s) => sum + s.totalWorkDays, 0);
    const totalAllowances = allSalariesToMerge.reduce((sum, s) => sum + (s.allowances || 0), 0);

    // Get all work record IDs from all salaries (both temporary and paid) from junction table
    const salaryIds = allSalariesToMerge.map(s => s.id);
    const junctionResult = await pool.query(
      `SELECT DISTINCT work_record_id FROM monthly_salary_work_records
       WHERE monthly_salary_id = ANY($1::uuid[])`,
      [salaryIds]
    );
    const workRecordIds = junctionResult.rows.map(row => row.work_record_id);

    // Update work records status (only for temporary salaries, paid ones already have status "Đã thanh toán")
    const temporarySalaryIds = temporarySalaries.map(s => s.id);
    if (temporarySalaryIds.length > 0) {
      const temporaryJunctionResult = await pool.query(
        `SELECT DISTINCT work_record_id FROM monthly_salary_work_records
         WHERE monthly_salary_id = ANY($1::uuid[])`,
        [temporarySalaryIds]
      );
      const temporaryWorkRecordIds = temporaryJunctionResult.rows.map(row => row.work_record_id);
      
      if (temporaryWorkRecordIds.length > 0) {
        await workRecordModel.updateWorkRecordsStatus(temporaryWorkRecordIds, 'Đã thanh toán');
      }
    }

    // Delete all salaries (both temporary and paid) - cascade will delete junction records
    await pool.query(
      `DELETE FROM monthly_salaries WHERE id = ANY($1::uuid[])`,
      [salaryIds]
    );

    // Create merged salary record using primary salary's year/month
    const result = await pool.query(
      `INSERT INTO monthly_salaries (
        employee_id, year, month, total_work_days, total_amount, allowances, status, calculated_at, paid_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'Thanh toán', NOW(), NOW())
      RETURNING *`,
      [
        employeeId,
        primarySalary.year,
        primarySalary.month,
        totalWorkDays,
        totalAmount - totalAllowances, // total_amount should not include allowances
        totalAllowances
      ]
    );

    const mergedSalaryId = result.rows[0].id;

    // Save all work record IDs to merged salary in junction table
    if (workRecordIds.length > 0) {
      // Use unnest to insert multiple rows efficiently
      await pool.query(
        `INSERT INTO monthly_salary_work_records (monthly_salary_id, work_record_id)
         SELECT $1::uuid, unnest($2::uuid[])
         ON CONFLICT (monthly_salary_id, work_record_id) DO NOTHING`,
        [mergedSalaryId, workRecordIds]
      );
    }

    return this.getMonthlySalaryById(mergedSalaryId) as Promise<MonthlySalaryResponse>;
  }

  async payMonthlySalary(id: string): Promise<MonthlySalaryResponse | null> {
    // Get the salary to get employeeId
    const salary = await this.getMonthlySalaryById(id);
    if (!salary) {
      return null;
    }

    // Use merge and pay logic
    return this.mergeAndPaySalaries(id, salary.employeeId);
  }

  async deleteMonthlySalary(id: string): Promise<boolean> {
    // Get salary to check if it exists
    const ms = await this.getMonthlySalaryById(id);
    if (!ms) return false;
    
    // If status is "Thanh toán", revert work records to "Tạo mới" before deleting
    if (ms.status === 'Thanh toán') {
      // Get all work record IDs from junction table
      const junctionResult = await pool.query(
        `SELECT work_record_id FROM monthly_salary_work_records
         WHERE monthly_salary_id = $1`,
        [id]
      );
      const workRecordIds = junctionResult.rows.map(row => row.work_record_id);
      
      // Revert work records status to "Tạo mới" if there are any
      if (workRecordIds.length > 0) {
        await workRecordModel.updateWorkRecordsStatus(workRecordIds, 'Tạo mới');
      }
    }
    
    // Delete the salary record (CASCADE will delete junction records)
    await pool.query(`DELETE FROM monthly_salaries WHERE id = $1`, [id]);
    return true;
  }
}

export default new MonthlySalaryModel();

