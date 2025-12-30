'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface User {
  id: number;
  name: string;
  email: string;
  points: number;
  equippedOutfit?: {
    id: number;
    name: string;
    image: string;
  } | null;
}

interface JournalPrompt {
  question: string;
  answer: string | null;
  answeredAt: string | null;
}

export default function JournalPage() {
  const [prompts, setPrompts] = useState<JournalPrompt[]>([]);
  const [allPrompts, setAllPrompts] = useState<JournalPrompt[]>([]); // Store full array for index tracking
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [showResponse, setShowResponse] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    
    const currentUser = JSON.parse(userData);
    setUser(currentUser);
    
    const journalPromptsData = sessionStorage.getItem(`journalPrompts_${currentUser.id}`);
    
    if (!journalPromptsData) {
      router.push('/dashboard');
      return;
    }

    const promptsData = JSON.parse(journalPromptsData);
    
    // Handle both old string format and new object format
    const normalizedPrompts: JournalPrompt[] = promptsData.map((prompt: any) => {
      if (typeof prompt === 'string') {
        // Old format: convert string to object
        return {
          question: prompt,
          answer: null,
          answeredAt: null,
        };
      }
      // New format: ensure it has the right structure
      return {
        question: prompt.question || String(prompt),
        answer: prompt.answer || null,
        answeredAt: prompt.answeredAt || null,
      };
    });
    
    // Store full array for index tracking
    setAllPrompts(normalizedPrompts);
    
    // Filter to only show unanswered prompts
    const unansweredPrompts = normalizedPrompts.filter((p: JournalPrompt) => p.answer === null);
    
    if (unansweredPrompts.length === 0) {
      // All prompts answered, redirect to dashboard
      router.push('/dashboard');
      return;
    }
    
    setPrompts(unansweredPrompts);
    setCurrentPromptIndex(0); // Reset to first unanswered prompt
  }, [router]);

  const handleSubmitAnswer = async () => {
    if (currentAnswer.trim().length < 10) {
      alert('Please write at least 10 characters, eh!');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Find the current prompt in the filtered array
      const currentPrompt = prompts[currentPromptIndex];
      if (!currentPrompt) {
        throw new Error('Current prompt not found');
      }
      
      // Ensure allPrompts is initialized - if empty, use prompts as fallback
      let workingAllPrompts = allPrompts.length > 0 ? allPrompts : prompts;
      
      // Find the index of this prompt in the full array (for backend)
      let fullArrayIndex = workingAllPrompts.findIndex((p: JournalPrompt) => p.question === currentPrompt.question);
      
      // If not found, try to get from sessionStorage
      if (fullArrayIndex === -1 && user) {
        const storedPrompts = sessionStorage.getItem(`journalPrompts_${user.id}`);
        if (storedPrompts) {
          const parsedPrompts: JournalPrompt[] = JSON.parse(storedPrompts).map((p: any) => {
            if (typeof p === 'string') {
              return { question: p, answer: null, answeredAt: null };
            }
            return { question: p.question, answer: p.answer || null, answeredAt: p.answeredAt || null };
          });
          workingAllPrompts = parsedPrompts;
          fullArrayIndex = parsedPrompts.findIndex((p: JournalPrompt) => p.question === currentPrompt.question);
        }
      }
      
      if (fullArrayIndex === -1) {
        // Fallback: use current index if arrays match
        fullArrayIndex = currentPromptIndex;
        console.warn('Could not find prompt in full array, using current index as fallback');
      }
      
      // First, save the answer to the backend
      const saveResponse = await fetch('http://localhost:5000/api/journal/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          promptIndex: fullArrayIndex,
          prompt: currentPrompt.question,
          answer: currentAnswer
        })
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to save journal entry: ${saveResponse.status}`);
      }

      const saveData = await saveResponse.json();

      // Update the full prompts array with the answer
      const updatedAllPrompts = [...workingAllPrompts];
      if (updatedAllPrompts[fullArrayIndex]) {
        updatedAllPrompts[fullArrayIndex] = {
          ...updatedAllPrompts[fullArrayIndex],
          answer: currentAnswer,
          answeredAt: new Date().toISOString(),
        };
      }
      
      // Update session storage with all prompts (including answered ones)
      if (user) {
        sessionStorage.setItem(`journalPrompts_${user.id}`, JSON.stringify(updatedAllPrompts));
      }
      
      // Update local state
      setAllPrompts(updatedAllPrompts);
      
      // Filter out answered prompts for display
      const remainingPrompts = updatedAllPrompts.filter((p: JournalPrompt) => p.answer === null);
      setPrompts(remainingPrompts);
      
      // Reset to first unanswered prompt if there are any left
      if (remainingPrompts.length > 0) {
        setCurrentPromptIndex(0);
      }

      // Then get AI response (handle gracefully if it fails)
      try {
        const openRouterKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
        if (!openRouterKey) {
          console.warn('OpenRouter API key not found, skipping AI response');
          // Generate a more meaningful fallback response based on their answer
          const answerLower = currentAnswer.toLowerCase();
          let fallbackResponse = "";
          
          if (answerLower.includes('sad') || answerLower.includes('down') || answerLower.includes('struggl') || answerLower.includes('hard')) {
            fallbackResponse = "I can really feel the weight of what you're going through, and I want you to know that it's completely okay to feel this way. Life as an immigrant can be incredibly challenging, and your feelings are valid. Remember, every difficult moment you're facing is a step toward growth, even when it doesn't feel like it. You're stronger than you know, and I'm here to support you through this, eh! 🦫";
          } else if (answerLower.includes('happy') || answerLower.includes('good') || answerLower.includes('great') || answerLower.includes('excited')) {
            fallbackResponse = "I'm so happy to hear about the positive things happening in your life! It's wonderful that you're experiencing these moments of joy and fulfillment. Celebrating these wins, big or small, is so important for your mental well-being. Keep holding onto these positive feelings and remember them during tougher times. You're doing great, and I'm cheering you on! 🦫";
          } else if (answerLower.includes('worri') || answerLower.includes('anxious') || answerLower.includes('stress') || answerLower.includes('nervous')) {
            fallbackResponse = "I can sense the worry and anxiety in what you shared, and I want you to know that these feelings are completely understandable, especially when navigating life in a new country. It's normal to feel overwhelmed sometimes. Take things one step at a time, and remember that you don't have to figure everything out today. You're doing your best, and that's enough, eh! 🦫";
          } else {
            fallbackResponse = "Thank you for opening up and sharing your thoughts with me. I can see that you're processing a lot, and I want you to know that your feelings matter. Whatever you're going through, remember that you're not alone in this journey. Taking time to reflect like this shows real strength, and I'm proud of you for doing it. Keep going, one day at a time, eh! 🦫";
          }
          
          setAiResponse(fallbackResponse);
          setShowResponse(true);
        } else {
          const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openRouterKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'http://localhost:3000',
              'X-Title': 'BeaverBuddy'
            },
            body: JSON.stringify({
              model: 'meta-llama/llama-3.2-3b-instruct:free',
              messages: [
                {
                  role: 'system',
                  content: 'You are Billy the Beaver, a warm and compassionate Canadian mental health assistant helping immigrants. You respond with genuine empathy, understanding, and encouragement. Your responses are always personalized, meaningful, and address specific things the user shared. You use natural Canadian expressions like "eh" occasionally, but focus on being supportive and understanding.'
                },
                {
                  role: 'user',
                  content: `The user answered this journal question: "${currentPrompt.question}"

Here's what they wrote: "${currentAnswer}"

Write a meaningful, personalized response (4-6 sentences) that:

1. SPECIFICALLY ACKNOWLEDGE what they shared - mention specific details from their answer to show you really read and understood it
2. VALIDATE their feelings - let them know their emotions are completely valid and understandable
3. SHOW EMPATHY - demonstrate that you understand what they're going through by reflecting on their experience
4. OFFER ENCOURAGEMENT - provide gentle, supportive words that give them hope and strength
5. BE SPECIFIC - reference particular things they mentioned (problems, feelings, situations) rather than being generic
6. INCLUDE a subtle Canadian touch naturally (like "eh", "maple leaf", "hockey", "Tim Hortons", "poutine", etc.) but don't force it

IMPORTANT: 
- DO NOT use generic phrases like "Thank you for sharing" or "I'm here for you" as the main response
- DO address specific things they mentioned in their answer
- DO write a thoughtful, meaningful response that shows you truly understand their situation
- DO be warm, conversational, and supportive like a caring friend
- Your response should be substantial and meaningful, not just a brief acknowledgment

Write Billy's response now:`
                }
              ]
            })
          });

          if (!aiResponse.ok) {
            throw new Error(`AI API error: ${aiResponse.status}`);
          }

          const aiData = await aiResponse.json();
          let aiMessage = aiData.choices?.[0]?.message?.content || "";
          
          // Clean up the response - remove any markdown formatting or extra text
          aiMessage = aiMessage.trim();
          // Remove common prefixes that AI might add
          aiMessage = aiMessage.replace(/^(Billy says?:?|Response:?|Here's what I think:?)\s*/i, '');
          aiMessage = aiMessage.replace(/^["']|["']$/g, ''); // Remove quotes if present
          
          // If the response is too short or generic, try to enhance it
          if (!aiMessage || aiMessage.length < 50) {
            // Fallback to a more meaningful default
            aiMessage = `I can really hear the ${currentAnswer.toLowerCase().includes('sad') || currentAnswer.toLowerCase().includes('down') ? 'struggle' : currentAnswer.toLowerCase().includes('happy') || currentAnswer.toLowerCase().includes('good') ? 'joy' : 'emotions'} in what you shared, and I want you to know that your feelings are completely valid. It takes courage to open up like this, and I'm proud of you for taking this step. Remember, you're not alone in this journey, and every day is a chance to move forward, eh! 🦫`;
          }
          
          setAiResponse(aiMessage);
          setShowResponse(true);
        }
      } catch (aiError) {
        console.error('Error getting AI response:', aiError);
        // Generate a meaningful fallback response based on their answer
        const answerLower = currentAnswer.toLowerCase();
        let fallbackResponse = "";
        
        if (answerLower.includes('sad') || answerLower.includes('down') || answerLower.includes('struggl') || answerLower.includes('hard')) {
          fallbackResponse = "I can really feel the weight of what you're going through, and I want you to know that it's completely okay to feel this way. Life as an immigrant can be incredibly challenging, and your feelings are valid. Remember, every difficult moment you're facing is a step toward growth, even when it doesn't feel like it. You're stronger than you know, and I'm here to support you through this, eh! 🦫";
        } else if (answerLower.includes('happy') || answerLower.includes('good') || answerLower.includes('great') || answerLower.includes('excited')) {
          fallbackResponse = "I'm so happy to hear about the positive things happening in your life! It's wonderful that you're experiencing these moments of joy and fulfillment. Celebrating these wins, big or small, is so important for your mental well-being. Keep holding onto these positive feelings and remember them during tougher times. You're doing great, and I'm cheering you on! 🦫";
        } else if (answerLower.includes('worri') || answerLower.includes('anxious') || answerLower.includes('stress') || answerLower.includes('nervous')) {
          fallbackResponse = "I can sense the worry and anxiety in what you shared, and I want you to know that these feelings are completely understandable, especially when navigating life in a new country. It's normal to feel overwhelmed sometimes. Take things one step at a time, and remember that you don't have to figure everything out today. You're doing your best, and that's enough, eh! 🦫";
        } else {
          fallbackResponse = "Thank you for opening up and sharing your thoughts with me. I can see that you're processing a lot, and I want you to know that your feelings matter. Whatever you're going through, remember that you're not alone in this journey. Taking time to reflect like this shows real strength, and I'm proud of you for doing it. Keep going, one day at a time, eh! 🦫";
        }
        
        setAiResponse(fallbackResponse);
        setShowResponse(true);
      }

      // Update answers array
      const updatedAnswers = [...answers];
      updatedAnswers[currentPromptIndex] = currentAnswer;
      setAnswers(updatedAnswers);

      // Trigger a custom event to notify dashboard of journal update
      window.dispatchEvent(new CustomEvent('journalUpdated'));

    } catch (error: any) {
      console.error('Error submitting journal:', error);
      const errorMessage = error.message || 'Failed to submit. Please try again.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleNextPrompt = () => {
    // Get remaining unanswered prompts from the filtered array
    if (prompts.length > 1) {
      // Move to next unanswered prompt
      const nextIndex = currentPromptIndex < prompts.length - 1 
        ? currentPromptIndex + 1 
        : 0;
      setCurrentPromptIndex(nextIndex);
      setCurrentAnswer('');
      setShowResponse(false);
      setAiResponse('');
    } else {
      // All prompts completed
      if (user) {
        sessionStorage.removeItem(`journalPrompts_${user.id}`);
      }
      alert('🎉 Journal completed! Great job reflecting today.');
      router.push('/dashboard');
    }
  };

  const handleLogout = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const currentUser = JSON.parse(userData);
      localStorage.removeItem(`questGeneratedDate_${currentUser.id}`);
      sessionStorage.removeItem(`generatedQuests_${currentUser.id}`);
      sessionStorage.removeItem(`monthlyQuests_${currentUser.id}`);
      sessionStorage.removeItem(`journalPrompts_${currentUser.id}`);
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (prompts.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ 
        background: 'linear-gradient(135deg, #ffa69e 0%, #ffddd2 100%)'
      }}>
        <p className="text-gray-800 font-semibold">Loading journal...</p>
      </div>
    );
  }

  return (
    <main className="h-screen flex flex-col relative overflow-hidden bg-white">
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>

      {/* Floating sparkles */}
      <div className="absolute top-20 left-20 text-gray-400 text-3xl z-5" style={{ animation: 'sparkle 3s ease-in-out infinite' }}>✦</div>
      <div className="absolute top-32 right-32 text-gray-400 text-2xl z-5" style={{ animation: 'sparkle 3s ease-in-out infinite', animationDelay: '1s' }}>✦</div>
      <div className="absolute bottom-40 left-40 text-gray-400 text-2xl z-5" style={{ animation: 'sparkle 3s ease-in-out infinite', animationDelay: '2s' }}>✦</div>

      {/* Header - Glass */}
      <div className="relative h-20 flex items-center justify-between px-6 z-10" style={{ 
        background: 'rgba(255, 255, 255, 0.15)', 
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <button
          onClick={handleLogout}
          className="text-sm font-bold text-gray-800 hover:text-gray-900 transition-all px-4 py-2 rounded-xl bg-white/60 backdrop-blur-md shadow-lg border border-white/40"
        >
          🪵 Logout
        </button>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-white/40">
            <span className="text-2xl">🍁</span>
            <span className="text-lg font-black text-gray-800">500</span>
          </div>
          <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-white/40">
            <span className="text-2xl">🔥</span>
            <span className="text-lg font-black text-gray-800">12</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-28 relative z-10">
        {/* Question counter */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-white/50">
            <span className="text-2xl">📖</span>
            <span className="text-lg font-black text-gray-800">
              {prompts.filter((p: JournalPrompt) => p.answer === null).length} remaining
            </span>
          </div>
        </div>
        
        <div className="w-full max-w-lg">
          {/* Glass card */}
          <div className="relative" style={{
            background: 'rgba(255, 255, 255, 1)',
            backdropFilter: 'blur(20px)',
            borderRadius: '40px',
            padding: '32px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            {/* Question Speech bubble - only show when not showing response */}
            {!showResponse && (
              <div className="mb-6 text-left relative" style={{ 
                background: 'rgba(255, 255, 255, 0.4)',
                backdropFilter: 'blur(10px)',
                borderRadius: '25px',
                padding: '20px 24px',
                boxShadow: '0 8px 10px rgba(0, 0, 0, 0.2)'
              }}>
                {/* Speech bubble tail */}
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2" style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' }}>
                  <svg width="30" height="20" viewBox="0 0 30 20" fill="none">
                    <path d="M 5 0 Q 15 10 25 0 L 18 15 L 12 15 Z" fill="white"/>
                  </svg>
                </div>
                <h1 className="text-2xl font-black text-gray-800 leading-tight">
                  {prompts[currentPromptIndex]?.question || 'Loading...'}
                </h1>
              </div>
            )}

            {/* Billy Beaver */}
            <div className="flex justify-center mb-6">
              <div className="relative w-52 h-52">
                <Image
                  src={user?.equippedOutfit?.image || "/images/beaver/default/default.png"}
                  alt="Billy the Beaver"
                  width={240}
                  height={240}
                  className="object-contain drop-shadow-2xl"
                  priority
                  style={{ animation: 'float 3s ease-in-out infinite' }}
                />
              </div>
            </div>

            {/* Billy's Response Speech bubble - shown after submission */}
            {showResponse && (
              <div className="mb-6 text-left relative" style={{ 
                background: 'rgba(34, 197, 94, 0.25)',
                backdropFilter: 'blur(10px)',
                borderRadius: '25px',
                padding: '20px 24px',
                boxShadow: '0 8px 10px rgba(0, 0, 0, 0.2)',
                border: '2px solid rgba(34, 197, 94, 0.3)'
              }}>
                {/* Speech bubble tail pointing up to Billy */}
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 rotate-180" style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' }}>
                  <svg width="30" height="20" viewBox="0 0 30 20" fill="none">
                    <path d="M 5 0 Q 15 10 25 0 L 18 15 L 12 15 Z" fill="rgba(34, 197, 94, 0.9)"/>
                  </svg>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🦫</span>
                  <p className="text-sm font-bold text-green-800">Billy says:</p>
                </div>
                <p className="text-base text-gray-800 leading-relaxed font-medium">
                  {aiResponse}
                </p>
              </div>
            )}

            {/* Input field */}
            {!showResponse && (
              <div className="mb-4">
                <textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Share your thoughts here..."
                  className="w-full p-4 resize-none text-gray-800 placeholder-gray-500 text-sm leading-relaxed"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '20px',
                    border: '2px solid rgba(236, 72, 153, 0.3)',
                    outline: 'none',
                    boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.05)'
                  }}
                  rows={3}
                  onFocus={(e) => e.target.style.border = '2px solid rgba(236, 72, 153, 0.6)'}
                  onBlur={(e) => e.target.style.border = '2px solid rgba(236, 72, 153, 0.3)'}
                />
                <p className="text-xs text-gray-700 mt-2 ml-1 font-semibold">
                  {currentAnswer.length}/10 characters minimum
                </p>
              </div>
            )}

            {/* Submit or Next button */}
            {!showResponse ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={loading || currentAnswer.trim().length < 10}
                className="w-full py-4 font-black text-lg tracking-wider transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                style={{ 
                  borderRadius: '20px',
                  background: '#ce5c5c',
                  color: 'white',
                  boxShadow: '0 10px 30px rgba(236, 72, 153, 0.4)'
                }}
              >
                {loading ? 'THINKING...' : 'SUBMIT'}
              </button>
            ) : (
              <button
                onClick={handleNextPrompt}
                className="w-full py-4 font-black text-lg tracking-wider transition-all transform hover:scale-105"
                style={{ 
                  borderRadius: '20px',
                  background: '#22c55e',
                  color: 'white',
                  boxShadow: '0 10px 30px rgba(34, 197, 94, 0.4)'
                }}
              >
                {prompts.length > 1 ? '→ NEXT QUESTION' : '✓ FINISH JOURNAL'}
              </button>
            )}

            <p className="text-center text-xs mt-3 text-gray-700 font-semibold">
              Take your time to reflect thoughtfully
            </p>
          </div>
        </div>
      </div>

      {/* Bottom navigation - solid */}
      <div className="absolute bottom-0 left-0 right-0 h-28 flex items-center justify-center px-4 z-10 bg-white border-t-2 border-gray-200 shadow-lg">
        <div className="flex justify-center items-center gap-8 w-full max-w-2xl pb-4">
          <button 
            onClick={() => router.push('/billy')}
            className="flex flex-col items-center transition-transform hover:scale-110"
          >
            <div className="w-24 h-24 flex flex-col items-center justify-center rounded-3xl px-3 py-2" style={{
              background: 'rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)'
            }}>
              <Image
                src="/images/icons/billy.png"
                alt="Billy"
                width={64}
                height={64}
                className="w-14 h-14 object-contain mb-1"
              />
              <span className="text-xs font-black text-gray-800">Billy</span>
            </div>
          </button>
          
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex flex-col items-center transition-transform hover:scale-110"
          >
            <div className="w-24 h-24 flex flex-col items-center justify-center rounded-3xl px-3 py-2" style={{
              background: 'rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)'
            }}>
              <Image
                src="/images/icons/house.png"
                alt="Home"
                width={64}
                height={64}
                className="w-14 h-14 object-contain mb-1"
              />
              <span className="text-xs font-black text-gray-800">Home</span>
            </div>
          </button>
          
          <button className="flex flex-col items-center">
            <div className="w-24 h-24 flex flex-col items-center justify-center rounded-3xl px-3 py-2" style={{
              background: 'rgba(255, 22, 22, 0.22)',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(236, 72, 72, 0.4)',
              boxShadow: '0 8px 24px rgba(236, 72, 153, 0.3)'
            }}>
              <Image
                src="/images/icons/journal.png"
                alt="Journal"
                width={64}
                height={64}
                className="w-14 h-14 object-contain mb-1"
              />
              <span className="text-xs font-black text-pink-700">Journal</span>
            </div>
          </button>
        </div>
      </div>
    </main>
  );
}