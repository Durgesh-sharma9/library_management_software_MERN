import { Router } from 'express';
import {
  getAssignments,
  getAssignmentById,
  createAssignment,
  returnBook,
  reissueBook,
  updateFineStatus,
  reportLostOrDamagedAssignment,
} from '../controllers/assignmentController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getAssignments);
router.get('/:id', getAssignmentById);
router.post('/', createAssignment);
router.post('/:id/return', returnBook);
router.post('/:id/reissue', reissueBook);
router.post('/:id/lost-damaged', reportLostOrDamagedAssignment);
router.patch('/:id/fine', updateFineStatus);

export default router;
