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

export default function JournalPage() {
  const [prompts, setPrompts] = useState<string[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [showResponse, setShowResponse] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Get user ID from localStorage
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    
    const currentUser = JSON.parse(userData);
    setUser(currentUser);
    
    // Get journal prompts from sessionStorage with user-specific key
    const journalPromptsData = sessionStorage.getItem(`journalPrompts_${currentUser.id}`);
    
    if (!journalPromptsData) {
      router.push('/dashboard');
      return;
    }

    const questions = JSON.parse(journalPromptsData);
    setPrompts(questions);
  }, [router]);

  const handleSubmitAnswer = async () => {
    if (currentAnswer.trim().length < 10) {
      alert('Please write at least 10 characters, eh!');
      return;
    }

    setLoading(true);

    try {
      // Call AI to get a comforting response
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'BeaverBuddy'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.2-3b-instruct:free',
          messages: [{
            role: 'user',
            content: `You are Billy the Beaver, a compassionate Canadian mental health assistant helping an immigrant. They answered this journal prompt: "${prompts[currentPromptIndex]}"

Their answer: "${currentAnswer}"

Respond with a warm, supportive, and comforting message (2-3 sentences). Be empathetic and encouraging. Include Canadian references when appropriate. Sound friendly and conversational, like a caring friend.`
          }]
        })
      });

      const data = await response.json();
      const aiMessage = data.choices[0].message.content;

      setAiResponse(aiMessage);
      setShowResponse(true);

      // Save the answer
      const updatedAnswers = [...answers];
      updatedAnswers[currentPromptIndex] = currentAnswer;
      setAnswers(updatedAnswers);

    } catch (error) {
      console.error('Error getting AI response:', error);
      alert('Failed to get response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNextPrompt = () => {
    if (currentPromptIndex < prompts.length - 1) {
      setCurrentPromptIndex(currentPromptIndex + 1);
      setCurrentAnswer('');
      setShowResponse(false);
      setAiResponse('');
    } else {
      // All prompts completed
      sessionStorage.removeItem('journalPrompts');
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
            <span className="text-lg font-black text-gray-800">{currentPromptIndex + 1}/{prompts.length}</span>
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
            {/* Speech bubble */}
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
                {prompts[currentPromptIndex]}
              </h1>
            </div>

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

            {/* AI Response after submission */}
            {showResponse && (
              <div className="mb-4 p-3 text-center font-bold text-sm" style={{
                background: 'rgba(34, 197, 94, 0.3)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                color: '#166534'
              }}>
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xl">🦫</span>
                  <p className="text-xs font-bold text-green-800">Billy says:</p>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed">
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
                {currentPromptIndex < prompts.length - 1 ? '→ NEXT QUESTION' : '✓ FINISH JOURNAL'}
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