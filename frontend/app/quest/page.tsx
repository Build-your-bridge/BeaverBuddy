'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Quest {
  title: string;
  description: string;
  points: number;
  difficulty: string;
  category: string;
}

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get quests from sessionStorage
    const questsData = sessionStorage.getItem('generatedQuests');
    
    if (!questsData) {
      // No quests, redirect back
      router.push('/dashboard');
      return;
    }

    setQuests(JSON.parse(questsData));
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ 
        background: 'linear-gradient(180deg, #F8C4C4 0%, #E8B4B4 100%)'
      }}>
        <p className="text-gray-600">Loading quests...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen" style={{ 
      background: 'linear-gradient(180deg, #F8C4C4 0%, #E8B4B4 100%)'
    }}>
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-white rounded-b-[40px] p-4 flex items-center justify-between border-b-2 border-gray-200 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <span className="font-bold text-gray-800">12</span>
            <span className="text-2xl ml-4">🍁</span>
            <span className="font-bold text-gray-800">500</span>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-2xl text-gray-600 hover:text-gray-800"
          >
            ✕
          </button>
        </div>

        {/* Quests List */}
        <div className="p-6 space-y-4">
          {quests.map((quest, index) => (
            <div
              key={index}
              className="bg-white rounded-3xl p-4 flex items-center gap-4 shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center flex-shrink-0 relative">
                <span className="text-3xl">🍁</span>
                <span className="absolute bottom-1 text-xs font-bold text-red-600">
                  ✕{quest.points}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 text-sm mb-1">
                  {quest.title}
                </h3>
                <p className="text-xs text-gray-600">
                  {quest.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Tabs */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[40px] p-4 flex gap-2 shadow-2xl">
          <button className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-3 rounded-full font-bold text-sm shadow-lg">
            DAILY QUESTS
          </button>
          <button className="flex-1 bg-gray-200 text-gray-600 py-3 rounded-full font-bold text-sm">
            MONTHLY QUESTS
          </button>
        </div>
      </div>
    </main>
  );
}