'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

export default function ReflectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [feeling, setFeeling] = useState('');
  const [stage, setStage] = useState<'intro' | 'prompts' | 'journal' | 'complete'>('intro');
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [journalEntry, setJournalEntry] = useState('');
  const [hasJournalPrompts, setHasJournalPrompts] = useState(false);
  const [remainingJournalCount, setRemainingJournalCount] = useState(0);

  const getReflectionPrompts = () => {
    // Create context-specific prompts based on what the user shared
    if (feeling.toLowerCase().includes('stress') || feeling.toLowerCase().includes('worry') || feeling.toLowerCase().includes('anxious')) {
      return [
        '💭 What specific moment today made you feel most stressed?',
        '🌱 What\'s one small step you took to handle this stress?',
        '💪 How can you practice relaxation when you feel this way again?',
        '💗 Who can you talk to when stress feels overwhelming?'
      ];
    } else if (feeling.toLowerCase().includes('sad') || feeling.toLowerCase().includes('lonely') || feeling.toLowerCase().includes('down')) {
      return [
        '💭 What happened today that made you feel this way?',
        '🌱 What\'s one thing, no matter how small, that helped today?',
        '💪 How did you show strength despite feeling this way?',
        '💗 Is there someone you trust who can help you through this?'
      ];
    } else if (feeling.toLowerCase().includes('happy') || feeling.toLowerCase().includes('great') || feeling.toLowerCase().includes('excited')) {
      return [
        '💭 What was the best part of your day?',
        '🌱 What did you do today that made you proud?',
        '💪 How can you keep this positive feeling going?',
        '💗 Who was part of making today special?'
      ];
    } else if (feeling.toLowerCase().includes('overwhelm') || feeling.toLowerCase().includes('pressure') || feeling.toLowerCase().includes('too much')) {
      return [
        '💭 What\'s the biggest thing weighing on you right now?',
        '🌱 What\'s one thing you completed today, even if it felt hard?',
        '💪 What can you let go of or ask for help with?',
        '💗 Who supports you when things feel like too much?'
      ];
    } else {
      // Default prompts for general feelings
      return [
        '💭 What is one thing that happened today that surprised you?',
        '🌱 What is one small thing you did well today?',
        '💪 How did you handle something difficult today?',
        '💗 Is there someone who made you feel supported?'
      ];
    }
  };

  const reflectionPrompts = getReflectionPrompts();

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

  const handleNext = () => {
    if (currentPromptIndex < reflectionPrompts.length - 1) {
      setCurrentPromptIndex(currentPromptIndex + 1);
      setJournalEntry('');
    } else {
      // Redirect to journal page to answer daily prompts
      router.push(`/journal?feeling=${encodeURIComponent(feeling)}`);
    }
  };

  const handleSaveReflection = () => {
    if (user) {
      const reflectionData = localStorage.getItem(`reflection_${user.id}`) || '[]';
      const reflections = JSON.parse(reflectionData);
      reflections.push({
        date: new Date().toISOString(),
        feeling,
        prompts: reflectionPrompts.map((prompt, index) => ({
          prompt,
          response: ''
        })),
        journalEntry,
        timestamp: Date.now()
      });
      localStorage.setItem(`reflection_${user.id}`, JSON.stringify(reflections));
    }
    setStage('complete');
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
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <Header 
          title="Time to reflect" 
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
              <h2 className="text-2xl font-black text-gray-800 mb-4">Let's reflect</h2>
              <p className="text-sm text-gray-700 mb-6">
                Sometimes taking time to think about the day helps us feel more grounded. I'll ask you a few gentle questions.
              </p>

              <button
                onClick={() => setStage('prompts')}
                className="w-full py-4 font-black text-lg tracking-wider transition-all transform hover:scale-105 rounded-xl mb-3"
                style={{ 
                  background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
                  color: 'white'
                }}
              >
                Start Reflection
              </button>

              <button
                onClick={() => router.push('/quests')}
                className="w-full py-3 font-semibold rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
              >
                Quit
              </button>
            </div>
          )}

          {stage === 'prompts' && (
            <div
              className="w-full max-w-md"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                borderRadius: '28px',
                padding: '28px',
                boxShadow: '0 8px 32px rgba(220, 38, 38, 0.15)',
                border: '2px solid rgba(220, 38, 38, 0.2)',
                animation: 'slideIn 0.4s ease-out'
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-1 bg-gradient-to-r from-red-300 to-red-100 rounded-full" 
                  style={{ width: `${((currentPromptIndex + 1) / reflectionPrompts.length) * 100}%` }}
                />
              </div>

              <p className="text-xs text-gray-600 mb-4">
                Question {currentPromptIndex + 1} of {reflectionPrompts.length}
              </p>

              <p className="text-lg font-semibold text-gray-800 mb-6">
                {reflectionPrompts[currentPromptIndex]}
              </p>

              <textarea
                value={journalEntry}
                onChange={(e) => setJournalEntry(e.target.value)}
                placeholder="Your thoughts here..."
                className="w-full p-4 border-2 border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
                style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                rows={4}
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    if (currentPromptIndex > 0) {
                      setCurrentPromptIndex(currentPromptIndex - 1);
                      setJournalEntry('');
                    }
                  }}
                  disabled={currentPromptIndex === 0}
                  className="flex-1 py-3 font-semibold rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>

                <button
                  onClick={handleNext}
                  className="flex-1 py-3 font-black rounded-lg transition-all transform hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
                    color: 'white'
                  }}
                >
                  {currentPromptIndex === reflectionPrompts.length - 1 ? 'Write Journal' : 'Next'}
                </button>
              </div>
            </div>
          )}

          {stage === 'journal' && (
            <div
              className="w-full max-w-md"
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                borderRadius: '28px',
                padding: '28px',
                boxShadow: '0 8px 32px rgba(220, 38, 38, 0.15)',
                border: '2px solid rgba(220, 38, 38, 0.2)',
                animation: 'slideIn 0.4s ease-out'
              }}
            >
              <h3 className="text-xl font-black text-gray-800 mb-4">Is there anything else?</h3>
              <p className="text-sm text-gray-700 mb-4">
                Feel free to write anything on your mind. This is just for you.
              </p>

              <textarea
                value={journalEntry}
                onChange={(e) => setJournalEntry(e.target.value)}
                placeholder="Write your thoughts..."
                className="w-full p-4 border-2 border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm resize-none"
                style={{ background: 'rgba(255, 255, 255, 0.6)' }}
                rows={6}
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => router.push('/quests')}
                  className="flex-1 py-3 font-semibold rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Quit
                </button>

                <button
                  onClick={handleSaveReflection}
                  className="flex-1 py-3 font-black rounded-lg transition-all transform hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
                    color: 'white'
                  }}
                >
                  Next
                </button>
              </div>
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
              <p className="text-4xl mb-4">🌟</p>
              <h2 className="text-2xl font-black text-gray-800 mb-2">Well done</h2>
              <p className="text-sm text-gray-700 mb-6">
                Taking time to reflect shows real strength. Your thoughts matter.
              </p>

              <button
                onClick={() => router.push('/quests')}
                className="w-full py-4 font-black text-lg tracking-wider transition-all transform hover:scale-105 rounded-xl"
                style={{ 
                  background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
                  color: 'white'
                }}
              >
                Next
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
