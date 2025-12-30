"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const journalController_1 = require("../controllers/journalController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post('/submit', authMiddleware_1.authMiddleware, journalController_1.submitJournalEntry);
router.get('/entries', authMiddleware_1.authMiddleware, journalController_1.getJournalEntries);
exports.default = router;
