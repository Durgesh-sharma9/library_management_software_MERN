import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getImageKitAuth, uploadImage, proxyImage } from '../controllers/uploadController.js';

const router = express.Router();

// CORS image proxy for canvas operations (no auth required so browser Image/Canvas can stream safely)
router.get('/proxy', proxyImage as any);

// Routes protected by auth
router.get('/auth', authenticate as any, getImageKitAuth as any);
router.post('/', authenticate as any, uploadImage as any);

export default router;
