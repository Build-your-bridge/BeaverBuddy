"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTodayJournalStatus = exports.getJournalEntries = exports.submitJournalEntry = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Helper function to normalize prompts
function normalizePrompts(prompts) {
    return prompts.map((jp) => {
        if (typeof jp === 'string') {
            return {
                question: jp,
                answer: null,
                answeredAt: null,
            };
        }
        return {
            question: jp.question || String(jp),
            answer: jp.answer || null,
            answeredAt: jp.answeredAt || null,
        };
    });
}
// Helper function to get today's date range (UTC)
function getTodayDateRange() {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return { start: today, end: tomorrow };
}
// Helper function to sanitize user input
function sanitizeAnswer(answer) {
    return answer
        .trim()
        .replace(/[<>]/g, '') // Basic XSS prevention
        .slice(0, 5000); // Max length enforcement
}
// Submit a journal entry
const submitJournalEntry = async (req, res) => {
    try {
        const userId = req.userId;
        const { promptIndex, prompt, answer } = req.body;
        // === VALIDATION ===
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (promptIndex === undefined || promptIndex === null) {
            return res.status(400).json({ error: 'promptIndex is required' });
        }
        if (typeof promptIndex !== 'number' || promptIndex < 0) {
            return res.status(400).json({ error: 'Invalid promptIndex format' });
        }
        if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
            return res.status(400).json({ error: 'Answer is required' });
        }
        if (answer.trim().length < 10) {
            return res.status(400).json({
                error: 'Answer must be at least 10 characters long'
            });
        }
        if (answer.length > 5000) {
            return res.status(400).json({
                error: 'Answer is too long (maximum 5000 characters)'
            });
        }
        // Sanitize the answer
        const sanitizedAnswer = sanitizeAnswer(answer);
        // === DATABASE TRANSACTION ===
        const result = await prisma.$transaction(async (tx) => {
            // Get today's date range
            const { start, end } = getTodayDateRange();
            // Find today's daily quest
            const dailyQuest = await tx.dailyQuest.findFirst({
                where: {
                    userId,
                    date: {
                        gte: start,
                        lt: end
                    }
                }
            });
            if (!dailyQuest) {
                throw new Error('No journal prompts found for today');
            }
            // Get and normalize journal prompts
            const rawPrompts = dailyQuest.journalPrompts;
            if (!Array.isArray(rawPrompts) || rawPrompts.length === 0) {
                throw new Error('Invalid journal prompts data');
            }
            const journalPrompts = normalizePrompts(rawPrompts);
            // Validate prompt index
            if (promptIndex >= journalPrompts.length) {
                throw new Error(`Invalid prompt index: ${promptIndex}. Only ${journalPrompts.length} prompts available.`);
            }
            // Additional validation: check if prompt text matches (if provided)
            if (prompt && journalPrompts[promptIndex].question !== prompt) {
                console.warn(`Prompt mismatch at index ${promptIndex}. Expected: "${journalPrompts[promptIndex].question}", Got: "${prompt}"`);
                // Try to find by question text as fallback
                const foundIndex = journalPrompts.findIndex((jp) => jp.question === prompt);
                if (foundIndex !== -1 && foundIndex !== promptIndex) {
                    throw new Error('Prompt index mismatch. Please refresh and try again.');
                }
            }
            // Check if already answered
            if (journalPrompts[promptIndex].answer !== null) {
                return res.status(400).json({
                    error: 'This prompt has already been answered',
                    alreadyAnswered: true
                });
            }
            // Update the answer
            journalPrompts[promptIndex] = {
                question: journalPrompts[promptIndex].question,
                answer: sanitizedAnswer,
                answeredAt: new Date().toISOString(),
            };
            // Count remaining unanswered prompts
            const remainingPrompts = journalPrompts.filter((jp) => jp.answer === null).length;
            // Update in database
            const updatedQuest = await tx.dailyQuest.update({
                where: { id: dailyQuest.id },
                data: {
                    journalPrompts: journalPrompts,
                    // Optionally update a completedAt timestamp if all done
                    ...(remainingPrompts === 0 && {
                        completedAt: new Date()
                    })
                }
            });
            return {
                success: true,
                remainingPrompts,
                allCompleted: remainingPrompts === 0,
                answeredPromptIndex: promptIndex,
                totalPrompts: journalPrompts.length
            };
        });
        // Send success response
        res.json(result);
    }
    catch (error) {
        console.error('Error submitting journal entry:', {
            error: error.message,
            stack: error.stack,
            userId: req.userId,
            promptIndex: req.body.promptIndex
        });
        // Determine status code based on error type
        let statusCode = 500;
        let errorMessage = 'Failed to submit journal entry';
        if (error.message.includes('No journal prompts found')) {
            statusCode = 404;
            errorMessage = error.message;
        }
        else if (error.message.includes('Invalid') ||
            error.message.includes('mismatch')) {
            statusCode = 400;
            errorMessage = error.message;
        }
        res.status(statusCode).json({
            error: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
exports.submitJournalEntry = submitJournalEntry;
// Get journal entries for a user
const getJournalEntries = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Parse and validate limit
        const limitParam = req.query.limit;
        let limit = 10; // default
        if (limitParam) {
            const parsedLimit = parseInt(limitParam, 10);
            if (isNaN(parsedLimit) || parsedLimit < 1) {
                return res.status(400).json({
                    error: 'Invalid limit parameter. Must be a positive number.'
                });
            }
            limit = Math.min(parsedLimit, 100); // Cap at 100 to prevent abuse
        }
        // Optional: Add date range filtering
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const whereClause = { userId };
        if (startDate || endDate) {
            whereClause.date = {};
            if (startDate) {
                whereClause.date.gte = new Date(startDate);
            }
            if (endDate) {
                whereClause.date.lte = new Date(endDate);
            }
        }
        // Fetch entries
        const entries = await prisma.dailyQuest.findMany({
            where: whereClause,
            orderBy: { date: 'desc' },
            take: limit,
            select: {
                id: true,
                date: true,
                journalPrompts: true,
                completedAt: true,
                createdAt: true
            }
        });
        // Normalize prompts in response
        const normalizedEntries = entries.map(entry => ({
            ...entry,
            journalPrompts: normalizePrompts(entry.journalPrompts),
            // Add completion stats
            totalPrompts: Array.isArray(entry.journalPrompts) ? entry.journalPrompts.length : 0,
            answeredPrompts: Array.isArray(entry.journalPrompts)
                ? entry.journalPrompts.filter((jp) => {
                    const normalized = typeof jp === 'string' ? { answer: null } : jp;
                    return normalized.answer !== null;
                }).length
                : 0
        }));
        res.json({
            entries: normalizedEntries,
            count: normalizedEntries.length,
            limit
        });
    }
    catch (error) {
        console.error('Error fetching journal entries:', {
            error: error.message,
            stack: error.stack,
            userId: req.userId
        });
        res.status(500).json({
            error: 'Failed to fetch journal entries',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
exports.getJournalEntries = getJournalEntries;
// Optional: Get today's journal status
const getTodayJournalStatus = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { start, end } = getTodayDateRange();
        const dailyQuest = await prisma.dailyQuest.findFirst({
            where: {
                userId,
                date: {
                    gte: start,
                    lt: end
                }
            },
            select: {
                id: true,
                date: true,
                journalPrompts: true,
                completedAt: true
            }
        });
        if (!dailyQuest) {
            return res.json({
                hasJournal: false,
                message: 'No journal prompts for today'
            });
        }
        const prompts = normalizePrompts(dailyQuest.journalPrompts);
        const answeredCount = prompts.filter(jp => jp.answer !== null).length;
        res.json({
            hasJournal: true,
            totalPrompts: prompts.length,
            answeredPrompts: answeredCount,
            remainingPrompts: prompts.length - answeredCount,
            isCompleted: answeredCount === prompts.length,
            completedAt: dailyQuest.completedAt,
            prompts: prompts.map(jp => ({
                question: jp.question,
                isAnswered: jp.answer !== null,
                answeredAt: jp.answeredAt
            }))
        });
    }
    catch (error) {
        console.error('Error fetching today\'s journal status:', error);
        res.status(500).json({
            error: 'Failed to fetch journal status',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
exports.getTodayJournalStatus = getTodayJournalStatus;
