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
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
  }, [router]);

  const handleSubmitFeeling = async () => {
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

      // Save quests to sessionStorage
      sessionStorage.setItem('generatedQuests', JSON.stringify(data.quests));

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
    sessionStorage.removeItem('generatedQuests'); // Clear quest data
    router.push('/');
  };

  if (!user) {
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

      {/* Header with Canadian flag colors */}
      <div className="bg-white rounded-b-[45px] pt-5 pb-4 px-6 relative" style={{ 
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        borderBottom: '4px solid #C41E3A'
      }}>
        <div className="text-center mb-3">
          <div className="inline-block mb-1">
            <span className="text-3xl animate-bounce inline-block" style={{ animation: 'float 3s ease-in-out infinite' }}>🍁</span>
          </div>
          <h2 className="text-2xl font-bold mb-0.5" style={{ 
            background: 'linear-gradient(90deg, #C41E3A 0%, #E63946 50%, #C41E3A 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
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

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-24">
        <div className="w-full max-w-md">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-[35px] px-6 py-5 relative shadow-2xl" style={{
            border: '3px solid #8B4513',
            boxShadow: '0 20px 60px rgba(139, 69, 19, 0.3)'
          }}>
            <div className="bg-white rounded-3xl px-5 py-2.5 mb-4 text-center relative" style={{ 
              boxShadow: '0 8px 20px rgba(196, 30, 58, 0.15)',
              border: '2px solid #FFE5E5'
            }}>
              <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 text-2xl">🍁</div>
              <h1 className="text-lg font-bold text-gray-800 leading-snug pt-1">
                How are you feeling today, eh?
              </h1>
              <p className="text-xs text-gray-600 mt-0.5">Share what's on your mind</p>
            </div>

            <div className="flex justify-center mb-4">
              <div className="relative w-32 h-32 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center shadow-lg" style={{
                border: '3px solid #8B4513'
              }}>
                <Image
                  src="/images/beaver/welcome_beaver2.png"
                  alt="Beaver mascot"
                  width={120}
                  height={120}
                  className="object-contain"
                  priority
                />
              </div>
            </div>

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
                placeholder='Type your answer here... e.g., "I feel great because hockey season started!" 🏒'
                className="w-full p-3 rounded-3xl resize-none text-gray-700 text-xs leading-relaxed shadow-inner"
                style={{ 
                  border: '3px solid #C41E3A',
                  backgroundColor: '#FFFBF5',
                  outline: 'none'
                }}
                rows={2}
              />
              <p className="text-[10px] text-gray-500 mt-1 ml-1">
                {feeling.length}/20 characters minimum
              </p>
            </div>

            {/* Disabled button until 20 characters */}
            <button
              onClick={handleSubmitFeeling}
              disabled={loading || feeling.trim().length < 20}
              className="w-full py-3 rounded-full font-bold text-base tracking-wider transition-all transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              style={{ 
                background: 'linear-gradient(135deg, #C41E3A 0%, #E63946 100%)',
                color: 'white',
                boxShadow: '0 8px 20px rgba(196, 30, 58, 0.4)'
              }}
            >
              {loading ? '🍁 GENERATING... 🍁' : '🍁 VIEW QUESTS 🍁'}
            </button>

            <p className="text-center text-[10px] mt-2 text-gray-500 font-medium">
              Share your feelings to unlock today's Canadian quests!
            </p>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-amber-50 to-orange-100 rounded-t-[40px] py-3" style={{ 
        boxShadow: '0 -8px 30px rgba(139, 69, 19, 0.3)',
        borderTop: '3px solid #8B4513'
      }}>
        <div className="flex justify-around items-end max-w-md mx-auto px-8">
          <button className="flex flex-col items-center gap-0.5 transition-transform hover:scale-110">
            <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-amber-600 to-orange-700 rounded-full shadow-lg">
              <span className="text-xl">🦫</span>
            </div>
            <span className="text-[10px] font-bold" style={{ color: '#8B4513' }}>Billy</span>
          </button>
          
          <button className="flex flex-col items-center gap-0.5 -mt-3">
            <div className="rounded-full px-6 py-2 relative" style={{ 
              background: 'linear-gradient(135deg, #C41E3A 0%, #E63946 100%)',
              boxShadow: '0 8px 25px rgba(196, 30, 58, 0.5)'
            }}>
              <div className="absolute -top-1.5 -right-1.5 text-lg">🍁</div>
              <div className="w-10 h-10 flex items-center justify-center bg-white rounded-2xl">
                <span className="text-xl">🏠</span>
              </div>
            </div>
            <span className="text-[10px] font-bold" style={{ color: '#C41E3A' }}>Home</span>
          </button>
          
          <button className="flex flex-col items-center gap-0.5 transition-transform hover:scale-110">
            <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-gray-600 to-gray-800 rounded-2xl shadow-lg">
              <span className="text-xl">📖</span>
            </div>
            <span className="text-[10px] font-bold" style={{ color: '#8B4513' }}>Journal</span>
          </button>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="absolute top-3 right-4 text-[10px] font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-full z-10 shadow-lg transition-all"
      >
        🚪 Logout
      </button>
    </main>
  );
}