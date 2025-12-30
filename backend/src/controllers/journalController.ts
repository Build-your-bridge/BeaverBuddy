import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Submit a journal entry
export const submitJournalEntry = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { promptIndex, prompt, answer } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (promptIndex === undefined || promptIndex === null) {
      return res.status(400).json({ error: 'promptIndex is required' });
    }

    if (!answer || answer.trim().length === 0) {
      return res.status(400).json({ error: 'Answer is required' });
    }

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get user's daily quest entry for today
    const dailyQuest = await prisma.dailyQuest.findFirst({
      where: {
        userId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    if (!dailyQuest) {
      return res.status(404).json({ error: 'No journal prompts found for today' });
    }

    // Get current journal prompts
    let journalPrompts = dailyQuest.journalPrompts as any;
    
    if (!Array.isArray(journalPrompts) || journalPrompts.length === 0) {
      return res.status(400).json({ error: 'Invalid journal prompts data' });
    }

    // Migrate old string format to object format if needed
    journalPrompts = journalPrompts.map((jp: any, index: number) => {
      // If it's already an object with question property, ensure it has the right structure
      if (typeof jp === 'object' && jp.question !== undefined) {
        return {
          question: jp.question,
          answer: jp.answer || null,
          answeredAt: jp.answeredAt || null,
        };
      }
      // If it's a string (old format), convert to object format
      if (typeof jp === 'string') {
        return {
          question: jp,
          answer: null,
          answeredAt: null,
        };
      }
      // Fallback: ensure proper structure
      return {
        question: String(jp),
        answer: null,
        answeredAt: null,
      };
    });

    // Find the prompt by index or by question text (more reliable)
    let promptToUpdate: any = null;
    let updateIndex = -1;

    // First try to use the provided index if it's valid
    if (promptIndex >= 0 && promptIndex < journalPrompts.length) {
      updateIndex = promptIndex;
      promptToUpdate = journalPrompts[promptIndex];
    }

    // If index didn't work or if question text is provided, try to find by question
    if (!promptToUpdate && prompt) {
      updateIndex = journalPrompts.findIndex((jp: any) => {
        const jpQuestion = typeof jp === 'string' ? jp : jp.question;
        return jpQuestion === prompt;
      });
      
      if (updateIndex !== -1) {
        promptToUpdate = journalPrompts[updateIndex];
      }
    }

    if (updateIndex === -1 || !promptToUpdate) {
      console.error(`Could not find prompt. Index: ${promptIndex}, Question: ${prompt}, Array length: ${journalPrompts.length}`);
      return res.status(400).json({ 
        error: 'Could not find the specified journal prompt' 
      });
    }

    // Update the answer for the specific prompt
    journalPrompts[updateIndex] = {
      question: typeof promptToUpdate === 'string' ? promptToUpdate : promptToUpdate.question,
      answer: answer || null,
      answeredAt: answer ? new Date().toISOString() : null,
    };

    // Count remaining prompts (those with answer === null)
    const remainingPrompts = journalPrompts.filter((jp: any) => jp.answer === null).length;

    // Update the daily quest with the new answers
    await prisma.dailyQuest.update({
      where: { id: dailyQuest.id },
      data: {
        journalPrompts: journalPrompts
      }
    });

    res.json({
      success: true,
      remainingPrompts,
      allCompleted: remainingPrompts === 0
    });

  } catch (error: any) {
    console.error('Error submitting journal entry:', error);
    res.status(500).json({ 
      error: 'Failed to submit journal entry',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get journal entries for a user
export const getJournalEntries = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const limit = parseInt(req.query.limit as string) || 10;

    const entries = await prisma.dailyQuest.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: limit,
      select: {
        id: true,
        date: true,
        journalPrompts: true
      }
    });

    res.json(entries);

  } catch (error) {
    console.error('Error fetching journal entries:', error);
    res.status(500).json({ error: 'Failed to fetch journal entries' });
  }
};