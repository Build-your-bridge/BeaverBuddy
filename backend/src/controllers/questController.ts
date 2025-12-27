import { Request, Response } from 'express';

export const generateQuests = async (req: Request, res: Response) => {
  try {
    const { feeling } = req.body;
    
    // 1. Validation: Ensure user has shared enough text
    if (!feeling || feeling.trim().length < 20) {
      return res.status(422).json({ 
        error: 'Please share at least 20 characters about how you\'re feeling' 
      });
    }

    // 2. OpenRouter API Call using a FREE model
    // Note: We use gemini-2.0-flash-exp:free because your balance is $0.00
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000', 
        'X-Title': 'BeaverBuddy'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free', 
        messages: [{
          role: 'user',
          content: `You are a Canadian mental health and integration assistant. 
          Based on the user's feeling, generate 4 personalized daily quests. 
          Each quest should be actionable and culturally relevant to Canada.

          User's feeling: "${feeling}"

          Respond with ONLY a JSON object in this EXACT format:
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
          }`
        }],
        // Forces valid JSON output (supported by Gemini Flash)
        response_format: { type: 'json_object' } 
      })
    });

    const data: any = await response.json();
    
    // 3. Handle API Errors (like 401, 402, 429)
    if (!response.ok) {
      console.error('OpenRouter Error:', data);
      const errorMessage = data.error?.message || 'AI service error';
      return res.status(response.status).json({ error: errorMessage });
    }

    // 4. Extract and Parse the JSON content
    const content = data.choices[0].message.content;
    let questsData;
    
    try {
      // Regex to find JSON even if the AI adds conversational text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      questsData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid JSON format from AI');
    }

    // 5. Success! Send quests back to frontend
    return res.status(200).json({
      success: true,
      quests: questsData.quests
    });

  } catch (error: any) {
    // Log the actual error to your terminal for debugging
    console.error('GENERATE QUESTS ERROR:', error.message);
    
    return res.status(500).json({ 
      error: 'The Beaver is resting! Please try again in a moment.' 
    });
  }
};