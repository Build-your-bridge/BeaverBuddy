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
In addition to generating 4 Daily Quests, we also want you to generate 2 Monthly Quests. Monthly Quests should be GENERAL Canadian cultural experiences that ANY Canadian immigrant would enjoy, regardless of their current mood or situation. These should be major events that are not done on a daily basis, and involve more money, people, and planning time in advance.

IMPORTANT: Monthly quests should be COMPLETELY INDEPENDENT of the user's current feeling. They should be exciting Canadian experiences that help with cultural integration and exploration.

Here are some examples of general Canadian monthly quests:
-Visit the CN Tower and enjoy the panoramic views of Toronto (Reward: 500🍁)
-Attend a Toronto Maple Leafs NHL hockey game at Scotiabank Arena (Reward: 600🍁)
-Explore the Royal Ontario Museum (ROM) and discover Canadian art and history (Reward: 400🍁)
-Visit Niagara Falls and take a boat tour to feel the mist (Reward: 550🍁)
-Attend the Toronto International Film Festival (TIFF) screening (Reward: 450🍁)
-Go to a concert at the Rogers Centre or another major venue (Reward: 500🍁)
-Visit the Art Gallery of Ontario (AGO) to see Canadian artists (Reward: 400🍁)
-Explore the Distillery District and enjoy local Canadian crafts and food (Reward: 350🍁)
-Attend a Canadian music festival like Veld Music Festival (Reward: 500🍁)
-Take a day trip to explore Ontario's beautiful national parks (Reward: 450🍁)

Part Three - Follow-Up Questions
We also want you to generate 3 follow-up questions based on the user's feelings today. These should be questions that allow the user to go deeper into detail about how they're feeling today, instead of just a brief 1-sentence summary. This is meant to act like a diary to the user, giving them a chance to thoroughly reflect through their emotions and relieve stress so that it's not all pent-up in their mind. The 3rd, final question should always be the same: "Is there anything else you'd like to talk about today?". This gives the user the freedom to write down whatever they want.

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
- Generate NEW personalized DAILY quests based on the user's feeling above
- Generate COMPLETELY GENERAL monthly quests that are exciting Canadian experiences for ANY immigrant
- Monthly quests should have NOTHING to do with the user's current mood or feeling
- Return ONLY a JSON object. DO NOT copy the example quests below - they are just to show the format and length!

Example format (GENERATE YOUR OWN based on user's feeling for daily quests, general Canadian experiences for monthly quests):
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
  "journalPrompts": ["Personalized question about their feeling", "Deeper follow-up question", "Is there anything else you'd like to talk about today?"]
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

    if (!questsData.journalPrompts || !Array.isArray(questsData.journalPrompts) || questsData.journalPrompts.length !== 3) {
      console.error('Invalid journalPrompts structure:', questsData);
      return res.status(500).json({
        error: 'AI generated invalid journal prompts. Please try again.',
      });
    }

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