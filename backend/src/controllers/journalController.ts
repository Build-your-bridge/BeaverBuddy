import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Type definitions
interface JournalPromptObject {
  question: string;
  answer: string | null;
  answeredAt: string | null;
}

// Helper function to normalize prompts
function normalizePrompts(prompts: any[]): JournalPromptObject[] {
  return prompts.map((jp: any) => {
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
function sanitizeAnswer(answer: string): string {
  return answer
    .trim()
    .replace(/[<>]/g, '') // Basic XSS prevention
    .slice(0, 5000); // Max length enforcement
}

// Generate next journal question based on previous answers
async function generateNextQuestion(previousAnswers: { question: string; answer: string }[]): Promise<string> {
  try {
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    
    if (!openRouterKey) {
      throw new Error('OpenRouter API key not configured');
    }

    // Build context from previous answers
    const context = previousAnswers.map((qa, index) => 
      `Question ${index + 1}: ${qa.question}\nUser's answer: ${qa.answer}`
    ).join('\n\n');

    console.log('Generating next journal question based on previous answers...');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'BeaverBuddy'
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct:free',
        messages: [
          {
            role: 'system',
            content: 'You are Billy the Beaver, a mental health assistant. Generate ONE follow-up question based on what the user shared. The question should help them explore their feelings deeper or think about solutions. Return ONLY the question, nothing else.'
          },
          {
            role: 'user',
            content: `Based on this conversation:\n\n${context}\n\nGenerate a thoughtful follow-up question that helps the user explore WHY they feel this way or HOW they can address what they shared. Return ONLY the question text, no preamble or explanation.`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to generate question: ${response.status}`);
    }

    const data: any = await response.json();
    let question = data.choices?.[0]?.message?.content || "";
    
    // Clean up the question
    question = question.trim()
      .replace(/^(Question:|Here's a question:|Follow-up:)\s*/i, '')
      .replace(/^["']|["']$/g, '');
    
    if (!question || question.length < 10) {
      throw new Error('Generated question too short');
    }
    
    return question;
  } catch (error: any) {
    console.error('Error generating next question:', error);
    // Return a generic follow-up question if AI fails
    return "What do you think might help you feel better about this situation?";
  }
}
async function generateAIResponse(prompt: string, answer: string): Promise<string> {
  // List of free models to try in order
  const freeModels = [
    'meta-llama/llama-3.2-3b-instruct:free',
    'mistralai/mistral-7b-instruct:free',
    'google/gemma-2-9b-it:free',
    'nousresearch/hermes-3-llama-3.1-405b:free'
  ];

  let lastError: any = null;

  // Try each model
  for (const model of freeModels) {
    try {
      const openRouterKey = process.env.OPENROUTER_API_KEY;
      
      if (!openRouterKey) {
        console.error('OpenRouter API key is not configured in environment variables');
        throw new Error('OpenRouter API key not configured');
      }

      console.log(`Trying OpenRouter model: ${model}...`);

      const aiResponseFetch = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'BeaverBuddy'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are Billy the Beaver, a warm and compassionate Canadian mental health assistant helping immigrants. You respond with genuine empathy, understanding, and encouragement. Your responses are always personalized, meaningful, and address specific things the user shared. You use natural Canadian expressions like "eh" occasionally, but focus on being supportive and understanding.'
            },
            {
              role: 'user',
              content: `The user answered this journal question: "${prompt}"\n\nHere's what they wrote: "${answer}"\n\nWrite a meaningful, personalized response (4-6 sentences) that specifically acknowledges what they shared, validates their feelings, shows empathy, and offers encouragement.`
            }
          ]
        })
      });

      console.log(`${model} response status:`, aiResponseFetch.status);

      if (aiResponseFetch.status === 429) {
        // Rate limited, try next model
        const errorData = await aiResponseFetch.json().catch(() => ({}));
        console.log(`${model} is rate-limited, trying next model...`);
        lastError = errorData;
        continue;
      }

      if (!aiResponseFetch.ok) {
        const errorData = await aiResponseFetch.json().catch(() => ({}));
        console.error(`${model} API error:`, errorData);
        lastError = errorData;
        continue;
      }

      const aiData: any = await aiResponseFetch.json();
      console.log(`${model} response received:`, { 
        hasChoices: !!aiData.choices, 
        choicesLength: aiData.choices?.length 
      });

      let aiMessage = aiData.choices?.[0]?.message?.content || "";
      
      // Clean up AI response
      aiMessage = aiMessage.trim()
        .replace(/^(Billy says?:?|Response:?|Here's what I think:?)\s*/i, '')
        .replace(/^["']|["']$/g, '');
      
      console.log('Cleaned AI message length:', aiMessage.length);
      
      if (!aiMessage || aiMessage.length < 50) {
        console.log(`${model} response too short, trying next model...`);
        continue;
      }
      
      console.log(`Successfully generated AI response using ${model}`);
      return aiMessage;

    } catch (error: any) {
      console.error(`Error with ${model}:`, error.message);
      lastError = error;
      continue;
    }
  }

  // All models failed
  console.error('All AI models failed or are rate-limited');
  throw new Error('AI service temporarily unavailable due to rate limits. Please try again in a few moments.');
}

// Submit a journal entry
export const submitJournalEntry = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
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

    // === STEP 1: DATABASE OPERATIONS (FAST) ===
    // Get today's date range
    const { start, end } = getTodayDateRange();

    // Find today's daily quest
    const dailyQuest = await prisma.dailyQuest.findFirst({
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
    const rawPrompts = dailyQuest.journalPrompts as any[];
    
    if (!Array.isArray(rawPrompts) || rawPrompts.length === 0) {
      throw new Error('Invalid journal prompts data');
    }

    const journalPrompts = normalizePrompts(rawPrompts);

    // Validate prompt index
    if (promptIndex >= journalPrompts.length) {
      throw new Error(
        `Invalid prompt index: ${promptIndex}. Only ${journalPrompts.length} prompts available.`
      );
    }

    // Additional validation: check if prompt text matches (if provided)
    if (prompt && journalPrompts[promptIndex].question !== prompt) {
      console.warn(
        `Prompt mismatch at index ${promptIndex}. Expected: "${journalPrompts[promptIndex].question}", Got: "${prompt}"`
      );
      // Try to find by question text as fallback
      const foundIndex = journalPrompts.findIndex(
        (jp) => jp.question === prompt
      );
      if (foundIndex !== -1 && foundIndex !== promptIndex) {
        throw new Error(
          'Prompt index mismatch. Please refresh and try again.'
        );
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
    const remainingPrompts = journalPrompts.filter(
      (jp) => jp.answer === null
    ).length;

    // === DYNAMIC QUESTION GENERATION ===
    // If this is question 1 and there are more questions, generate question 2 based on this answer
    if (promptIndex === 0 && journalPrompts.length > 1 && journalPrompts[1].answer === null) {
      console.log('Generating question 2 based on answer to question 1...');
      try {
        const previousAnswers = [{
          question: journalPrompts[0].question,
          answer: sanitizedAnswer
        }];
        
        const nextQuestion = await generateNextQuestion(previousAnswers);
        journalPrompts[1].question = nextQuestion;
        console.log('Generated question 2:', nextQuestion);
      } catch (error) {
        console.error('Failed to generate dynamic question 2, keeping original');
      }
    }

    // Update in database (quick operation)
    await prisma.dailyQuest.update({
      where: { id: dailyQuest.id },
      data: {
        journalPrompts: journalPrompts as any,
        // Optionally update a completedAt timestamp if all done
        ...(remainingPrompts === 0 && { 
          completedAt: new Date() 
        })
      }
    });

    // === STEP 2: GENERATE AI RESPONSE (SLOW) ===
    // This happens AFTER the database is updated, so no transaction timeout
    let aiResponse: string;
    try {
      aiResponse = await generateAIResponse(
        journalPrompts[promptIndex].question,
        sanitizedAnswer
      );
    } catch (aiError: any) {
      console.error('AI generation failed:', aiError);
      
      // Check if it's a rate limit error
      if (aiError.message?.includes('rate limit') || aiError.message?.includes('temporarily unavailable')) {
        return res.status(503).json({ 
          error: 'Billy is taking a short break due to high demand. Please try again in a moment!',
          retryable: true
        });
      }
      
      return res.status(503).json({ 
        error: 'Billy is having trouble responding right now. Please try again!',
        retryable: true
      });
    }

    const result = {
      success: true,
      aiResponse,
      remainingPrompts,
      allCompleted: remainingPrompts === 0,
      answeredPromptIndex: promptIndex,
      totalPrompts: journalPrompts.length
    };

    // Send success response
    res.json(result);

  } catch (error: any) {
    console.error('Error submitting journal entry:', {
      error: error.message,
      stack: error.stack,
      userId: (req as any).userId,
      promptIndex: req.body.promptIndex
    });

    // Determine status code based on error type
    let statusCode = 500;
    let errorMessage = 'Failed to submit journal entry';

    if (error.message.includes('No journal prompts found')) {
      statusCode = 404;
      errorMessage = error.message;
    } else if (
      error.message.includes('Invalid') || 
      error.message.includes('mismatch')
    ) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.message.includes('Failed to generate AI response')) {
      statusCode = 503;
      errorMessage = error.message;
    }

    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get journal entries for a user
export const getJournalEntries = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Parse and validate limit
    const limitParam = req.query.limit as string;
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
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const whereClause: any = { userId };

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
      journalPrompts: normalizePrompts(entry.journalPrompts as any[]),
      // Add completion stats
      totalPrompts: Array.isArray(entry.journalPrompts) ? entry.journalPrompts.length : 0,
      answeredPrompts: Array.isArray(entry.journalPrompts) 
        ? (entry.journalPrompts as any[]).filter((jp: any) => {
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

  } catch (error: any) {
    console.error('Error fetching journal entries:', {
      error: error.message,
      stack: error.stack,
      userId: (req as any).userId
    });

    res.status(500).json({ 
      error: 'Failed to fetch journal entries',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Optional: Get today's journal status
export const getTodayJournalStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

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

    const prompts = normalizePrompts(dailyQuest.journalPrompts as any[]);
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

  } catch (error: any) {
    console.error('Error fetching today\'s journal status:', error);
    res.status(500).json({ 
      error: 'Failed to fetch journal status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};