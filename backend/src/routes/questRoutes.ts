// src/routes/questRoutes.ts
import express from 'express';
import { generateQuests, generateMonthlyQuests, checkTodayStatus, updateQuestCompletion } from '../controllers/questController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/check-today', authMiddleware, checkTodayStatus);
router.post('/generate', authMiddleware, generateQuests);
router.post('/generate-monthly', authMiddleware, generateMonthlyQuests);
router.put('/complete', authMiddleware, updateQuestCompletion);

export default router;