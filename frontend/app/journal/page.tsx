'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function JournalPage() {
  const [prompts, setPrompts] = useState<string[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [showResponse, setShowResponse] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Get journal prompts from sessionStorage
    const journalPromptsData = sessionStorage.getItem('journalPrompts');
    
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

  if (prompts.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ 
        background: 'linear-gradient(135deg, #B8312F 0%, #E63946 50%, #8B0000 100%)'
      }}>
        <p className="text-white font-bold">Loading journal...</p>
      </div>
    );
  }

  // Generate maple leaves
  const mapleLeaves = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    left: `${(i * 12) + 5}%`,
    color: i % 3 === 0 ? '#1e40af' : i % 3 === 1 ? '#3b82f6' : '#ffffff',
    animationDuration: `${Math.random() * 4 + 8}s`,
    animationDelay: `${Math.random() * 5}s`,
    fontSize: `${Math.random() * 15 + 25}px`,
  }));

  return (
    <main className="h-screen flex flex-col relative overflow-hidden" style={{ 
      background: 'linear-gradient(135deg, #B8312F 0%, #E63946 25%, #DC143C 50%, #C41E3A 75%, #8B0000 100%)',
      backgroundSize: '400% 400%',
      animation: 'gradient 15s ease infinite'
    }}>
      <style jsx>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes fall {
          0% { 
            transform: translateY(-100px) rotate(0deg); 
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 0.9;
          }
          100% { 
            transform: translateY(100vh) rotate(360deg); 
            opacity: 0;
          }
        }
        .maple-leaf {
          position: absolute;
          animation: fall linear infinite;
          pointer-events: none;
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.6));
        }
      `}</style>

      {/* Falling maple leaves */}
      {mapleLeaves.map((leaf) => (
        <div
          key={leaf.id}
          className="maple-leaf"
          style={{
            left: leaf.left,
            animationDuration: leaf.animationDuration,
            animationDelay: leaf.animationDelay,
            width: leaf.fontSize,
            height: leaf.fontSize,
          }}
        >
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.8))' }}>
            <path
              d="M50,10 L55,35 L70,25 L60,45 L85,45 L65,55 L75,75 L55,65 L50,90 L45,65 L25,75 L35,55 L15,45 L40,45 L30,25 L45,35 Z"
              fill={leaf.color}
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="1"
            />
          </svg>
        </div>
      ))}

      {/* Header */}
      <div className="bg-white rounded-b-[45px] pt-5 pb-4 px-6 relative" style={{ 
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        borderBottom: '4px solid #C41E3A'
      }}>
        <div className="text-center">
          <div className="inline-block mb-1">
            <span className="text-3xl animate-bounce inline-block" style={{ animation: 'float 3s ease-in-out infinite' }}>📖</span>
          </div>
          <h2 className="text-2xl font-bold mb-0.5" style={{ 
            background: 'linear-gradient(90deg, #C41E3A 0%, #E63946 50%, #C41E3A 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Journal Time
          </h2>
          <p className="text-xs text-gray-600 font-medium">Question {currentPromptIndex + 1} of {prompts.length}</p>
        </div>
        
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-3">
          {prompts.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                index <= currentPromptIndex ? 'bg-red-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-24">
        <div className="w-full max-w-md">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-[35px] px-6 py-5 relative shadow-2xl" style={{
            border: '3px solid #8B4513',
            boxShadow: '0 20px 60px rgba(139, 69, 19, 0.3)'
          }}>
            {/* Billy asking the question */}
            <div className="bg-white rounded-3xl px-5 py-2.5 mb-4 text-center relative" style={{ 
              boxShadow: '0 8px 20px rgba(196, 30, 58, 0.15)',
              border: '2px solid #FFE5E5'
            }}>
              <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 text-2xl">🍁</div>
              <h1 className="text-base font-bold text-gray-800 leading-snug pt-1">
                {prompts[currentPromptIndex]}
              </h1>
            </div>

            {/* Beaver */}
            <div className="flex justify-center mb-4">
              <div className="relative w-32 h-32 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center shadow-lg" style={{
                border: '3px solid #8B4513'
              }}>
                <Image
                  src="/images/beaver/welcome_beaver2.png"
                  alt="Billy the Beaver"
                  width={120}
                  height={120}
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* AI Response after submission */}
            {showResponse && (
              <div className="mb-4 p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-3xl border-2 border-green-200 animate-fade-in">
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
              <div className="mb-3">
                <textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder='Share your thoughts here, eh! 🍁'
                  className="w-full p-3 rounded-3xl resize-none text-gray-700 text-xs leading-relaxed shadow-inner"
                  style={{ 
                    border: '3px solid #C41E3A',
                    backgroundColor: '#FFFBF5',
                    outline: 'none'
                  }}
                  rows={4}
                />
                <p className="text-[10px] text-gray-500 mt-1 ml-1">
                  {currentAnswer.length} characters (minimum 10)
                </p>
              </div>
            )}

            {/* Submit or Next button */}
            {!showResponse ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={loading || currentAnswer.trim().length < 10}
                className="w-full py-3 rounded-full font-bold text-base tracking-wider transition-all transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                style={{ 
                  background: 'linear-gradient(135deg, #C41E3A 0%, #E63946 100%)',
                  color: 'white',
                  boxShadow: '0 8px 20px rgba(196, 30, 58, 0.4)'
                }}
              >
                {loading ? '🍁 THINKING... 🍁' : '🍁 SUBMIT 🍁'}
              </button>
            ) : (
              <button
                onClick={handleNextPrompt}
                className="w-full py-3 rounded-full font-bold text-base tracking-wider transition-all transform hover:scale-105 hover:shadow-2xl"
                style={{ 
                  background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                  color: 'white',
                  boxShadow: '0 8px 20px rgba(40, 167, 69, 0.4)'
                }}
              >
                {currentPromptIndex < prompts.length - 1 ? '→ NEXT QUESTION' : '✓ FINISH JOURNAL'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-amber-50 to-orange-100 rounded-t-[40px] py-3" style={{ 
        boxShadow: '0 -8px 30px rgba(139, 69, 19, 0.3)',
        borderTop: '3px solid #8B4513'
      }}>
        <div className="flex justify-center">
          <button 
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-red-600 text-white rounded-full font-bold text-sm shadow-lg hover:bg-red-700 transition-all"
          >
            🏠 Back to Dashboard
          </button>
        </div>
      </div>
    </main>
  );
}