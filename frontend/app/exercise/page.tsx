'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

export default function ExercisePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [feeling, setFeeling] = useState('');
  const [category, setCategory] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [hasJournalPrompts, setHasJournalPrompts] = useState(false);
  const [remainingJournalCount, setRemainingJournalCount] = useState(0);

  // AI-tailored exercise options based on what the user wrote
  const getExercises = () => {
    const lowerFeeling = feeling.toLowerCase();
    
    // Detect emotional state from feeling text
    const isAnxious = lowerFeeling.includes('anxious') || lowerFeeling.includes('worried') || lowerFeeling.includes('nervous') || lowerFeeling.includes('panic') || lowerFeeling.includes('stress');
    const isSad = lowerFeeling.includes('sad') || lowerFeeling.includes('depressed') || lowerFeeling.includes('down') || lowerFeeling.includes('blue');
    const isLonely = lowerFeeling.includes('lonely') || lowerFeeling.includes('alone') || lowerFeeling.includes('isolated');
    const isOverwhelmed = lowerFeeling.includes('overwhelm') || lowerFeeling.includes('pressure') || lowerFeeling.includes('too much') || lowerFeeling.includes('stressed');
    const isAngry = lowerFeeling.includes('angry') || lowerFeeling.includes('frustrated') || lowerFeeling.includes('mad') || lowerFeeling.includes('furious');
    const isTired = lowerFeeling.includes('tired') || lowerFeeling.includes('exhausted') || lowerFeeling.includes('drained') || lowerFeeling.includes('fatigue');
    const isHappy = lowerFeeling.includes('great') || lowerFeeling.includes('happy') || lowerFeeling.includes('excited') || lowerFeeling.includes('amazing');

    // Tailor exercises to emotional state
    if (isAnxious) {
      return [
        { id: 'breathing', name: '🌬️ Breathing Exercise', description: 'Slow breaths to calm anxiety right now', tailored: true },
        { id: 'grounding', name: '🌍 5-Senses Grounding', description: 'Ground yourself in the present moment', tailored: true },
        { id: 'movement', name: '🚶 Gentle Walk', description: 'Slow movement to ease tension', tailored: true }
      ];
    } else if (isSad || isLonely) {
      return [
        { id: 'movement', name: '🚶 Movement & Mood', description: 'Gentle activity to lift your spirit', tailored: true },
        { id: 'breathing', name: '🌬️ Breathing Exercise', description: 'Center yourself with calm breaths', tailored: true },
        { id: 'journaling', name: '💭 Express Yourself', description: 'Write what you\'re feeling', tailored: true }
      ];
    } else if (isOverwhelmed) {
      return [
        { id: 'breathing', name: '🌬️ Quick Reset', description: 'Reset your nervous system', tailored: true },
        { id: 'movement', name: '🚶 Take a Break', description: 'Step away and move your body', tailored: true },
        { id: 'grounding', name: '🌍 Present Moment', description: 'Feel connected to here and now', tailored: true }
      ];
    } else if (isAngry) {
      return [
        { id: 'movement', name: '🚶 Active Release', description: 'Channel energy through movement', tailored: true },
        { id: 'breathing', name: '🌬️ Breathe to Release', description: 'Release anger with your breath', tailored: true },
        { id: 'journaling', name: '💭 Let It Out', description: 'Write without filter', tailored: true }
      ];
    } else if (isTired) {
      return [
        { id: 'grounding', name: '🌍 Energizing Senses', description: 'Wake up your senses', tailored: true },
        { id: 'movement', name: '🚶 Revitalizing Walk', description: 'Light movement to boost energy', tailored: true },
        { id: 'breathing', name: '🌬️ Energizing Breath', description: 'Invigorate yourself', tailored: true }
      ];
    } else if (isHappy) {
      return [
        { id: 'journaling', name: '💭 Celebrate & Reflect', description: 'Capture this moment in writing', tailored: true },
        { id: 'movement', name: '🚶 Express Joy', description: 'Dance or move with your happiness', tailored: true },
        { id: 'breathing', name: '🌬️ Mindful Appreciation', description: 'Savor this feeling', tailored: true }
      ];
    } else {
      // Default balanced exercises for any other feeling
      return [
        { id: 'breathing', name: '🌬️ Breathing Exercise', description: 'Calm your mind with slow, deep breaths' },
        { id: 'grounding', name: '🌍 Grounding Technique', description: '5 senses exercise to feel present' },
        { id: 'movement', name: '🚶 Brief Walk', description: 'Clear your mind with movement' }
      ];
    }
  };

  const exercises = getExercises();

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
    const categoryParam = searchParams.get('category');
    
    if (feelingParam) {
      setFeeling(decodeURIComponent(feelingParam));
    }
    if (categoryParam) {
      setCategory(decodeURIComponent(categoryParam));
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

  const handleSelectExercise = (exerciseId: string) => {
    switch(exerciseId) {
      case 'breathing':
        router.push(`/breathing-exercise?feeling=${encodeURIComponent(feeling)}`);
        break;
      case 'grounding':
        router.push(`/grounding?feeling=${encodeURIComponent(feeling)}`);
        break;
      case 'movement':
        router.push(`/movement?feeling=${encodeURIComponent(feeling)}`);
        break;
      case 'journaling':
        router.push(`/reflection?feeling=${encodeURIComponent(feeling)}`);
        break;
      default:
        router.push('/quests');
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
          title="Quick Exercise" 
          points={0}
          streak={0}
          onLogout={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            router.push('/');
          }}
        />

        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-24 overflow-y-auto">
          <div className="w-full max-w-md">
            <div
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
              <h2 className="text-2xl font-black text-gray-800 mb-2">Try an exercise</h2>
              <p className="text-sm text-gray-700 mb-6">
                Pick one that feels right for you now. Any one of these can help.
              </p>

              <div className="space-y-3 mb-6">
                {exercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() => handleSelectExercise(exercise.id)}
                    className="w-full text-left p-4 rounded-lg transition-all transform hover:scale-105 border-2 hover:border-red-500"
                    style={{
                      background: 'rgba(255, 255, 255, 0.5)',
                      borderColor: 'rgba(220, 38, 38, 0.3)'
                    }}
                  >
                    <h3 className="font-black text-gray-800">{exercise.name}</h3>
                    <p className="text-xs text-gray-600 mt-1">{exercise.description}</p>
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
          </div>
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
