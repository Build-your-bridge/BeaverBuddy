"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const questRoutes_1 = __importDefault(require("./routes/questRoutes"));
const outfitRoutes_1 = __importDefault(require("./routes/outfitRoutes"));
const journalRoutes_1 = __importDefault(require("./routes/journalRoutes"));
const prisma_1 = __importDefault(require("./db/prisma"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/quests', questRoutes_1.default);
app.use('/api/outfits', outfitRoutes_1.default);
app.use('/api/journal', journalRoutes_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'BeaverBuddy Backend is running!',
        timestamp: new Date().toISOString(),
        database: 'Connected via Prisma'
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(err.status || 500).json({
        error: err.message || 'Something went wrong!'
    });
});
// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🔄 Shutting down gracefully...');
    await prisma_1.default.$disconnect();
    console.log('✅ Database disconnected');
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('\n🔄 Shutting down gracefully...');
    await prisma_1.default.$disconnect();
    console.log('✅ Database disconnected');
    process.exit(0);
});
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
