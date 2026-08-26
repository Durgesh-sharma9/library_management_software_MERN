import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getAvailablePlans,
  getCurrentSchoolSubscription,
  submitPurchaseRequest,
  getSchoolRequestHistory,
} from '../controllers/subscriptionController.js';

const router = Router();

// Protect all subscription routes
router.use(authenticate);

// 1. Get available plans for current school
router.get('/plans', getAvailablePlans);

// 2. Get current subscription status, usage vs limits, and active request
router.get('/current', getCurrentSchoolSubscription);

// 3. Submit a new plan purchase / upgrade request
router.post('/purchase-request', submitPurchaseRequest);

// 4. Get request history for this school
router.get('/my-requests', getSchoolRequestHistory);

export default router;
