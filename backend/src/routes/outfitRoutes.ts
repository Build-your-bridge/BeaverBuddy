import { Router } from 'express';
import {
  getAllOutfits,
  getUserOutfits,
  buyOutfit,
  toggleEquipOutfit,
  getUserPoints
} from '../controllers/outfitController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Public routes
router.get('/', getAllOutfits);

// Protected routes
router.get('/user', authMiddleware, getUserOutfits);
router.get('/user/points', authMiddleware, getUserPoints);
router.post('/user/:id/buy', authMiddleware, buyOutfit);
router.post('/user/:id/equip', authMiddleware, toggleEquipOutfit);

export default router;