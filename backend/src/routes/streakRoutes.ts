// src/routes/streakRoutes.ts
import express from 'express';
import { checkStreak, getStreakInfo } from '../controllers/streakController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Check and update streak on login
router.get('/check', authMiddleware, checkStreak);

// Get current streak info
router.get('/info', authMiddleware, getStreakInfo);

export default router;