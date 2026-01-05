'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

export default function BreathingExercisePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [feeling, setFeeling] = useState('');
  const [submittedFeeling, setSubmittedFeeling] = useState('');
  const [stage, setStage] = useState<'intro' | 'exercise' | 'complete'>('intro');
  const [breathCount, setBreathCount] = useState(0);
  const [circleSize, setCircleSize] = useState(100);
  const [hasJournalPrompts, setHasJournalPrompts] = useState(false);
  const [remainingJournalCount, setRemainingJournalCount] = useState(0);

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
      setSubmittedFeeling(decodeURIComponent(feelingParam));
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

  useEffect(() => {
    if (stage !== 'exercise') return;

    let animationFrame: number;
    let breathPhase = 0;
    let elapsed = 0;
    let lastBreathCount = 0;

    const animate = () => {
      elapsed += 16; // Approximate 60fps (1000/60 ≈ 16ms)
      const cycleTime = 8000; // 8 seconds per breath cycle
      const totalCycleNumber = Math.floor(elapsed / cycleTime);
      const progress = (elapsed % cycleTime) / cycleTime;

      if (progress < 0.25) {
        // Inhale
        breathPhase = progress * 4;
        setCircleSize(100 + breathPhase * 100);
      } else if (progress < 0.5) {
        // Hold
        breathPhase = (progress - 0.25) * 4;
        setCircleSize(200);
      } else if (progress < 0.75) {
        // Exhale
        breathPhase = (progress - 0.5) * 4;
        setCircleSize(200 - breathPhase * 100);
      } else {
        // Hold
        setCircleSize(100);
      }

      // Update breath count when a cycle completes
      if (totalCycleNumber !== lastBreathCount && totalCycleNumber < 3) {
        lastBreathCount = totalCycleNumber;
        setBreathCount(totalCycleNumber);
      }

      // Move to completion after 3 breaths
      if (totalCycleNumber >= 3) {
        setStage('complete');
        return;
      }

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [stage]);

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
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
          .breathing-circle {
            border-radius: 50%;
            background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%);
            box-shadow: 0 0 60px rgba(220, 38, 38, 0.3);
            transition: width 0.05s linear, height 0.05s linear;
          }
        `}</style>

        <Header 
          title="Take a breath" 
          points={0}
          streak={0}
          onLogout={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            router.push('/');
          }}
        />

        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-24 relative z-10">
          
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
              <h2 className="text-2xl font-black text-gray-800 mb-4">Let's pause</h2>
              <p className="text-sm text-gray-700 mb-6">
                Take 5 slow, deep breaths with me. This can help calm your mind and give you space to process what you're feeling.
              </p>

              <button
                onClick={() => setStage('exercise')}
                className="w-full py-4 font-black text-lg tracking-wider transition-all transform hover:scale-105 rounded-xl mb-3"
                style={{ 
                  background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
                  color: 'white'
                }}
              >
                Start Breathing Exercise
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
            <div className="text-center w-full max-w-md">
              <div
                className="breathing-circle mx-auto mb-8"
                style={{
                  width: `${circleSize}px`,
                  height: `${circleSize}px`
                }}
              />
              
              <p className="text-xl font-black text-gray-800 mb-4">
                {breathCount < 2
                  ? '🫁 Breathe in slowly...'
                  : breathCount < 4
                  ? '🫁 Hold it...'
                  : '🫁 Breathe out slowly...'}
              </p>

              <p className="text-sm text-gray-600">
                Breath {breathCount + 1} of 3
              </p>

              <div className="flex gap-2 justify-center mt-6">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full transition-all"
                    style={{
                      background: i <= breathCount ? '#DC2626' : '#e5e7eb'
                    }}
                  />
                ))}
              </div>

              <button
                onClick={() => router.push('/quests')}
                className="w-full mt-8 py-3 font-semibold rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
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
                Thank you for taking this moment. You're caring for yourself, and that matters.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => router.push(`/severity-assessment?feeling=${encodeURIComponent(submittedFeeling || '')}`)}
                  className="w-full py-4 font-black text-lg tracking-wider transition-all transform hover:scale-105 rounded-xl"
                  style={{ 
                    background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
                    color: 'white'
                  }}
                >
                  Continue
                </button>

                <button
                  onClick={() => router.push('/quests')}
                  className="w-full py-3 font-semibold rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Quit
                </button>
              </div>
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
