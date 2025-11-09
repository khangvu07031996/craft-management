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

