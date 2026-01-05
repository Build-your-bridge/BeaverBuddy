'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

export default function ShortExercisesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [hasJournalPrompts, setHasJournalPrompts] = useState(false);
  const [remainingJournalCount, setRemainingJournalCount] = useState(0);

  const exercises = [
    {
      id: 'quick-breathing',
      name: '🌬️ Quick Breathing Reset',
      description: '60-second breathing to calm down',
      time: '1 min',
      color: 'from-red-200 to-red-100'
    },
    {
      id: 'grounding',
      name: '🌍 5 Senses Ground',
      description: 'Notice what\'s around you',
      time: '3 min',
      color: 'from-blue-200 to-blue-100'
    },
    {
      id: 'quick-stretch',
      name: '🧘 Gentle Stretch',
      description: 'Quick neck & shoulder release',
      time: '2 min',
      color: 'from-green-200 to-green-100'
    },
    {
      id: 'quick-walk',
      name: '🚶 One-Minute Walk',
      description: 'Step outside or move around',
      time: '1 min',
      color: 'from-yellow-200 to-yellow-100'
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
  }, [router]);

  const handleExerciseClick = (exerciseId: string) => {
    switch(exerciseId) {
      case 'quick-breathing':
        router.push('/breathing-exercise?short=true');
        break;
      case 'grounding':
        router.push('/grounding');
        break;
      case 'quick-stretch':
        router.push('/movement');
        break;
      case 'quick-walk':
        router.push('/movement');
        break;
      default:
        router.push('/dashboard');
    }
  };

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ 
        background: 'linear-gradient(to bottom, #E8D4C0 0%, #F5E6D3 100%)'
      }}>
        <p className="text-gray-800 font-semibold">Loading...</p>
      </div>
    );
  }

  return (
    <main className="h-screen flex flex-col overflow-hidden relative" style={{ background: 'linear-gradient(to bottom, #FEF2F2 0%, #FFFBFB 100%)' }}>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <Header 
        title="Quick Break?" 
        points={0}
        streak={0}
        onLogout={() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/');
        }}
      />

      <div className="flex-1 flex flex-col overflow-y-auto px-4 py-6 pb-24 relative z-10">
        <div className="max-w-2xl w-full mx-auto">
          
          {/* Intro */}
          <div className="mb-8 text-center">
            <p className="text-sm text-gray-700 leading-relaxed">
              Sometimes you just need a quick moment to reset. Pick an exercise below.
            </p>
          </div>

          {/* Exercise Grid */}
          <div className="grid grid-cols-1 gap-4 mb-8">
            {exercises.map((exercise) => (
              <button
                key={exercise.id}
                onClick={() => handleExerciseClick(exercise.id)}
                className={`p-6 rounded-2xl text-left transition-all transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg bg-gradient-to-br ${exercise.color}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-black text-lg text-gray-800 mb-1">{exercise.name}</h3>
                    <p className="text-sm text-gray-700">{exercise.description}</p>
                  </div>
                  <span className="text-xs font-bold text-gray-600 bg-white/60 px-3 py-1 rounded-full">
                    {exercise.time}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Back to Dashboard */}
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 font-semibold rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <BottomNav 
        currentPage="dashboard" 
        hasJournalPrompts={hasJournalPrompts} 
        remainingJournalCount={remainingJournalCount} 
      />
    </main>
  );
}
