'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

export default function MovementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [feeling, setFeeling] = useState('');
  const [stage, setStage] = useState<'intro' | 'exercise' | 'complete'>('intro');
  const [currentExercise, setCurrentExercise] = useState(0);
  const [hasJournalPrompts, setHasJournalPrompts] = useState(false);
  const [remainingJournalCount, setRemainingJournalCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const exercises = [
    {
      name: '🚶 Take a Walk',
      duration: 300, // 5 minutes
      instructions: [
        'Stand up and walk around for 5 minutes',
        'Focus on how your feet feel on the ground',
        'Notice your surroundings as you walk',
        'Let your mind wander naturally'
      ]
    },
    {
      name: '🧘 Gentle Stretches',
      duration: 180, // 3 minutes
      instructions: [
        'Reach your arms up and stretch',
        'Touch your toes if you can',
        'Roll your shoulders backward',
        'Bend side to side gently'
      ]
    },
    {
      name: '💪 Light Exercise',
      duration: 300, // 5 minutes
      instructions: [
        'Do 10 jumping jacks',
        'March in place for 1 minute',
        'Do 10 push-ups or wall push-ups',
        'Keep moving for 5 minutes total'
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

  // Timer effect
  useEffect(() => {
    if (!isRunning || stage !== 'exercise') return;

    const interval = setInterval(() => {
      setTimer(t => {
        if (t + 1 >= exercises[currentExercise].duration) {
          setIsRunning(false);
          setStage('complete');
          return t;
        }
        return t + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, stage, currentExercise]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}</style>

        <Header 
          title="Quick Movement" 
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
              <h2 className="text-2xl font-black text-gray-800 mb-2">Move your body</h2>
              <p className="text-sm text-gray-700 mb-6">
                Movement releases stress and lifts your mood. Choose an exercise and go at your own pace.
              </p>

              <div className="space-y-3 mb-6">
                {exercises.map((ex, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentExercise(idx);
                      setTimer(0);
                      setIsRunning(true);
                      setStage('exercise');
                    }}
                    className="w-full text-left p-4 rounded-lg transition-all border-2 hover:scale-105"
                    style={{
                      background: 'rgba(255, 255, 255, 0.5)',
                      borderColor: 'rgba(220, 38, 38, 0.3)'
                    }}
                  >
                    <h3 className="font-black text-gray-800">{ex.name}</h3>
                    <p className="text-xs text-gray-600 mt-1">~{ex.duration / 60} minutes</p>
                  </button>
                ))}
              </div>

              <button
                onClick={() => router.push('/quests')}
                className="w-full py-3 font-semibold rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
              >
                Skip & Go to Quests
              </button>
            </div>
          )}

          {stage === 'exercise' && (
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
              <p className="text-5xl mb-4">{exercises[currentExercise].name.split(' ')[0]}</p>
              <h3 className="text-xl font-black text-gray-800 mb-6">{exercises[currentExercise].name}</h3>

              <div className="bg-red-100 rounded-2xl p-8 mb-6">
                <p className="text-5xl font-black text-red-600 font-mono" style={{ animation: 'pulse 1s ease-in-out infinite' }}>
                  {formatTime(timer)}
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  of {exercises[currentExercise].duration / 60} minutes
                </p>
              </div>

              <div className="text-left mb-6">
                {exercises[currentExercise].instructions.map((instruction, idx) => (
                  <div key={idx} className="flex gap-3 mb-3 text-sm">
                    <span className="text-lg">✓</span>
                    <span className="text-gray-700">{instruction}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  setIsRunning(false);
                  setStage('complete');
                }}
                className="w-full py-3 font-semibold rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
              >
                I'm Done
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
              <p className="text-4xl mb-4">💪</p>
              <h2 className="text-2xl font-black text-gray-800 mb-2">Great job!</h2>
              <p className="text-sm text-gray-700 mb-6">
                You moved your body and released some stress. Notice how you feel now.
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
