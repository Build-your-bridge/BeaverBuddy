// src/controllers/questController.ts
import { Request, Response } from 'express';
import prisma from '../db/prisma';
import { getHelplinesByType } from './helpline';
import { fetchTicketmasterEvents, formatEventForAI } from '../services/ticketmasterService';

// Type definitions
interface CrisisCheckResult {
  isCrisis: boolean;
  type: 'none' | 'harm_others' | 'suicidal' | 'self_harm' | 'severe_distress';
}

interface Quest {
  id: number;
  title: string;
  description: string;
  reward: number;
  completed?: boolean;
}

interface MonthlyQuest {
  id: number;
  title: string;
  description: string;
  reward: number;
  completed?: boolean;
}

interface JournalPrompt {
  question: string;
  answer: string | null;
  answeredAt: string | null;
}

interface QuestGenerationResponse {
  quests: Quest[];
  monthlyQuests: MonthlyQuest[];
  journalPrompts: JournalPrompt[] | string[];
  isEmergency?: boolean;
}

interface HelplineData {
  message: string;
  helplines: any[];
  additionalMessage: string;
}

// Safety check function for crisis detection - ENHANCED
function detectCrisisKeywords(text: string): CrisisCheckResult {
  const lowerText = text.toLowerCase();
  
  // Suicidal ideation keywords
  const suicidalKeywords = [
    'kill myself', 'suicide', 'end my life', 'want to die', 'better off dead',
    'no reason to live', 'can\'t go on', 'end it all', 'take my life',
    'rather be dead', 'wish i was dead', 'don\'t want to be alive',
    'not worth living', 'ending it', 'jump off', 'overdose', 'hang myself',
    'suicidal thoughts', 'thinking about suicide', 'planning to die'
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
    'scratch myself', 'hit myself', 'bang my head', 'pulling my hair out',
    'self injury', 'self-injury', 'injure myself'
  ];
  
  // Severe distress keywords - EXPANDED AND MORE SENSITIVE
  const severeDistressKeywords = [
    'drowning', 'can\'t breathe', 'suffocating', 'crushing me',
    'can\'t take it anymore', 'give up', 'no hope', 'hopeless', 'worthless',
    'nobody cares', 'everyone hates me', 'better without me', 'can\'t do this',
    'want to disappear', 'wish i didn\'t exist', 'life is meaningless',
    'nothing matters', 'why bother', 'pointless to try', 'no motivation',
    'empty inside', 'numb', 'can\'t feel anything', 'don\'t want to exist',
    'tired of living', 'exhausted from life', 'everything is too much',
    'can\'t cope', 'falling apart', 'breaking down', 'lost all hope'
  ];
  
  // Additional phrases that indicate severe distress (check for these exact phrases)
  const severeDistressPhrases = [
    'feel like drowning',
    'feel like i\'m drowning',
    'feels like drowning',
    'no motivation for me',
    'no motivation left',
    'lost all motivation',
    'no reason to',
    'can\'t find a reason'
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
  
  // Check for severe distress phrases first (exact matches)
  if (severeDistressPhrases.some(phrase => lowerText.includes(phrase))) {
    return { isCrisis: true, type: 'severe_distress' };
  }
  
  // Check for severe distress (lowered threshold to 1 keyword for more sensitivity)
  const distressCount = severeDistressKeywords.filter(keyword => lowerText.includes(keyword)).length;
  if (distressCount >= 1) {
    return { isCrisis: true, type: 'severe_distress' };
  }
  
  return { isCrisis: false, type: 'none' };
}

// Helper function to clean and parse JSON more robustly
function parseAIResponse(content: string): any {
  // Remove markdown code blocks
  content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  // Find JSON boundaries
  const startIndex = content.indexOf('{');
  const endIndex = content.lastIndexOf('}');
  
  if (startIndex === -1 || endIndex === -1) {
    throw new Error('No JSON object found in response');
  }
  
  let jsonStr = content.substring(startIndex, endIndex + 1);
  
  // Clean up common JSON issues
  jsonStr = jsonStr
    .replace(/,\s*}/g, '}')  // Remove trailing commas before }
    .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
    .replace(/\n/g, ' ')      // Replace newlines with spaces
    .replace(/\r/g, '')       // Remove carriage returns
    .replace(/\t/g, ' ')      // Replace tabs with spaces
    .trim();
  
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    // Try to fix common issues
    // Fix missing closing brackets/braces
    const openBraces = (jsonStr.match(/{/g) || []).length;
    const closeBraces = (jsonStr.match(/}/g) || []).length;
    const openBrackets = (jsonStr.match(/\[/g) || []).length;
    const closeBrackets = (jsonStr.match(/]/g) || []).length;
    
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      jsonStr += ']';
    }
    for (let i = 0; i < openBraces - closeBraces; i++) {
      jsonStr += '}';
    }
    
    return JSON.parse(jsonStr);
  }
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
      // Check if this is a crisis entry (empty quests array indicates crisis lockout)
      const quests = existingDaily.quests as any[];
      if (quests && quests.length === 0) {
        return res.status(200).json({
          hasGeneratedToday: true,
          isCrisisLockout: true,
          quests: [],
          monthlyQuests: null,
          journalPrompts: [],
        });
      }

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
      
      console.log('📅 Check today - userMonthly:', userMonthly ? 'found' : 'not found');
      console.log('📅 Check today - sharedMonthly:', sharedMonthly ? 'found' : 'not found');
      console.log('📅 Check today - returning monthlyQuests:', JSON.stringify(monthlyQuests, null, 2));

      return res.status(200).json({
        hasGeneratedToday: true,
        isCrisisLockout: false,
        quests: existingDaily.quests,
        monthlyQuests: monthlyQuests,
        journalPrompts: existingDaily.journalPrompts,
      });
    }

    return res.status(200).json({
      hasGeneratedToday: false,
      isCrisisLockout: false,
    });

  } catch (error: any) {
    console.error('Check today status error:', error);
    return res.status(500).json({
      error: 'Failed to check status',
    });
  }
};

export const generateQuests = async (req: Request, res: Response) => {
  const openaiKey = process.env.OPENAI_API_KEY;
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

    // CRISIS DETECTION CHECK - HAPPENS BEFORE ANYTHING ELSE
    const crisisCheck = detectCrisisKeywords(feeling);
    console.log('🔍 CRISIS CHECK DEBUG:', { 
      feeling: feeling.substring(0, 100), 
      isCrisis: crisisCheck.isCrisis, 
      type: crisisCheck.type 
    });
    
    if (crisisCheck.isCrisis) {
      // Log the crisis event for safety monitoring
      console.log(`🚨 CRISIS DETECTED - User ${userId} - Type: ${crisisCheck.type} - Time: ${new Date().toISOString()}`);
      console.log(`Crisis message content: ${feeling.substring(0, 100)}...`);
      
      // Create a crisis flag in the database with EMPTY quests array to lock them out for 24 hours
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Check if entry already exists for today
      const existingDaily = await prisma.dailyQuest.findUnique({
        where: {
          userId_date: {
            userId,
            date: today,
          },
        },
      });

      // Only create crisis lockout entry if one doesn't exist
      if (!existingDaily) {
        await prisma.dailyQuest.create({
          data: {
            userId,
            date: today,
            quests: [], // Empty array = crisis lockout marker
            journalPrompts: [],
            completedAt: new Date(),
          },
        });
      }
      
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

    if (existingDaily) {
      // Check if it's a crisis lockout (empty quests array)
      const quests = existingDaily.quests as any[];
      if (quests && quests.length === 0) {
        return res.status(403).json({
          error: 'You are currently in crisis support mode. Please check back tomorrow.',
          isCrisisLockout: true
        });
      }

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

    // FIRST: Ask AI to perform safety check before generating quests
    console.log('🤖 Performing AI safety check...');
    const safetyCheckResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 200,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: 'You are a crisis detection AI for a mental health app. Your ONLY job is to determine if a user message contains ANY indication of crisis. Respond with ONLY "CRISIS" or "SAFE" - nothing else.'
          },
          {
            role: 'user',
            content: `Analyze this user message for ANY signs of crisis, including:
- Suicidal thoughts or intentions (wanting to die, ending life, suicide)
- Self-harm intentions (cutting, burning, hurting themselves)
- Intentions to harm others (killing, hurting, violence towards others)
- Severe mental distress that needs immediate intervention

User message: "${feeling}"

If you detect ANY of the above, respond with ONLY the word: CRISIS
If the message is safe, respond with ONLY the word: SAFE

Your response (one word only):`
          },
        ],
      }),
    });

    const safetyData: any = await safetyCheckResponse.json();
    
    if (safetyCheckResponse.ok) {
      const safetyResult = safetyData.choices[0].message.content.trim().toUpperCase();
      console.log('🤖 AI Safety Result:', safetyResult);
      
      // If AI detects crisis, trigger emergency response
      if (safetyResult.includes('CRISIS')) {
        console.log(`🚨 AI DETECTED CRISIS - User ${userId} - Time: ${new Date().toISOString()}`);
        console.log(`AI Crisis detection for: ${feeling.substring(0, 100)}...`);
        
        // Create crisis lockout in database
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        await prisma.dailyQuest.create({
          data: {
            userId,
            date: today,
            quests: [], // Empty array = crisis lockout marker
            journalPrompts: [],
            completedAt: new Date(),
          },
        });
        
        // Default to severe_distress for AI-detected crises
        // (since AI caught something our keyword filter missed)
        const helplineData = getHelplinesByType('severe_distress');
        
        if (!helplineData) {
          return res.status(500).json({
            error: 'Crisis resources unavailable. Please call 911 or contact emergency services.',
          });
        }
        
        return res.status(200).json({
          isCrisis: true,
          crisisType: 'severe_distress',
          message: helplineData.message,
          helplines: helplineData.helplines,
          additionalMessage: helplineData.additionalMessage,
          lockedOut: true,
          lockoutMessage: 'For your safety, you won\'t be able to submit another check-in until tomorrow. Please reach out to the resources above.'
        });
      }
    }

    // If AI says SAFE, proceed with quest generation
    console.log('✅ Safety check passed, generating daily quests...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 2500,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful JSON generator for a mental health support app. You MUST output ONLY valid, well-formed JSON. No explanations, no markdown, no extra text - ONLY the JSON object.'
          },
          {
            role: 'user',
            content: `Generate daily quests for a Canadian immigrant mental health app.

User's feeling: "${feeling}"

You must generate EXACTLY:
- 4 daily quests (2 personalized to their feeling, 2 general Canadian experiences)
- 1 personalized journal prompt (a caring question specifically about what they shared in their feeling - reference their specific situation)

Output ONLY this JSON structure with NO extra text:

{
  "quests": [
    {"id": 1, "title": "☕ Quest 1", "description": "Short description (80-120 chars)", "reward": 20},
    {"id": 2, "title": "🎵 Quest 2", "description": "Short description (80-120 chars)", "reward": 25},
    {"id": 3, "title": "🏃 Quest 3", "description": "Short description (80-120 chars)", "reward": 15},
    {"id": 4, "title": "📝 Quest 4", "description": "Short description (80-120 chars)", "reward": 30}
  ],
  "journalPrompts": [
    "A personalized question based on what they shared about their feelings - be specific and caring"
  ]
}

CRITICAL: 
- The journal prompt MUST be personalized to their specific feeling, not generic
- Reference what they actually said in their feeling
- Output ONLY the JSON above. No other text.`,
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
    console.log('AI Raw Response:', content.substring(0, 200));

    let questsData;
    try {
      questsData = parseAIResponse(content);
    } catch (parseError: any) {
      console.error('JSON Parse Error:', parseError.message);
      console.error('Failed content:', content);
      return res.status(500).json({
        error: 'Failed to parse AI response. Please try again.',
        details: parseError.message
      });
    }

    // Validate the structure
    if (!questsData.quests || !Array.isArray(questsData.quests) || questsData.quests.length !== 4) {
      console.error('Invalid quests structure:', questsData);
      return res.status(500).json({
        error: 'AI generated invalid quest structure. Please try again.',
      });
    }

    if (!questsData.journalPrompts || !Array.isArray(questsData.journalPrompts) || questsData.journalPrompts.length !== 1) {
      console.error('Invalid journalPrompts structure:', questsData);
      return res.status(500).json({
        error: 'AI generated invalid journal prompts. Please try again.',
      });
    }

    // Use the AI-generated journal prompt as Question 1
    // Add a placeholder for Question 2 (will be generated dynamically after user answers Q1)
    questsData.journalPrompts.push("What do you think might help you feel better about this situation?");
    // Add the hardcoded Question 3
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

    // Save daily quests to DB
    const daily = await prisma.dailyQuest.create({
      data: {
        userId,
        date: today,
        quests: questsData.quests,
        journalPrompts: questsData.journalPrompts,
        originalFeeling: feeling,
      },
    });
    
    return res.status(200).json({
      success: true,
      quests: daily.quests,
      journalPrompts: daily.journalPrompts,
      generatedAt: today,
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
      
      // Don't allow quest completion if in crisis lockout (empty quests array)
      if (quests.length === 0) {
        return res.status(403).json({ error: 'Quest completion not available in crisis support mode' });
      }

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

// Generate Monthly Quests (separate endpoint)
export const generateMonthlyQuests = async (req: Request, res: Response) => {
  const openaiKey = process.env.OPENAI_API_KEY;
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { filters, city, province } = req.body;

    if (!filters || !Array.isArray(filters) || filters.length === 0) {
      return res.status(422).json({
        error: 'Please select at least one interest filter',
      });
    }

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Check if user already has monthly quests
    const userMonthly = await prisma.monthlyQuest.findUnique({
      where: {
        userId_month: {
          userId,
          month: currentMonthStr,
        },
      },
    });

    // If user already has monthly quests, delete them to generate fresh ones with new filters
    if (userMonthly) {
      console.log('🗑️ Deleting existing monthly quests to regenerate with new filters');
      await prisma.monthlyQuest.delete({
        where: {
          userId_month: {
            userId,
            month: currentMonthStr,
          },
        },
      });
    }

    // Fetch Ticketmaster events based on filters
    let ticketmasterEvents: string[] = [];
    let rawEvents: any[] = [];
    try {
      console.log('🎫 Fetching Ticketmaster events for filters:', filters, 'city:', city || 'Toronto');
      const events = await fetchTicketmasterEvents(filters, city || 'Toronto');
      console.log(`📊 Raw events fetched: ${events.length}`);
      
      if (events.length > 0) {
        console.log('First event sample:', JSON.stringify(events[0], null, 2));
      }
      
      // Store raw events for reroll pool
      rawEvents = events.slice(0, 30);
      
      ticketmasterEvents = rawEvents.map((event: any) => 
        formatEventForAI(event, event._filterCategory || 'general')
      );
      console.log(`✅ Formatted ${ticketmasterEvents.length} events for AI`);
      
      // Need at least 6 events for proper monthly quests (2 shown + 4 in reroll pool)
      if (ticketmasterEvents.length < 6) {
        console.error(`❌ Only ${ticketmasterEvents.length} events found - need at least 6 for reroll pool`);
        console.error('Selected filters:', filters);
        return res.status(404).json({
          error: `Only ${ticketmasterEvents.length} events found. Try selecting more categories or check back later!`,
          filters: filters
        });
      }
      
      if (ticketmasterEvents.length > 0) {
        console.log('First 3 formatted events being sent to AI:');
        ticketmasterEvents.slice(0, 3).forEach((event, i) => {
          console.log(`${i + 1}. ${event.substring(0, 200)}...`);
        });
      }
    } catch (error) {
      console.error('❌ Error fetching Ticketmaster events:', error);
      return res.status(500).json({
        error: 'Failed to fetch events from Ticketmaster. Please try again.',
      });
    }

    // Generate monthly quests with AI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1500,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful JSON generator for a mental health support app. You MUST output ONLY valid, well-formed JSON. No explanations, no markdown, no extra text - ONLY the JSON object.'
          },
          {
            role: 'user',
            content: `Generate monthly quests for a Canadian immigrant mental health app.

User selected interests: ${filters.join(', ')}

TASK: You will generate descriptions for 6 EVENT options and 1 LANDMARK quest.

PART 1 - Generate descriptions for the TOP 6 EVENTS from the list below:
  SELECTION CRITERIA (in order of importance):
  1. Major cultural significance to Canada (hockey games, major concerts, theatre productions, festivals)
  2. Well-known venues or artists/performers
  3. Events that promote mental wellness and social connection
  4. Professional productions (NOT amateur nights, open mics, karaoke, trivia)
  5. Events with clear dates and reputable venues
  
  IMPORTANT VARIETY RULES:
  - Select 6 COMPLETELY DIFFERENT events (not multiple performances of the same show)
  - If multiple categories are available, select events from DIFFERENT categories
  - DO NOT select "Clue (Touring)" on Jan 8th AND "Clue (Touring)" on Jan 9th - that's the same show!
  - Choose diverse experiences to give users variety
  
  AVOID: Generic bar events, amateur nights, small unknown venues, unclear events, duplicate shows
  PREFER: Major sports (Maple Leafs, Raptors, Blue Jays), major concerts, professional theatre, established festivals
  
  CRITICAL RULES:
  - YOU MUST ONLY SELECT EVENTS FROM THE LIST BELOW - DO NOT MAKE UP OR INVENT EVENTS
  - USE THE EXACT "name", "url", "id", and "category" from the event JSON below
  - The "category" field tells you what filter it came from (music, sports, theatre, arts, etc.)
  - If an event has category="theatre" it should be tagged as theatre, NOT arts

PART 2 - 1 LANDMARK quest: A famous Canadian landmark to visit (AGO, ROM, CN Tower, Ripley's Aquarium, Casa Loma, etc.)

${ticketmasterEvents.length > 0 ? `Available Events (select and describe the top 6):
${ticketmasterEvents.join('\n')}` : `* 6 EVENT options: Fun Ontario events for ${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })} related to: ${filters.join(', ')}
* 1 LANDMARK quest: A famous Toronto landmark (AGO, ROM, CN Tower, Ripley's Aquarium, Casa Loma)`}

QUEST WRITING REQUIREMENTS:
- Titles should be the ACTUAL EVENT NAME from the data (e.g., "Toronto Maple Leafs vs Winnipeg Jets" NOT "Catch the Maple Leafs in Action")
- Descriptions must be SHORT and punchy (max 2 sentences, ~20-25 words)
- Use SPECIFIC dates like "January 17th" or "February 3rd" (NOT "this Friday" or "next week")
- Include venue name and make it exciting but BRIEF
- DO NOT use "join us" or "we" - you are NOT hosting the event, just recommending it
- Each event must have a UNIQUE, ENGAGING description - don't just repeat the title!

EXAMPLES:
- Title: "🏒 Toronto Maple Leafs vs Winnipeg Jets"
  Description: "Watch the Leafs battle at Scotiabank Arena on January 17th. Experience live NHL hockey!"
  
- Title: "🎵 Deep Dish Concert"
  Description: "Legendary house duo performs at CODA on February 3rd. Get ready to dance!"

- Title: "🏛️ Explore the Royal Ontario Museum"
  Description: "Discover Canada's cultural heritage at the ROM. Explore world-class exhibits and artifacts."

Output ONLY this JSON structure with NO extra text:

{
  "eventOptions": [
    {"id": 1, "title": "[Emoji + event name]", "description": "[SHORT unique description with venue and date]", "reward": 500, "url": "[EXACT url]", "eventId": "[EXACT id]", "category": "[EXACT category]"},
    {"id": 2, "title": "[Emoji + event name]", "description": "[SHORT unique description]", "reward": 500, "url": "[EXACT url]", "eventId": "[EXACT id]", "category": "[EXACT category]"},
    {"id": 3, "title": "[Emoji + event name]", "description": "[SHORT unique description]", "reward": 500, "url": "[EXACT url]", "eventId": "[EXACT id]", "category": "[EXACT category]"},
    {"id": 4, "title": "[Emoji + event name]", "description": "[SHORT unique description]", "reward": 500, "url": "[EXACT url]", "eventId": "[EXACT id]", "category": "[EXACT category]"},
    {"id": 5, "title": "[Emoji + event name]", "description": "[SHORT unique description]", "reward": 500, "url": "[EXACT url]", "eventId": "[EXACT id]", "category": "[EXACT category]"},
    {"id": 6, "title": "[Emoji + event name]", "description": "[SHORT unique description]", "reward": 500, "url": "[EXACT url]", "eventId": "[EXACT id]", "category": "[EXACT category]"}
  ],
  "landmarkQuest": {"id": 7, "title": "[Landmark with emoji]", "description": "[Short 20-25 word description]", "reward": 400}
}

CRITICAL: 
- For EVENT options: YOU MUST ONLY USE EVENTS FROM THE PROVIDED LIST
- DO NOT INVENT, MAKE UP, OR CREATE fake events
- Copy the EXACT "name", "url", "id", and "category" fields from the event data
- Titles MUST use the ACTUAL EVENT NAME from the "name" field
- Descriptions must be UNIQUE for each event - tell us WHY it's interesting, not just repeat the title!
- The "category" field in the event data tells you which filter it came from - USE IT EXACTLY
- Descriptions MUST be SHORT (20-25 words max) - be concise!
- Use SPECIFIC dates like "January 17th" (NOT "this Friday")
- DO NOT say "join us" or "we" - you are recommending events, not hosting them
- For LANDMARK quest: Only include title, description, reward (no url/eventId/category)
- Output ONLY the JSON above. No other text.`,
          },
        ],
      }),
    });

    // Parse monthly quest response from OpenAI
    const data: any = await response.json();

    if (!response.ok || !data.choices || !data.choices[0]) {
      console.error('OpenAI API error:', data);
      return res.status(500).json({
        error: data.error?.message || 'AI service temporarily unavailable',
      });
    }

    let content = data.choices[0].message.content;
    console.log('AI Monthly Quest Response:', content.substring(0, 200));

    let questsData;
    try {
      questsData = parseAIResponse(content);
    } catch (parseError: any) {
      console.error('JSON Parse Error:', parseError.message);
      console.error('Failed content:', content);
      return res.status(500).json({
        error: 'Failed to parse AI response. Please try again.',
        details: parseError.message
      });
    }

    // Validate the structure - now expecting eventOptions array + landmarkQuest
    console.log('📊 Event Options from AI:', JSON.stringify(questsData.eventOptions, null, 2));
    if (!questsData.eventOptions || !Array.isArray(questsData.eventOptions) || questsData.eventOptions.length !== 6) {
      console.error('Invalid eventOptions structure:', questsData);
      return res.status(500).json({
        error: 'AI generated invalid event options structure. Please try again.',
      });
    }

    // Pick first 2 events for display, keep rest in pools
    const displayEvents = questsData.eventOptions.slice(0, 2).map((q: any, idx: number) => ({ ...q, id: idx + 1, completed: false }));
    const poolEvents = questsData.eventOptions.slice(2);
    
    // Add landmark quest
    const landmarkQuest = { ...questsData.landmarkQuest, id: 3, completed: false };
    const monthlyQuests = [...displayEvents, landmarkQuest];

    console.log('📊 Final Monthly Quests:', JSON.stringify(monthlyQuests, null, 2));

    // Save monthly quests to DB
    const monthly = await prisma.monthlyQuest.create({
      data: {
        userId,
        month: currentMonthStr,
        monthlyQuests: monthlyQuests,
      },
    });

    console.log('💾 Saved monthly quests to DB:', JSON.stringify(monthly.monthlyQuests, null, 2));
    
    // Create event pool for rerolling (events not currently selected)
    const monthlyQuestsArray = Array.isArray(monthly.monthlyQuests) ? monthly.monthlyQuests : [];
    const eventQuests = monthlyQuestsArray.filter((q: any) => q.eventId);
    
    // Create separate reroll pools with AI-generated descriptions
    const quest1Pool = poolEvents.slice(0, 2).map((event: any) => ({
      id: event.eventId,
      name: event.title,
      description: event.description,
      url: event.url,
      category: event.category
    }));
    
    const quest2Pool = poolEvents.slice(2, 4).map((event: any) => ({
      id: event.eventId,
      name: event.title,
      description: event.description,
      url: event.url,
      category: event.category
    }));
    
    return res.status(200).json({
      success: true,
      monthlyQuests: monthly.monthlyQuests,
      eventPools: {
        quest1: quest1Pool,
        quest2: quest2Pool
      },
      monthGenerated: currentMonthStr,
      regenerated: true,
    });

  } catch (error: any) {
    console.error('Generate monthly quests error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate monthly quests. Please try again.',
    });
  }
};