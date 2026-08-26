import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  seedSampleData,
  checkMaxBooksLimit,
  previewFineCalculation,
} from '../controllers/settingController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getSettings);
router.get('/check-limit', checkMaxBooksLimit);
router.post('/calculate-fine-preview', previewFineCalculation);
router.put('/', updateSettings);
router.post('/seed', seedSampleData);

export default router;

