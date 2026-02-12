import pool from '../config/database';
import fs from 'fs';
import path from 'path';

export async function setupDatabase(): Promise<void> {
  try {
    console.log('🔧 Setting up database...');
    
    // Run init.sql
    const sqlFile = fs.readFileSync(
      path.join(__dirname, 'init.sql'),
      'utf-8'
    );
    
    await pool.query(sqlFile);
    
    // Run migrations
    console.log('🔧 Running migrations...');
    
    // Add employee status migration
    try {
      const statusMigration = fs.readFileSync(
        path.join(__dirname, 'add_employee_status.sql'),
        'utf-8'
      );
      await pool.query(statusMigration);
      console.log('✅ Employee status migration completed');
    } catch (error: any) {
      // Migration might already be applied, that's okay
      if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
        console.warn('⚠️ Status migration warning:', error.message);
      }
    }

    // Add overtime configs table migration
    try {
      // First try to fix existing table if it has wrong schema
      try {
        const fixMigration = fs.readFileSync(
          path.join(__dirname, 'fix_overtime_configs_table.sql'),
          'utf-8'
        );
        await pool.query(fixMigration);
        console.log('✅ Overtime configs table schema fixed');
      } catch (error: any) {
        // If fix fails, try creating fresh
        const overtimeConfigMigration = fs.readFileSync(
          path.join(__dirname, 'create_overtime_configs_table.sql'),
          'utf-8'
        );
        await pool.query(overtimeConfigMigration);
        console.log('✅ Overtime configs table migration completed');
      }
    } catch (error: any) {
      // Migration might already be applied, that's okay
      if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
        console.warn('⚠️ Overtime configs migration warning:', error.message);
      }
    }

    // Add overtime columns to work_records table
    try {
      const overtimeWorkRecordsMigration = fs.readFileSync(
        path.join(__dirname, 'add_overtime_to_work_records.sql'),
        'utf-8'
      );
      await pool.query(overtimeWorkRecordsMigration);
      console.log('✅ Overtime columns migration for work_records completed');
    } catch (error: any) {
      // Migration might already be applied, that's okay
      if (!error.message.includes('already exists') && !error.message.includes('duplicate') && !error.message.includes('column') && !error.message.includes('already exists')) {
        console.warn('⚠️ Overtime work_records migration warning:', error.message);
      }
    }

    // Add weight_kg column to work_items table
    try {
      const weightMigration = fs.readFileSync(
        path.join(__dirname, 'add_weight_to_work_items.sql'),
        'utf-8'
      );
      await pool.query(weightMigration);
      console.log('✅ Weight column migration for work_items completed');
    } catch (error: any) {
      // Migration might already be applied, that's okay
      if (!error.message.includes('already exists') && !error.message.includes('duplicate') && !error.message.includes('column')) {
        console.warn('⚠️ Weight migration warning:', error.message);
      }
    }

    // Add status column to work_records table
    try {
      const statusWorkRecordsMigration = fs.readFileSync(
        path.join(__dirname, 'add_status_to_work_records.sql'),
        'utf-8'
      );
      await pool.query(statusWorkRecordsMigration);
      console.log('✅ Status column migration for work_records completed');
    } catch (error: any) {
      // Migration might already be applied, that's okay
      if (!error.message.includes('already exists') && !error.message.includes('duplicate') && !error.message.includes('column')) {
        console.warn('⚠️ Status work_records migration warning:', error.message);
      }
    }

    // Remove UNIQUE constraint on monthly_salaries
    try {
      const removeUniqueConstraintMigration = fs.readFileSync(
        path.join(__dirname, 'remove_monthly_salary_unique_constraint.sql'),
        'utf-8'
      );
      await pool.query(removeUniqueConstraintMigration);
      console.log('✅ Remove UNIQUE constraint migration for monthly_salaries completed');
    } catch (error: any) {
      // Migration might already be applied, that's okay
      if (!error.message.includes('does not exist') && !error.message.includes('constraint')) {
        console.warn('⚠️ Remove UNIQUE constraint migration warning:', error.message);
      }
    }

    // Create monthly_salary_work_records junction table
    try {
      const monthlySalaryWorkRecordsMigration = fs.readFileSync(
        path.join(__dirname, 'create_monthly_salary_work_records_table.sql'),
        'utf-8'
      );
      await pool.query(monthlySalaryWorkRecordsMigration);
      console.log('✅ Monthly salary work records junction table migration completed');
    } catch (error: any) {
      // Migration might already be applied, that's okay
      if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
        console.warn('⚠️ Monthly salary work records migration warning:', error.message);
      }
    }

    // Add employee role and link user to employee
    try {
      const employeeRoleMigration = fs.readFileSync(
        path.join(__dirname, 'add_employee_role_and_link.sql'),
        'utf-8'
      );
      await pool.query(employeeRoleMigration);
      console.log('✅ Employee role and link migration completed');
    } catch (error: any) {
      // Migration might already be applied, that's okay
      if (!error.message.includes('already exists') && !error.message.includes('duplicate') && !error.message.includes('column')) {
        console.warn('⚠️ Employee role migration warning:', error.message);
      }
    }

    // Add product code system to work_items
    try {
      const productCodeMigration = fs.readFileSync(
        path.join(__dirname, 'add_product_code_to_work_items.sql'),
        'utf-8'
      );
      await pool.query(productCodeMigration);
      console.log('✅ Product code system migration for work_items completed');
    } catch (error: any) {
      // Migration might already be applied, that's okay
      if (!error.message.includes('already exists') && !error.message.includes('duplicate') && !error.message.includes('column')) {
        console.warn('⚠️ Product code migration warning:', error.message);
      }
    }

    // Add date_from and date_to to monthly_salaries for salary by date range
    try {
      const dateRangeMigration = fs.readFileSync(
        path.join(__dirname, 'add_date_range_to_monthly_salaries.sql'),
        'utf-8'
      );
      await pool.query(dateRangeMigration);
      console.log('✅ Date range columns migration for monthly_salaries completed');
    } catch (error: any) {
      // Migration might already be applied, that's okay
      if (!error.message.includes('already exists') && !error.message.includes('duplicate') && !error.message.includes('column')) {
        console.warn('⚠️ Date range migration warning:', error.message);
      }
    }

    // Add advance_payment to monthly_salaries
    try {
      const advancePaymentMigration = fs.readFileSync(
        path.join(__dirname, 'add_advance_payment_to_monthly_salaries.sql'),
        'utf-8'
      );
      await pool.query(advancePaymentMigration);
      console.log('✅ Advance payment column migration for monthly_salaries completed');
    } catch (error: any) {
      // Migration might already be applied, that's okay
      if (!error.message.includes('already exists') && !error.message.includes('duplicate') && !error.message.includes('column')) {
        console.warn('⚠️ Advance payment migration warning:', error.message);
      }
    }
    
    console.log('✅ Database setup completed successfully');
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    throw error;
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('Database initialization complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to initialize database:', error);
      process.exit(1);
    });
}

