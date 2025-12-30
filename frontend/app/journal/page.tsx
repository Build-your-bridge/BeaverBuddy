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
  // HOOKS
  // --------------------------------------------------------------------------
  const router = useRouter();

  // --------------------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------------------
  const [isTyping, setIsTyping] = useState(false);
  const [prompts, setPrompts] = useState<JournalPrompt[]>([]);
  const [allPrompts, setAllPrompts] = useState<JournalPrompt[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [showResponse, setShowResponse] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  // Store conversation history for display
  const [conversationHistory, setConversationHistory] = useState<Array<{
    question: string;
    userAnswer: string;
    billyResponse: string;
  }>>([]);

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
    
    // Show user's message immediately
    setShowResponse(true);
    
    // Then show typing indicator after a brief moment
    setTimeout(() => {
      setIsTyping(true);
    }, 300);

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
      
      // Save answer to backend and get AI response
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

      const responseData = await saveResponse.json();

      console.log('=== BACKEND RESPONSE ===');
      console.log('Full response:', responseData);
      console.log('Updated prompts:', responseData.updatedPrompts);
      console.log('========================');

      // Update with the fresh prompts from backend (includes dynamically generated Q2)
      if (responseData.updatedPrompts) {
        const updatedPrompts = responseData.updatedPrompts.map((p: any) => ({
          question: p.question,
          answer: p.answer,
          answeredAt: p.answeredAt
        }));
        
        setAllPrompts(updatedPrompts);
        
        if (user) {
          sessionStorage.setItem(`journalPrompts_${user.id}`, JSON.stringify(updatedPrompts));
        }
        
        // Update remaining prompts
        const remainingPrompts = updatedPrompts.filter((p: JournalPrompt) => p.answer === null);
        setPrompts(remainingPrompts);
        
        if (remainingPrompts.length > 0) {
          setCurrentPromptIndex(0);
        }
      }

      // Display AI response from backend
      setAiResponse(responseData.aiResponse);
      setIsTyping(false);

      window.dispatchEvent(new CustomEvent('journalUpdated'));

    } catch (error: any) {
      console.error('Error submitting journal:', error);
      alert(error.message || 'Failed to submit. Please try again.');
      setShowResponse(false);
      setIsTyping(false);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // NEXT PROMPT - Move to next question or finish
  // --------------------------------------------------------------------------
  const handleNextPrompt = () => {
    // Save current conversation to history
    if (currentAnswer && aiResponse && prompts[currentPromptIndex]) {
      setConversationHistory(prev => [...prev, {
        question: prompts[currentPromptIndex].question,
        userAnswer: currentAnswer,
        billyResponse: aiResponse
      }]);
    }

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

  // Comment

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
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden bg-red-800">
                        <Image
                          src={user?.equippedOutfit?.image || "/images/beaver/default/default.png"}
                          alt="Billy"
                          width={56}
                          height={56}
                          className="object-cover"
                        />
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

              {/* Typing Indicator */}
              {isTyping && (
                <div className="mb-6 flex justify-start">
                  <div className="max-w-md">
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden bg-red-800">
                        <Image
                          src={user?.equippedOutfit?.image || "/images/beaver/default/default.png"}
                          alt="Billy"
                          width={56}
                          height={56}
                          className="object-cover"
                        />
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
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden bg-red-800">
                        <Image
                          src={user?.equippedOutfit?.image || "/images/beaver/default/default.png"}
                          alt="Billy"
                          width={56}
                          height={56}
                          className="object-cover"
                        />
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
                    <div className="flex items-start gap-3 flex-row-reverse">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg bg-gray-600">
                        <span className="text-2xl">👤</span>
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