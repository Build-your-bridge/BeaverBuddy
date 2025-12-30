import express from 'express';
import { submitJournalEntry, getJournalEntries } from '../controllers/journalController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/submit', authMiddleware, submitJournalEntry);
router.get('/entries', authMiddleware, getJournalEntries);

export default router;