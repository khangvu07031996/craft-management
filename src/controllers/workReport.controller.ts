import { Request, Response } from 'express';
import pool from '../config/database';
import {
  WorkReport,
  PayrollPeriodReport,
  PayrollPeriodPaidSalaryRow,
  PayrollPeriodEmployeeActivityRow,
  TopPerformersReport,
  TopPerformerRankRow,
  TopPerformerMetricKey,
} from '../types/work.types';

const TOP_PERFORMER_METRICS_ALL: TopPerformerMetricKey[] = [
  'totalQuantity',
  'totalAmount',
  'productTypeCount',
  'workDays',
  'overtimeHours',
  'overtimeQuantity',
  'weekAttendanceRatio',
];
const VALID_TOP_METRICS = new Set<string>(TOP_PERFORMER_METRICS_ALL);

type AggRowInternal = {
  employeeId: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  department: string | null;
  totalQuantity: number;
  totalAmount: number;
  productTypeCount: number;
  workDays: number;
  overtimeHours: number;
  overtimeQuantity: number;
  weekAttendanceRatio: number;
};

function metricValue(row: AggRowInternal, metric: TopPerformerMetricKey): number {
  switch (metric) {
    case 'totalQuantity':
      return row.totalQuantity;
    case 'totalAmount':
      return row.totalAmount;
    case 'productTypeCount':
      return row.productTypeCount;
    case 'workDays':
      return row.workDays;
    case 'overtimeHours':
      return row.overtimeHours;
    case 'overtimeQuantity':
      return row.overtimeQuantity;
    case 'weekAttendanceRatio':
      return row.weekAttendanceRatio;
    default:
      return 0;
  }
}

function compareMetricDesc(a: AggRowInternal, b: AggRowInternal, metric: TopPerformerMetricKey): number {
  const va = metricValue(a, metric);
  const vb = metricValue(b, metric);
  if (vb !== va) return vb - va;
  /** Họ + Tên: trong DB employees, first_name = Họ, last_name = Tên (theo form nhân viên). */
  const na = `${a.firstName} ${a.lastName}`;
  const nb = `${b.firstName} ${b.lastName}`;
  return na.localeCompare(nb, 'vi', { sensitivity: 'base' });
}

const METRIC_SCORING_EPS = 1e-7;

/** Có ít nhất 2 giá trị khác nhau trong kỳ — tránh “hạng 1” khi cả xưởng cùng 0 hoặc cùng một số. */
function isMetricDiscriminative(allRows: AggRowInternal[], metric: TopPerformerMetricKey): boolean {
  if (allRows.length <= 1) return false;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const r of allRows) {
    const v = metricValue(r, metric);
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }
  return maxV - minV > METRIC_SCORING_EPS;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Inclusive calendar bounds YYYY-MM-DD (local calendar year/month/quarter). */
function resolvePeriodBounds(
  granularity: string,
  year: number,
  month?: number,
  quarter?: number
): { dateFrom: string; dateTo: string; periodLabel: string } {
  if (granularity === 'year') {
    return {
      dateFrom: `${year}-01-01`,
      dateTo: `${year}-12-31`,
      periodLabel: `Năm ${year}`,
    };
  }
  if (granularity === 'quarter') {
    if (!quarter || quarter < 1 || quarter > 4) {
      throw new Error('Quarter must be 1–4');
    }
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    const lastDay = new Date(year, endMonth, 0).getDate();
    return {
      dateFrom: `${year}-${pad2(startMonth)}-01`,
      dateTo: `${year}-${pad2(endMonth)}-${pad2(lastDay)}`,
      periodLabel: `Quý ${quarter}/${year}`,
    };
  }
  if (granularity === 'month') {
    if (!month || month < 1 || month > 12) {
      throw new Error('Month must be 1–12');
    }
    const lastDay = new Date(year, month, 0).getDate();
    return {
      dateFrom: `${year}-${pad2(month)}-01`,
      dateTo: `${year}-${pad2(month)}-${pad2(lastDay)}`,
      periodLabel: `Tháng ${month}/${year}`,
    };
  }
  throw new Error('Invalid granularity');
}

function toDateStr(d: unknown): string | undefined {
  if (d == null) return undefined;
  if (typeof d === 'string') return d.split('T')[0];
  if (d instanceof Date) return d.toISOString().split('T')[0];
  return String(d).split('T')[0];
}

function paidAtToIso(rowPaidAt: unknown): string {
  if (rowPaidAt instanceof Date) return rowPaidAt.toISOString();
  if (typeof rowPaidAt === 'string') return new Date(rowPaidAt).toISOString();
  return new Date(String(rowPaidAt)).toISOString();
}

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

export const getPayrollPeriodReport = async (req: Request, res: Response) => {
  try {
    const { granularity, year, month, quarter, department, employee_id } = req.query;

    if (!granularity || !year) {
      return res.status(400).json({
        success: false,
        message: 'granularity and year are required',
      });
    }

    const g = String(granularity).toLowerCase();
    if (!['month', 'quarter', 'year'].includes(g)) {
      return res.status(400).json({
        success: false,
        message: 'granularity must be month, quarter, or year',
      });
    }

    const yearNum = parseInt(year as string, 10);
    if (Number.isNaN(yearNum)) {
      return res.status(400).json({ success: false, message: 'Invalid year' });
    }

    let bounds: { dateFrom: string; dateTo: string; periodLabel: string };
    try {
      bounds = resolvePeriodBounds(
        g,
        yearNum,
        month !== undefined ? parseInt(month as string, 10) : undefined,
        quarter !== undefined ? parseInt(quarter as string, 10) : undefined
      );
    } catch (e: any) {
      return res.status(400).json({ success: false, message: e.message || 'Invalid period' });
    }

    const { dateFrom, dateTo, periodLabel } = bounds;

    const salaryConditions: string[] = [
      `ms.status = 'Thanh toán'`,
      `ms.paid_at IS NOT NULL`,
      `(ms.paid_at::date) >= $1::date`,
      `(ms.paid_at::date) <= $2::date`,
    ];
    const salaryValues: unknown[] = [dateFrom, dateTo];
    let p = 3;

    if (department) {
      salaryConditions.push(`e.department = $${p}`);
      salaryValues.push(department as string);
      p++;
    }
    if (employee_id) {
      salaryConditions.push(`ms.employee_id = $${p}`);
      salaryValues.push(employee_id as string);
      p++;
    }

    const salaryWhere = salaryConditions.join(' AND ');

    const salaryQuery = `
      SELECT
        ms.id,
        ms.employee_id,
        ms.year,
        ms.month,
        ms.date_from,
        ms.date_to,
        ms.total_work_days,
        ms.total_amount,
        ms.allowances,
        ms.advance_payment,
        ms.status,
        ms.paid_at,
        e.first_name AS employee_first_name,
        e.last_name AS employee_last_name,
        e.employee_id AS employee_employee_id
      FROM monthly_salaries ms
      LEFT JOIN employees e ON ms.employee_id = e.id
      WHERE ${salaryWhere}
      ORDER BY ms.paid_at ASC, e.last_name, e.first_name
    `;

    const salaryResult = await pool.query(salaryQuery, salaryValues);

    let totalAmountSum = 0;
    let totalAllowancesSum = 0;
    let totalAdvanceSum = 0;
    let totalNetPaid = 0;

    const paidSalaries: PayrollPeriodPaidSalaryRow[] = salaryResult.rows.map((row) => {
      const totalAmount = parseFloat(row.total_amount) || 0;
      const allowances = parseFloat(row.allowances) || 0;
      const advancePayment = parseFloat(row.advance_payment) || 0;
      const netPaid = totalAmount + allowances - advancePayment;
      totalAmountSum += totalAmount;
      totalAllowancesSum += allowances;
      totalAdvanceSum += advancePayment;
      totalNetPaid += netPaid;

      const empId = row.employee_id as string;
      const rowOut: PayrollPeriodPaidSalaryRow = {
        id: row.id,
        employeeId: empId,
        year: parseInt(row.year, 10),
        month: parseInt(row.month, 10),
        dateFrom: toDateStr(row.date_from),
        dateTo: toDateStr(row.date_to),
        totalWorkDays: parseInt(row.total_work_days, 10) || 0,
        totalAmount,
        allowances,
        advancePayment,
        status: row.status,
        paidAt: paidAtToIso(row.paid_at),
        netPaid,
      };

      if (row.employee_first_name) {
        rowOut.employee = {
          id: empId,
          firstName: row.employee_first_name,
          lastName: row.employee_last_name,
          employeeId: row.employee_employee_id,
        };
      }
      return rowOut;
    });

    const workConditions: string[] = [
      `wr.work_date >= $1::date`,
      `wr.work_date <= $2::date`,
    ];
    const workValues: unknown[] = [dateFrom, dateTo];
    let wp = 3;

    if (department) {
      workConditions.push(`e.department = $${wp}`);
      workValues.push(department as string);
      wp++;
    }
    if (employee_id) {
      workConditions.push(`wr.employee_id = $${wp}`);
      workValues.push(employee_id as string);
      wp++;
    }

    const workWhere = workConditions.join(' AND ');

    const workQuery = `
      SELECT
        wr.employee_id,
        COUNT(DISTINCT wr.work_date)::int AS work_days,
        COALESCE(SUM(wr.overtime_hours), 0)::float AS overtime_hours,
        COALESCE(SUM(wr.overtime_quantity), 0)::float AS overtime_quantity,
        COUNT(DISTINCT wr.work_item_id)::int AS product_type_count,
        COALESCE(SUM(wr.quantity), 0)::float AS total_quantity,
        e.first_name,
        e.last_name,
        e.employee_id AS emp_code,
        e.department
      FROM work_records wr
      INNER JOIN employees e ON e.id = wr.employee_id
      WHERE ${workWhere}
      GROUP BY wr.employee_id, e.first_name, e.last_name, e.employee_id, e.department
      ORDER BY e.last_name, e.first_name
    `;

    const workResult = await pool.query(workQuery, workValues);

    const byEmployee: PayrollPeriodEmployeeActivityRow[] = workResult.rows.map((row) => ({
      employeeId: row.employee_id,
      firstName: row.first_name,
      lastName: row.last_name,
      employeeCode: row.emp_code,
      department: row.department ?? null,
      workDays: parseInt(row.work_days, 10) || 0,
      overtimeHours: parseFloat(row.overtime_hours) || 0,
      overtimeQuantity: parseFloat(row.overtime_quantity) || 0,
      productTypeCount: parseInt(row.product_type_count, 10) || 0,
      totalQuantity: parseFloat(row.total_quantity) || 0,
    }));

    const report: PayrollPeriodReport = {
      periodLabel,
      dateFrom,
      dateTo,
      summary: {
        paidSlipCount: paidSalaries.length,
        totalAmountSum,
        totalAllowancesSum,
        totalAdvanceSum,
        totalNetPaid,
      },
      paidSalaries,
      byEmployee,
    };

    return res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('Error generating payroll period report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate payroll period report',
      error: error.message,
    });
  }
};

export const getTopPerformersReport = async (req: Request, res: Response) => {
  try {
    const { granularity, year, month, quarter, department, top, metrics, only_paid_employees } = req.query;

    if (!granularity || !year) {
      return res.status(400).json({
        success: false,
        message: 'granularity and year are required',
      });
    }

    const g = String(granularity).toLowerCase();
    if (!['month', 'quarter', 'year'].includes(g)) {
      return res.status(400).json({
        success: false,
        message: 'granularity must be month, quarter, or year',
      });
    }

    const yearNum = parseInt(year as string, 10);
    if (Number.isNaN(yearNum)) {
      return res.status(400).json({ success: false, message: 'Invalid year' });
    }

    let bounds: { dateFrom: string; dateTo: string; periodLabel: string };
    try {
      bounds = resolvePeriodBounds(
        g,
        yearNum,
        month !== undefined ? parseInt(month as string, 10) : undefined,
        quarter !== undefined ? parseInt(quarter as string, 10) : undefined
      );
    } catch (e: any) {
      return res.status(400).json({ success: false, message: e.message || 'Invalid period' });
    }

    const { dateFrom, dateTo, periodLabel } = bounds;

    let topNum = parseInt(top as string, 10);
    if (Number.isNaN(topNum) || topNum < 1) topNum = 10;
    topNum = Math.min(50, Math.max(1, topNum));

    const onlyPaidEmployees =
      typeof only_paid_employees === 'string' &&
      ['1', 'true', 'yes'].includes(only_paid_employees.toLowerCase());

    let requestedMetrics: TopPerformerMetricKey[] = TOP_PERFORMER_METRICS_ALL;
    if (typeof metrics === 'string' && metrics.trim()) {
      const parts = metrics
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((m): m is TopPerformerMetricKey => VALID_TOP_METRICS.has(m));
      if (parts.length > 0) requestedMetrics = parts;
    }

    const weekCountResult = await pool.query(
      `SELECT COUNT(DISTINCT date_trunc('week', gs::date))::int AS w
       FROM generate_series($1::date, $2::date, interval '1 day') AS gs`,
      [dateFrom, dateTo]
    );
    const weeksInPeriod = parseInt(weekCountResult.rows[0]?.w, 10) || 1;

    const workConditions: string[] = [
      `wr.work_date >= $1::date`,
      `wr.work_date <= $2::date`,
    ];
    const workValues: unknown[] = [dateFrom, dateTo];
    let wp = 3;

    if (department) {
      workConditions.push(`e.department = $${wp}`);
      workValues.push(department as string);
      wp++;
    }

    if (onlyPaidEmployees) {
      workConditions.push(`wr.employee_id IN (
        SELECT DISTINCT ms.employee_id FROM monthly_salaries ms
        WHERE ms.status = 'Thanh toán'
          AND ms.paid_at IS NOT NULL
          AND (ms.paid_at::date) >= $1::date
          AND (ms.paid_at::date) <= $2::date
      )`);
    }

    const workWhere = workConditions.join(' AND ');

    const workQuery = `
      SELECT
        wr.employee_id,
        COUNT(DISTINCT wr.work_date)::int AS work_days,
        COALESCE(SUM(wr.overtime_hours), 0)::float AS overtime_hours,
        COALESCE(SUM(wr.overtime_quantity), 0)::float AS overtime_quantity,
        COUNT(DISTINCT wr.work_item_id)::int AS product_type_count,
        COALESCE(SUM(wr.quantity), 0)::float AS total_quantity,
        COALESCE(SUM(wr.total_amount), 0)::float AS total_amount,
        COUNT(DISTINCT date_trunc('week', wr.work_date::timestamp))::int AS weeks_with_work,
        e.first_name,
        e.last_name,
        e.employee_id AS emp_code,
        e.department
      FROM work_records wr
      INNER JOIN employees e ON e.id = wr.employee_id
      WHERE ${workWhere}
      GROUP BY wr.employee_id, e.first_name, e.last_name, e.employee_id, e.department
    `;

    const workResult = await pool.query(workQuery, workValues);

    const denom = Math.max(1, weeksInPeriod);

    const rows: AggRowInternal[] = workResult.rows.map((row) => {
      const weeksWithWork = parseInt(row.weeks_with_work, 10) || 0;
      return {
        employeeId: row.employee_id,
        firstName: row.first_name,
        lastName: row.last_name,
        employeeCode: row.emp_code,
        department: row.department ?? null,
        workDays: parseInt(row.work_days, 10) || 0,
        overtimeHours: parseFloat(row.overtime_hours) || 0,
        overtimeQuantity: parseFloat(row.overtime_quantity) || 0,
        productTypeCount: parseInt(row.product_type_count, 10) || 0,
        totalQuantity: parseFloat(row.total_quantity) || 0,
        totalAmount: parseFloat(row.total_amount) || 0,
        weekAttendanceRatio: weeksWithWork / denom,
      };
    });

    const scoringEligibleByMetric: Partial<Record<TopPerformerMetricKey, boolean>> = {};
    for (const metric of requestedMetrics) {
      scoringEligibleByMetric[metric] = isMetricDiscriminative(rows, metric);
    }

    const rankings: Partial<Record<TopPerformerMetricKey, TopPerformerRankRow[]>> = {};

    for (const metric of requestedMetrics) {
      const sorted = [...rows].sort((a, b) => compareMetricDesc(a, b, metric));
      const slice = sorted.slice(0, topNum);
      let prevRank = 1;
      rankings[metric] = slice.map((r, idx) => {
        let rank: number;
        if (idx === 0) {
          rank = 1;
        } else {
          const cmp = compareMetricDesc(slice[idx - 1], r, metric);
          rank = cmp === 0 ? prevRank : idx + 1;
        }
        prevRank = rank;
        const rankRow: TopPerformerRankRow = {
          rank,
          employeeId: r.employeeId,
          firstName: r.firstName,
          lastName: r.lastName,
          employeeCode: r.employeeCode,
          department: r.department,
          value:
            metric === 'weekAttendanceRatio'
              ? Math.round(metricValue(r, metric) * 10000) / 10000
              : metric === 'totalAmount'
                ? Math.round(metricValue(r, metric) * 100) / 100
                : metricValue(r, metric),
        };
        return rankRow;
      });
    }

    const report: TopPerformersReport = {
      periodLabel,
      dateFrom,
      dateTo,
      top: topNum,
      weeksInPeriod,
      onlyPaidEmployees,
      rankings,
      scoringEligibleByMetric,
    };

    return res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('Error generating top performers report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate top performers report',
      error: error.message,
    });
  }
};
