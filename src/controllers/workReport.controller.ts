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

    // Build query
    let query = `
      SELECT 
        wr.work_date,
        wr.total_amount,
        e.department,
        wt.name as work_type_name,
        COUNT(*) as record_count
      FROM work_records wr
      LEFT JOIN employees e ON wr.employee_id = e.id
      LEFT JOIN work_types wt ON wr.work_type_id = wt.id
      WHERE wr.work_date >= $1 AND wr.work_date <= $2
    `;
    const values: any[] = [dateFrom, dateTo];
    let paramCount = 3;

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
      GROUP BY wr.work_date, e.department, wt.name, wr.total_amount
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

    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('Error generating weekly report:', error);
    res.status(500).json({
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

    // Build query
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
      WHERE EXTRACT(YEAR FROM wr.work_date) = $1 
        AND EXTRACT(MONTH FROM wr.work_date) = $2
    `;
    const values: any[] = [yearNum, monthNum];
    let paramCount = 3;

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
      period: `${monthNum}/${yearNum}`,
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

    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('Error generating monthly report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate monthly report',
      error: error.message,
    });
  }
};

