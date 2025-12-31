// src/controllers/questController.ts
import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { getHelplinesByType } from '../controllers/helpline';

// Safety check function for crisis detection
function detectCrisisKeywords(text: string): { isCrisis: boolean; type: string } {
  const lowerText = text.toLowerCase();
  
  // Suicidal ideation keywords
  const suicidalKeywords = [
    'kill myself', 'suicide', 'end my life', 'want to die', 'better off dead',
    'no reason to live', 'can\'t go on', 'end it all', 'take my life',
    'rather be dead', 'wish i was dead', 'don\'t want to be alive',
    'not worth living', 'ending it', 'jump off', 'overdose', 'hang myself'
  ];
  
  // Harm to others keywords - EXPANDED
  const harmOthersKeywords = [
    'kill someone', 'hurt someone', 'harm others', 'want to hurt', 'going to hurt',
    'murder', 'going to kill', 'make them pay', 'get revenge', 'shoot up',
    'bomb the', 'blow up', 'mass shooting', 'school shooting', 'attack the',
    'stab someone', 'hurt people', 'kill people', 'violence against',
    'planning to hurt', 'going to attack', 'make them suffer', 'teach them a lesson',
    'they deserve to die', 'want them dead', 'explosive', 'weapon to',
    'going to shoot', 'gun to school', 'knife to', 'hurt my', 'kill my',
    'harm my classmates', 'harm my coworkers', 'hurt everyone', 'kill everyone'
  ];
  
  // Self-harm keywords
  const selfHarmKeywords = [
    'cut myself', 'hurt myself', 'self harm', 'self-harm', 'burning myself',
    'starve myself', 'punish myself', 'harm myself', 'cutting', 'burn my skin',
    'scratch myself', 'hit myself', 'bang my head', 'pulling my hair out'
  ];
  
  // Severe crisis keywords
  const severeDistressKeywords = [
    'can\'t take it anymore', 'give up', 'no hope', 'hopeless', 'worthless',
    'nobody cares', 'everyone hates me', 'better without me', 'can\'t do this',
    'want to disappear', 'wish i didn\'t exist', 'life is meaningless',
    'nothing matters', 'why bother', 'pointless to try'
  ];
  
  // Check for each crisis type (prioritize harm to others)
  if (harmOthersKeywords.some(keyword => lowerText.includes(keyword))) {
    return { isCrisis: true, type: 'harm_others' };
  }
  
  if (suicidalKeywords.some(keyword => lowerText.includes(keyword))) {
    return { isCrisis: true, type: 'suicidal' };
  }
  
  if (selfHarmKeywords.some(keyword => lowerText.includes(keyword))) {
    return { isCrisis: true, type: 'self_harm' };
  }
  
  // Check for severe distress (less urgent but still important)
  const distressCount = severeDistressKeywords.filter(keyword => lowerText.includes(keyword)).length;
  if (distressCount >= 2) {
    return { isCrisis: true, type: 'severe_distress' };
  }
  
  return { isCrisis: false, type: 'none' };
}

// New endpoint to check if user has generated quests today
export const checkTodayStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const existingDaily = await prisma.dailyQuest.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    if (existingDaily) {
      // Get monthly quests (user's own or shared from another user for this month)
      const userMonthly = await prisma.monthlyQuest.findUnique({
        where: {
          userId_month: {
            userId,
            month: currentMonthStr,
          },
        },
      });

      const sharedMonthly = await prisma.monthlyQuest.findFirst({
        where: {
          month: currentMonthStr,
        },
      });

      const monthlyQuests = userMonthly?.monthlyQuests || sharedMonthly?.monthlyQuests || null;

      return res.status(200).json({
        hasGeneratedToday: true,
        quests: existingDaily.quests,
        monthlyQuests: monthlyQuests,
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

    // CRISIS DETECTION CHECK
    const crisisCheck = detectCrisisKeywords(feeling);
    console.log('🔍 CRISIS CHECK DEBUG:', { feeling, isCrisis: crisisCheck.isCrisis, type: crisisCheck.type });
    if (crisisCheck.isCrisis) {
      // Log the crisis event for safety monitoring
      console.log(`🚨 CRISIS DETECTED - User ${userId} - Type: ${crisisCheck.type} - Time: ${new Date().toISOString()}`);
      console.log(`Crisis message content: ${feeling.substring(0, 100)}...`);
      
      // Create a crisis flag in the database to lock them out for 24 hours
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Store crisis flag in DailyQuest table with special marker
      await prisma.dailyQuest.create({
        data: {
          userId,
          date: today,
          quests: [],
          journalPrompts: [],
          completedAt: new Date(),
        },
      });
      
      // Get helplines from config
      const helplineData = getHelplinesByType(crisisCheck.type);
      
      if (!helplineData) {
        return res.status(500).json({
          error: 'Crisis resources unavailable. Please call 911 or contact emergency services.',
        });
      }
      
      return res.status(200).json({
        isCrisis: true,
        crisisType: crisisCheck.type,
        message: helplineData.message,
        helplines: helplineData.helplines,
        additionalMessage: helplineData.additionalMessage,
        lockedOut: true,
        lockoutMessage: 'For your safety, you won\'t be able to submit another check-in until tomorrow. Please reach out to the resources above.'
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

    // Check for existing monthly quests for this month (same for all users)
    const existingMonthly = await prisma.monthlyQuest.findFirst({
      where: {
        month: currentMonthStr,
      },
    });

    // Also check if this user already has monthly quests
    const userMonthly = await prisma.monthlyQuest.findUnique({
      where: {
        userId_month: {
          userId,
          month: currentMonthStr,
        },
      },
    });

    if (existingDaily && (userMonthly || existingMonthly)) {
      // Use existing monthly quests (either user's own or shared from another user)
      const monthlyQuestsToReturn = userMonthly?.monthlyQuests || existingMonthly?.monthlyQuests;
      
      return res.status(200).json({
        success: true,
        quests: existingDaily.quests,
        monthlyQuests: monthlyQuestsToReturn,
        journalPrompts: existingDaily.journalPrompts,
        generatedAt: today,
        monthGenerated: currentMonthStr,
        regenerated: false,
      });
    }

    // Call AI to generate quests
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
        max_tokens: 2500,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: 'You are a JSON generator. You ONLY output valid JSON. Never include explanations, greetings, or any text outside the JSON structure.'
          },
          {
            role: 'user',
            content: `⚠️ EMERGENCY SAFETY PROTOCOL ⚠️
CRITICAL: If the user mentions ANY of the following emergency keywords, DO NOT generate quests. The system has already detected this is a crisis and will show emergency resources instead.

EMERGENCY KEYWORDS (DO NOT GENERATE QUESTS IF PRESENT):
- Suicide, suicidal, kill myself, end my life, want to die
- Self-harm, cutting, hurt myself, burn myself, self-injure
- Harming others, kill someone, hurt people, violence, attack
- Any mention of weapons, explosives, or plans to harm themselves or others
- Hopelessness combined with multiple expressions of despair

If you detect emergency keywords above, respond ONLY with:
{
  "isEmergency": true,
  "quests": [],
  "monthlyQuests": [],
  "journalPrompts": []
}

---

NORMAL MODE (No emergency keywords detected):

Your job is to help Canadian immigrants with mental health and cultural isolation. The user will tell you how they're feeling today and why, and you will generate EXACTLY 4 Daily Quests:
- 2 Personalized Quests that are tailored to the user's specific situation, background, and current feelings
- 2 General Canadian Quests that are universal Canadian cultural experiences (not related to user's specific mood or situation)

CRITICAL: All quests must be VERY SPECIFIC and ACTIONABLE. Include exact steps, numbers, locations, or specific actions the user should take.

Here's a full comprehensive example:
The user says: "I'm feeling sad today because I'm really struggling to find a job".

4 Daily Quests (2 Personalized + 2 General Canadian):
1. [Personalized] 📝 Resume Review: Spend 30 minutes updating your resume with 3 new skills you've learned, then ask a friend to review it. (Reward: 25🍁)
2. [Personalized] 💼 Job Search Strategy: Research 5 companies in your field today and write down 2 specific reasons why you'd want to work at each. (Reward: 30🍁)
3. [General Canadian] ☕ Tim Hortons Visit: Go to your nearest Tim Hortons, order a double-double coffee, and try a Timbits box (pick your favorite flavor!). (Reward: 20🍁)
4. [General Canadian] 🎵 Canadian Music Discovery: Listen to "Waves of Blue" by Majid Jordan on Spotify, then find 2 more songs by Canadian artists and add them to a playlist. (Reward: 15🍁)

Part Two - Monthly Quests (EVENT-BASED, SAME FOR EVERYONE)
Current Month: ${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}

Generate 2 monthly quests that are appropriate for the current month and represent exciting Canadian cultural events.

Part Three - Follow-Up Questions
Generate EXACTLY 2 follow-up questions that are DIRECTLY RELATED to the user's mental health check-in.

User's feeling: "${feeling}"

CRITICAL INSTRUCTIONS:
- Generate EXACTLY 4 daily quests: 2 Personalized + 2 General Canadian
- Generate 2 monthly quests that are EVENT-BASED
- Generate ONLY 2 journal prompts
- Return ONLY a JSON object
- Do NOT include emergency keywords in quest descriptions

Example format:
{
  "quests": [
    {"id": 1, "title": "☕ Quest Title", "description": "Detailed description (80-120 chars).", "reward": 20},
    {"id": 2, "title": "🎵 Quest Title", "description": "Another description.", "reward": 30},
    {"id": 3, "title": "🏃 Quest Title", "description": "Activity description.", "reward": 20},
    {"id": 4, "title": "📝 Quest Title", "description": "Fourth quest.", "reward": 10}
  ],
  "monthlyQuests": [
    {"id": 1, "title": "🏒 Quest Title", "description": "Canadian cultural experience.", "reward": 500},
    {"id": 2, "title": "🌊 Quest Title", "description": "Another experience.", "reward": 400}
  ],
  "journalPrompts": [
    "Question 1: Why question.",
    "Question 2: How question."
  ]
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
    
    if (startIndex === -1 || endIndex === -1) {
      console.error('No JSON found in AI response');
      return res.status(500).json({
        error: 'AI returned invalid response format',
      });
    }

    let jsonStr = content
      .substring(startIndex, endIndex + 1)
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');

    let questsData;
    try {
      questsData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Initial JSON parse error:', parseError);
      
      try {
        let fixedJson = jsonStr;
        const openBraces = (fixedJson.match(/{/g) || []).length;
        const closeBraces = (fixedJson.match(/}/g) || []).length;
        const openBrackets = (fixedJson.match(/\[/g) || []).length;
        const closeBrackets = (fixedJson.match(/]/g) || []).length;
        
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          fixedJson += ']';
        }
        
        for (let i = 0; i < openBraces - closeBraces; i++) {
          fixedJson += '}';
        }
        
        questsData = JSON.parse(fixedJson);
      } catch (fixError) {
        console.error('Failed to fix JSON:', fixError);
        return res.status(500).json({
          error: 'Failed to parse AI response. Please try again.',
        });
      }
    }

    // Validate the structure
    if (!questsData.quests || !Array.isArray(questsData.quests) || questsData.quests.length !== 4) {
      console.error('Invalid quests structure:', questsData);
      return res.status(500).json({
        error: 'AI generated invalid quest structure. Please try again.',
      });
    }

    if (!questsData.monthlyQuests || !Array.isArray(questsData.monthlyQuests) || questsData.monthlyQuests.length !== 2) {
      console.error('Invalid monthlyQuests structure:', questsData);
      return res.status(500).json({
        error: 'AI generated invalid monthly quest structure. Please try again.',
      });
    }

    if (!questsData.journalPrompts || !Array.isArray(questsData.journalPrompts) || questsData.journalPrompts.length === 0) {
      console.error('Invalid journalPrompts structure:', questsData);
      return res.status(500).json({
        error: 'AI generated invalid journal prompts. Please try again.',
      });
    }

    // Take only the first journal prompt
    const firstPrompt = questsData.journalPrompts[0];
    questsData.journalPrompts = [firstPrompt];

    // Add placeholder for question 2
    questsData.journalPrompts.push("This question will be personalized based on your previous answer");
    
    // Add the 3rd question
    questsData.journalPrompts.push("Is there anything else you'd like to talk about today?");

    // Transform journalPrompts to objects
    questsData.journalPrompts = questsData.journalPrompts.map((prompt: any) => {
      if (typeof prompt === 'object' && prompt.question) {
        return {
          question: prompt.question,
          answer: prompt.answer || null,
          answeredAt: prompt.answeredAt || null,
        };
      }
      return {
        question: typeof prompt === 'string' ? prompt : String(prompt),
        answer: null,
        answeredAt: null,
      };
    });

    // Add completed: false to all quests
    questsData.quests = questsData.quests.map((q: any) => ({ ...q, completed: false }));
    questsData.monthlyQuests = questsData.monthlyQuests.map((q: any) => ({ ...q, completed: false }));

    // Save quests to DB
    const result = await prisma.$transaction(async (tx) => {
      const daily = await tx.dailyQuest.create({
        data: {
          userId,
          date: today,
          quests: questsData.quests,
          journalPrompts: questsData.journalPrompts,
        },
      });

      let monthly = userMonthly || existingMonthly;
      if (!monthly) {
        monthly = await tx.monthlyQuest.create({
          data: {
            userId,
            month: currentMonthStr,
            monthlyQuests: questsData.monthlyQuests,
          },
        });
      } else if (!userMonthly && existingMonthly) {
        monthly = await tx.monthlyQuest.create({
          data: {
            userId,
            month: currentMonthStr,
            monthlyQuests: existingMonthly.monthlyQuests as any,
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

export const updateQuestCompletion = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { questIndex, completed, isMonthly = false } = req.body;

    if (typeof questIndex !== 'number' || typeof completed !== 'boolean') {
      return res.status(400).json({ error: 'Invalid quest index or completion status' });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (isMonthly) {
      const monthlyQuest = await prisma.monthlyQuest.findFirst({
        where: {
          userId,
          month: currentMonthStr,
        },
      });

      if (!monthlyQuest) {
        return res.status(404).json({ error: 'Monthly quests not found' });
      }

      const monthlyQuests = monthlyQuest.monthlyQuests as any[];
      if (questIndex < 0 || questIndex >= monthlyQuests.length) {
        return res.status(400).json({ error: 'Invalid quest index' });
      }

      const wasCompleted = monthlyQuests[questIndex].completed;
      const reward = monthlyQuests[questIndex].reward || 0;
      monthlyQuests[questIndex].completed = completed;

      await prisma.monthlyQuest.update({
        where: { id: monthlyQuest.id },
        data: { monthlyQuests: monthlyQuests },
      });

      if (completed && !wasCompleted && reward > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: { points: { increment: reward } }
        });
      }
    } else {
      const dailyQuest = await prisma.dailyQuest.findUnique({
        where: {
          userId_date: {
            userId,
            date: today,
          },
        },
      });

      if (!dailyQuest) {
        return res.status(404).json({ error: 'Daily quests not found' });
      }

      const quests = dailyQuest.quests as any[];
      if (questIndex < 0 || questIndex >= quests.length) {
        return res.status(400).json({ error: 'Invalid quest index' });
      }

      const wasCompleted = quests[questIndex].completed;
      const reward = quests[questIndex].reward || 0;
      quests[questIndex].completed = completed;

      await prisma.dailyQuest.update({
        where: { id: dailyQuest.id },
        data: { quests: quests },
      });

      if (completed && !wasCompleted && reward > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: { points: { increment: reward } }
        });
      }
    }

    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('Update quest completion error:', error);
    return res.status(500).json({
      error: 'Failed to update quest completion',
    });
  }
};