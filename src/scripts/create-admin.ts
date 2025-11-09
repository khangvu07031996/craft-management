import pool from '../config/database';
import bcrypt from 'bcrypt';
import { UserRole } from '../types/user.types';

async function createAdminUser() {
  try {
    const email = process.argv[2] || 'admin@example.com';
    const password = process.argv[3] || 'admin123';
    const firstName = process.argv[4] || 'Admin';
    const lastName = process.argv[5] || 'User';

    // Check if admin user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      // Update existing user to admin
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE users SET password = $1, role = $2, first_name = $3, last_name = $4 WHERE email = $5',
        [hashedPassword, UserRole.ADMIN, firstName, lastName, email]
      );
      console.log(`✅ Updated user ${email} to admin role`);
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        'INSERT INTO users (email, password, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5)',
        [email, hashedPassword, firstName, lastName, UserRole.ADMIN]
      );
      console.log(`✅ Created admin user: ${email}`);
    }

    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`👤 Name: ${firstName} ${lastName}`);
    console.log(`🔐 Role: admin`);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createAdminUser();

