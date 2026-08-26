import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory,
} from '../controllers/categoryController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getCategories);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.patch('/:id/status', toggleCategoryStatus);
router.delete('/:id', deleteCategory);

export default router;
