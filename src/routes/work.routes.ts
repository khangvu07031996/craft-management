import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import * as workTypeController from '../controllers/workType.controller';
import * as workItemController from '../controllers/workItem.controller';
import * as workRecordController from '../controllers/workRecord.controller';
import * as monthlySalaryController from '../controllers/monthlySalary.controller';
import * as workReportController from '../controllers/workReport.controller';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Work Types routes
router.get('/types', workTypeController.getAllWorkTypes);
router.get('/types/:id', workTypeController.getWorkTypeById);
router.post('/types', workTypeController.createWorkType);
router.put('/types/:id', workTypeController.updateWorkType);
router.delete('/types/:id', workTypeController.deleteWorkType);

// Work Items routes
router.get('/items', workItemController.getAllWorkItems);
router.get('/items/:id', workItemController.getWorkItemById);
router.post('/items', workItemController.createWorkItem);
router.put('/items/:id', workItemController.updateWorkItem);
router.delete('/items/:id', workItemController.deleteWorkItem);

// Work Records routes
router.get('/records', workRecordController.getAllWorkRecords);
router.get('/records/by-employee-month', workRecordController.getWorkRecordsByEmployeeAndMonth);
router.get('/records/:id', workRecordController.getWorkRecordById);
router.post('/records', workRecordController.createWorkRecord);
router.put('/records/:id', workRecordController.updateWorkRecord);
router.delete('/records/:id', workRecordController.deleteWorkRecord);

// Monthly Salaries routes
router.get('/monthly-salaries', monthlySalaryController.getAllMonthlySalaries);
router.get('/monthly-salaries/:id', monthlySalaryController.getMonthlySalaryById);
router.post('/calculate-monthly', monthlySalaryController.calculateMonthlySalary);
router.put('/monthly-salaries/:id/status', monthlySalaryController.updateMonthlySalaryStatus);

// Reports routes
router.get('/reports/weekly', workReportController.getWeeklyReport);
router.get('/reports/monthly', workReportController.getMonthlyReport);

export default router;
