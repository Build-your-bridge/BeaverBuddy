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
  const [checkingStatus, setCheckingStatus] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    
    // Check if there are journal prompts
    const journalPrompts = sessionStorage.getItem('journalPrompts');
    setHasJournalPrompts(!!journalPrompts);

    // Check session storage first (fallback if API fails)
    const existingQuests = sessionStorage.getItem('generatedQuests');
    const questGeneratedDate = localStorage.getItem('questGeneratedDate');
    const today = new Date().toDateString();

    if (existingQuests && questGeneratedDate === today) {
      // Already generated today based on local storage
      setHasGeneratedToday(true);
      setCheckingStatus(false);
    } else if (questGeneratedDate && questGeneratedDate !== today) {
      // Old quests from a previous day, clear them
      sessionStorage.removeItem('generatedQuests');
      sessionStorage.removeItem('monthlyQuests');
      sessionStorage.removeItem('journalPrompts');
      localStorage.removeItem('questGeneratedDate');
      setHasJournalPrompts(false);
      checkTodayStatus(token);
    } else {
      // Check with backend
      checkTodayStatus(token);
    }
  }, [router]);

  const checkTodayStatus = async (token: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/quests/check-today', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHasGeneratedToday(data.hasGeneratedToday);
        
        // If they have generated today, store the quests in session
        if (data.hasGeneratedToday && data.quests) {
          sessionStorage.setItem('generatedQuests', JSON.stringify(data.quests));
          sessionStorage.setItem('monthlyQuests', JSON.stringify(data.monthlyQuests || []));
          sessionStorage.setItem('journalPrompts', JSON.stringify(data.journalPrompts));
          localStorage.setItem('questGeneratedDate', new Date().toDateString());
          setHasJournalPrompts(true);
        }
      }
    } catch (err) {
      console.error('Error checking today status:', err);
      // Don't set hasGeneratedToday on error - let the localStorage check handle it
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSubmitFeeling = async () => {
    if (hasGeneratedToday) {
      // If already generated, just navigate to quests page
      router.push('/quests');
      return;
    }

    // Validation - 20 characters minimum
    if (feeling.trim().length < 20) {
      setError('Please share at least 20 characters about how you\'re feeling');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      // API call to backend
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

      // Save quests, monthly quests, and journal prompts to sessionStorage
      sessionStorage.setItem('generatedQuests', JSON.stringify(data.quests));
      sessionStorage.setItem('monthlyQuests', JSON.stringify(data.monthlyQuests));
      sessionStorage.setItem('journalPrompts', JSON.stringify(data.journalPrompts));
      
      // Store the date when quests were generated
      localStorage.setItem('questGeneratedDate', new Date().toDateString());

      // Mark as generated today
      setHasGeneratedToday(true);

      // Navigate to quests page
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
    localStorage.removeItem('questGeneratedDate');
    sessionStorage.removeItem('generatedQuests');
    sessionStorage.removeItem('monthlyQuests');
    sessionStorage.removeItem('journalPrompts');
    router.push('/');
  };

  if (!user || checkingStatus) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ 
        background: 'linear-gradient(135deg, #B8312F 0%, #E63946 50%, #8B0000 100%)'
      }}>
        <p className="text-white font-semibold">Loading...</p>
      </div>
    );
  }

  // Generate blue and white maple leaves
  const mapleLeaves = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    left: `${(i * 12) + 5}%`,
    color: i % 3 === 0 ? '#1e40af' : i % 3 === 1 ? '#3b82f6' : '#ffffff',
    animationDuration: `${Math.random() * 4 + 8}s`,
    animationDelay: `${Math.random() * 5}s`,
    fontSize: `${Math.random() * 15 + 25}px`,
  }));

  return (
    <main className="h-screen flex flex-col relative overflow-hidden" style={{ 
      background: 'white'
    }}>
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes fall {
          0% { 
            transform: translateY(-100px) rotate(0deg); 
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 0.9;
          }
          100% { 
            transform: translateY(100vh) rotate(360deg); 
            opacity: 0;
          }
        }
        .maple-leaf {
          position: absolute;
          animation: fall linear infinite;
          pointer-events: none;
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.6));
        }
      `}</style>

      {/* Falling blue and white maple leaves as SVG */}
      {mapleLeaves.map((leaf) => (
        <div
          key={leaf.id}
          className="maple-leaf"
          style={{
            left: leaf.left,
            animationDuration: leaf.animationDuration,
            animationDelay: leaf.animationDelay,
            width: leaf.fontSize,
            height: leaf.fontSize,
          }}
        >
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.8))' }}>
            <path
              d="M50,10 L55,35 L70,25 L60,45 L85,45 L65,55 L75,75 L55,65 L50,90 L45,65 L25,75 L35,55 L15,45 L40,45 L30,25 L45,35 Z"
              fill={leaf.color}
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="1"
            />
          </svg>
        </div>
      ))}

      {/* Simple Header */}
      <div className="relative h-12 md:h-20 flex items-center justify-between px-4 border-b border-gray-300" style={{ background: 'white' }}>
        <button
          onClick={handleLogout}
          className="text-xs md:text-sm font-medium text-gray-600 hover:text-gray-800 shadow-md hover:shadow-lg transition-all px-2 py-1 md:px-3 md:py-2 rounded cursor-pointer"
        >
          🚪 Logout
        </button>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-lg md:text-2xl">🍁</span>
            <span className="text-sm md:text-lg font-bold text-red-600">500</span>
          </div>
          <div className="flex items-center gap-1">
            <Image
              src="/images/icons/fire.png"
              alt="Fire"
              width={40}
              height={40}
              className="w-7 h-7 md:w-10 md:h-10 object-cover"
            />
            <span className="text-sm md:text-lg font-bold text-orange-600">12</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-24">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-[35px] px-6 py-5 relative shadow-2xl" style={{
            boxShadow: '0 20px 60px rgba(139, 69, 19, 0.3)'
          }}>
            <div className="bg-white rounded-xl px-5 py-2.5 mb-4 text-center relative" style={{ 
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
            }}>
              <h1 className="text-lg font-bold text-gray-800 leading-snug pt-1">
                {hasGeneratedToday ? "Today's Check-in Complete! ✓" : "How are you feeling today?"}
              </h1>
              <p className="text-xs text-gray-600 mt-0.5">
                {hasGeneratedToday ? "Come back tomorrow for a new check-in" : "Share what's on your mind"}
              </p>
            </div>

            <div className="flex justify-center mb-4">
              <div className="relative w-35 h-35 md:w-48 md:h-48 flex items-center justify-center">
                <Image
                  src="/images/beaver/default_beaver.png"
                  alt="Beaver mascot"
                  width={200}
                  height={200}
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* Success message when already generated */}
            {hasGeneratedToday && (
              <div className="mb-3 p-3 bg-green-100 border border-green-400 text-green-700 rounded-2xl text-xs text-center">
                ✓ You've already completed today's mental health check-in! View your quests below.
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mb-3 p-2 bg-red-100 border border-red-400 text-red-700 rounded-2xl text-xs text-center">
                {error}
              </div>
            )}

            {/* Input field with character count */}
            <div className="mb-3">
              <textarea
                value={feeling}
                onChange={(e) => {
                  setFeeling(e.target.value);
                  setError('');
                }}
                placeholder={hasGeneratedToday ? 'Check-in complete for today. See you tomorrow! 🍁' : 'Type your answer here... e.g., "I feel great because hockey season started!" 🏒'}
                className="w-full p-3 rounded-2xl resize-none text-gray-700 text-xs leading-relaxed shadow-inner"
                style={{ 
                  border: '1.5px solid #C41E3A',
                  backgroundColor: hasGeneratedToday ? '#f5f5f5' : '#ffffffff',
                  outline: 'none'
                }}
                rows={2}
                disabled={hasGeneratedToday}
              />
              {!hasGeneratedToday && (
                <p className="text-[10px] text-gray-500 mt-1 ml-1">
                  {feeling.length}/20 characters minimum
                </p>
              )}
            </div>

            {/* Button changes based on status */}
            <button
              onClick={handleSubmitFeeling}
              disabled={loading || (!hasGeneratedToday && feeling.trim().length < 20)}
              className="w-full py-3 rounded-2xl font-bold text-base tracking-wider transition-all transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              style={{ 
                background: hasGeneratedToday 
                  ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
                  : 'linear-gradient(135deg, #C41E3A 0%, #E63946 100%)',
                color: 'white',
                boxShadow: hasGeneratedToday 
                  ? '0 8px 20px rgba(37, 99, 235, 0.4)'
                  : '0 8px 20px rgba(196, 30, 58, 0.4)'
              }}
            >
              {loading ? 'GENERATING...' : hasGeneratedToday ? 'VIEW MY QUESTS' : 'SUBMIT & VIEW QUESTS'}
            </button>

            <p className="text-center text-[10px] mt-2 text-gray-500 font-medium">
              {hasGeneratedToday 
                ? 'One check-in per day. Reset at midnight.' 
                : 'Share how you\'re feeling to unlock today\'s quests!'}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="absolute bottom-0 left-0 right-0 h-20 md:h-32 flex items-end justify-around px-4 border-t border-gray-300 pb-2" style={{ background: 'white' }}>
        <div className="flex justify-around items-center max-w-md mx-auto px-8 w-full">
          <button className="flex flex-col items-center transition-transform hover:scale-110">
            <div className="w-16 h-16 md:w-24 md:h-24 flex flex-col items-center justify-center rounded-lg px-2 py-1">
              <Image
                src="/images/icons/billy.png"
                alt="Billy"
                width={96}
                height={96}
                className="w-16 h-16 md:!w-24 md:!h-24 object-contain mb-0.5"
              />
              <span className="text-xs md:text-base font-bold text-gray-600">Billy</span>
            </div>
          </button>
          
          <button className="flex flex-col items-center">
            <div className="w-16 h-16 md:w-24 md:h-24 flex flex-col items-center justify-center rounded-lg px-2 py-1" style={{ backgroundColor: '#e8c4c4' }}>
              <Image
                src="/images/icons/house.png"
                alt="Home"
                width={96}
                height={96}
                className="w-16 h-16 md:!w-24 md:!h-24 object-contain mb-0.5"
              />
              <span className="text-xs md:text-base font-bold text-red-600">Home</span>
            </div>
          </button>
          
          <button 
            onClick={() => router.push('/journal')}
            className="flex flex-col items-center transition-transform hover:scale-110 relative"
          >
            {hasJournalPrompts && (
              <div className="absolute top-3 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center z-10 animate-pulse">
                3
              </div>
            )}
            <div className="w-16 h-16 md:w-24 md:h-24 flex flex-col items-center justify-center px-2 py-1">
              <Image
                src="/images/icons/grey_journal.png"
                alt="Journal"
                width={96}
                height={96}
                className="w-16 h-16 md:!w-24 md:!h-24 object-contain mb-0.5"
              />
              <span className="text-xs md:text-base font-bold text-gray-600">Journal</span>
            </div>
          </button>
        </div>
      </div>

    </main>
  );
}