// src/routes/authRoutes.ts
import express from 'express';
import { signup, login, getProfile } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected routes
router.get('/profile', authMiddleware, getProfile);

export default router;