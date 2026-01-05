'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

export default function GroundingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [feeling, setFeeling] = useState('');
  const [stage, setStage] = useState<'intro' | 'exercise' | 'complete'>('intro');
  const [currentStep, setCurrentStep] = useState(0);
  const [hasJournalPrompts, setHasJournalPrompts] = useState(false);
  const [remainingJournalCount, setRemainingJournalCount] = useState(0);

  const groundingSteps = [
    {
      sense: '👀 SIGHT',
      instruction: 'Name 5 things you can see around you',
      color: 'from-red-200 to-red-100'
    },
    {
      sense: '🖐️ TOUCH',
      instruction: 'Name 4 things you can touch and feel',
      color: 'from-yellow-200 to-yellow-100'
    },
    {
      sense: '👂 SOUND',
      instruction: 'Name 3 things you can hear',
      color: 'from-blue-200 to-blue-100'
    },
    {
      sense: '👃 SMELL',
      instruction: 'Name 2 things you can smell (or imagine)',
      color: 'from-purple-200 to-purple-100'
    },
    {
      sense: '👅 TASTE',
      instruction: 'Name 1 thing you can taste or have tasted',
      color: 'from-pink-200 to-pink-100'
    }
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    
    const feelingParam = searchParams.get('feeling');
    if (feelingParam) {
      setFeeling(decodeURIComponent(feelingParam));
    }

    // Update journal count
    const journalPromptsData = sessionStorage.getItem(`journalPrompts_${parsedUser.id}`);
    if (journalPromptsData) {
      try {
        const prompts = JSON.parse(journalPromptsData);
        const normalizedPrompts = Array.isArray(prompts) ? prompts : [];
        const remaining = normalizedPrompts.filter((p: any) => !p.answer).length;
        setRemainingJournalCount(remaining);
        setHasJournalPrompts(remaining > 0);
      } catch (e) {
        console.error('Error parsing journal prompts:', e);
      }
    }
  }, [router, searchParams]);

  const handleNextStep = () => {
    if (currentStep < groundingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setStage('complete');
    }
  };

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ 
        background: 'linear-gradient(135deg, #ffa69e 0%, #ffddd2 100%)'
      }}>
        <p className="text-gray-800 font-semibold">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <main className="h-screen flex flex-col overflow-hidden relative" style={{ background: 'linear-gradient(to bottom, #FEF2F2 0%, #FFFBFB 100%)' }}>
        <style jsx>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <Header 
          title="5 Senses Grounding" 
          points={0}
          streak={0}
          onLogout={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            router.push('/');
          }}
        />

        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-24 overflow-y-auto">
          {stage === 'intro' && (
            <div
              className="w-full max-w-md"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                borderRadius: '28px',
                padding: '28px',
                boxShadow: '0 8px 32px rgba(220, 38, 38, 0.15)',
                border: '2px solid rgba(220, 38, 38, 0.2)',
                animation: 'fadeIn 0.4s ease-out'
              }}
            >
              <h2 className="text-2xl font-black text-gray-800 mb-4">Ground yourself</h2>
              <p className="text-sm text-gray-700 mb-6">
                This 5 senses technique helps bring you back to the present moment. You'll notice things around you one sense at a time.
              </p>

              <button
                onClick={() => setStage('exercise')}
                className="w-full py-4 font-black text-lg tracking-wider transition-all transform hover:scale-105 rounded-xl mb-3"
                style={{ 
                  background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
                  color: 'white'
                }}
              >
                Start Exercise
              </button>

              <button
                onClick={() => router.push('/quests')}
                className="w-full py-3 font-semibold rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
              >
                Quit
              </button>
            </div>
          )}

          {stage === 'exercise' && (
            <div
              className="w-full max-w-md"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                borderRadius: '28px',
                padding: '28px',
                boxShadow: '0 8px 32px rgba(220, 38, 38, 0.15)',
                border: `2px solid rgba(220, 38, 38, 0.2)`,
                animation: 'fadeIn 0.4s ease-out'
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                {groundingSteps.map((_, idx) => (
                  <div
                    key={idx}
                    className="h-1 flex-1 rounded-full transition-all"
                    style={{
                      background: idx <= currentStep ? 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)' : '#e5e7eb'
                    }}
                  />
                ))}
              </div>

              <p className="text-xs text-gray-600 mb-4">
                Step {currentStep + 1} of {groundingSteps.length}
              </p>

              <div className="text-center mb-6">
                <p className="text-3xl mb-3">{groundingSteps[currentStep].sense}</p>
                <h3 className="text-lg font-black text-gray-800">
                  {groundingSteps[currentStep].instruction}
                </h3>
              </div>

              <textarea
                placeholder="What did you notice?"
                className="w-full p-4 border-2 border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none mb-6"
                style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                rows={3}
              />

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (currentStep > 0) setCurrentStep(currentStep - 1);
                  }}
                  disabled={currentStep === 0}
                  className="flex-1 py-3 font-semibold rounded-lg border-2 border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>

                <button
                  onClick={handleNextStep}
                  className="flex-1 py-3 font-black rounded-lg transition-all transform hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
                    color: 'white'
                  }}
                >
                  {currentStep === groundingSteps.length - 1 ? 'Complete' : 'Next'}
                </button>
              </div>

              <button
                onClick={() => router.push('/quests')}
                className="w-full mt-3 py-3 font-semibold rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
              >
                Quit
              </button>
            </div>
          )}

          {stage === 'complete' && (
            <div
              className="w-full max-w-md text-center"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                borderRadius: '28px',
                padding: '28px',
                boxShadow: '0 8px 32px rgba(220, 38, 38, 0.15)',
                border: '2px solid rgba(220, 38, 38, 0.2)',
                animation: 'fadeIn 0.4s ease-out'
              }}
            >
              <p className="text-4xl mb-4">✨</p>
              <h2 className="text-2xl font-black text-gray-800 mb-2">You did it</h2>
              <p className="text-sm text-gray-700 mb-6">
                Notice how you feel now. You've grounded yourself in the present moment.
              </p>

              <button
                onClick={() => router.push(`/reflection?feeling=${encodeURIComponent(feeling)}`)}
                className="w-full py-4 font-black text-lg tracking-wider transition-all transform hover:scale-105 rounded-xl"
                style={{ 
                  background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
                  color: 'white'
                }}
              >
                Continue to Reflection
              </button>
            </div>
          )}
        </div>

        <BottomNav 
          currentPage="dashboard" 
          hasJournalPrompts={hasJournalPrompts} 
          remainingJournalCount={remainingJournalCount} 
        />
      </main>
    </>
  );
}
