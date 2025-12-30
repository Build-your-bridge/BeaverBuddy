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
    // Find any user's monthly quests for this month to reuse
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
        max_tokens: 2500,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: 'You are a JSON generator. You ONLY output valid JSON. Never include explanations, greetings, or any text outside the JSON structure.'
          },
          {
            role: 'user',
            content: `Part One - Daily Quests
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

More Personalized Quest Examples (be VERY specific):
"I'm feeling bored and lonely, I haven't seen my friends in a while because everyone is so busy with life."
- [Personalized] 📱 Reconnect: Text 3 friends you haven't talked to in a while and suggest a specific activity for this weekend (coffee, walk, or video call). (Reward: 30🍁)

"I'm really mad, I studied so hard for my test yesterday but I didn't get the grade I wanted."
- [Personalized] 🧘 Calm Down Session: Do 10 minutes of deep breathing (4-7-8 technique: inhale 4, hold 7, exhale 8), then write down 3 things you learned from studying. (Reward: 25🍁)

"I'm feeling great! I just had a fun Christmas party with all of my friends and I won some cool prizes!"
- [Personalized] ✍️ Gratitude Journal: Write down 5 specific things you're grateful for from today, including why each one matters to you. (Reward: 20🍁)

General Canadian Quest Examples (be VERY specific):
- [General Canadian] 🏒 Hockey Night: Watch at least 1 period of a Toronto Maple Leafs game tonight (or any NHL game), and learn 2 new hockey terms. (Reward: 25🍁)
- [General Canadian] 🍁 Canadian History: Visit the Royal Ontario Museum website, read about 1 Canadian historical event, and share one interesting fact with someone. (Reward: 20🍁)
- [General Canadian] 🎬 Canadian Film: Watch a movie by a Canadian director (like "The Grand Seduction" or "Bon Cop, Bad Cop") and note 2 things that show Canadian culture. (Reward: 30🍁)

Part Two - Monthly Quests (EVENT-BASED, SAME FOR EVERYONE)
IMPORTANT: Monthly quests are EVENT-BASED experiences that are THE SAME for ALL users. They represent major Canadian cultural events, festivals, or experiences that happen during this month. These should be like attending events, festivals, or major cultural experiences.

Current Month: ${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}

Monthly quests should be:
- Major Canadian events, festivals, or cultural experiences
- Things that require planning, tickets, or advance booking
- Experiences that help with cultural integration
- The SAME for every user (not personalized)
- Event-based (like festivals, concerts, exhibitions, sports events, etc.)

Examples of event-based monthly quests:
- 🎭 Attend a performance at the Stratford Festival (if it's summer/fall) (Reward: 500🍁)
- 🏒 Watch a Toronto Maple Leafs home game at Scotiabank Arena (Reward: 600🍁)
- 🎬 Attend a screening at the Toronto International Film Festival (TIFF) (Reward: 550🍁)
- 🎵 Go to a concert at Massey Hall or Roy Thomson Hall (Reward: 500🍁)
- 🎨 Visit a special exhibition at the Art Gallery of Ontario (AGO) (Reward: 450🍁)
- 🍁 Attend the Canadian National Exhibition (CNE) in Toronto (Reward: 500🍁)
- 🎪 Go to a Cirque du Soleil show (if available) (Reward: 550🍁)
- 🏛️ Visit the Royal Ontario Museum (ROM) and attend a special event or exhibition (Reward: 400🍁)
- 🎤 Attend a comedy show at Second City Toronto (Reward: 400🍁)
- 🎨 Explore the Distillery District during a special event or festival (Reward: 450🍁)

Generate 2 monthly quests that are appropriate for the current month and represent exciting Canadian cultural events.

Part Three - Follow-Up Questions
We also want you to generate EXACTLY 2 follow-up questions that are DIRECTLY RELATED to the user's mental health check-in. These questions should help the user:
1. First question: Explore WHY they are feeling this way - dig deeper into the root causes or triggers
2. Second question: Think about HOW they can tackle or address the problems they mentioned

IMPORTANT: 
- Generate ONLY 2 questions
- DO NOT include "Is there anything else you'd like to talk about today?" - this will be added automatically as the 3rd question
- These questions MUST be personalized based on the specific feelings and emotions the user shared in their check-in
- They should help the user process their emotions, understand their situation better, and think about potential solutions or coping strategies

Example: If the user says "I'm feeling sad because I'm struggling to find a job", the questions might be:
1. "What specific challenges have you faced in your job search that have been most discouraging?"
2. "What steps could you take this week to move forward with your job search, and what support do you need?"

Quest Formatting and Improvements
IMPORTANT RULES:
- ALL quest titles MUST start with an emoji
- ALL 4 daily quests must be UNIQUE and DIFFERENT from each other
- Quest descriptions should be detailed and engaging, approximately 80-120 characters
- Make quest titles playful and fun! Examples: "☕ Timmies Time", "🏒 We The North", "🌊 Under The Sea", "🎵 Jam Session"
- Add extra details to make quests more interesting and actionable
- IMPORTANT: Generate NEW quests based on the user's feeling, don't copy these examples!

Quest Description Style Examples (GENERATE YOUR OWN, DON'T COPY THESE):
- Coffee quest style: "Grab a coffee from Tim Hortons and [add personalized action based on user's mood]."
- Song quest style: "Listen to [specific Canadian song] and [action related to user's feeling]."
- Activity quest style: "[Activity] and [specific detail that helps with their emotional state]."

For Song quests, ALWAYS suggest a specific Canadian song:
-Waves of Blue by Majid Jordan
-Crazy For You by Hedley
-She's All I Wanna Be by Tate McRae
-Sound of Your Heart by Shawn Hook
-I'm Not Alright by Loud Luxury and Bryce Vine
-2 Heads by Coleman Hell

User's feeling: "${feeling}"

CRITICAL INSTRUCTIONS:
- Generate EXACTLY 4 daily quests: 2 Personalized (very specific to their feeling and situation) + 2 General Canadian (universal Canadian experiences)
- Make ALL quests VERY SPECIFIC with exact actions, numbers, locations, or steps
- Generate 2 monthly quests that are EVENT-BASED and appropriate for the current month (${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })})
- Monthly quests should be the SAME for everyone (event-based experiences, not personalized)
- Generate ONLY 2 journal prompts - do NOT include the 3rd "Is there anything else" question
- Return ONLY a JSON object. DO NOT copy the example quests below - they are just to show the format and length!

Example format (GENERATE YOUR OWN based on user's feeling for personalized quests, general Canadian experiences for general Canadian quests):
{
  "quests": [
    {"id": 1, "title": "☕ Quest Title", "description": "Detailed description that helps with their specific feeling (80-120 chars).", "reward": 20},
    {"id": 2, "title": "🎵 Quest Title", "description": "Another personalized description addressing their emotion.", "reward": 30},
    {"id": 3, "title": "🏃 Quest Title", "description": "Activity description tailored to their current state.", "reward": 20},
    {"id": 4, "title": "📝 Quest Title", "description": "Fourth unique quest relevant to their feeling.", "reward": 10}
  ],
  "monthlyQuests": [
    {"id": 1, "title": "🏒 Quest Title", "description": "Exciting general Canadian cultural experience (80-120 chars).", "reward": 500},
    {"id": 2, "title": "🌊 Quest Title", "description": "Another amazing Canadian adventure experience.", "reward": 400}
  ],
  "journalPrompts": [
    "Question 1: Personalized question about WHY you're feeling this way.",
    "Question 2: Follow-up question about HOW to address what you shared."
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

    // Debug: log the raw content
    console.log('AI Response Content:', content);

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

    console.log('Extracted JSON string:', jsonStr);

    let questsData;
    try {
      // Try to parse the JSON
      questsData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Initial JSON parse error:', parseError);
      
      // Try to fix common JSON issues
      try {
        // Attempt to fix incomplete JSON by adding missing closing brackets
        let fixedJson = jsonStr;
        
        // Count opening and closing braces/brackets
        const openBraces = (fixedJson.match(/{/g) || []).length;
        const closeBraces = (fixedJson.match(/}/g) || []).length;
        const openBrackets = (fixedJson.match(/\[/g) || []).length;
        const closeBrackets = (fixedJson.match(/]/g) || []).length;
        
        // Add missing closing brackets
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          fixedJson += ']';
        }
        
        // Add missing closing braces
        for (let i = 0; i < openBraces - closeBraces; i++) {
          fixedJson += '}';
        }
        
        console.log('Attempting to parse fixed JSON:', fixedJson);
        questsData = JSON.parse(fixedJson);
      } catch (fixError) {
        console.error('Failed to fix JSON:', fixError);
        console.error('Original JSON:', jsonStr);
        return res.status(500).json({
          error: 'Failed to parse AI response. The AI generated incomplete JSON. Please try again.',
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

    // Take only the first journal prompt (AI sometimes generates 2 despite instructions)
    const firstPrompt = questsData.journalPrompts[0];
    questsData.journalPrompts = [firstPrompt];

    // Add placeholder for question 2 (will be generated dynamically after question 1 is answered)
    questsData.journalPrompts.push("This question will be personalized based on your previous answer");
    
    // ALWAYS add the 3rd question as the standard one
    questsData.journalPrompts.push("Is there anything else you'd like to talk about today?");

    // Transform journalPrompts from strings to objects with question, answer, and answeredAt
    questsData.journalPrompts = questsData.journalPrompts.map((prompt: any) => {
      // If it's already an object with question property, use it; otherwise treat as string
      if (typeof prompt === 'object' && prompt.question) {
        return {
          question: prompt.question,
          answer: prompt.answer || null,
          answeredAt: prompt.answeredAt || null,
        };
      }
      // If it's a string, convert to object format
      return {
        question: typeof prompt === 'string' ? prompt : String(prompt),
        answer: null,
        answeredAt: null,
      };
    });

    // Add completed: false to all quests automatically
    questsData.quests = questsData.quests.map((q: any) => ({ ...q, completed: false }));
    questsData.monthlyQuests = questsData.monthlyQuests.map((q: any) => ({ ...q, completed: false }));

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

      // For monthly quests: reuse existing ones for this month if they exist, otherwise create new ones
      let monthly = userMonthly || existingMonthly;
      if (!monthly) {
        // Create new monthly quests for this user (will be reused by others)
        monthly = await tx.monthlyQuest.create({
          data: {
            userId,
            month: currentMonthStr,
            monthlyQuests: questsData.monthlyQuests,
          },
        });
      } else if (!userMonthly && existingMonthly) {
        // User doesn't have monthly quests but they exist for this month - create a copy for this user
        monthly = await tx.monthlyQuest.create({
          data: {
            userId,
            month: currentMonthStr,
            monthlyQuests: existingMonthly.monthlyQuests as any, // Reuse the same quests
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
      // Update monthly quest completion
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

      monthlyQuests[questIndex].completed = completed;

      await prisma.monthlyQuest.update({
        where: { id: monthlyQuest.id },
        data: { monthlyQuests: monthlyQuests },
      });
    } else {
      // Update daily quest completion
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

      quests[questIndex].completed = completed;

      await prisma.dailyQuest.update({
        where: { id: dailyQuest.id },
        data: { quests: quests },
      });
    }

    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('Update quest completion error:', error);
    return res.status(500).json({
      error: 'Failed to update quest completion',
    });
  }
};