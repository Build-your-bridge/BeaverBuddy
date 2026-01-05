'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

interface ScreeningData {
  duration?: 'just-today' | 'few-days' | 'long-time';
  category?: 'family' | 'school-work' | 'immigration' | 'loneliness' | 'other';
  immediateNeed?: 'short-exercise' | 'reflection-time' | 'not-now';
}

export default function ScreeningPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [screening, setScreening] = useState<ScreeningData>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [feeling, setFeeling] = useState('');
  const [hasJournalPrompts, setHasJournalPrompts] = useState(false);
  const [remainingJournalCount, setRemainingJournalCount] = useState(0);

  const questions = [
    {
      title: 'How long has this problem been going on for?',
      subtitle: 'Understanding the timeline helps us support you better',
      type: 'duration',
      options: [
        { label: 'Just Today', value: 'just-today', color: 'rgba(74, 222, 128, 0.3)', textColor: '#16a34a' },
        { label: 'A Few Days', value: 'few-days', color: 'rgba(250, 204, 21, 0.3)', textColor: '#ca8a04' },
        { label: 'A Long Time', value: 'long-time', color: 'rgba(239, 68, 68, 0.3)', textColor: '#991b1b' }
      ]
    },
    {
      title: 'Which category is this problem linked to?',
      subtitle: 'This helps us give you more relevant support',
      type: 'category',
      options: [
        { label: '👨‍👩‍👧 Family', value: 'family', color: 'rgba(74, 222, 128, 0.3)', textColor: '#16a34a' },
        { label: '📚 School/Work', value: 'school-work', color: 'rgba(250, 204, 21, 0.3)', textColor: '#ca8a04' },
        { label: '🌍 Immigration', value: 'immigration', color: 'rgba(239, 68, 68, 0.3)', textColor: '#991b1b' },
        { label: '💔 Loneliness', value: 'loneliness', color: 'rgba(168, 85, 247, 0.3)', textColor: '#7e22ce' },
        { label: '✨ Other', value: 'other', color: 'rgba(59, 130, 246, 0.3)', textColor: '#1e40af' }
      ]
    },
    {
      title: 'Would you like something that will help right now?',
      subtitle: 'We can offer immediate support while you process this',
      type: 'immediateNeed',
      options: [
        { label: '🫂 Short Exercise', value: 'short-exercise', color: 'rgba(74, 222, 128, 0.3)', textColor: '#16a34a' },
        { label: '✍️ Reflection Time', value: 'reflection-time', color: 'rgba(250, 204, 21, 0.3)', textColor: '#ca8a04' },
        { label: '⏸️ Not Now', value: 'not-now', color: 'rgba(244, 63, 94, 0.3)', textColor: '#be123c' }
      ]
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
    
    // Get the feeling from search params
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

  const handleOptionSelect = (value: string) => {
    const questionType = questions[currentQuestion].type;
    const newScreening = { ...screening, [questionType]: value };
    setScreening(newScreening);

    // If crisis detected (Long Time), handle specially
    if (questionType === 'duration' && value === 'long-time') {
      // Save screening and redirect to crisis follow-up
      saveScreeningData(newScreening);
      setTimeout(() => {
        router.push(`/crisis-followup-new?feeling=${encodeURIComponent(feeling)}&category=${encodeURIComponent(newScreening.category || '')}&screeningId=${Date.now()}`);
      }, 500);
      return;
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Screening complete
      saveScreeningData(newScreening);
      // Determine next page based on responses
      determineContinueFlow(newScreening);
    }
  };

  const saveScreeningData = (data: ScreeningData) => {
    if (!user) return;
    
    const screeningHistory = localStorage.getItem(`mentalHealthScreening_${user.id}`) || '[]';
    const history = JSON.parse(screeningHistory);
    
    const screeningEntry = {
      timestamp: new Date().toISOString(),
      feeling,
      ...data
    };
    
    history.push(screeningEntry);
    localStorage.setItem(`mentalHealthScreening_${user.id}`, JSON.stringify(history));
  };

  const determineContinueFlow = (data: ScreeningData) => {
    // If user wants immediate help
    if (data.immediateNeed === 'short-exercise') {
      // Route to exercise page with category for context
      router.push(`/exercise?feeling=${encodeURIComponent(feeling)}&category=${encodeURIComponent(data.category || '')}`);
    } else if (data.immediateNeed === 'reflection-time') {
      router.push(`/reflection?feeling=${encodeURIComponent(feeling)}`);
    } else if (data.immediateNeed === 'not-now') {
      // Not Now - go directly to quests
      router.push('/quests');
    } else {
      // Default fallback to quests
      router.push('/quests');
    }
  };

  const question = questions[currentQuestion];

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ 
        background: 'linear-gradient(135deg, #ffa69e 0%, #ffddd2 100%)'
      }}>
        <p className="text-gray-800 font-semibold">Loading screening...</p>
      </div>
    );
  }

  return (
    <>
      <main className="h-screen flex flex-col overflow-hidden relative" style={{ background: 'linear-gradient(to bottom, #FAF3E0 0%, #FEF5E7 100%)' }}>
        <style jsx>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideIn {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
          }
          .question-container {
            animation: slideIn 0.4s ease-out;
          }
          .option-button {
            transition: all 0.3s ease;
          }
          .option-button:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          }
        `}</style>

        {/* Header */}
        <Header 
          title="Let's understand this better" 
          points={0}
          streak={0}
          onLogout={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            router.push('/');
          }}
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-24 relative z-10 overflow-y-auto">
          <div className="w-full max-w-md py-4">
            
            {/* Progress indicator */}
            <div className="mb-8 flex gap-2 justify-center">
              {questions.map((_, idx) => (
                <div
                  key={idx}
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: idx <= currentQuestion ? '24px' : '8px',
                    background: idx <= currentQuestion ? '#ec4899' : '#e5e7eb'
                  }}
                />
              ))}
            </div>

            {/* Question Card */}
            <div
              className="question-container"
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(20px)',
                borderRadius: '28px',
                padding: '28px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.5)'
              }}
            >
              <h2 className="text-2xl font-black text-gray-800 mb-2">
                {question.title}
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                {question.subtitle}
              </p>

              {/* Your feeling context */}
              {feeling && (
                <div
                  className="mb-6 p-3 rounded-xl"
                  style={{
                    background: 'rgba(236, 72, 153, 0.1)',
                    border: '1px solid rgba(236, 72, 153, 0.2)'
                  }}
                >
                  <p className="text-xs text-gray-700">
                    <span className="font-semibold">You shared: </span>
                    <span className="italic">"{feeling.substring(0, 60)}{feeling.length > 60 ? '...' : ''}"</span>
                  </p>
                </div>
              )}

              {/* Options */}
              <div className="space-y-3">
                {question.options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleOptionSelect(option.value)}
                    className="option-button w-full p-4 text-left rounded-xl font-semibold transition-all border border-gray-200"
                    style={{
                      background: option.color,
                      color: option.textColor
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Support message */}
              <p className="text-xs text-gray-600 mt-6 text-center italic">
                💭 Your answers help us give you better support
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <BottomNav 
          currentPage="dashboard" 
          hasJournalPrompts={hasJournalPrompts} 
          remainingJournalCount={remainingJournalCount} 
        />
      </main>
    </>
  );
}
