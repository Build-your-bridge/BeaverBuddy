// src/controllers/questController.ts
import { Request, Response } from 'express';

export const generateQuests = async (req: Request, res: Response) => {
  try {
    const { feeling } = req.body;
    const userId = (req as any).userId;

    // Validation
    if (!feeling || feeling.trim().length < 20) {
      return res.status(422).json({ 
        error: 'Please share at least 20 characters about how you\'re feeling' 
      });
    }

    console.log(`Generating quests for user ${userId} based on: "${feeling}"`);

    // Call your AI API to generate quests
    const quests = await generateQuestsWithAI(feeling);

    res.status(200).json({
      success: true,
      quests
    });

  } catch (error: any) {
    console.error('Generate quests error:', error);
    res.status(500).json({ 
      error: 'Failed to generate quests. Please try again.' 
    });
  }
};

async function generateQuestsWithAI(feeling: string): Promise<any[]> {
  // TODO: Replace with your preferred AI API
  // Example using fetch for any REST API:
  
  const response = await fetch('YOUR_AI_API_ENDPOINT_HERE', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.AI_API_KEY}`
    },
    body: JSON.stringify({
      prompt: `You are a helpful Canadian wellness assistant. Based on how someone is feeling, generate exactly 4 personalized daily quests to help them improve their day.

User's feeling: "${feeling}"

Generate 4 quests as a JSON array. Each quest should have:
- title: A short, encouraging title (include relevant emoji)
- description: A clear, actionable description (one sentence)
- points: Between 15-40 based on difficulty
- difficulty: "easy", "medium", or "hard"
- category: "wellness", "social", "cultural", or "mental_health"

Make the quests:
1. Relevant to their emotional state
2. Achievable in one day
3. Canadian-themed where appropriate (Tim Hortons, hockey, nature, etc.)
4. Supportive and encouraging

Return ONLY a valid JSON array, nothing else.`
    })
  });

  const data = await response.json();
  
  // Parse the AI response - adjust based on your API's response format
  const aiResponse = data.response || data.text || data.content || '';
  
  // Remove markdown code blocks if present
  const cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
  const quests = JSON.parse(cleanedResponse);

  return quests;
}