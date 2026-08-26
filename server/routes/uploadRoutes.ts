import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getImageKitAuth, uploadImage } from '../controllers/uploadController.js';

const router = express.Router();

// Both routes protected by auth
router.get('/auth', authenticate as any, getImageKitAuth as any);
router.post('/', authenticate as any, uploadImage as any);

export default router;
