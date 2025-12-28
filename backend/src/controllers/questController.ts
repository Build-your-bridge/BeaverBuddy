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
        max_tokens: 1200,
        temperature: 0.7,
        messages: [{
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

User's feeling: "${feeling}"

Generate exactly 4 daily quests (2 Emotional, 2 Cultural), 2 monthly quests (both Cultural), and 3 follow-up questions. Respond with ONLY valid JSON (no extra text, no explanations):
{"quests":[{"title":"Title","description":"Description","points":20,"difficulty":"easy","category":"mental_health"},{"title":"Title","description":"Description","points":30,"difficulty":"easy","category":"mental_health"},{"title":"Title","description":"Description","points":20,"difficulty":"easy","category":"cultural"},{"title":"Title","description":"Description","points":10,"difficulty":"easy","category":"cultural"}],"monthlyQuests":[{"title":"Title","description":"Description","points":500,"difficulty":"hard","category":"cultural"},{"title":"Title","description":"Description","points":300,"difficulty":"hard","category":"cultural"}],"journalPrompts":["Question 1?","Question 2?","Is there anything else you'd like to talk about today?"]}

Use categories: "mental_health" for Emotional Quests, "cultural" for Cultural Quests. Daily quest points should be 10-50. Monthly quest points should be 100-500 based on difficulty.`
        }]
      })
    });

    const data: any = await response.json();
    
    if (!response.ok) {
      console.error('OpenRouter Error:', data);
      return res.status(500).json({ error: data.error?.message || 'AI service temporarily unavailable' });
    }

    const content = data.choices[0].message.content;
    console.log('AI Response:', content);
    
    let questsData;
    
    try {
      // Find the JSON object
      const startIndex = content.indexOf('{');
      const endIndex = content.lastIndexOf('}');
      
      if (startIndex === -1 || endIndex === -1) {
        throw new Error('No JSON found in response');
      }
      
      let jsonStr = content.substring(startIndex, endIndex + 1);
      
      // Clean up common AI formatting issues
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      
      questsData = JSON.parse(jsonStr);
      
      // Validate structure
      if (!questsData.quests || !Array.isArray(questsData.quests) || questsData.quests.length !== 4) {
        throw new Error('Invalid quests structure - need exactly 4 daily quests');
      }
      
      if (!questsData.monthlyQuests || !Array.isArray(questsData.monthlyQuests) || questsData.monthlyQuests.length !== 2) {
        throw new Error('Invalid monthlyQuests structure - need exactly 2 monthly quests');
      }
      
      if (!questsData.journalPrompts || !Array.isArray(questsData.journalPrompts) || questsData.journalPrompts.length !== 3) {
        throw new Error('Invalid journalPrompts structure - need exactly 3 prompts');
      }
      
    } catch (parseError: any) {
      console.error('Parse error:', parseError.message);
      console.error('Raw content:', content);
      return res.status(500).json({ 
        error: 'Failed to generate valid quests. Please try again.' 
      });
    }

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return res.status(200).json({
      success: true,
      quests: questsData.quests,
      monthlyQuests: questsData.monthlyQuests,
      journalPrompts: questsData.journalPrompts,
      generatedAt: new Date().toISOString(),
      monthGenerated: `${currentYear}-${currentMonth + 1}`
    });

  } catch (error: any) {
    console.error('Generate quests error:', error.message);
    return res.status(500).json({ 
      error: 'Failed to generate quests. Please try again.' 
    });
  }
};