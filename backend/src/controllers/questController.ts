// src/controllers/questController.ts
import { Request, Response } from 'express';

export const generateQuests = async (req: Request, res: Response) => {
  try {
    const { feeling } = req.body;
    
    if (!feeling || feeling.trim().length < 20) {
      return res.status(422).json({ 
        error: 'Please share at least 20 characters about how you\'re feeling' 
      });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000', 
        'X-Title': 'BeaverBuddy'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        messages: [{
          role: 'user',
          content: `You are an assistant who helps Canadian immigrants with 2 different problems: Mental health struggles and cultural isolation. The user will tell you how they're feeling today and why, and your job is to generate 4 personalized tasks (named Daily Quests) catered to their needs. 2 of them should be Emotional Quests that directly help with their current situation, and the other 2 should be Cultural Quests that help them get more familiar and comfortable with Canada's local culture.

Here are some examples of Emotional Quests:

"I'm feeling bored and lonely, I haven't seen my friends in while because everyone is so busy with life."
-Suggested Quest: Listen to this song or check out this game! (Reward: 50 Maple Leaves)

"I'm really mad, I studied so hard for my test yesterday but I didn't get the grade I wanted."
-Suggested Quest: Breathing Exercises to calm you down. (Reward: 20 Maple Leaves)

"I'm feeling great! I just had a fun Christmas party with all of my friends and I won some cool prizes!"
-Suggested Quest: Write down something you're grateful for. (Reward: 25 Maple Leaves)

"I'm feeling disappointed because I'm really struggling to find a job."
-Suggested Quest: Try tweaking your resume and apply for 3 different jobs today! (Reward: 50 Maple Leaves)

Here are some examples of Cultural Quests:
-Buy a coffee from Tim Hortons (Reward: 20 Maple Leaves)
-Go to a Raptors Game (Reward: 500 Maple Leaves)
-Song of the Week: Listen to a song from a small, Canadian artist (Reward: 75 Maple Leaves)

User's feeling: "${feeling}"

Generate exactly 4 quests (2 Emotional, 2 Cultural). Respond with ONLY valid JSON:
{
  "quests": [
    {
      "title": "Quest Title with emoji",
      "description": "Clear, actionable description",
      "points": 20,
      "difficulty": "easy",
      "category": "mental_health"
    }
  ]
}

Use categories: "mental_health" for Emotional Quests, "cultural" for Cultural Quests. Points should be 15-50 based on difficulty.`
        }]
      })
    });

    const data: any = await response.json();
    
    if (!response.ok) {
      console.error('OpenRouter Error:', data);
      return res.status(500).json({ error: 'AI service temporarily unavailable' });
    }

    const content = data.choices[0].message.content;
    let questsData;
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      questsData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Parse error:', content);
      throw new Error('Invalid JSON from AI');
    }

    return res.status(200).json({
      success: true,
      quests: questsData.quests
    });

  } catch (error: any) {
    console.error('Generate quests error:', error.message);
    return res.status(500).json({ 
      error: 'Failed to generate quests. Please try again.' 
    });
  }
};