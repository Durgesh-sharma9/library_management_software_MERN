import { Router } from 'express';
import {
  getShelves,
  createShelf,
  updateShelf,
  deleteShelf,
} from '../controllers/shelfController.js';

const router = Router();

router.get('/', getShelves);
router.post('/', createShelf);
router.put('/:id', updateShelf);
router.delete('/:id', deleteShelf);

export default router;
