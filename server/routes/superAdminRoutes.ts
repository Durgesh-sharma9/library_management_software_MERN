import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth.js';
import {
  getSuperAdminStats,
  getAllSchools,
  createSchool,
  updateSchool,
  updateSchoolStatus,
  impersonateSchool,
  deleteSchool,
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getAllSubscriptionRequests,
  approveSubscriptionRequest,
  rejectSubscriptionRequest,
} from '../controllers/superAdminController.js';

const router = Router();

// Protect all superadmin endpoints with authenticate + requireSuperAdmin
router.use(authenticate);
router.use(requireSuperAdmin);

// Platform Analytics & Stats
router.get('/stats', getSuperAdminStats);

// Schools Management
router.get('/schools', getAllSchools);
router.post('/schools', createSchool);
router.put('/schools/:id', updateSchool);
router.patch('/schools/:id/status', updateSchoolStatus);
router.post('/schools/:id/impersonate', impersonateSchool);
router.delete('/schools/:id', deleteSchool);

// Subscription Plans Management
router.get('/plans', getAllPlans);
router.post('/plans', createPlan);
router.put('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);

// Subscription Purchase & Upgrade Approval Requests
router.get('/subscription-requests', getAllSubscriptionRequests);
router.post('/subscription-requests/:id/approve', approveSubscriptionRequest);
router.post('/subscription-requests/:id/reject', rejectSubscriptionRequest);

export default router;
