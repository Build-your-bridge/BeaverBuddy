'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// ============================================================================
// INTERFACES
// ============================================================================

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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function JournalPage() {
  // --------------------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------------------
  const [prompts, setPrompts] = useState<JournalPrompt[]>([]);
  const [allPrompts, setAllPrompts] = useState<JournalPrompt[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [showResponse, setShowResponse] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const router = useRouter();

  // --------------------------------------------------------------------------
  // INITIALIZE - Load user and prompts from storage
  // --------------------------------------------------------------------------
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
    
    // Normalize prompts (handle both string and object formats)
    const normalizedPrompts: JournalPrompt[] = promptsData.map((prompt: any) => {
      if (typeof prompt === 'string') {
        return { question: prompt, answer: null, answeredAt: null };
      }
      return {
        question: prompt.question || String(prompt),
        answer: prompt.answer || null,
        answeredAt: prompt.answeredAt || null,
      };
    });
    
    setAllPrompts(normalizedPrompts);
    
    // Filter to only show unanswered prompts
    const unansweredPrompts = normalizedPrompts.filter((p: JournalPrompt) => p.answer === null);
    if (unansweredPrompts.length === 0) {
      router.push('/dashboard');
      return;
    }
    
    setPrompts(unansweredPrompts);
  }, [router]);

  // --------------------------------------------------------------------------
  // SUBMIT ANSWER - Save to backend and get AI response
  // --------------------------------------------------------------------------
  const handleSubmitAnswer = async () => {
    if (currentAnswer.trim().length < 10) {
      alert('Please write at least 10 characters, eh!');
      return;
    }

    setLoading(true);
    setIsTyping(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const currentPrompt = prompts[currentPromptIndex];
      if (!currentPrompt) throw new Error('Current prompt not found');
      
      // Find the index in the full array for backend submission
      let workingAllPrompts = allPrompts.length > 0 ? allPrompts : prompts;
      let fullArrayIndex = workingAllPrompts.findIndex((p: JournalPrompt) => p.question === currentPrompt.question);
      
      if (fullArrayIndex === -1) {
        fullArrayIndex = currentPromptIndex;
        console.warn('Could not find prompt in full array, using current index as fallback');
      }
      
      // Save answer to backend
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

      // Update local state
      const updatedAllPrompts = [...workingAllPrompts];
      if (updatedAllPrompts[fullArrayIndex]) {
        updatedAllPrompts[fullArrayIndex] = {
          ...updatedAllPrompts[fullArrayIndex],
          answer: currentAnswer,
          answeredAt: new Date().toISOString(),
        };
      }
      
      if (user) {
        sessionStorage.setItem(`journalPrompts_${user.id}`, JSON.stringify(updatedAllPrompts));
      }
      
      setAllPrompts(updatedAllPrompts);
      const remainingPrompts = updatedAllPrompts.filter((p: JournalPrompt) => p.answer === null);
      setPrompts(remainingPrompts);
      if (remainingPrompts.length > 0) setCurrentPromptIndex(0);

      // Get AI response (with fallback if API key is missing)
      try {
        const openRouterKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
        
        if (!openRouterKey) {
          // Use fallback response
          setTimeout(() => {
            setAiResponse(getFallbackResponse(currentAnswer));
            setShowResponse(true);
            setIsTyping(false);
          }, 1500);
        } else {
          // Call AI API
          const aiResponseFetch = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
                  content: `The user answered this journal question: "${currentPrompt.question}"\n\nHere's what they wrote: "${currentAnswer}"\n\nWrite a meaningful, personalized response (4-6 sentences) that specifically acknowledges what they shared, validates their feelings, shows empathy, and offers encouragement.`
                }
              ]
            })
          });

          if (!aiResponseFetch.ok) throw new Error(`AI API error: ${aiResponseFetch.status}`);

          const aiData = await aiResponseFetch.json();
          let aiMessage = aiData.choices?.[0]?.message?.content || "";
          
          // Clean up AI response
          aiMessage = aiMessage.trim()
            .replace(/^(Billy says?:?|Response:?|Here's what I think:?)\s*/i, '')
            .replace(/^["']|["']$/g, '');
          
          if (!aiMessage || aiMessage.length < 50) {
            aiMessage = `I can really hear what you shared, and I want you to know that your feelings are completely valid. It takes courage to open up like this, and I'm proud of you for taking this step. Remember, you're not alone in this journey, and every day is a chance to move forward, eh! 🦫`;
          }
          
          setTimeout(() => {
            setAiResponse(aiMessage);
            setShowResponse(true);
            setIsTyping(false);
          }, 1500);
        }
      } catch (aiError) {
        console.error('Error getting AI response:', aiError);
        setTimeout(() => {
          setAiResponse(getFallbackResponse(currentAnswer));
          setShowResponse(true);
          setIsTyping(false);
        }, 1500);
      }

      window.dispatchEvent(new CustomEvent('journalUpdated'));

    } catch (error: any) {
      console.error('Error submitting journal:', error);
      alert(error.message || 'Failed to submit. Please try again.');
      setIsTyping(false);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // FALLBACK AI RESPONSE - Used when API key is missing or fails
  // --------------------------------------------------------------------------
  const getFallbackResponse = (answer: string): string => {
    const answerLower = answer.toLowerCase();
    
    if (answerLower.includes('sad') || answerLower.includes('down') || answerLower.includes('struggl') || answerLower.includes('hard')) {
      return "I can really feel the weight of what you're going through, and I want you to know that it's completely okay to feel this way. Life as an immigrant can be incredibly challenging, and your feelings are valid. Remember, every difficult moment you're facing is a step toward growth, even when it doesn't feel like it. You're stronger than you know, and I'm here to support you through this, eh! 🦫";
    } else if (answerLower.includes('happy') || answerLower.includes('good') || answerLower.includes('great') || answerLower.includes('excited')) {
      return "I'm so happy to hear about the positive things happening in your life! It's wonderful that you're experiencing these moments of joy and fulfillment. Celebrating these wins, big or small, is so important for your mental well-being. Keep holding onto these positive feelings and remember them during tougher times. You're doing great, and I'm cheering you on! 🦫";
    } else if (answerLower.includes('worri') || answerLower.includes('anxious') || answerLower.includes('stress') || answerLower.includes('nervous')) {
      return "I can sense the worry and anxiety in what you shared, and I want you to know that these feelings are completely understandable, especially when navigating life in a new country. It's normal to feel overwhelmed sometimes. Take things one step at a time, and remember that you don't have to figure everything out today. You're doing your best, and that's enough, eh! 🦫";
    } else {
      return "Thank you for opening up and sharing your thoughts with me. I can see that you're processing a lot, and I want you to know that your feelings matter. Whatever you're going through, remember that you're not alone in this journey. Taking time to reflect like this shows real strength, and I'm proud of you for doing it. Keep going, one day at a time, eh! 🦫";
    }
  };

  // --------------------------------------------------------------------------
  // NEXT PROMPT - Move to next question or finish
  // --------------------------------------------------------------------------
  const handleNextPrompt = () => {
    if (prompts.length > 1) {
      setCurrentPromptIndex(prev => prev + 1);
      setCurrentAnswer('');
      setShowResponse(false);
      setAiResponse('');
    } else {
      if (user) {
        sessionStorage.removeItem(`journalPrompts_${user.id}`);
      }
      alert('🎉 Journal completed! Great job reflecting today.');
      router.push('/dashboard');
    }
  };

  // --------------------------------------------------------------------------
  // LOGOUT - Clear all session data
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // LOADING STATE
  // --------------------------------------------------------------------------
  if (prompts.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom, #E8D4C0 0%, #F5E6D3 100%)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-800 border-t-transparent"></div>
          <p className="text-gray-700 font-semibold">Loading your journal...</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // CALCULATE PROGRESS
  // --------------------------------------------------------------------------
  const totalQuestions = allPrompts.length;
  const answeredCount = totalQuestions - prompts.length;
  const progressPercentage = (answeredCount / totalQuestions) * 100;

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------
  return (
    <main className="h-screen flex flex-col overflow-hidden relative" style={{ background: 'linear-gradient(to bottom, #E8D4C0 0%, #F5E6D3 100%)' }}>
      {/* ===== STYLES ===== */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>

      {/* ===== DECORATIVE MAPLE LEAF BACKGROUND ===== */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
        <svg
          className="absolute top-0 left-0 w-full h-full opacity-10"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="mapleRed" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#C8102E" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#8B0F23" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          <path
            d="M50 5 L54 28 L68 20 L59 40 L82 45 L59 50 L68 70 L54 62 L50 85 L46 62 L32 70 L41 50 L18 45 L41 40 L32 20 L46 28 Z"
            fill="url(#mapleRed)"
          />
        </svg>
      </div>


      {/* ===== HEADER ===== */}
      <header className="flex-shrink-0 relative z-10" style={{ background: '#8B0000', borderBottom: '3px solid #660000' }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍁</span>
            <h1 className="text-lg font-black text-white">Journal Reflections</h1>
          </div>
          
          {/* Points & Logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/30">
              <span className="text-sm">🍁</span>
              <span className="text-xs font-bold text-white">{user?.points || 500}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/30">
              <span className="text-sm">🔥</span>
              <span className="text-xs font-bold text-white">12</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-full font-bold text-xs text-white transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden relative z-10">
        <div className="w-full max-w-3xl h-full flex flex-col">
          
          {/* ===== CHAT CONTAINER ===== */}
          <div className="flex-1 bg-white/95 backdrop-blur-md rounded-3xl border-3 flex flex-col overflow-hidden shadow-2xl" style={{ borderColor: '#8B4513' }}>
            
            {/* ===== PROGRESS BAR ===== */}
            <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-b from-gray-50 to-gray-100" style={{ borderBottom: '2px solid #D2B48C' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md bg-red-800">
                    {answeredCount + 1}
                  </div>
                  <p className="text-sm font-bold text-gray-800">Question {answeredCount + 1} of {totalQuestions}</p>
                </div>
                <p className="text-lg font-black text-red-800">{Math.round(progressPercentage)}%</p>
              </div>
              <div className="relative h-2 rounded-full overflow-hidden bg-gray-200">
                <div 
                  className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 bg-red-800"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* ===== MESSAGES AREA (SCROLLABLE) ===== */}
            <div className="flex-1 overflow-y-auto px-6 py-6 bg-gradient-to-b from-gray-50 to-gray-100">
              
              {/* Question Bubble */}
              {!showResponse && (
                <div className="mb-6 flex justify-start">
                  <div className="max-w-md">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 shadow-md bg-gray-600">
                        📖
                      </div>
                      <div className="flex-1 rounded-2xl rounded-tl-none px-4 py-3 shadow-md bg-gray-600 border border-gray-700">
                        <p className="text-sm font-semibold text-white leading-relaxed">
                          {prompts[currentPromptIndex]?.question || 'Loading...'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Billy Character */}
              <div className="flex justify-center my-6">
                <div className="relative">
                  <div className="w-32 h-32 flex items-center justify-center" style={{ animation: 'float 3s ease-in-out infinite' }}>
                    <Image
                      src={user?.equippedOutfit?.image || "/images/beaver/default/default.png"}
                      alt="Billy"
                      width={128}
                      height={128}
                      className="object-contain drop-shadow-2xl"
                    />
                  </div>
                </div>
              </div>

              {/* Typing Indicator */}
              {isTyping && (
                <div className="mb-6 flex justify-start">
                  <div className="max-w-md">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 shadow-md bg-red-800">
                        🦫
                      </div>
                      <div className="rounded-2xl rounded-tl-none px-4 py-3 bg-white border-2 border-gray-300 shadow-md">
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 bg-red-800 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                          <div className="w-2 h-2 bg-red-800 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-red-800 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Billy's Response */}
              {showResponse && !isTyping && (
                <div className="mb-6 flex justify-start">
                  <div className="max-w-md">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 shadow-md bg-red-800">
                        🦫
                      </div>
                      <div className="rounded-2xl rounded-tl-none px-4 py-3 bg-white border-2 border-gray-300 shadow-md">
                        <p className="text-xs font-bold text-red-800 mb-1.5">Billy says:</p>
                        <p className="text-sm text-gray-800 leading-relaxed">{aiResponse}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* User's Answer */}
              {showResponse && currentAnswer && (
                <div className="mb-6 flex justify-end">
                  <div className="max-w-md">
                    <div className="flex items-start gap-2 flex-row-reverse">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 shadow-md bg-gray-600">
                        👤
                      </div>
                      <div className="rounded-2xl rounded-tr-none px-4 py-3 shadow-md bg-gray-600 border border-gray-700">
                        <p className="text-sm text-white leading-relaxed">
                          {currentAnswer.length > 100 ? currentAnswer.substring(0, 100) + '...' : currentAnswer}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ===== INPUT AREA (FIXED AT BOTTOM) ===== */}
            {!showResponse && !isTyping && (
              <div className="flex-shrink-0 bg-white px-6 py-4 border-t-2 border-gray-200">
                <textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Share your thoughts here... 💭"
                  className="w-full p-3 text-sm text-gray-800 placeholder-gray-400 bg-gray-50 rounded-xl border-2 border-gray-300 focus:border-red-800 focus:outline-none resize-none overflow-y-auto"
                  style={{ minHeight: '80px', maxHeight: '120px' }}
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs font-bold text-gray-600">
                    {currentAnswer.length < 10 ? `${10 - currentAnswer.length} more characters` : '✓ Ready'}
                  </p>
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={loading || currentAnswer.trim().length < 10}
                    className="px-5 py-2 rounded-full font-black text-xs text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 disabled:hover:scale-100 bg-red-800 hover:bg-red-900"
                  >
                    {loading ? 'THINKING...' : 'SUBMIT ✍️'}
                  </button>
                </div>
              </div>
            )}

            {/* ===== NEXT BUTTON (AFTER RESPONSE) ===== */}
            {showResponse && !isTyping && (
              <div className="flex-shrink-0 bg-white px-6 py-4 border-t-2 border-gray-200">
                <button
                  onClick={handleNextPrompt}
                  className="w-full py-3 rounded-full font-black text-sm text-white shadow-md hover:shadow-lg transition-all hover:scale-105 bg-green-700 hover:bg-green-800"
                >
                  {prompts.length > 1 ? '→ NEXT QUESTION' : '✓ FINISH JOURNAL'}
                </button>
              </div>
            )}
          </div>

          {/* ===== BOTTOM NAVIGATION ===== */}
          <div className="flex-shrink-0 flex items-center justify-center gap-4 mt-4 pb-2">
            <button 
              onClick={() => router.push('/billy')}
              className="flex flex-col items-center gap-1 transition-transform hover:scale-110"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white shadow-lg border-2 border-gray-300">
                <Image src="/images/icons/billy.png" alt="Billy" width={48} height={48} className="object-contain" />
              </div>
              <span className="text-xs font-bold text-gray-700">Billy</span>
            </button>
            
            <button 
              onClick={() => router.push('/dashboard')}
              className="flex flex-col items-center gap-1 transition-transform hover:scale-110"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white shadow-lg border-2 border-gray-300">
                <Image src="/images/icons/house.png" alt="Home" width={48} height={48} className="object-contain" />
              </div>
              <span className="text-xs font-bold text-gray-700">Home</span>
            </button>
            
            <button className="flex flex-col items-center gap-1">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl border-3 bg-red-800 border-red-900">
                <Image src="/images/icons/journal.png" alt="Journal" width={48} height={48} className="object-contain" />
              </div>
              <span className="text-xs font-bold text-white drop-shadow-md">Journal</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}