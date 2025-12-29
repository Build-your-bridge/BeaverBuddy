// src/controllers/questController.ts
import { Request, Response } from 'express';
import prisma from '../db/prisma';

// New endpoint to check if user has generated quests today
export const checkTodayStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const existingDaily = await prisma.dailyQuest.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    if (existingDaily) {
      return res.status(200).json({
        hasGeneratedToday: true,
        quests: existingDaily.quests,
        journalPrompts: existingDaily.journalPrompts,
      });
    }

    return res.status(200).json({
      hasGeneratedToday: false,
    });

  } catch (error: any) {
    console.error('Check today status error:', error);
    return res.status(500).json({
      error: 'Failed to check status',
    });
  }
};

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

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Check if quests already exist
    const existingDaily = await prisma.dailyQuest.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
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

    // Call AI to generate quests with the improved prompt
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
        max_tokens: 1500,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: `Part One - Daily Quests
Your job is to help Canadian immigrants with mental health and cultural isolation. The user will tell you how they're feeling today and why, and you will generate 4 personalized Daily Quests for them. 2 of them should be Emotional Quests that directly help with their current situation, and the other 2 should be Cultural Quests that have NOTHING to do with their current situation, and instead help them get familiar and comfortable with Canada's local culture.

Here's a full comprehensive example of what we're expecting:
The user says this: "I'm feeling sad today because I'm really struggling to find a job".

4 Daily Quests:
-[Emotional] Resume Editing: Spend 1 hour tweaking and improving your resume. (Reward: 20🍁)
-[Emotional] LinkedIn Connections: Make 3 LinkedIn connections to meet new people. (Reward: 30🍁)
-[Cultural] Coffee Break: Grab a coffee from Tim Hortons. (Reward: 20🍁)
-[Cultural] Song of the Day: Listen to a recent song from a small, Canadian artist. (Reward: 10🍁)

Here are some other examples for various Emotional Daily Quests:
"I'm feeling bored and lonely, I haven't seen my friends in while because everyone is so busy with life."
-Suggested Emotional Quest: Listen to this song or check out this game! (Reward: 50🍁)
"I'm really mad, I studied so hard for my test yesterday but I didn't get the grade I wanted."
-Suggested Emotional Quest: Breathing Exercises to calm you down. (Reward: 20🍁)
"I'm feeling great! I just had a fun Christmas party with all of my friends and I won some cool prizes!"
-Suggested Emotional Quest: Write down something you're grateful for. (Reward: 25🍁)

Part Two - Monthly Quests
In addition to generating 4 Daily Quests, we also want you to generate 2 Monthly Quests. Monthly Quests are supposed to be purely cultural and not related to the user's current mood for the day. These Monthly Quests are much more major events that are not done on a daily basis, and involve more money, people, and planning time in advance.

Here are some examples:
-Go to a Toronto Raptors/Maple Leafs/Blue Jays game (Reward: 500🍁)
-Go to a concert/music festival (Like a Taylor Swift concert, or the Veld Music Festival)
-Go to a convention (Like FanExpo Canada or Toronto Comicon)
-Visit the CN Tower/Eaton Center/Ripley's Aquarium/The ROM

Part Three - Follow-Up Questions
We also want you to generate 3 follow-up questions based on the user's feelings today. These should be questions that allow the user to go deeper into detail about how they're feeling today, instead of just a brief 1-sentence summary. This is meant to act like a diary to the user, giving them a chance to thoroughly reflect through their emotions and relieve stress so that it's not all pent-up in their mind. The 3rd, final question should always be the same: "Is there anything else you'd like to talk about today?". This gives the user the freedom to write down whatever they want.

Quest Formatting and Improvements
Each quest description should be approximately 150 chars, but must not exceed this limit. We want quests to have a good amount of detail but not look like a whole paragraph. Feel free to make the quest titles more playful and less formal! The coffee quest can be renamed to "Timmies Time", the Raptors quest can be "We The North", the aquarium quest can be "Under The Sea", etc!. Please also add an emoji to the title of the quest for extra flair.

For the Song quest, don't tell users to just find a song on their own. Suggest a song for them to listen to! Here are a bunch of examples:
-Waves of Blue by Majid Jordan
-Crazy For You by Hedley
-She's All I Wanna Be by Tate McRae
-Sound of Your Heart by Shawn Hook
-I'm Not Alright by Loud Luxury and Bryce Vine
-2 Heads by Coleman Hell

User's feeling: "${feeling}"

Return ONLY a JSON object with this exact structure:
{
  "quests": [
    {"id": 1, "text": "string", "completed": false},
    {"id": 2, "text": "string", "completed": false},
    {"id": 3, "text": "string", "completed": false},
    {"id": 4, "text": "string", "completed": false}
  ],
  "monthlyQuests": [
    {"id": 1, "text": "string", "completed": false},
    {"id": 2, "text": "string", "completed": false}
  ],
  "journalPrompts": ["string1", "string2", "Is there anything else you'd like to talk about today?"]
}`,
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

    // Parse AI JSON safely
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

    // Save quests to DB using Transaction
    const result = await prisma.$transaction(async (tx) => {
      const daily = await tx.dailyQuest.create({
        data: {
          userId,
          date: today,
          quests: questsData.quests,
          journalPrompts: questsData.journalPrompts,
        },
      });

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