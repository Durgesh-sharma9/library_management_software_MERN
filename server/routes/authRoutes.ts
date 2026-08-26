import { Router } from 'express';
import { login, registerSchool, verifySignupOTP, resendSignupOTP, getMe, getSchoolsList } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/register', registerSchool);
router.post('/verify-otp', verifySignupOTP);
router.post('/resend-otp', resendSignupOTP);
router.get('/schools', getSchoolsList);
router.get('/me', authenticate, getMe);

export default router;
