import express from 'express';
import * as overtimeConfigController from '../controllers/overtimeConfig.controller';

const router = express.Router();

// Overtime Config routes
// Note: Authentication and admin role middleware are applied in work.routes.ts
router.get('/', overtimeConfigController.getAllOvertimeConfigs);
router.get('/:workTypeId', overtimeConfigController.getOvertimeConfigByWorkTypeId);
router.post('/', overtimeConfigController.createOvertimeConfig);
router.put('/:workTypeId', overtimeConfigController.updateOvertimeConfig);
router.delete('/:workTypeId', overtimeConfigController.deleteOvertimeConfig);

export default router;

