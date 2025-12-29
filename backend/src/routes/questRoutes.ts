// src/routes/questRoutes.ts
import express from 'express';
import { generateQuests, checkTodayStatus } from '../controllers/questController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/check-today', authMiddleware, checkTodayStatus);
router.post('/generate', authMiddleware, generateQuests);

export default router;