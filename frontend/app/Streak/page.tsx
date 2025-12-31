// app/Streak/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

function StreakContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(false);
  const [user, setUser] = useState<any>(null);

  const currentStreak = parseInt(searchParams.get('streak') || '1');
  const todayPrize = parseInt(searchParams.get('prize') || '5');

  useEffect(() => {
    // Get user data
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Fade in animation
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleContinue = () => {
    router.push('/dashboard');
  };

  const streakRewards = [
    { day: 1, reward: 5 },
    { day: 2, reward: 10 },
    { day: 3, reward: 15 },
    { day: 4, reward: 20 },
    { day: 5, reward: 25 },
    { day: 6, reward: 30 },
    { day: 7, reward: 35 }
  ];

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: 'linear-gradient(to bottom, #E8D4C0 0%, #F5E6D3 100%)',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out'
      }}
    >
      <div 
        className="relative w-full max-w-lg"
        style={{
          transform: isVisible ? 'scale(1)' : 'scale(0.9)',
          transition: 'transform 0.3s ease-in-out'
        }}
      >
        {/* Main Card */}
        <div className="relative" style={{
          background: 'linear-gradient(135deg, #FF9A9E 0%, #FAD0C4 50%, #FFB6B9 100%)',
          borderRadius: '32px',
          padding: '32px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          border: '3px solid rgba(255, 255, 255, 0.5)'
        }}>

          {/* Today's Prize Badge */}
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-full px-6 py-2 shadow-lg">
              <p className="text-xl font-black text-gray-900">
                Today's Prize: 🍁 {todayPrize}x
              </p>
            </div>
          </div>

          {/* Beaver Character */}
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-3xl p-4 shadow-xl" style={{ width: '180px', height: '180px' }}>
              <div className="relative w-full h-full flex items-center justify-center">
                <Image
                  src={user?.equippedOutfit?.image || "/images/beaver/default/default.png"}
                  alt="Streak Beaver"
                  width={140}
                  height={140}
                  className="object-contain"
                />
              </div>
            </div>
          </div>

          {/* Congratulations Message */}
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 rounded-2xl px-6 py-3 shadow-md">
              <p className="text-center font-black text-gray-900 text-sm">
                Congrats on your {currentStreak} Day Streak!<br />
                Return tomorrow for more prizes!
              </p>
            </div>
          </div>

          {/* Streak Days */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {streakRewards.map((item) => (
              <div key={item.day} className="flex flex-col items-center">
                <div className={`bg-white rounded-lg px-2 py-1 mb-1 shadow-md ${
                  item.day <= currentStreak ? 'ring-2 ring-green-500' : ''
                }`}>
                  <p className="text-xs font-black text-gray-900">Day {item.day}</p>
                </div>
                <div className={`bg-white rounded-full p-2 shadow-md relative ${
                  item.day === currentStreak ? 'ring-4 ring-yellow-400 animate-pulse' : 
                  item.day < currentStreak ? 'opacity-60' : ''
                }`}>
                  <div className="text-2xl">🍁</div>
                  <div className="absolute -bottom-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-black">
                    {item.reward}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            className="w-full py-3 rounded-full font-black text-sm text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
            style={{ background: '#a12b2b' }}
          >
            CONTINUE TO DASHBOARD
          </button>
        </div>
      </div>
    </div>
  );
}
export default function StreakPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-gradient-to-b from-red-200 to-red-100"><p>Loading...</p></div>}>
      <StreakContent />
    </Suspense>
  );
}
