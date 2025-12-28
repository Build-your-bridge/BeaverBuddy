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
        model: 'meta-llama/llama-3.2-3b-instruct:free', // Changed to Llama
        messages: [{
          role: 'user',
          content: `You are a Canadian mental health assistant. Generate 4 daily quests based on this feeling: "${feeling}"

Respond with ONLY valid JSON (no other text):
{
  "quests": [
    {
      "title": "Quest Title",
      "description": "Short description",
      "points": 15,
      "difficulty": "easy",
      "category": "mental_health"
    }
  ]
}

Make quests helpful and Canadian-themed.`
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