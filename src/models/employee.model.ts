import pool from '../config/database';
import { Employee, CreateEmployeeDto, UpdateEmployeeDto, EmployeeResponse, EmployeeStatus } from '../types/employee.types';

class EmployeeModel {
  // Helper to map database row to EmployeeResponse
  private mapToEmployeeResponse(row: any): EmployeeResponse {
    return {
      id: row.id,
      employeeId: row.employee_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phoneNumber: row.phone_number || undefined,
      position: row.position,
      department: row.department,
      salary: row.salary ? parseFloat(row.salary) : undefined,
      hireDate: row.hire_date,
      managerId: row.manager_id || undefined,
      status: (row.status || EmployeeStatus.ACTIVE) as EmployeeStatus,
      manager: row.manager_first_name ? {
        id: row.manager_id,
        firstName: row.manager_first_name,
        lastName: row.manager_last_name,
        employeeId: row.manager_employee_id,
      } : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  // Get all employees with pagination
  async getAllEmployees(
    department?: string,
    managerId?: string,
    email?: string,
    name?: string,
    phoneNumber?: string,
    page: number = 1,
    pageSize: number = 10,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ employees: EmployeeResponse[]; total: number }> {
    // Build WHERE conditions
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (department) {
      conditions.push(`e.department = $${paramCount}`);
      values.push(department);
      paramCount++;
    }

    if (managerId) {
      conditions.push(`e.manager_id = $${paramCount}`);
      values.push(managerId);
      paramCount++;
    }

    if (email) {
      conditions.push(`e.email ILIKE $${paramCount}`);
      values.push(`%${email}%`);
      paramCount++;
    }

    if (name) {
      conditions.push(`(e.first_name ILIKE $${paramCount} OR e.last_name ILIKE $${paramCount} OR CONCAT(e.first_name, ' ', e.last_name) ILIKE $${paramCount})`);
      values.push(`%${name}%`);
      paramCount++;
    }

    if (phoneNumber) {
      conditions.push(`e.phone_number ILIKE $${paramCount}`);
      values.push(`%${phoneNumber}%`);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM employees e${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total, 10);

    // Calculate offset
    const offset = (page - 1) * pageSize;

    // Validate and set sort column
    const allowedSortColumns: Record<string, string> = {
      'first_name': 'e.first_name',
      'last_name': 'e.last_name',
      'email': 'e.email',
      'position': 'e.position',
      'department': 'e.department',
      'hire_date': 'e.hire_date',
      'created_at': 'e.created_at',
    };
    const sortColumn = sortBy && allowedSortColumns[sortBy] ? allowedSortColumns[sortBy] : 'e.created_at';
    const order = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get paginated data
    const dataQuery = `
      SELECT 
        e.*,
        m.first_name as manager_first_name,
        m.last_name as manager_last_name,
        m.employee_id as manager_employee_id
      FROM employees e
      LEFT JOIN employees m ON e.manager_id = m.id
      ${whereClause}
      ORDER BY ${sortColumn} ${order}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    const dataValues = [...values, pageSize, offset];
    const result = await pool.query(dataQuery, dataValues);

    return {
      employees: result.rows.map(row => this.mapToEmployeeResponse(row)),
      total,
    };
  }

  // Get employees statistics by department
  async getEmployeesByDepartment(): Promise<Array<{ department: string; count: number }>> {
    try {
      console.log('EmployeeModel.getEmployeesByDepartment: Executing query...');
      const query = `
        SELECT 
          department,
          COUNT(*)::integer as count
        FROM employees
        WHERE department IS NOT NULL AND department != ''
        GROUP BY department
        ORDER BY count DESC, department ASC
      `;
      const result = await pool.query(query);
      console.log('EmployeeModel.getEmployeesByDepartment: Query result:', result.rows);
      const stats = result.rows.map(row => ({
        department: row.department || 'Unknown',
        count: parseInt(row.count.toString(), 10),
      }));
      console.log('EmployeeModel.getEmployeesByDepartment: Mapped stats:', stats);
      return stats;
    } catch (error) {
      console.error('EmployeeModel.getEmployeesByDepartment: Database error:', error);
      throw error;
    }
  }

  // Get employee by ID
  async getEmployeeById(id: string): Promise<EmployeeResponse | null> {
    const result = await pool.query(
      `SELECT 
        e.*,
        m.first_name as manager_first_name,
        m.last_name as manager_last_name,
        m.employee_id as manager_employee_id
      FROM employees e
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE e.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToEmployeeResponse(result.rows[0]);
  }

  // Create new employee
  async createEmployee(employeeData: CreateEmployeeDto): Promise<EmployeeResponse> {
    const {
      employeeId,
      firstName,
      lastName,
      email,
      phoneNumber,
      position,
      department,
      salary,
      hireDate,
      managerId,
      status = EmployeeStatus.ACTIVE, // Default to active
    } = employeeData;

    const result = await pool.query(
      `INSERT INTO employees (
        employee_id, first_name, last_name, email, phone_number,
        position, department, salary, hire_date, manager_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        employeeId || null,
        firstName,
        lastName,
        email,
        phoneNumber || null,
        position,
        department,
        salary || null,
        hireDate,
        managerId || null,
        status,
      ]
    );

    return this.mapToEmployeeResponse(result.rows[0]);
  }

  // Get employee by employee_id
  async getEmployeeByEmployeeId(employeeId: string): Promise<EmployeeResponse | null> {
    const result = await pool.query(
      `SELECT 
        e.*,
        m.first_name as manager_first_name,
        m.last_name as manager_last_name,
        m.employee_id as manager_employee_id
      FROM employees e
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE e.employee_id = $1`,
      [employeeId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToEmployeeResponse(result.rows[0]);
  }

  // Update employee
  async updateEmployee(id: string, employeeData: UpdateEmployeeDto): Promise<EmployeeResponse | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (employeeData.employeeId !== undefined) {
      updates.push(`employee_id = $${paramCount}`);
      values.push(employeeData.employeeId);
      paramCount++;
    }
    if (employeeData.firstName !== undefined) {
      updates.push(`first_name = $${paramCount}`);
      values.push(employeeData.firstName);
      paramCount++;
    }
    if (employeeData.lastName !== undefined) {
      updates.push(`last_name = $${paramCount}`);
      values.push(employeeData.lastName);
      paramCount++;
    }
    if (employeeData.email !== undefined) {
      updates.push(`email = $${paramCount}`);
      values.push(employeeData.email);
      paramCount++;
    }
    if (employeeData.phoneNumber !== undefined) {
      updates.push(`phone_number = $${paramCount}`);
      values.push(employeeData.phoneNumber || null);
      paramCount++;
    }
    if (employeeData.position !== undefined) {
      updates.push(`position = $${paramCount}`);
      values.push(employeeData.position);
      paramCount++;
    }
    if (employeeData.department !== undefined) {
      updates.push(`department = $${paramCount}`);
      values.push(employeeData.department);
      paramCount++;
    }
    if (employeeData.salary !== undefined) {
      updates.push(`salary = $${paramCount}`);
      values.push(employeeData.salary || null);
      paramCount++;
    }
    if (employeeData.hireDate !== undefined) {
      updates.push(`hire_date = $${paramCount}`);
      values.push(employeeData.hireDate);
      paramCount++;
    }
    if (employeeData.managerId !== undefined) {
      updates.push(`manager_id = $${paramCount}`);
      values.push(employeeData.managerId || null);
      paramCount++;
    }
    if (employeeData.status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(employeeData.status);
      paramCount++;
    }

    if (updates.length === 0) {
      return this.getEmployeeById(id);
    }

    values.push(id);
    const query = `
      UPDATE employees 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING id, employee_id, first_name, last_name, email, phone_number,
                position, department, salary, hire_date, manager_id, status,
                created_at, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToEmployeeResponse(result.rows[0]);
  }

  // Delete employee
  async deleteEmployee(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM employees WHERE id = $1',
      [id]
    );
    return (result.rowCount || 0) > 0;
  }

  // Get employees by manager
  async getEmployeesByManager(managerId: string): Promise<EmployeeResponse[]> {
    const result = await pool.query(
      `SELECT 
        e.*,
        m.first_name as manager_first_name,
        m.last_name as manager_last_name,
        m.employee_id as manager_employee_id
      FROM employees e
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE e.manager_id = $1
      ORDER BY e.created_at DESC`,
      [managerId]
    );
    return result.rows.map(row => this.mapToEmployeeResponse(row));
  }

  // Get employees by department

  // Check if employee exists by email
  async findByEmail(email: string): Promise<EmployeeResponse | null> {
    const result = await pool.query(
      `SELECT 
        e.*,
        m.first_name as manager_first_name,
        m.last_name as manager_last_name,
        m.employee_id as manager_employee_id
      FROM employees e
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE e.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToEmployeeResponse(result.rows[0]);
  }

  // Check if employee exists by employee_id
  async findByEmployeeId(employeeId: string): Promise<EmployeeResponse | null> {
    return this.getEmployeeByEmployeeId(employeeId);
  }

  // Check if manager exists
  async managerExists(managerId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT id FROM employees WHERE id = $1',
      [managerId]
    );
    return result.rows.length > 0;
  }
}

export default new EmployeeModel();

