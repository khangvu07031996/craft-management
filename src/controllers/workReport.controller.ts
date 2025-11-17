import { Request, Response } from 'express';
import pool from '../config/database';
import { WorkReport } from '../types/work.types';

export const getWeeklyReport = async (req: Request, res: Response) => {
  try {
    const { year, week, department, employee_id } = req.query;

    if (!year || !week) {
      return res.status(400).json({
        success: false,
        message: 'Year and week are required',
      });
    }

    const yearNum = parseInt(year as string);
    const weekNum = parseInt(week as string);

    // Calculate date range for the week
    // ISO week: week 1 starts on the first Monday of the year
    const jan1 = new Date(yearNum, 0, 1);
    const daysOffset = (jan1.getDay() + 6) % 7; // Monday = 0
    const weekStart = new Date(yearNum, 0, 1 + (weekNum - 1) * 7 - daysOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const dateFrom = weekStart.toISOString().split('T')[0];
    const dateTo = weekEnd.toISOString().split('T')[0];

    // Build query - only include employees with paid monthly salary
    // For weekly report, check if employee has paid monthly salary for the month containing the work_date
    let query = `
      SELECT 
        wr.work_date,
        wr.total_amount,
        wr.employee_id,
        e.department,
        wt.name as work_type_name,
        COUNT(*) as record_count
      FROM work_records wr
      LEFT JOIN employees e ON wr.employee_id = e.id
      LEFT JOIN work_types wt ON wr.work_type_id = wt.id
      INNER JOIN monthly_salaries ms ON 
        ms.employee_id = wr.employee_id 
        AND ms.year = $1
        AND ms.month = EXTRACT(MONTH FROM wr.work_date)
        AND ms.status = 'Thanh toán'
      WHERE wr.work_date >= $2 AND wr.work_date <= $3
    `;
    const values: any[] = [yearNum, dateFrom, dateTo];
    let paramCount = 4;

    if (department) {
      query += ` AND e.department = $${paramCount}`;
      values.push(department);
      paramCount++;
    }

    if (employee_id) {
      query += ` AND wr.employee_id = $${paramCount}`;
      values.push(employee_id);
      paramCount++;
    }

    query += `
      GROUP BY wr.work_date, wr.employee_id, e.department, wt.name, wr.total_amount
      ORDER BY wr.work_date, e.department
    `;

    const result = await pool.query(query, values);

    // Aggregate data
    const totalAmount = result.rows.reduce((sum, row) => sum + parseFloat(row.total_amount), 0);
    const uniqueEmployees = new Set(result.rows.map((row) => row.employee_id));
    const totalWorkDays = new Set(result.rows.map((row) => row.work_date)).size;

    // Group by department
    const byDepartment: Record<string, { totalAmount: number; totalWorkDays: number }> = {};
    result.rows.forEach((row) => {
      const dept = row.department || 'Unknown';
      if (!byDepartment[dept]) {
        byDepartment[dept] = { totalAmount: 0, totalWorkDays: 0 };
      }
      byDepartment[dept].totalAmount += parseFloat(row.total_amount);
    });

    // Group by work type
    const byWorkType: Record<string, { totalAmount: number; count: number }> = {};
    result.rows.forEach((row) => {
      const workType = row.work_type_name || 'Unknown';
      if (!byWorkType[workType]) {
        byWorkType[workType] = { totalAmount: 0, count: 0 };
      }
      byWorkType[workType].totalAmount += parseFloat(row.total_amount);
      byWorkType[workType].count += parseInt(row.record_count);
    });

    const report: WorkReport = {
      period: `Week ${weekNum}, ${yearNum}`,
      totalEmployees: uniqueEmployees.size,
      totalWorkDays,
      totalAmount,
      byDepartment: Object.entries(byDepartment).map(([department, data]) => ({
        department,
        totalAmount: data.totalAmount,
        totalWorkDays: data.totalWorkDays,
      })),
      byWorkType: Object.entries(byWorkType).map(([workTypeName, data]) => ({
        workTypeName,
        totalAmount: data.totalAmount,
        count: data.count,
      })),
    };

    return res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('Error generating weekly report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate weekly report',
      error: error.message,
    });
  }
};

export const getMonthlyReport = async (req: Request, res: Response) => {
  try {
    const { year, month, department, employee_id } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Year and month are required',
      });
    }

    const yearNum = parseInt(year as string);
    const monthNum = parseInt(month as string);

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Month must be between 1 and 12',
      });
    }

    // Get all paid monthly salaries for the month
    let salaryQuery = `
      SELECT 
        ms.employee_id,
        ms.total_amount,
        ms.allowances,
        ms.total_work_days,
        e.department
      FROM monthly_salaries ms
      LEFT JOIN employees e ON ms.employee_id = e.id
      WHERE ms.year = $1 
        AND ms.month = $2
        AND ms.status = 'Thanh toán'
    `;
    const salaryValues: any[] = [yearNum, monthNum];
    let salaryParamCount = 3;

    if (department) {
      salaryQuery += ` AND e.department = $${salaryParamCount}`;
      salaryValues.push(department);
      salaryParamCount++;
    }

    if (employee_id) {
      salaryQuery += ` AND ms.employee_id = $${salaryParamCount}`;
      salaryValues.push(employee_id);
      salaryParamCount++;
    }

    const salaryResult = await pool.query(salaryQuery, salaryValues);

    // If no paid salaries, return empty report
    if (salaryResult.rows.length === 0) {
      const report: WorkReport = {
        period: `Tháng ${monthNum}/${yearNum}`,
        totalEmployees: 0,
        totalWorkDays: 0,
        totalAmount: 0,
        byDepartment: [],
        byWorkType: [],
      };

      return res.json({
        success: true,
        data: report,
      });
    }

    // Aggregate data from monthly salaries
    const totalAmount = salaryResult.rows.reduce(
      (sum, row) => sum + parseFloat(row.total_amount) + (parseFloat(row.allowances) || 0),
      0
    );
    const uniqueEmployees = new Set(salaryResult.rows.map((row) => row.employee_id));
    const totalWorkDays = salaryResult.rows.reduce(
      (sum, row) => sum + parseInt(row.total_work_days || 0),
      0
    );

    // Group by department
    const byDepartment: Record<string, { totalAmount: number; totalWorkDays: number }> = {};
    salaryResult.rows.forEach((row) => {
      const dept = row.department || 'Unknown';
      if (!byDepartment[dept]) {
        byDepartment[dept] = { totalAmount: 0, totalWorkDays: 0 };
      }
      byDepartment[dept].totalAmount += parseFloat(row.total_amount) + (parseFloat(row.allowances) || 0);
      byDepartment[dept].totalWorkDays += parseInt(row.total_work_days || 0);
    });

    // Get work records for work type grouping (only for employees with paid salaries)
    const employeeIds = Array.from(uniqueEmployees);
    let workTypeQuery = `
      SELECT 
        wr.employee_id,
        wt.name as work_type_name,
        wr.total_amount,
        COUNT(*) as record_count
      FROM work_records wr
      LEFT JOIN work_types wt ON wr.work_type_id = wt.id
      WHERE EXTRACT(YEAR FROM wr.work_date) = $1 
        AND EXTRACT(MONTH FROM wr.work_date) = $2
        AND wr.employee_id = ANY($3::uuid[])
    `;
    const workTypeValues: any[] = [yearNum, monthNum, employeeIds];
    let workTypeParamCount = 4;

    if (department) {
      workTypeQuery += ` AND EXISTS (
        SELECT 1 FROM employees e 
        WHERE e.id = wr.employee_id AND e.department = $${workTypeParamCount}
      )`;
      workTypeValues.push(department);
      workTypeParamCount++;
    }

    workTypeQuery += `
      GROUP BY wr.employee_id, wt.name, wr.total_amount
    `;

    const workTypeResult = await pool.query(workTypeQuery, workTypeValues);

    // Get employees with work records (total_work_days > 0)
    const employeesWithWorkRecords = new Set(
      salaryResult.rows
        .filter((row) => parseInt(row.total_work_days || 0) > 0)
        .map((row) => row.employee_id)
    );

    // Group by work type from work records (only for employees with work records)
    const byWorkType: Record<string, { totalAmount: number; count: number }> = {};
    workTypeResult.rows.forEach((row) => {
      // Only count if employee has work records (total_work_days > 0)
      if (employeesWithWorkRecords.has(row.employee_id)) {
        const workType = row.work_type_name || 'Unknown';
        if (!byWorkType[workType]) {
          byWorkType[workType] = { totalAmount: 0, count: 0 };
        }
        byWorkType[workType].totalAmount += parseFloat(row.total_amount);
        byWorkType[workType].count += parseInt(row.record_count);
      }
    });

    // Add employees with default salary (total_work_days = 0) to work type "Lương mặc định"
    salaryResult.rows.forEach((row) => {
      // If total_work_days = 0, this is default salary
      if (parseInt(row.total_work_days || 0) === 0) {
        if (!byWorkType['Lương mặc định']) {
          byWorkType['Lương mặc định'] = { totalAmount: 0, count: 0 };
        }
        byWorkType['Lương mặc định'].totalAmount += parseFloat(row.total_amount) + (parseFloat(row.allowances) || 0);
        byWorkType['Lương mặc định'].count += 1;
      }
    });

    const report: WorkReport = {
      period: `Tháng ${monthNum}/${yearNum}`,
      totalEmployees: uniqueEmployees.size,
      totalWorkDays,
      totalAmount,
      byDepartment: Object.entries(byDepartment).map(([department, data]) => ({
        department,
        totalAmount: data.totalAmount,
        totalWorkDays: data.totalWorkDays,
      })),
      byWorkType: Object.entries(byWorkType).map(([workTypeName, data]) => ({
        workTypeName,
        totalAmount: data.totalAmount,
        count: data.count,
      })),
    };

    return res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('Error generating monthly report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate monthly report',
      error: error.message,
    });
  }
};

