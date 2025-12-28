'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface User {
  id: number;
  name: string;
  email: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [feeling, setFeeling] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasJournalPrompts, setHasJournalPrompts] = useState(false);
  const [canSubmit, setCanSubmit] = useState(true);
  const [hasExistingQuests, setHasExistingQuests] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState('');
  const router = useRouter();

  // Helper to get user-specific storage key so different accounts have different timers
  const getStorageKey = useCallback((userId: number) => `lastQuestSubmission_${userId}`, []);

  const updateCountdown = useCallback((resetTime: Date) => {
    const now = new Date();
    const diff = resetTime.getTime() - now.getTime();
    
    if (diff <= 0) {
      setTimeUntilReset('');
      setCanSubmit(true);
      if (user) localStorage.removeItem(getStorageKey(user.id));
      sessionStorage.removeItem('generatedQuests');
      sessionStorage.removeItem('journalPrompts');
    } else {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeUntilReset(`${hours}h ${minutes}m`);
    }
  }, [user, getStorageKey]);

  const checkSubmissionStatus = useCallback((currentUser: User) => {
    const storageKey = getStorageKey(currentUser.id);
    const lastSubmission = localStorage.getItem(storageKey);
    const generatedQuests = sessionStorage.getItem('generatedQuests');
    
    if (lastSubmission) {
      const lastSubmitTime = new Date(lastSubmission);
      const now = new Date();
      const hoursSinceSubmit = (now.getTime() - lastSubmitTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceSubmit < 24) {
        setCanSubmit(false);
        setHasExistingQuests(!!generatedQuests);
        
        const resetTime = new Date(lastSubmitTime.getTime() + 24 * 60 * 60 * 1000);
        updateCountdown(resetTime);
        
        const interval = setInterval(() => updateCountdown(resetTime), 60000);
        return () => clearInterval(interval);
      } else {
        localStorage.removeItem(storageKey);
        setCanSubmit(true);
      }
    }
  }, [getStorageKey, updateCountdown]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    
    const journalPrompts = sessionStorage.getItem('journalPrompts');
    setHasJournalPrompts(!!journalPrompts);

    const cleanup = checkSubmissionStatus(parsedUser);
    return () => { if (cleanup) cleanup(); };
  }, [router, checkSubmissionStatus]);

  const handleSubmitFeeling = async () => {
    if (feeling.trim().length < 20) {
      setError('Please share at least 20 characters about how you\'re feeling');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/quests/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ feeling })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to generate quests');

      sessionStorage.setItem('generatedQuests', JSON.stringify(data.quests));
      sessionStorage.setItem('journalPrompts', JSON.stringify(data.journalPrompts));
      
      if (user) {
        localStorage.setItem(getStorageKey(user.id), new Date().toISOString());
      }

      router.push('/quests');

    } catch (err: any) {
      setError(err.message || 'Failed to generate quests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('generatedQuests');
    sessionStorage.removeItem('journalPrompts');
    router.push('/');
  };

  if (!user) return null;

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
      `}</style>

      {/* Header */}
      <div className="bg-white rounded-b-[45px] pt-5 pb-4 px-6 relative z-10" style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.2)', borderBottom: '4px solid #C41E3A' }}>
        <div className="text-center mb-3">
          <div className="inline-block mb-1">
            <span className="text-3xl animate-bounce inline-block" style={{ animation: 'float 3s ease-in-out infinite' }}>🍁</span>
          </div>
          <h2 className="text-2xl font-bold mb-0.5" style={{ background: 'linear-gradient(90deg, #C41E3A 0%, #E63946 50%, #C41E3A 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Welcome, {user.name}!
          </h2>
          <p className="text-xs text-gray-600 font-medium">Hope you're having a great day, eh! 🇨🇦</p>
        </div>
        
        <div className="flex justify-center items-center gap-16">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 bg-gradient-to-r from-orange-400 to-red-500 px-4 py-1.5 rounded-full shadow-lg">
              <span className="text-2xl">🔥</span>
              <span className="text-xl font-bold text-white">12</span>
            </div>
            <span className="text-[10px] font-semibold text-gray-600 mt-1">Day Streak</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-800 px-4 py-1.5 rounded-full shadow-lg">
              <span className="text-2xl">🍁</span>
              <span className="text-xl font-bold text-white">500</span>
            </div>
            <span className="text-[10px] font-semibold text-gray-600 mt-1">Maple Leafs</span>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="flex-1 flex items-center justify-center px-6 pb-24 relative z-10">
        <div className="w-full max-w-md">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-[35px] px-6 py-5 relative shadow-2xl" style={{ border: '3px solid #8B4513' }}>
            <div className="bg-white rounded-3xl px-5 py-2.5 mb-4 text-center relative shadow-md">
              <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 text-2xl">🍁</div>
              <h1 className="text-lg font-bold text-gray-800 pt-1">
                {canSubmit ? 'How are you feeling today, eh?' : 'Today\'s Check-in Complete!'}
              </h1>
              <p className="text-xs text-gray-600 mt-0.5">
                {canSubmit ? 'Share what\'s on your mind' : `Resets in ${timeUntilReset}`}
              </p>
            </div>

            <div className="flex justify-center mb-4">
                <Image src="/images/beaver/welcome_beaver2.png" alt="Beaver" width={120} height={120} className="object-contain" priority />
            </div>

            {error && <div className="mb-3 p-2 bg-red-100 border border-red-400 text-red-700 rounded-2xl text-xs text-center">{error}</div>}

            {canSubmit ? (
              <div className="mb-3">
                <textarea
                  value={feeling}
                  onChange={(e) => { setFeeling(e.target.value); setError(''); }}
                  placeholder='Type your answer here... 🏒'
                  className="w-full p-3 rounded-3xl resize-none text-gray-700 text-xs shadow-inner outline-none border-[3px] border-[#C41E3A] bg-[#FFFBF5]"
                  rows={2}
                />
                <p className="text-[10px] text-gray-500 mt-1 ml-1">{feeling.length}/20 characters minimum</p>
              </div>
            ) : null}

            {/* ACTION BUTTON: Either Submits or Navigates to Quests */}
            <button
              onClick={canSubmit ? handleSubmitFeeling : () => router.push('/quests')}
              disabled={loading || (canSubmit && feeling.trim().length < 20)}
              className="w-full py-3 rounded-full font-bold text-base tracking-wider transition-all transform hover:scale-105 shadow-lg text-white"
              style={{ background: 'linear-gradient(135deg, #C41E3A 0%, #E63946 100%)' }}
            >
              {loading ? '🍁 GENERATING... 🍁' : (canSubmit ? '🍁 SUBMIT 🍁' : '🍁 VIEW QUESTS 🍁')}
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM NAVIGATION: All buttons now have router.push logic */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-amber-50 to-orange-100 rounded-t-[40px] py-3 z-20 border-t-[3px] border-[#8B4513]">
        <div className="flex justify-around items-end max-w-md mx-auto px-8">
          
          <button onClick={() => router.push('/dashboard')} className="flex flex-col items-center gap-0.5 transition-transform hover:scale-110">
            <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-amber-600 to-orange-700 rounded-full shadow-lg"><span className="text-xl">🦫</span></div>
            <span className="text-[10px] font-bold text-[#8B4513]">Billy</span>
          </button>
          
          <button onClick={() => router.push('/dashboard')} className="flex flex-col items-center gap-0.5 -mt-3">
            <div className="rounded-full px-6 py-2 relative bg-gradient-to-br from-[#C41E3A] to-[#E63946] shadow-xl">
              <div className="absolute -top-1.5 -right-1.5 text-lg">🍁</div>
              <div className="w-10 h-10 flex items-center justify-center bg-white rounded-2xl"><span className="text-xl">🏠</span></div>
            </div>
            <span className="text-[10px] font-bold text-[#C41E3A]">Home</span>
          </button>
          
          <button onClick={() => router.push('/journal')} className="flex flex-col items-center gap-0.5 transition-transform hover:scale-110 relative">
            {hasJournalPrompts && <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center z-30 animate-pulse">3</div>}
            <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-gray-600 to-gray-800 rounded-2xl shadow-lg"><span className="text-xl">📖</span></div>
            <span className="text-[10px] font-bold text-[#8B4513]">Journal</span>
          </button>

        </div>
      </div>

      <button onClick={handleLogout} className="absolute top-3 right-4 text-[10px] font-semibold text-white bg-red-600 px-3 py-1.5 rounded-full z-20 shadow-lg">
        🚪 Logout
      </button>
    </main>
  );
}