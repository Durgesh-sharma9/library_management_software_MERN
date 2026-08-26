import { Router } from 'express';
import {
  getMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  getNextMemberId,
  bulkImportMembers,
} from '../controllers/memberController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/next-id', getNextMemberId);
router.get('/', getMembers);
router.post('/bulk-import', bulkImportMembers);
router.get('/:id', getMemberById);
router.post('/', createMember);
router.put('/:id', updateMember);
router.delete('/:id', deleteMember);

export default router;
