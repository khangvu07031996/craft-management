import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin, requireEmployee } from '../middleware/role.middleware';
import * as workTypeController from '../controllers/workType.controller';
import * as workItemController from '../controllers/workItem.controller';
import * as workRecordController from '../controllers/workRecord.controller';
import * as monthlySalaryController from '../controllers/monthlySalary.controller';
import * as workReportController from '../controllers/workReport.controller';
import * as overtimeConfigController from '../controllers/overtimeConfig.controller';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Work Types routes
router.get('/types', requireEmployee, workTypeController.getAllWorkTypes); // Employee can read
router.get('/types/:id', requireEmployee, workTypeController.getWorkTypeById); // Employee can read
router.post('/types', requireAdmin, workTypeController.createWorkType);
router.put('/types/:id', requireAdmin, workTypeController.updateWorkType);
router.delete('/types/:id', requireAdmin, workTypeController.deleteWorkType);

// Work Items routes
router.get('/items', requireEmployee, workItemController.getAllWorkItems); // Employee can read
router.get('/items/:id', requireEmployee, workItemController.getWorkItemById); // Employee can read
router.post('/items', requireAdmin, workItemController.createWorkItem);
router.put('/items/:id', requireAdmin, workItemController.updateWorkItem);
router.delete('/items/:id', requireAdmin, workItemController.deleteWorkItem);
router.get('/items/:id/total-made', requireEmployee, workRecordController.getTotalQuantityMadeByWorkItem); // Employee can read

// Work Records routes (Employee or Admin)
router.get('/records/hours/:employeeId/:workDate', requireEmployee, workRecordController.getTotalHoursWorkedInDay);
router.get('/records', requireEmployee, workRecordController.getAllWorkRecords);
router.get('/records/by-employee-month', requireEmployee, workRecordController.getWorkRecordsByEmployeeAndMonth);
router.get('/records/by-monthly-salary/:monthly_salary_id', requireAdmin, workRecordController.getWorkRecordsByMonthlySalaryId);
router.get('/records/:id', requireEmployee, workRecordController.getWorkRecordById);
router.post('/records', requireEmployee, workRecordController.createWorkRecord);
router.put('/records/:id', requireEmployee, workRecordController.updateWorkRecord);
router.delete('/records/:id', requireEmployee, workRecordController.deleteWorkRecord);

// Monthly Salaries routes (Admin only)
router.get('/monthly-salaries', requireAdmin, monthlySalaryController.getAllMonthlySalaries);
router.get('/monthly-salaries/:id', requireAdmin, monthlySalaryController.getMonthlySalaryById);
router.post('/calculate-monthly', requireAdmin, monthlySalaryController.calculateMonthlySalary);
router.post('/calculate-monthly-all', requireAdmin, monthlySalaryController.calculateMonthlySalaryForAll);
// Update allowances
router.put('/monthly-salaries/:id/allowances', requireAdmin, monthlySalaryController.updateMonthlySalaryStatus);
// Pay and Delete
router.post('/monthly-salaries/:id/pay', requireAdmin, monthlySalaryController.payMonthlySalary);
router.delete('/monthly-salaries/:id', requireAdmin, monthlySalaryController.deleteMonthlySalary);

// Reports routes (Admin only)
router.get('/reports/weekly', requireAdmin, workReportController.getWeeklyReport);
router.get('/reports/monthly', requireAdmin, workReportController.getMonthlyReport);

// Overtime Config routes - allow employee to read, admin to write
router.get('/overtime-configs', requireEmployee, overtimeConfigController.getAllOvertimeConfigs);
router.get('/overtime-configs/:workTypeId', requireEmployee, overtimeConfigController.getOvertimeConfigByWorkTypeId);
router.post('/overtime-configs', requireAdmin, overtimeConfigController.createOvertimeConfig);
router.put('/overtime-configs/:workTypeId', requireAdmin, overtimeConfigController.updateOvertimeConfig);
router.delete('/overtime-configs/:workTypeId', requireAdmin, overtimeConfigController.deleteOvertimeConfig);

export default router;
