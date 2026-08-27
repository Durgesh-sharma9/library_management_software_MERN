import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getAvailablePlans,
  getCurrentSchoolSubscription,
  submitPurchaseRequest,
  getSchoolRequestHistory,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from '../controllers/subscriptionController.js';

const router = Router();

// Protect all subscription routes
router.use(authenticate);

// 1. Get available plans for current school
router.get('/plans', getAvailablePlans);

// 2. Get current subscription status, usage vs limits, and active request
router.get('/current', getCurrentSchoolSubscription);

// 3. Submit a new plan purchase / upgrade request (Offline / Manual)
router.post('/purchase-request', submitPurchaseRequest);

// 4. Get request history for this school
router.get('/my-requests', getSchoolRequestHistory);

// 5. Razorpay Online Payment Integration Routes
router.post('/razorpay-order', createRazorpayOrder);
router.post('/razorpay-verify', verifyRazorpayPayment);

export default router;
