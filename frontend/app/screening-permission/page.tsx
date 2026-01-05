'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

export default function ScreeningPermissionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [feeling, setFeeling] = useState('');
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
          title="Understanding Better" 
          points={0}
          streak={0}
          onLogout={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            router.push('/');
          }}
        />

        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-24 relative z-10">
          <div
            className="w-full max-w-md"
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
            <p className="text-4xl mb-4 text-center">💙</p>
            <h2 className="text-2xl font-black text-gray-800 mb-4 text-center">Thank you for sharing</h2>
            <p className="text-sm text-gray-700 mb-8 text-center">
              I appreciate you opening up. Understanding what you're going through helps me support you better.
            </p>

            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-gray-800 mb-2">Can I ask you one question to understand this better?</p>
              <p className="text-xs text-gray-600">
                It'll just take a minute, and it helps me give you the right kind of support.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => router.push(`/screening?feeling=${encodeURIComponent(feeling)}`)}
                className="w-full py-4 font-black text-lg tracking-wider transition-all transform hover:scale-105 rounded-xl"
                style={{ 
                  background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
                  color: 'white'
                }}
              >
                Yes, Ask Away
              </button>

              <button
                onClick={() => router.push('/quests')}
                className="w-full py-3 font-semibold rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
              >
                Not Now
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
