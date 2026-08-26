import { Router } from 'express';
import {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  getNextAccessionNumber,
  bulkImportBooks,
  reportDirectLostDamagedBook,
  getLostDamageLogs,
  getLostDamageStats,
  updateLostDamageLog,
  deleteLostDamageLog,
  getBookAnalytics,
} from '../controllers/bookController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/analytics', getBookAnalytics);
router.get('/next-accession', getNextAccessionNumber);
router.get('/lost-damaged-stats', getLostDamageStats);
router.get('/lost-damaged-logs', getLostDamageLogs);
router.post('/report-lost-damaged', reportDirectLostDamagedBook);
router.put('/lost-damaged-logs/:id', updateLostDamageLog);
router.delete('/lost-damaged-logs/:id', deleteLostDamageLog);
router.get('/', getBooks);
router.post('/bulk-import', bulkImportBooks);
router.get('/:id', getBookById);
router.post('/', createBook);
router.put('/:id', updateBook);
router.delete('/:id', deleteBook);

export default router;
