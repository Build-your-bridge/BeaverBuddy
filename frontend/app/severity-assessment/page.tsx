'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

export default function SeverityAssessmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [feeling, setFeeling] = useState('');
  const [stage, setStage] = useState<'ask-question' | 'duration' | 'category' | 'mood-check' | 'welcome-back' | 'loading'>('ask-question');
  
  // Assessment responses
  const [duration, setDuration] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [welcomeBackResponse, setWelcomeBackResponse] = useState<string | null>(null);
  const [isCrisis, setIsCrisis] = useState(false);
  const [previousIssue, setPreviousIssue] = useState<string | null>(null);

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
    }

    // Check if this is a returning user (long-term issue)
    const storedDuration = localStorage.getItem(`lastAssessmentDuration_${parsedUser.id}`);
    const storedCategory = localStorage.getItem(`lastAssessmentCategory_${parsedUser.id}`);
    
    if (storedDuration === 'a-long-time' && storedCategory) {
      // This is a returning user - show welcome back
      setPreviousIssue(storedCategory);
      setStage('welcome-back');
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

  const getDurationLabel = (value: string): string => {
    switch(value) {
      case 'just-today': return 'Just Today';
      case 'a-few-days': return 'A Few Days';
      case 'a-long-time': return 'A Long Time';
      default: return value;
    }
  };

  const getCategoryLabel = (value: string): string => {
    switch(value) {
      case 'family': return 'Family Issues';
      case 'school-work': return 'School/Work';
      case 'immigration': return 'Immigration/Status';
      case 'loneliness': return 'Loneliness/Connection';
      case 'other': return 'Something Else';
      default: return value;
    }
  };

  const handleDurationSelect = (selected: string) => {
    setDuration(selected);
    if (user) {
      localStorage.setItem(`lastAssessmentDuration_${user.id}`, selected);
    }
    setStage('category');
  };

  const handleCategorySelect = (selected: string) => {
    setCategory(selected);
    if (user) {
      localStorage.setItem(`lastAssessmentCategory_${user.id}`, selected);
    }
    setStage('mood-check');
  };

  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood);
    
    // Save mood to growth tracking history
    if (user) {
      const growthHistory = localStorage.getItem(`growthCheckInHistory_${user.id}`) || '[]';
      const history = JSON.parse(growthHistory);
      
      // Update today's entry or add new one
      const today = new Date().toDateString();
      const todayEntry = history.find((e: any) => e.date === today);
      
      const moodEmojis: { [key: string]: string } = {
        'amazing': '🤩',
        'happy': '😊',
        'calm': '😌',
        'okay': '😐',
        'sad': '😢',
        'stressed': '😰',
        'angry': '😠'
      };
      
      if (todayEntry) {
        todayEntry.mood = mood;
        todayEntry.emoji = moodEmojis[mood] || '💭';
      } else {
        history.push({
          date: today,
          feeling: feeling,
          timestamp: new Date().toISOString(),
          emoji: moodEmojis[mood] || '💭',
          mood: mood
        });
      }
      
      localStorage.setItem(`growthCheckInHistory_${user.id}`, JSON.stringify(history));
    }
    
    // Go to quests after selecting mood
    router.push('/quests');
  };

  const handleWelcomeBackResponse = (response: string) => {
    setWelcomeBackResponse(response);
    
    if (response === 'worse' || response === 'crisis') {
      // Trigger crisis protocol
      setIsCrisis(true);
      if (user) {
        localStorage.setItem(`crisisLockout_${user.id}`, 'true');
        localStorage.setItem(`questGeneratedDate_${user.id}`, new Date().toDateString());
        // Store that this is immigration-related for crisis routing
        if (previousIssue === 'immigration') {
          localStorage.setItem(`immigrationCrisis_${user.id}`, 'true');
        }
      }
      // Show crisis resources
      router.push(`/crisis-followup-new?issue=${encodeURIComponent(previousIssue || 'this issue')}&category=${encodeURIComponent(previousIssue || 'other')}`);
    } else {
      // Continue to journal
      router.push(`/journal?feeling=${encodeURIComponent(feeling)}`);
    }
  };

  const getImmigrationSpecificMessage = (): string => {
    const messages = [
      "I hear you. Immigration-related stress is real and valid.",
      "Your experience matters. Let's work through this together.",
      "Navigating immigration challenges takes strength. You're doing great.",
      "Visa status stress affects many. You're not alone in this.",
      "Language and culture barriers are tough. I'm here to help.",
      "Family separation through immigration is deeply painful. Let's talk about it."
    ];
    return messages[Math.floor(Math.random() * messages.length)];
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
          title="Let's understand" 
          points={0}
          streak={0}
          onLogout={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            router.push('/');
          }}
        />

        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-24 overflow-y-auto">
          
          {/* ASK QUESTION */}
          {stage === 'ask-question' && (
            <div className="w-full max-w-md" style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '28px',
              padding: '28px',
              boxShadow: '0 8px 32px rgba(220, 38, 38, 0.15)',
              border: '2px solid rgba(220, 38, 38, 0.2)',
              animation: 'fadeIn 0.4s ease-out'
            }}>
              <p className="text-4xl mb-4 text-center">💭</p>
              <h2 className="text-2xl font-black text-gray-800 mb-4 text-center">
                Can I ask you a few questions?
              </h2>
              <p className="text-sm text-gray-700 mb-6 text-center">
                This helps me understand what you're going through so I can suggest the right support.
              </p>
              
              <button
                onClick={() => setStage('duration')}
                className="w-full py-4 font-black text-lg tracking-wider transition-all transform hover:scale-105 rounded-xl mb-3"
                style={{
                  background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
                  color: 'white'
                }}
              >
                Yes, Let's Talk
              </button>

              <button
                onClick={() => router.push(`/journal?feeling=${encodeURIComponent(feeling)}`)}
                className="w-full py-3 font-semibold rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
              >
                Skip For Now
              </button>
            </div>
          )}

          {/* DURATION QUESTION */}
          {stage === 'duration' && (
            <div className="w-full max-w-md" style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '28px',
              padding: '28px',
              boxShadow: '0 8px 32px rgba(220, 38, 38, 0.15)',
              border: '2px solid rgba(220, 38, 38, 0.2)',
              animation: 'slideIn 0.4s ease-out'
            }}>
              <h2 className="text-2xl font-black text-gray-800 mb-6 text-center">
                How long has this been going on?
              </h2>
              
              <div className="space-y-3">
                <button
                  onClick={() => handleDurationSelect('just-today')}
                  className="w-full p-4 rounded-xl font-black text-left border-2 border-green-300 bg-green-100 hover:bg-green-200 transition-all text-gray-900"
                >
                  <p className="text-lg">Just Today</p>
                  <p className="text-xs text-gray-700 mt-1">Happened recently</p>
                </button>

                <button
                  onClick={() => handleDurationSelect('a-few-days')}
                  className="w-full p-4 rounded-xl font-black text-left border-2 border-yellow-300 bg-yellow-100 hover:bg-yellow-200 transition-all text-gray-900"
                >
                  <p className="text-lg">A Few Days</p>
                  <p className="text-xs text-gray-700 mt-1">Been a little while</p>
                </button>

                <button
                  onClick={() => handleDurationSelect('a-long-time')}
                  className="w-full p-4 rounded-xl font-black text-left border-2 border-red-300 bg-red-100 hover:bg-red-200 transition-all text-gray-900"
                >
                  <p className="text-lg">A Long Time</p>
                  <p className="text-xs text-gray-700 mt-1">This has been going on</p>
                </button>
              </div>
            </div>
          )}

          {/* CATEGORY QUESTION */}
          {stage === 'category' && (
            <div className="w-full max-w-md" style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '28px',
              padding: '28px',
              boxShadow: '0 8px 32px rgba(220, 38, 38, 0.15)',
              border: '2px solid rgba(220, 38, 38, 0.2)',
              animation: 'slideIn 0.4s ease-out'
            }}>
              <h2 className="text-2xl font-black text-gray-800 mb-6 text-center">
                What's this about?
              </h2>
              
              <div className="space-y-3">
                <button
                  onClick={() => handleCategorySelect('family')}
                  className="w-full p-4 rounded-xl font-black text-left border-2 border-green-300 bg-green-100 hover:bg-green-200 transition-all text-gray-900"
                >
                  <p className="text-lg">👨‍👩‍👧 Family</p>
                  <p className="text-xs text-gray-700 mt-1">Family relationships</p>
                </button>

                <button
                  onClick={() => handleCategorySelect('school-work')}
                  className="w-full p-4 rounded-xl font-black text-left border-2 border-yellow-300 bg-yellow-100 hover:bg-yellow-200 transition-all text-gray-900"
                >
                  <p className="text-lg">📚 School/Work</p>
                  <p className="text-xs text-gray-700 mt-1">School or work stress</p>
                </button>

                <button
                  onClick={() => handleCategorySelect('immigration')}
                  className="w-full p-4 rounded-xl font-black text-left border-2 border-red-300 bg-red-100 hover:bg-red-200 transition-all text-gray-900"
                >
                  <p className="text-lg">🌍 Immigration/Visa Status</p>
                  <p className="text-xs text-gray-700 mt-1">Visa, citizenship, family separation, or documentation stress</p>
                </button>

                <button
                  onClick={() => handleCategorySelect('loneliness')}
                  className="w-full p-4 rounded-xl font-black text-left border-2 border-blue-300 bg-blue-100 hover:bg-blue-200 transition-all text-gray-900"
                >
                  <p className="text-lg">💙 Loneliness</p>
                  <p className="text-xs text-gray-700 mt-1">Feeling alone</p>
                </button>

                <button
                  onClick={() => handleCategorySelect('other')}
                  className="w-full p-4 rounded-xl font-black text-left border-2 border-purple-300 bg-purple-100 hover:bg-purple-200 transition-all text-gray-900"
                >
                  <p className="text-lg">💜 Other</p>
                  <p className="text-xs text-gray-700 mt-1">Something else</p>
                </button>
              </div>
            </div>
          )}

          {/* MOOD CHECK QUESTION */}
          {stage === 'mood-check' && (
            <div className="w-full max-w-md" style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '28px',
              padding: '28px',
              boxShadow: '0 8px 32px rgba(220, 38, 38, 0.15)',
              border: '2px solid rgba(220, 38, 38, 0.2)',
              animation: 'slideIn 0.4s ease-out'
            }}>
              <h2 className="text-2xl font-black text-gray-800 mb-2 text-center">
                How are you feeling right now?
              </h2>
              <p className="text-xs text-gray-600 mb-6 text-center">
                Pick one to update your mood on your growth page
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleMoodSelect('amazing')}
                  className="p-4 rounded-xl font-bold text-center bg-gradient-to-br from-yellow-100 to-yellow-200 hover:from-yellow-200 hover:to-yellow-300 border-2 border-yellow-300 transition-all"
                >
                  <p className="text-4xl mb-1">🤩</p>
                  <p className="text-sm text-gray-900">Amazing</p>
                </button>

                <button
                  onClick={() => handleMoodSelect('happy')}
                  className="p-4 rounded-xl font-bold text-center bg-gradient-to-br from-green-100 to-green-200 hover:from-green-200 hover:to-green-300 border-2 border-green-300 transition-all"
                >
                  <p className="text-4xl mb-1">😊</p>
                  <p className="text-sm text-gray-900">Happy</p>
                </button>

                <button
                  onClick={() => handleMoodSelect('calm')}
                  className="p-4 rounded-xl font-bold text-center bg-gradient-to-br from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 border-2 border-blue-300 transition-all"
                >
                  <p className="text-4xl mb-1">😌</p>
                  <p className="text-sm text-gray-900">Calm</p>
                </button>

                <button
                  onClick={() => handleMoodSelect('okay')}
                  className="p-4 rounded-xl font-bold text-center bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 border-2 border-gray-300 transition-all"
                >
                  <p className="text-4xl mb-1">😐</p>
                  <p className="text-sm text-gray-900">Okay</p>
                </button>

                <button
                  onClick={() => handleMoodSelect('sad')}
                  className="p-4 rounded-xl font-bold text-center bg-gradient-to-br from-purple-100 to-purple-200 hover:from-purple-200 hover:to-purple-300 border-2 border-purple-300 transition-all"
                >
                  <p className="text-4xl mb-1">😢</p>
                  <p className="text-sm text-gray-900">Sad</p>
                </button>

                <button
                  onClick={() => handleMoodSelect('stressed')}
                  className="p-4 rounded-xl font-bold text-center bg-gradient-to-br from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 border-2 border-red-300 transition-all"
                >
                  <p className="text-4xl mb-1">😰</p>
                  <p className="text-sm text-gray-900">Stressed</p>
                </button>
              </div>
            </div>
          )}

          {/* WELCOME BACK - For returning long-term issues */}
          {stage === 'welcome-back' && (
            <div className="w-full max-w-md" style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '28px',
              padding: '28px',
              boxShadow: '0 8px 32px rgba(220, 38, 38, 0.15)',
              border: '2px solid rgba(220, 38, 38, 0.2)',
              animation: 'slideIn 0.4s ease-out'
            }}>
              <p className="text-4xl mb-4 text-center">👋</p>
              <h2 className="text-2xl font-black text-gray-800 mb-4 text-center">Welcome back</h2>
              <p className="text-sm text-gray-700 mb-6 text-center">
                {previousIssue === 'immigration' 
                  ? "I see you're still navigating immigration challenges. Your persistence is strength. How are you holding up?" 
                  : `I remember you mentioned you were dealing with ${previousIssue}. How is that going now?`}
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => handleWelcomeBackResponse('better')}
                  className="w-full p-4 rounded-xl font-black text-left border-2 border-gray-200 hover:border-green-400 bg-green-50 hover:bg-green-100 transition-all"
                >
                  <p className="text-lg">✨ {previousIssue === 'immigration' ? 'Making Progress' : 'Better'}</p>
                </button>

                <button
                  onClick={() => handleWelcomeBackResponse('alright')}
                  className="w-full p-4 rounded-xl font-black text-left border-2 border-gray-200 hover:border-yellow-400 bg-yellow-50 hover:bg-yellow-100 transition-all"
                >
                  <p className="text-lg">😐 {previousIssue === 'immigration' ? 'Steady' : 'About the Same'}</p>
                </button>

                <button
                  onClick={() => handleWelcomeBackResponse('worse')}
                  className="w-full p-4 rounded-xl font-black text-left border-2 border-gray-200 hover:border-orange-400 bg-orange-50 hover:bg-orange-100 transition-all"
                >
                  <p className="text-lg">😞 {previousIssue === 'immigration' ? 'More Stressful' : 'Getting Worse'}</p>
                </button>

                <button
                  onClick={() => handleWelcomeBackResponse('crisis')}
                  className="w-full p-4 rounded-xl font-black text-left border-2 border-gray-200 hover:border-red-600 bg-red-100 hover:bg-red-200 transition-all"
                >
                  <p className="text-lg text-red-700">🆘 {previousIssue === 'immigration' ? 'In Crisis - Need Help' : 'I Need Help Now'}</p>
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
