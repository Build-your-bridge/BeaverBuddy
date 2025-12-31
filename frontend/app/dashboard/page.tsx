'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

interface User {
  id: number;
  name: string;
  email: string;
  points: number;
  equippedOutfit?: {
    id: number;
    name: string;
    image: string;
  } | null;
}

interface Helpline {
  name: string;
  number: string;
  available: string;
  description: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [feeling, setFeeling] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasJournalPrompts, setHasJournalPrompts] = useState(false);
  const [remainingJournalCount, setRemainingJournalCount] = useState(0);
  const [hasGeneratedToday, setHasGeneratedToday] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [currentPoints, setCurrentPoints] = useState(500);
  const [isCrisis, setIsCrisis] = useState(false);
  const [crisisData, setCrisisData] = useState<{
    message: string;
    helplines: Helpline[];
    additionalMessage: string;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    const currentUserId = parsedUser.id;
    
    // Check for crisis lockout
    const crisisLockout = localStorage.getItem(`crisisLockout_${currentUserId}`);
    const questGeneratedDate = localStorage.getItem(`questGeneratedDate_${currentUserId}`);
    const today = new Date().toDateString();
    
    // If there's a crisis lockout and it's still today, keep them locked out
    if (crisisLockout === 'true' && questGeneratedDate === today) {
      setHasGeneratedToday(true);
      setIsCrisis(true);
      // You can show a gentle message that they're in cooldown
    }
    
    // Clear crisis lockout if it's a new day
    if (crisisLockout === 'true' && questGeneratedDate !== today) {
      localStorage.removeItem(`crisisLockout_${currentUserId}`);
    }
    
    updateJournalCount(currentUserId);

    const existingQuests = sessionStorage.getItem(`generatedQuests_${currentUserId}`);

    if (existingQuests && questGeneratedDate === today) {
      setHasGeneratedToday(true);
      fetchUserPoints(token);
    } else if (questGeneratedDate && questGeneratedDate !== today) {
      sessionStorage.removeItem(`generatedQuests_${currentUserId}`);
      sessionStorage.removeItem(`monthlyQuests_${currentUserId}`);
      sessionStorage.removeItem(`journalPrompts_${currentUserId}`);
      localStorage.removeItem(`questGeneratedDate_${currentUserId}`);
      setHasJournalPrompts(false);
      setCheckingStatus(true);
      checkTodayStatus(token);
      fetchUserPoints(token);
    } else {
      setCheckingStatus(true);
      checkTodayStatus(token);
      fetchUserPoints(token);
    }
  }, [router]);

  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        updateJournalCount(user.id);
      }
    };
    
    const handleJournalUpdate = () => {
      if (user) {
        updateJournalCount(user.id);
      }
    };
    
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        updateJournalCount(user.id);
      }
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('journalUpdated', handleJournalUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('journalUpdated', handleJournalUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const updateJournalCount = (userId: number) => {
    const journalPromptsData = sessionStorage.getItem(`journalPrompts_${userId}`);
    
    if (journalPromptsData) {
      try {
        const prompts = JSON.parse(journalPromptsData);
        const normalizedPrompts = Array.isArray(prompts) ? prompts.map((p: any) => {
          if (typeof p === 'string') {
            return { question: p, answer: null, answeredAt: null };
          }
          return { question: p.question, answer: p.answer || null, answeredAt: p.answeredAt || null };
        }) : [];
        
        const remaining = normalizedPrompts.filter((p: any) => p.answer === null).length;
        setRemainingJournalCount(remaining);
        setHasJournalPrompts(remaining > 0);
      } catch (error) {
        console.error('Error parsing journal prompts:', error);
        setHasJournalPrompts(false);
        setRemainingJournalCount(0);
      }
    } else {
      setHasJournalPrompts(false);
      setRemainingJournalCount(0);
    }
  };

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
            updateJournalCount(currentUser.id);
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

  const fetchUserPoints = async (token: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/outfits/user/points', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const pointsData = await response.json();
        setCurrentPoints(pointsData.points);
      }
    } catch (error) {
      console.error('Error fetching user points:', error);
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
    setIsCrisis(false);

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

      // Check if this is a crisis response
      if (data.isCrisis) {
        setIsCrisis(true);
        setCrisisData({
          message: data.message,
          helplines: data.helplines,
          additionalMessage: data.additionalMessage
        });
        
        // Mark as generated today to lock them out
        if (data.lockedOut) {
          const userData = localStorage.getItem('user');
          if (userData) {
            const currentUser = JSON.parse(userData);
            localStorage.setItem(`questGeneratedDate_${currentUser.id}`, new Date().toDateString());
            // Set a special flag indicating crisis lockout
            localStorage.setItem(`crisisLockout_${currentUser.id}`, 'true');
          }
          setHasGeneratedToday(true);
        }
        
        setLoading(false);
        return;
      }

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
        updateJournalCount(currentUser.id);
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
    <main className="h-screen flex flex-col overflow-hidden relative" style={{ background: 'linear-gradient(to bottom, #E8D4C0 0%, #F5E6D3 100%)' }}>
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
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

      {/* Header */}
      <Header 
        title="Dashboard" 
        points={currentPoints} 
        onLogout={handleLogout}
      />

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-28 relative z-10 overflow-y-auto">
        <div className="w-full max-w-lg py-6">
          {/* Glass card */}
          <div className="relative" style={{
            background: 'rgba(255, 255, 255, 1)',
            backdropFilter: 'blur(20px)',
            borderRadius: '40px',
            padding: '32px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            
            {/* Crisis Response View */}
            {isCrisis && crisisData ? (
              <div className="space-y-6">
                {/* Speech bubble */}
                <div className="text-left relative" style={{ 
                  background: 'rgba(254, 226, 226, 0.8)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '25px',
                  padding: '20px 24px',
                  boxShadow: '0 8px 10px rgba(0, 0, 0, 0.2)',
                  border: '2px solid rgba(252, 165, 165, 0.5)'
                }}>
                  <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                    <svg width="30" height="20" viewBox="0 0 30 20" fill="none">
                      <path d="M 5 0 Q 15 10 25 0 L 18 15 L 12 15 Z" fill="rgba(254, 226, 226, 0.8)"/>
                    </svg>
                  </div>
                  <h1 className="text-2xl font-black text-red-900 leading-tight mb-2">
                    🆘 Immediate Support Needed
                  </h1>
                  <p className="text-sm text-gray-800 leading-relaxed font-semibold">
                    {crisisData.message}
                  </p>
                </div>

                {/* Billy with concerned expression */}
                <div className="flex justify-center mb-4 mt-8">
                  <div className="relative w-44 h-44">
                    <Image
                      src={user?.equippedOutfit?.image || "/images/beaver/default/default.png"}
                      alt="Billy is concerned"
                      width={176}
                      height={176}
                      className="object-contain drop-shadow-2xl"
                      priority
                    />
                  </div>
                </div>

                {/* Helplines */}
                <div className="space-y-3">
                  <h2 className="text-lg font-black text-gray-900 text-center mb-3">
                    📞 Crisis Support Resources
                  </h2>
                  {crisisData.helplines.map((helpline, idx) => (
                    <div key={idx} className="rounded-2xl p-3 border-2 shadow-sm" style={{
                      background: 'linear-gradient(to right, rgba(219, 234, 254, 0.8), rgba(191, 219, 254, 0.8))',
                      borderColor: 'rgba(147, 197, 253, 0.8)'
                    }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="font-black text-gray-900 text-xs mb-1">{helpline.name}</h3>
                          <p className="text-xs text-gray-700 mb-0.5">{helpline.description}</p>
                          <p className="text-xs text-gray-600 font-semibold">Available: {helpline.available}</p>
                        </div>
                        <div className="flex-shrink-0">
                          <a 
                            href={helpline.number.startsWith('1-') ? `tel:${helpline.number}` : '#'}
                            className="block bg-blue-600 text-white px-3 py-2 rounded-full font-black text-xs hover:bg-blue-700 transition-all text-center whitespace-nowrap"
                          >
                            {helpline.number.includes('Text') ? 'TEXT' : 
                             helpline.number.includes('Visit') ? 'VISIT' : 'CALL'}
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Additional message */}
                <div className="rounded-2xl p-4 border-2 text-center" style={{
                  background: 'rgba(220, 252, 231, 0.8)',
                  borderColor: 'rgba(134, 239, 172, 0.8)'
                }}>
                  <p className="text-xs font-bold text-green-900 leading-relaxed">
                    {crisisData.additionalMessage}
                  </p>
                </div>

                {/* Back button */}
                <button
                  onClick={() => {
                    setIsCrisis(false);
                    setCrisisData(null);
                    setFeeling('');
                  }}
                  className="w-full py-3 rounded-full font-black text-sm text-white shadow-md hover:shadow-lg transition-all hover:scale-105"
                  style={{ background: '#6B7280' }}
                >
                  ← GO BACK
                </button>
              </div>
            ) : (
              /* Normal Check-in View */
              <>
                {/* Speech bubble */}
                <div className="mb-6 text-left relative" style={{ 
                  background: hasGeneratedToday ? 'rgba(220, 252, 231, 0.6)' : 'rgba(255, 255, 255, 0.4)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '25px',
                  padding: '20px 24px',
                  boxShadow: '0 8px 10px rgba(0, 0, 0, 0.2)'
                }}>
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
                      src={user?.equippedOutfit?.image || "/images/beaver/default/default.png"}
                      alt="Beaver mascot"
                      width={240}
                      height={240}
                      className="object-contain drop-shadow-2xl"
                      priority
                      style={{ animation: 'float 3s ease-in-out infinite' }}
                    />
                  </div>
                </div>

                {/* Success/Error messages */}
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

                {/* Input field */}
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
                        border: '2px solid rgba(236, 72, 153, 0.3)',
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
                  className={`w-full py-4 font-black text-lg tracking-wider transition-all transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer ${
                    hasGeneratedToday || (!loading && feeling.trim().length >= 20) ? 'hover:scale-105' : ''
                  }`}
                  style={{ 
                    borderRadius: '20px',
                    background: loading || (!hasGeneratedToday && feeling.trim().length < 20) ? '#9CA3AF' : '#a12b2b',
                    color: 'white'
                  }}
                >
                  {loading ? 'GENERATING...' : hasGeneratedToday ? 'VIEW MY QUESTS' : 'SUBMIT & VIEW QUESTS'}
                </button>

                <p className="text-center text-xs mt-3 text-gray-700 font-semibold">
                  {hasGeneratedToday 
                    ? 'One check-in per day. Reset at midnight.' 
                    : 'Share how you\'re feeling to unlock today\'s quests!'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav currentPage="dashboard" hasJournalPrompts={hasJournalPrompts} remainingJournalCount={remainingJournalCount} />
    </main>
  );
}