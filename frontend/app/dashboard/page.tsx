'use client';

import { useEffect, useState } from 'react';
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
  const [hasGeneratedToday, setHasGeneratedToday] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    const currentUserId = JSON.parse(userData).id;
    
    const journalPrompts = sessionStorage.getItem(`journalPrompts_${currentUserId}`);
    setHasJournalPrompts(!!journalPrompts);

    const existingQuests = sessionStorage.getItem(`generatedQuests_${currentUserId}`);
    const questGeneratedDate = localStorage.getItem(`questGeneratedDate_${currentUserId}`);
    const today = new Date().toDateString();

    if (existingQuests && questGeneratedDate === today) {
      setHasGeneratedToday(true);
    } else if (questGeneratedDate && questGeneratedDate !== today) {
      sessionStorage.removeItem(`generatedQuests_${currentUserId}`);
      sessionStorage.removeItem(`monthlyQuests_${currentUserId}`);
      sessionStorage.removeItem(`journalPrompts_${currentUserId}`);
      localStorage.removeItem(`questGeneratedDate_${currentUserId}`);
      setHasJournalPrompts(false);
      setCheckingStatus(true);
      checkTodayStatus(token);
    } else {
      setCheckingStatus(true);
      checkTodayStatus(token);
    }
  }, [router]);

  const checkTodayStatus = async (token: string) => {
    const timeoutId = setTimeout(() => {
      setCheckingStatus(false);
    }, 10000);
    
    try {
      const response = await fetch('http://localhost:5000/api/quests/check-today', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setHasGeneratedToday(data.hasGeneratedToday);
        
        if (data.hasGeneratedToday && data.quests) {
          const userData = localStorage.getItem('user');
          if (userData) {
            const currentUser = JSON.parse(userData);
            sessionStorage.setItem(`generatedQuests_${currentUser.id}`, JSON.stringify(data.quests));
            sessionStorage.setItem(`monthlyQuests_${currentUser.id}`, JSON.stringify(data.monthlyQuests || []));
            sessionStorage.setItem(`journalPrompts_${currentUser.id}`, JSON.stringify(data.journalPrompts));
            localStorage.setItem(`questGeneratedDate_${currentUser.id}`, new Date().toDateString());
            setHasJournalPrompts(true);
          }
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Error checking today status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSubmitFeeling = async () => {
    if (hasGeneratedToday) {
      router.push('/quests');
      return;
    }

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

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate quests');
      }

      const userData = localStorage.getItem('user');
      if (userData) {
        const currentUser = JSON.parse(userData);
        sessionStorage.setItem(`generatedQuests_${currentUser.id}`, JSON.stringify(data.quests));
        sessionStorage.setItem(`monthlyQuests_${currentUser.id}`, JSON.stringify(data.monthlyQuests));
        sessionStorage.setItem(`journalPrompts_${currentUser.id}`, JSON.stringify(data.journalPrompts));
        localStorage.setItem(`questGeneratedDate_${currentUser.id}`, new Date().toDateString());
      }

      setHasGeneratedToday(true);
      router.push('/quests');

    } catch (err: any) {
      setError(err.message || 'Failed to generate quests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const currentUser = JSON.parse(userData);
      localStorage.removeItem(`questGeneratedDate_${currentUser.id}`);
      sessionStorage.removeItem(`generatedQuests_${currentUser.id}`);
      sessionStorage.removeItem(`monthlyQuests_${currentUser.id}`);
      sessionStorage.removeItem(`journalPrompts_${currentUser.id}`);
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
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
    <main className="h-screen flex flex-col relative overflow-hidden bg-white">
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>

      {/* Floating sparkles */}
      <div className="absolute top-20 left-20 text-gray-400 text-3xl z-5" style={{ animation: 'sparkle 3s ease-in-out infinite' }}>✦</div>
      <div className="absolute top-32 right-32 text-gray-400 text-2xl z-5" style={{ animation: 'sparkle 3s ease-in-out infinite', animationDelay: '1s' }}>✦</div>
      <div className="absolute bottom-40 left-40 text-gray-400 text-2xl z-5" style={{ animation: 'sparkle 3s ease-in-out infinite', animationDelay: '2s' }}>✦</div>

      {/* Header - Glass */}
      <div className="relative h-20 flex items-center justify-between px-6 z-10" style={{ 
        background: 'rgba(255, 255, 255, 0.15)', 
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <button
          onClick={handleLogout}
          className="text-sm font-bold text-gray-800 hover:text-gray-900 transition-all px-4 py-2 rounded-xl bg-white/60 backdrop-blur-md shadow-lg border border-white/40"
        >
          🪵 Logout
        </button>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-white/40">
            <span className="text-2xl">🍁</span>
            <span className="text-lg font-black text-gray-800">500</span>
          </div>
          <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-white/40">
            <span className="text-2xl">🔥</span>
            <span className="text-lg font-black text-gray-800">12</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-28 relative z-10">
        <div className="w-full max-w-lg">
          {/* Glass card - you can see Toronto through it! */}
          <div className="relative" style={{
            background: 'rgba(255, 255, 255, 1)',
            backdropFilter: 'blur(20px)',
            borderRadius: '40px',
            padding: '32px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            {/* Speech bubble - also glass! */}
            <div className="mb-6 text-left relative" style={{ 
              background: 'rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(10px)',
              borderRadius: '25px',
              padding: '20px 24px',
              boxShadow: '0 8px 10px rgba(0, 0, 0, 0.2)'
            }}>
              {/* Speech bubble tail */}
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                <svg width="30" height="20" viewBox="0 0 30 20" fill="none">
                  <path d="M 5 0 Q 15 10 25 0 L 18 15 L 12 15 Z" fill="white"/>
                </svg>
              </div>
              <h1 className="text-2xl font-black text-gray-800 leading-tight">
                {hasGeneratedToday ? "Today's Check-in Complete! ✓" : `Hi ${user.name}, how are you feeling today?`}
              </h1>
              <p className="text-sm text-gray-700 mt-1 font-semibold">
                {hasGeneratedToday ? "Come back tomorrow for a new check-in" : "Share what's on your mind"}
              </p>
            </div>

            {/* Billy Beaver */}
            <div className="flex justify-center mb-6">
              <div className="relative w-52 h-52">
                <Image
                  src="/images/beaver/default_beaver.png"
                  alt="Beaver mascot"
                  width={240}
                  height={240}
                  className="object-contain drop-shadow-2xl"
                  priority
                  style={{ animation: 'float 3s ease-in-out infinite' }}
                />
              </div>
            </div>

            {/* Success/Error messages - glass style */}
            {hasGeneratedToday && (
              <div className="mb-4 p-3 text-center font-bold text-sm" style={{
                background: 'rgba(34, 197, 94, 0.3)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                color: '#166534'
              }}>
                ✓ You've already completed today's daily check-in! View your quests below.
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 text-center font-bold text-sm" style={{
                background: 'rgba(239, 68, 68, 0.3)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#991b1b'
              }}>
                {error}
              </div>
            )}

            {/* Input field - glass textarea */}
            {!hasGeneratedToday && (
              <div className="mb-4">
                <textarea
                  value={feeling}
                  onChange={(e) => {
                    setFeeling(e.target.value);
                    setError('');
                  }}
                  placeholder="Type your answer here... e.g., 'I feel great because hockey season started!' 🏒"
                  className="w-full p-4 resize-none text-gray-800 placeholder-gray-500 text-sm leading-relaxed"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '20px',
                    border: '2x solid rgba(236, 72, 153, 0.3)',
                    outline: 'none',
                    boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.05)'
                  }}
                  rows={3}
                  onFocus={(e) => e.target.style.border = '2px solid rgba(236, 72, 153, 0.6)'}
                  onBlur={(e) => e.target.style.border = '2px solid rgba(236, 72, 153, 0.3)'}
                />
                <p className="text-xs text-gray-700 mt-2 ml-1 font-semibold">
                  {feeling.length}/20 characters minimum
                </p>
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={handleSubmitFeeling}
              disabled={loading || (!hasGeneratedToday && feeling.trim().length < 20)}
              className="w-full py-4 font-black text-lg tracking-wider transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              style={{ 
                borderRadius: '20px',
                background: '#ce5c5c',
                color: 'white',
                boxShadow: '0 10px 30px rgba(236, 72, 153, 0.4)'
              }}
            >
              {loading ? 'GENERATING...' : hasGeneratedToday ? 'VIEW MY QUESTS' : 'SUBMIT & VIEW QUESTS'}
            </button>

            <p className="text-center text-xs mt-3 text-gray-700 font-semibold">
              {hasGeneratedToday 
                ? 'One check-in per day. Reset at midnight.' 
                : 'Share how you\'re feeling to unlock today\'s quests!'}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom navigation - glass */}
      <div className="absolute bottom-0 left-0 right-0 h-28 flex items-center justify-center px-4 z-10" style={{ 
        background: 'rgba(255, 255, 255, 0.15)', 
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div className="flex justify-center items-center gap-8 w-full max-w-2xl pb-4">
          <button className="flex flex-col items-center transition-transform hover:scale-110">
            <div className="w-24 h-24 flex flex-col items-center justify-center rounded-3xl px-3 py-2" style={{
              background: 'rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)'
            }}>
              <Image
                src="/images/icons/billy.png"
                alt="Billy"
                width={64}
                height={64}
                className="w-14 h-14 object-contain mb-1"
              />
              <span className="text-xs font-black text-gray-800">Billy</span>
            </div>
          </button>
          
          <button className="flex flex-col items-center">
            <div className="w-24 h-24 flex flex-col items-center justify-center rounded-3xl px-3 py-2" style={{
              background: 'rgba(255, 22, 22, 0.22)',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(236, 72, 72, 0.4)',
              boxShadow: '0 8px 24px rgba(236, 72, 153, 0.3)'
            }}>
              <Image
                src="/images/icons/house.png"
                alt="Home"
                width={64}
                height={64}
                className="w-14 h-14 object-contain mb-1"
              />
              <span className="text-xs font-black text-pink-700">Home</span>
            </div>
          </button>
          
          <button 
            onClick={() => router.push('/journal')}
            className="flex flex-col items-center transition-transform hover:scale-110 relative"
          >
            {hasJournalPrompts && (
              <div className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white text-xs font-black rounded-full w-7 h-7 flex items-center justify-center z-10 shadow-lg border-2 border-white animate-pulse">
                3
              </div>
            )}
            <div className="w-24 h-24 flex flex-col items-center justify-center rounded-3xl px-3 py-2" style={{
              background: 'rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)'
            }}>
              <Image
                src={hasJournalPrompts ? "/images/icons/journal.png" : "/images/icons/grey_journal.png"}
                alt="Journal"
                width={64}
                height={64}
                className="w-14 h-14 object-contain mb-1"
              />
              <span className="text-xs font-black text-gray-800">Journal</span>
            </div>
          </button>
        </div>
      </div>
    </main>
  );
}