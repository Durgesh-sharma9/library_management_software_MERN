import { Router } from 'express';
import { getDashboardAnalytics, getRecentActivity } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/analytics', getDashboardAnalytics);
router.get('/recent-activity', getRecentActivity);

export default router;
