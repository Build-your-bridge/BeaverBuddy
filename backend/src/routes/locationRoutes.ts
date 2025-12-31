// src/routes/locationRoutes.ts
import express from 'express';
import { updateUserLocation, getUserLocation } from '../controllers/locationTracker';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Update user location
router.post('/update', authMiddleware, updateUserLocation);

// Get user location
router.get('/', authMiddleware, getUserLocation);

export default router;