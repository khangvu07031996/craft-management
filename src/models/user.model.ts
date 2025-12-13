import pool from '../config/database';
import { User, CreateUserDto, UpdateUserDto, UserResponse, UserRole } from '../types/user.types';
import bcrypt from 'bcrypt';

class UserModel {
  // Get all users
  async getAllUsers(): Promise<UserResponse[]> {
    const result = await pool.query(
      'SELECT id, email, first_name as "firstName", last_name as "lastName", phone_number as "phoneNumber", address, role, employee_id as "employeeId", age, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  }

  // Get user by ID
  async getUserById(id: string): Promise<UserResponse | null> {
    const result = await pool.query(
      'SELECT id, email, first_name as "firstName", last_name as "lastName", phone_number as "phoneNumber", address, role, employee_id as "employeeId", age, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  // Get user by email (with password for authentication)
  async getUserByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT id, email, password, first_name as "firstName", last_name as "lastName", phone_number as "phoneNumber", address, role, employee_id as "employeeId", age, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );
    const row = result.rows[0];
    if (!row) return null;
    
    // Map to User interface (keep password for verification)
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      firstName: row.firstName,
      lastName: row.lastName,
      phoneNumber: row.phoneNumber,
      address: row.address,
      role: row.role,
      employeeId: row.employeeId,
      age: row.age,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  // Create new user
  async createUser(userData: CreateUserDto): Promise<UserResponse> {
    const { email, password, firstName, lastName, phoneNumber, address, role, employeeId, age } = userData;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Default role is 'member' if not specified
    const userRole = role || UserRole.MEMBER;
    
    const result = await pool.query(
      `INSERT INTO users (email, password, first_name, last_name, phone_number, address, role, employee_id, age) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING id, email, first_name as "firstName", last_name as "lastName", phone_number as "phoneNumber", address, role, employee_id as "employeeId", age, created_at, updated_at`,
      [email, hashedPassword, firstName, lastName, phoneNumber, address, userRole, employeeId, age]
    );
    
    return result.rows[0];
  }

  // Update user
  async updateUser(id: string, userData: UpdateUserDto): Promise<UserResponse | null> {
    const { email, firstName, lastName, phoneNumber, address, age } = userData;
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (email !== undefined) {
      updates.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }
    if (firstName !== undefined) {
      updates.push(`first_name = $${paramCount}`);
      values.push(firstName);
      paramCount++;
    }
    if (lastName !== undefined) {
      updates.push(`last_name = $${paramCount}`);
      values.push(lastName);
      paramCount++;
    }
    if (phoneNumber !== undefined) {
      updates.push(`phone_number = $${paramCount}`);
      values.push(phoneNumber);
      paramCount++;
    }
    if (address !== undefined) {
      updates.push(`address = $${paramCount}`);
      values.push(address);
      paramCount++;
    }
    if (age !== undefined) {
      updates.push(`age = $${paramCount}`);
      values.push(age);
      paramCount++;
    }

    if (updates.length === 0) {
      return this.getUserById(id);
    }

    values.push(id);
    const query = `
      UPDATE users 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING id, email, first_name as "firstName", last_name as "lastName", phone_number as "phoneNumber", address, role, employee_id as "employeeId", age, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  // Delete user
  async deleteUser(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );
    return (result.rowCount || 0) > 0;
  }

  // Find user by email (without password)
  async findByEmail(email: string): Promise<UserResponse | null> {
    const result = await pool.query(
      'SELECT id, email, first_name as "firstName", last_name as "lastName", phone_number as "phoneNumber", address, role, employee_id as "employeeId", age, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  // Verify password
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}

export default new UserModel();
