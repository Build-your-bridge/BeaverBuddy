import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface JournalPromptObject {
  question: string;
  answer: string | null;
  answeredAt: string | null;
}

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

function getTodayDateRange() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return { start: today, end: tomorrow };
}

function sanitizeAnswer(answer: string): string {
  return answer
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, 5000);
}

// IMPROVED: Better question generation with more context and multiple model fallback
async function generateNextQuestion(previousAnswers: { question: string; answer: string }[]): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const context = previousAnswers.map((qa, index) => 
    `Question ${index + 1}: ${qa.question}\nUser's answer: ${qa.answer}`
  ).join('\n\n');

  console.log(`Using GPT-4o-mini for question generation...`);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are Billy the Beaver, a warm and understanding mental health assistant. Your job is to generate ONE thoughtful follow-up question that helps the user explore their feelings deeper. The question should be natural, conversational, and help them understand WHY they feel this way or HOW they can address it. Return ONLY the question, nothing else - no preamble, no explanation, just the question itself.'
        },
        {
          role: 'user',
          content: `Based on what the user shared in their initial mental health check-in and their response to the first journal question:\n\n${context}\n\nGenerate a caring follow-up question that helps them explore their feelings deeper, considering both their original emotional state and their specific response. Focus on understanding the root cause or finding ways to improve their situation. Return ONLY the question text.`
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to generate question: ${response.status}`);
  }

  const data: any = await response.json();
  let question = data.choices?.[0]?.message?.content || "";
  
  console.log('Raw AI response:', question);
  
  question = question.trim()
    .replace(/^(Question:|Here's a question:|Follow-up:|Billy asks?:?)\s*/i, '')
    .replace(/^["']|["']$/g, '')
    .replace(/\n/g, ' ');
  
  console.log('Cleaned question:', question);
  
  if (!question || question.length < 10) {
    throw new Error('Generated question too short');
  }
  
  console.log(`Successfully generated question using GPT-4o-mini`);
  return question;
}

// IMPROVED: Better AI responses with more empathy and personalization
async function generateAIResponse(prompt: string, answer: string, previousContext?: { question: string; answer: string }[]): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Build context from previous conversation if available
  let contextString = '';
  if (previousContext && previousContext.length > 0) {
    contextString = '\n\nPrevious conversation:\n' + previousContext.map((qa, idx) => 
      `Q${idx + 1}: ${qa.question}\nA${idx + 1}: ${qa.answer}`
    ).join('\n\n') + '\n\n';
  }

  console.log(`Using GPT-4o-mini for AI response generation...`);

  const aiResponseFetch = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are Billy the Beaver, a warm, compassionate Canadian mental health assistant who helps immigrants adjust to life in Canada. Your responses are:
              
- Deeply empathetic and validating - you acknowledge their feelings genuinely
- Personalized and specific - you reference exactly what they shared
- Supportive and encouraging - you offer hope and perspective
- Naturally conversational - like a caring friend, not a therapist
- Occasionally Canadian - you use "eh" sparingly and naturally
- 4-6 sentences long - substantial but not overwhelming
- Focused on emotional support first, practical advice second

You never give generic responses. Every response should feel like it was written specifically for what this person shared.`
            },
            {
              role: 'user',
              content: `${contextString}Current question: "${prompt}"\n\nUser's answer: "${answer}"\n\nWrite a warm, personalized response that:
1. Acknowledges the specific feelings and situation they described
2. Validates their emotions (it's okay to feel this way)
3. Offers empathy and understanding
4. Provides gentle encouragement or a helpful perspective
5. Feels genuine and conversational, not robotic
6. DO NOT ask any follow up questions

Remember: Reference specific things they mentioned. Make it feel personal and caring.`
            }
          ]
        })
  });

  if (!aiResponseFetch.ok) {
    const errorData = await aiResponseFetch.json().catch(() => ({}));
    console.error(`OpenAI API error:`, errorData);
    throw new Error(`Failed to generate AI response: ${aiResponseFetch.status}`);
  }

  const aiData: any = await aiResponseFetch.json();

  let aiMessage = aiData.choices?.[0]?.message?.content || "";
  
  aiMessage = aiMessage.trim()
    .replace(/^(Billy says?:?|Response:?|Here's what I think:?)\s*/i, '')
    .replace(/^["']|["']$/g, '');
  
  if (!aiMessage || aiMessage.length < 50) {
    throw new Error('Generated AI response too short');
  }
  
  console.log(`Successfully generated AI response using GPT-4o-mini`);
  return aiMessage;
}

export const submitJournalEntry = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { promptIndex, prompt, answer } = req.body;

    // Validation
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

    const sanitizedAnswer = sanitizeAnswer(answer);

    // Database operations
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
        journalPrompts: true,
        originalFeeling: true
      }
    });

    if (!dailyQuest) {
      throw new Error('No journal prompts found for today');
    }

    const rawPrompts = dailyQuest.journalPrompts as any[];
    
    if (!Array.isArray(rawPrompts) || rawPrompts.length === 0) {
      throw new Error('Invalid journal prompts data');
    }

    const journalPrompts = normalizePrompts(rawPrompts);

    if (promptIndex >= journalPrompts.length) {
      throw new Error(
        `Invalid prompt index: ${promptIndex}. Only ${journalPrompts.length} prompts available.`
      );
    }

    if (prompt && journalPrompts[promptIndex].question !== prompt) {
      console.warn(`Prompt mismatch at index ${promptIndex}`);
      const foundIndex = journalPrompts.findIndex(
        (jp) => jp.question === prompt
      );
      if (foundIndex !== -1 && foundIndex !== promptIndex) {
        throw new Error(
          'Prompt index mismatch. Please refresh and try again.'
        );
      }
    }

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

    // IMPROVED: Dynamic question generation for Q2
    if (promptIndex === 0 && journalPrompts.length > 1) {
      console.log('🔄 === DYNAMIC Q2 GENERATION START ===');
      console.log('Original feeling:', dailyQuest.originalFeeling);
      console.log('User answer to Q1:', sanitizedAnswer);
      console.log('BEFORE UPDATE - journalPrompts[1].question:', journalPrompts[1].question);
      console.log('BEFORE UPDATE - journalPrompts[2].question:', journalPrompts[2]?.question);
      
      try {
        const previousAnswers = [
          {
            question: "Original mental health check-in",
            answer: dailyQuest.originalFeeling || "User shared how they were feeling"
          },
          {
            question: journalPrompts[0].question,
            answer: sanitizedAnswer
          }
        ];
        
        const nextQuestion = await generateNextQuestion(previousAnswers);
        console.log('✅ Generated dynamic question:', nextQuestion);
        journalPrompts[1].question = nextQuestion;
        console.log('AFTER UPDATE - journalPrompts[1].question:', journalPrompts[1].question);
        console.log('AFTER UPDATE - journalPrompts[2].question:', journalPrompts[2]?.question);
      } catch (error: any) {
        console.error('Failed to generate dynamic question 2:', error.message);
        
        // Use smart fallback based on sentiment
        const lowerAnswer = sanitizedAnswer.toLowerCase();
        const lowerFeeling = (dailyQuest.originalFeeling || '').toLowerCase();
        
        if (lowerAnswer.includes('stress') || lowerFeeling.includes('stress') || 
            lowerAnswer.includes('anxious') || lowerFeeling.includes('anxious')) {
          journalPrompts[1].question = "What helps you feel calmer when you're stressed?";
        } else if (lowerAnswer.includes('lonely') || lowerFeeling.includes('lonely') ||
                   lowerAnswer.includes('isolated') || lowerFeeling.includes('isolated')) {
          journalPrompts[1].question = "What connections or relationships would you like to strengthen?";
        } else if (lowerAnswer.includes('overwhelm') || lowerFeeling.includes('overwhelm')) {
          journalPrompts[1].question = "What's one small thing you could do today to feel less overwhelmed?";
        } else if (lowerAnswer.includes('sad') || lowerFeeling.includes('sad') ||
                   lowerAnswer.includes('depressed') || lowerFeeling.includes('depressed')) {
          journalPrompts[1].question = "What usually helps lift your mood, even just a little?";
        } else {
          journalPrompts[1].question = "What do you think might help you feel better about this situation?";
        }
        
        console.log('⚠️ Using fallback question:', journalPrompts[1].question);
      }
      
      console.log('🔄 === DYNAMIC Q2 GENERATION END ===');
      console.log('Final Q1:', journalPrompts[0].question.substring(0, 60) + '...');
      console.log('Final Q2:', journalPrompts[1].question.substring(0, 60) + '...');
      console.log('Final Q3:', journalPrompts[2]?.question.substring(0, 60) + '...');
      console.log('=====================================');
    }

    const remainingPrompts = journalPrompts.filter(
      (jp) => jp.answer === null
    ).length;

    console.log('=== BEFORE DATABASE UPDATE ===');
    console.log('Full journalPrompts array:');
    journalPrompts.forEach((jp, idx) => {
      console.log(`  [${idx}] Question: ${jp.question.substring(0, 50)}...`);
      console.log(`       Answered: ${jp.answer !== null}`);
    });
    console.log('==============================');

    // Update database
    await prisma.dailyQuest.update({
      where: { id: dailyQuest.id },
      data: {
        journalPrompts: journalPrompts as any,
        ...(remainingPrompts === 0 && { 
          completedAt: new Date() 
        })
      }
    });

    // IMPROVED: Generate AI response with conversation context
    let aiResponse: string;
    try {
      // Build context of previous Q&As
      const previousContext = journalPrompts
        .slice(0, promptIndex)
        .filter(jp => jp.answer !== null)
        .map(jp => ({
          question: jp.question,
          answer: jp.answer!
        }));

      aiResponse = await generateAIResponse(
        journalPrompts[promptIndex].question,
        sanitizedAnswer,
        previousContext.length > 0 ? previousContext : undefined
      );
    } catch (aiError: any) {
      console.error('AI generation failed:', aiError);
      
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
      totalPrompts: journalPrompts.length,
      updatedPrompts: journalPrompts
    };

    console.log('=== RESPONSE BEING SENT ===');
    console.log('Total prompts:', result.totalPrompts);
    console.log('Remaining prompts:', result.remainingPrompts);
    console.log('Updated prompts array:');
    result.updatedPrompts.forEach((jp, idx) => {
      console.log(`  [${idx}] ${jp.question.substring(0, 60)}... (answered: ${jp.answer !== null})`);
    });
    console.log('===========================');

    res.json(result);

  } catch (error: any) {
    console.error('Error submitting journal entry:', {
      error: error.message,
      stack: error.stack,
      userId: (req as any).userId,
      promptIndex: req.body.promptIndex
    });

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

export const getJournalEntries = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limitParam = req.query.limit as string;
    let limit = 10;
    
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return res.status(400).json({ 
          error: 'Invalid limit parameter. Must be a positive number.' 
        });
      }
      limit = Math.min(parsedLimit, 100);
    }

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

    const normalizedEntries = entries.map(entry => ({
      ...entry,
      journalPrompts: normalizePrompts(entry.journalPrompts as any[]),
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