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

    // Simulate API delay for realism
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate contextual quests
    const quests = generateContextualQuests(feeling);

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

function generateContextualQuests(feeling: string): any[] {
  const lower = feeling.toLowerCase();
  
  // Detect emotional keywords
  const isStressed = /stress|anxious|overwhelm|worry|pressure/.test(lower);
  const isLonely = /lonely|alone|isolated|miss/.test(lower);
  const isJobRelated = /job|work|employ|career|unemploy/.test(lower);
  const isSad = /sad|down|depress|bad|unhappy/.test(lower);
  const isHappy = /happy|great|good|excited|amazing|wonderful/.test(lower);
  const isSeasonal = /season|winter|cold|snow|weather/.test(lower);

  const questBank = {
    stress: [
      {
        title: "Take a Mindful Nature Walk",
        description: "Spend 20 minutes walking in a Canadian park and practice deep breathing",
        points: 25,
        difficulty: "easy",
        category: "wellness"
      },
      {
        title: "Try the 5-4-3-2-1 Grounding Technique",
        description: "Notice 5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste",
        points: 15,
        difficulty: "easy",
        category: "mental_health"
      },
      {
        title: "Journal Your Thoughts",
        description: "Write for 15 minutes about what's stressing you and potential solutions",
        points: 20,
        difficulty: "easy",
        category: "mental_health"
      },
      {
        title: "Practice Progressive Relaxation",
        description: "Follow a 10-minute guided muscle relaxation video",
        points: 20,
        difficulty: "easy",
        category: "wellness"
      }
    ],
    lonely: [
      {
        title: "Call a Friend or Family Member",
        description: "Have a 15-minute phone call with someone you haven't talked to recently",
        points: 25,
        difficulty: "easy",
        category: "social"
      },
      {
        title: "Visit a Community Center",
        description: "Research and plan to attend one local community event this week",
        points: 30,
        difficulty: "medium",
        category: "cultural"
      },
      {
        title: "Join a Meetup Group",
        description: "Find and join one interest-based group on Meetup.com",
        points: 25,
        difficulty: "medium",
        category: "social"
      },
      {
        title: "Chat at Tim Hortons",
        description: "Have a friendly conversation with someone at your local Tim's",
        points: 20,
        difficulty: "easy",
        category: "social"
      }
    ],
    job: [
      {
        title: "Update Your Resume",
        description: "Spend 30 minutes updating your resume with recent skills",
        points: 30,
        difficulty: "medium",
        category: "wellness"
      },
      {
        title: "Explore Job Bank Canada",
        description: "Browse job postings on Job Bank Canada for 20 minutes",
        points: 25,
        difficulty: "easy",
        category: "cultural"
      },
      {
        title: "Connect on LinkedIn",
        description: "Reach out to 3 people in your field on LinkedIn",
        points: 25,
        difficulty: "easy",
        category: "social"
      },
      {
        title: "Learn a New Skill",
        description: "Complete one free online course module on Coursera or LinkedIn Learning",
        points: 40,
        difficulty: "medium",
        category: "wellness"
      }
    ],
    sad: [
      {
        title: "Practice Gratitude",
        description: "Write down 5 things you're grateful for today",
        points: 15,
        difficulty: "easy",
        category: "mental_health"
      },
      {
        title: "Do Something You Enjoy",
        description: "Spend 30 minutes on a hobby or activity that brings you joy",
        points: 25,
        difficulty: "easy",
        category: "wellness"
      },
      {
        title: "Get Moving",
        description: "Do 15 minutes of physical activity - walk, dance, or exercise",
        points: 25,
        difficulty: "easy",
        category: "wellness"
      },
      {
        title: "Connect with Nature",
        description: "Spend time outside in a Canadian park or green space",
        points: 20,
        difficulty: "easy",
        category: "wellness"
      }
    ],
    happy: [
      {
        title: "Share Your Joy",
        description: "Tell someone about something good that happened to you today",
        points: 20,
        difficulty: "easy",
        category: "social"
      },
      {
        title: "Practice Random Kindness",
        description: "Do one unexpected kind thing for someone today",
        points: 25,
        difficulty: "easy",
        category: "social"
      },
      {
        title: "Explore Canadian Culture",
        description: "Visit a local museum, art gallery, or cultural site",
        points: 30,
        difficulty: "medium",
        category: "cultural"
      },
      {
        title: "Try a New Canadian Activity",
        description: "Try ice skating, visit a sugar shack, or attend a hockey game",
        points: 35,
        difficulty: "medium",
        category: "cultural"
      }
    ],
    seasonal: [
      {
        title: "Embrace Winter Activities",
        description: "Try skating, skiing, or simply enjoy a winter walk",
        points: 30,
        difficulty: "medium",
        category: "cultural"
      },
      {
        title: "Create a Cozy Space",
        description: "Make your home warmer with blankets, candles, or hot drinks",
        points: 15,
        difficulty: "easy",
        category: "wellness"
      },
      {
        title: "Get Sunlight Exposure",
        description: "Spend 15 minutes outside during daylight hours",
        points: 20,
        difficulty: "easy",
        category: "wellness"
      },
      {
        title: "Plan a Winter Activity",
        description: "Research and schedule one fun winter activity in Canada",
        points: 25,
        difficulty: "easy",
        category: "cultural"
      }
    ],
    default: [
      {
        title: "Take a Walk in Nature",
        description: "Explore a Canadian trail or park for 20 minutes",
        points: 25,
        difficulty: "easy",
        category: "wellness"
      },
      {
        title: "Connect with Your Community",
        description: "Visit a local Canadian landmark or community space",
        points: 25,
        difficulty: "easy",
        category: "cultural"
      },
      {
        title: "Practice Self-Care",
        description: "Do one thing today that makes you feel good",
        points: 20,
        difficulty: "easy",
        category: "mental_health"
      },
      {
        title: "Reach Out to Someone",
        description: "Send a message or call someone you care about",
        points: 20,
        difficulty: "easy",
        category: "social"
      }
    ]
  };

  // Select appropriate quest set
  if (isStressed) return questBank.stress;
  if (isLonely) return questBank.lonely;
  if (isJobRelated) return questBank.job;
  if (isSad) return questBank.sad;
  if (isHappy) return questBank.happy;
  if (isSeasonal) return questBank.seasonal;
  
  return questBank.default;
}