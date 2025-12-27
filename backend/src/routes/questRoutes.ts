// src/routes/questRoutes.ts
import express from 'express';
import { generateQuests } from '../controllers/questController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Protected route - user must be authenticated
router.post('/generate', authMiddleware, generateQuests);

export default router;