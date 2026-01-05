'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

export default function CrisisFollowupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [feeling, setFeeling] = useState('');
  const [category, setCategory] = useState('');
  const [stage, setStage] = useState<'assessment' | 'support' | 'followup' | 'complete'>('assessment');
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

  const getCategoryLabel = () => {
    const categoryMap: { [key: string]: string } = {
      'family': 'stressed about family',
      'school-work': 'struggling with school/work',
      'immigration': 'dealing with immigration issues',
      'loneliness': 'feeling lonely',
      'other': 'dealing with something challenging'
    };
    return categoryMap[category] || 'dealing with this';
  };

  const handleAssessmentSelect = (value: string) => {
    if (value === 'help' || value === 'worse') {
      setStage('support');
    } else {
      setStage('followup');
    }
  };

  const handleSupportSelect = (value: string) => {
    if (value === 'resources') {
      router.push('/resources');
      return;
    } else if (value === 'local-help') {
      router.push('/local-help');
      return;
    } else if (value === 'continue') {
      setStage('followup');
    }
  };

  const handleFollowupSelect = (value: string) => {
    if (user) {
      const followupData = {
        timestamp: new Date().toISOString(),
        category,
        feeling,
        permitFollowup: value === 'yes',
        crisisDetected: true
      };
      
      localStorage.setItem(`crisisFollowup_${user.id}`, JSON.stringify(followupData));
      localStorage.setItem(`crisisLockout_${user.id}`, 'true');
      localStorage.setItem(`crisisLockoutTime_${user.id}`, String(Date.now() + 24 * 60 * 60 * 1000));
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
        `}</style>

        <Header 
          title="Check-in" 
          points={0}
          streak={0}
          onLogout={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            router.push('/');
          }}
        />

        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-24 relative z-10 overflow-y-auto">
          
          {stage === 'assessment' && (
            <div className="w-full max-w-md" style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '28px',
              padding: '28px',
              boxShadow: '0 8px 32px rgba(220, 38, 38, 0.15)',
              border: '2px solid rgba(220, 38, 38, 0.2)',
              animation: 'fadeIn 0.4s ease-out'
            }}>
              <h2 className="text-2xl font-black text-gray-800 mb-4">Welcome back!</h2>
              <p className="text-sm text-gray-700 mb-6">
                Last time you mentioned you were feeling {getCategoryLabel()}. How's that going now?
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleAssessmentSelect('better')}
                  className="w-full py-4 px-4 font-black text-white rounded-lg transition-all transform hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)' }}
                >
                  🟢 Better
                </button>
                <button
                  onClick={() => handleAssessmentSelect('alright')}
                  className="w-full py-4 px-4 font-black text-white rounded-lg transition-all transform hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #eab308 0%, #facc15 100%)' }}
                >
                  🟡 Alright
                </button>
                <button
                  onClick={() => handleAssessmentSelect('worse')}
                  className="w-full py-4 px-4 font-black text-white rounded-lg transition-all transform hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)' }}
                >
                  🟠 Worse
                </button>
                <button
                  onClick={() => handleAssessmentSelect('help')}
                  className="w-full py-4 px-4 font-black text-white rounded-lg transition-all transform hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' }}
                >
                  🆘 I don't wanna talk about it
                </button>
              </div>
            </div>
          )}

          {stage === 'support' && (
            <div className="w-full max-w-md" style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '28px',
              padding: '28px',
              boxShadow: '0 8px 32px rgba(220, 38, 38, 0.15)',
              border: '2px solid rgba(220, 38, 38, 0.2)',
              animation: 'fadeIn 0.4s ease-out'
            }}>
              <h2 className="text-xl font-black text-gray-800 mb-4">Support Available</h2>
              <p className="text-sm text-gray-700 mb-6">
                If this has been weighing down on you for a while, support is available:
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleSupportSelect('resources')}
                  className="w-full py-4 px-4 font-black text-white rounded-lg transition-all transform hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)' }}
                >
                  🔗 Find Community Resources
                </button>
                <button
                  onClick={() => handleSupportSelect('local-help')}
                  className="w-full py-4 px-4 font-black text-white rounded-lg transition-all transform hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)' }}
                >
                  📞 Talk To Someone Locally
                </button>
                <button
                  onClick={() => handleSupportSelect('continue')}
                  className="w-full py-4 px-4 font-black rounded-lg border-2 border-gray-300 text-gray-700 transition-all transform hover:scale-105"
                >
                  Continue On
                </button>
              </div>
            </div>
          )}

          {stage === 'followup' && (
            <div className="w-full max-w-md" style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '28px',
              padding: '28px',
              boxShadow: '0 8px 32px rgba(220, 38, 38, 0.15)',
              border: '2px solid rgba(220, 38, 38, 0.2)',
              animation: 'fadeIn 0.4s ease-out'
            }}>
              <h2 className="text-xl font-black text-gray-800 mb-4">One last thing</h2>
              <p className="text-sm text-gray-700 mb-6">
                Do we have your permission to check in with you about this later?
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleFollowupSelect('yes')}
                  className="w-full py-4 px-4 font-black text-white rounded-lg transition-all transform hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)' }}
                >
                  💙 Yes, please check in
                </button>
                <button
                  onClick={() => handleFollowupSelect('no')}
                  className="w-full py-4 px-4 font-black rounded-lg border-2 border-gray-300 text-gray-700 transition-all transform hover:scale-105"
                >
                  Not right now
                </button>
              </div>
            </div>
          )}

          {stage === 'complete' && (
            <div className="w-full max-w-md text-center" style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '28px',
              padding: '28px',
              boxShadow: '0 8px 32px rgba(220, 38, 38, 0.15)',
              border: '2px solid rgba(220, 38, 38, 0.2)',
              animation: 'fadeIn 0.4s ease-out'
            }}>
              <p className="text-4xl mb-4">💙</p>
              <h2 className="text-2xl font-black text-gray-800 mb-2">Thank you</h2>
              <p className="text-sm text-gray-700 mb-6">
                Your safety matters to us. We've noted your preferences and will be here for you.
              </p>

              <button
                onClick={() => router.push('/quests')}
                className="w-full py-4 font-black text-lg tracking-wider transition-all transform hover:scale-105 rounded-xl"
                style={{ 
                  background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
                  color: 'white'
                }}
              >
                Continue to Dashboard
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
