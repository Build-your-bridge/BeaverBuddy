// src/controllers/questController.ts
import { Request, Response } from 'express';
import prisma from '../db/prisma';

export const generateQuests = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { feeling } = req.body;

    if (!feeling || feeling.trim().length < 20) {
      return res.status(422).json({
        error: 'Please share at least 20 characters about how you\'re feeling',
      });
    }

    // FIX: Use Date objects instead of string slices for Prisma findUnique
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 1️⃣ Check if quests already exist
    const existingDaily = await prisma.dailyQuest.findUnique({
      where: {
        userId_date: {
          userId,
          date: today, // Passing the Date object fixed the error
        },
      },
    });

    const existingMonthly = await prisma.monthlyQuest.findUnique({
      where: {
        userId_month: {
          userId,
          month: currentMonthStr,
        },
      },
    });

    if (existingDaily && existingMonthly) {
      return res.status(200).json({
        success: true,
        quests: existingDaily.quests,
        monthlyQuests: existingMonthly.monthlyQuests,
        journalPrompts: existingDaily.journalPrompts,
        generatedAt: today,
        monthGenerated: currentMonthStr,
        regenerated: false,
      });
    }

    // 2️⃣ Call AI to generate quests
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'BeaverBuddy',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        max_tokens: 1200,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: `
              Generate 4 daily quests, 2 monthly quests, and 3 journal prompts based on this feeling: "${feeling}".
              Return ONLY a JSON object with this exact structure:
              {
                "quests": [{"id": 1, "text": "string", "completed": false}, ...],
                "monthlyQuests": [{"id": 1, "text": "string", "completed": false}, ...],
                "journalPrompts": ["string1", "string2", "string3"]
              }
            `,
          },
        ],
      }),
    });

    const data: any = await response.json();

    if (!response.ok) {
      console.error('OpenRouter Error:', data);
      return res.status(500).json({
        error: data.error?.message || 'AI service temporarily unavailable',
      });
    }

    let content = data.choices[0].message.content;

    // 3️⃣ Parse AI JSON safely
    const startIndex = content.indexOf('{');
    const endIndex = content.lastIndexOf('}');
    const jsonStr = content
      .substring(startIndex, endIndex + 1)
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');

    const questsData = JSON.parse(jsonStr);

    // 4️⃣ Save quests to DB using Transaction to ensure both or neither are saved
    const result = await prisma.$transaction(async (tx) => {
      const daily = await tx.dailyQuest.create({
        data: {
          userId,
          date: today,
          quests: questsData.quests,
          journalPrompts: questsData.journalPrompts,
        },
      });

      // Only create monthly if it doesn't exist
      let monthly = existingMonthly;
      if (!monthly) {
        monthly = await tx.monthlyQuest.create({
          data: {
            userId,
            month: currentMonthStr,
            monthlyQuests: questsData.monthlyQuests,
          },
        });
      }

      return { daily, monthly };
    });

    return res.status(200).json({
      success: true,
      quests: result.daily.quests,
      monthlyQuests: result.monthly.monthlyQuests,
      journalPrompts: result.daily.journalPrompts,
      generatedAt: today,
      monthGenerated: currentMonthStr,
      regenerated: true,
    });

  } catch (error: any) {
    console.error('Generate quests error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate quests. Please try again.',
    });
  }
};