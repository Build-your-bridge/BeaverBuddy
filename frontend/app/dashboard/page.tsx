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

  const handleSubmitFeeling = () => {
    console.log('Feeling:', feeling);
    alert('Thanks for sharing! 🦫');
    setFeeling('');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #F8C4C4 0%, #E8B4B4 100%)' }}>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <main className="h-screen flex flex-col relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #F8C4C4 0%, #E8B4B4 100%)' }}>
      {/* Header with stats */}
      <div className="bg-white rounded-b-[50px] pt-6 pb-5 px-6">
        {/* Welcome message */}
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Welcome, {user.name}! 👋
          </h2>
        </div>
        
        {/* Stats */}
        <div className="flex justify-center items-center gap-24">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🔥</span>
            <span className="text-2xl font-bold" style={{ color: '#FF6B35' }}>12</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">🍁</span>
            <span className="text-2xl font-bold" style={{ color: '#E63946' }}>500</span>
          </div>
        </div>
      </div>

      {/* Main content - centered vertically with proper spacing */}
      <div className="flex-1 flex items-center justify-center px-6 pb-28">
        <div className="w-full max-w-md">
          {/* White card container */}
          <div className="bg-white rounded-[35px] px-8 py-7 relative">
            {/* Question speech bubble */}
            <div className="bg-white rounded-3xl px-6 py-3 mb-6 text-center" style={{ boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
              <h1 className="text-xl font-bold text-gray-800 leading-relaxed">
                How are you feeling today and<br/>why?
              </h1>
            </div>

            {/* Beaver mascot */}
            <div className="flex justify-center mb-6">
              <div className="relative w-40 h-40">
                <Image
                  src="/images/beaver/welcome_beaver2.png"
                  alt="Beaver mascot"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* Input field */}
            <div className="mb-5">
              <textarea
                value={feeling}
                onChange={(e) => setFeeling(e.target.value)}
                placeholder='Type your answer here... e.g., "I feel stressed because finding a job is hard."'
                className="w-full p-4 rounded-3xl resize-none text-gray-700 text-sm leading-relaxed"
                style={{ 
                  border: '2px solid #FFB3BA',
                  backgroundColor: '#FFF5F5',
                  outline: 'none'
                }}
                rows={3}
              />
            </div>

            {/* Quests button */}
            <button
              onClick={handleSubmitFeeling}
              className="w-full py-4 rounded-full font-bold text-lg tracking-wider transition-all"
              style={{ 
                backgroundColor: '#D3D3D3',
                color: 'white'
              }}
            >
              QUESTS
            </button>

            {/* Helper text */}
            <p className="text-center text-xs mt-3" style={{ color: '#B8B8B8' }}>
              Share how you're feeling to see today's quests!
            </p>
          </div>
        </div>
      </div>

      {/* Bottom navigation - fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[40px] py-4" style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.1)' }}>
        <div className="flex justify-around items-end max-w-md mx-auto px-8">
          {/* Biby */}
          <button className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D4A574' }}>
                <span className="text-xl">🦫</span>
              </div>
            </div>
            <span className="text-xs font-semibold" style={{ color: '#4A4A4A' }}>Biby</span>
          </button>
          
          {/* Home - active */}
          <button className="flex flex-col items-center gap-1 -mt-3">
            <div className="rounded-full px-8 py-3" style={{ backgroundColor: '#FFD5D8' }}>
              <div className="w-10 h-10 flex items-center justify-center" style={{ backgroundColor: '#FFA8B0', borderRadius: '12px' }}>
                <span className="text-2xl">🏠</span>
              </div>
            </div>
            <span className="text-xs font-bold" style={{ color: '#E63946' }}>Home</span>
          </button>
          
          {/* Journal */}
          <button className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 flex items-center justify-center">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#7A7A7A' }}>
                <span className="text-xl">📖</span>
              </div>
            </div>
            <span className="text-xs font-semibold" style={{ color: '#4A4A4A' }}>Journal</span>
          </button>
        </div>
      </div>

      {/* Temporary logout button */}
      <button
        onClick={handleLogout}
        className="absolute top-2 right-4 text-xs text-gray-400 hover:text-gray-600 underline bg-white/70 px-3 py-1 rounded-full z-10"
      >
        Logout
      </button>
    </main>
  );
}