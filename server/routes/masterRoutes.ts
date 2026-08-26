import { Router } from 'express';
import {
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getSections,
  createSection,
  updateSection,
  deleteSection,
} from '../controllers/masterController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Class Master Routes
router.get('/classes', getClasses);
router.post('/classes', createClass);
router.put('/classes/:id', updateClass);
router.delete('/classes/:id', deleteClass);

// Section Master Routes
router.get('/sections', getSections);
router.post('/sections', createSection);
router.put('/sections/:id', updateSection);
router.delete('/sections/:id', deleteSection);

export default router;
