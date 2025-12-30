"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const outfitController_1 = require("../controllers/outfitController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Public routes
router.get('/', outfitController_1.getAllOutfits);
// Protected routes
router.get('/user', authMiddleware_1.authMiddleware, outfitController_1.getUserOutfits);
router.get('/user/points', authMiddleware_1.authMiddleware, outfitController_1.getUserPoints);
router.post('/user/:id/buy', authMiddleware_1.authMiddleware, outfitController_1.buyOutfit);
router.post('/user/:id/equip', authMiddleware_1.authMiddleware, outfitController_1.toggleEquipOutfit);
exports.default = router;
