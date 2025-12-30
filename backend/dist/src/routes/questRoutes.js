"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/questRoutes.ts
const express_1 = __importDefault(require("express"));
const questController_1 = require("../controllers/questController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/check-today', authMiddleware_1.authMiddleware, questController_1.checkTodayStatus);
router.post('/generate', authMiddleware_1.authMiddleware, questController_1.generateQuests);
router.put('/complete', authMiddleware_1.authMiddleware, questController_1.updateQuestCompletion);
exports.default = router;
