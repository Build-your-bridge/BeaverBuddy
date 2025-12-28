'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Quest {
  title: string;
  description: string;
  points: number;
  difficulty: string;
  category: string;
  completed?: boolean;
}

export default function QuestsPage() {
  const [dailyQuests, setDailyQuests] = useState<Quest[]>([]);
  const [monthlyQuests, setMonthlyQuests] = useState<Quest[]>([]);
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');
  const [loading, setLoading] = useState(true);
  const [totalDailyQuests, setTotalDailyQuests] = useState(0);
  const [totalMonthlyQuests, setTotalMonthlyQuests] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const questsDataRaw = sessionStorage.getItem('generatedQuests');
    
    if (!questsDataRaw) {
      router.push('/dashboard');
      return;
    }

    try {
      const parsedData = JSON.parse(questsDataRaw);
      
      // FIX: Your backend sends { quests: [], monthlyQuests: [] }
      // We must extract the 'quests' array specifically
      const dailyArray = Array.isArray(parsedData) ? parsedData : (parsedData.quests || []);
      const monthlyArray = parsedData.monthlyQuests || [];

      setDailyQuests(dailyArray.map((q: Quest) => ({ ...q, completed: false })));
      setTotalDailyQuests(dailyArray.length);
      
      setMonthlyQuests(monthlyArray.map((q: Quest) => ({ ...q, completed: false })));
      setTotalMonthlyQuests(monthlyArray.length);

    } catch (err) {
      console.error("Parsing error:", err);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const toggleQuestCompletion = (index: number) => {
    if (activeTab === 'daily') {
      const updated = [...dailyQuests];
      updated[index].completed = !updated[index].completed;
      setDailyQuests(updated);
    } else {
      const updated = [...monthlyQuests];
      updated[index].completed = !updated[index].completed;
      setMonthlyQuests(updated);
    }
  };

  const removeQuest = (index: number) => {
    if (activeTab === 'daily') {
      setDailyQuests(prev => prev.filter((_, i) => i !== index));
    } else {
      setMonthlyQuests(prev => prev.filter((_, i) => i !== index));
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-red-500">
        <div className="animate-bounce">
          <p className="text-white text-lg font-bold">Loading quests... 🍁</p>
        </div>
      </div>
    );
  }

  const currentQuests = activeTab === 'daily' ? dailyQuests : monthlyQuests;
  const totalCount = activeTab === 'daily' ? totalDailyQuests : totalMonthlyQuests;
  const completedCount = totalCount - currentQuests.length;

  return (
    <main className="h-screen bg-[#f5f5f5] overflow-hidden flex flex-col relative">
      {/* Dashboard Button - Top Right Corner */}
      <div className="absolute top-4 right-4 z-50">
        <button 
          onClick={() => router.push('/dashboard')}
          className="bg-red-600 text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg hover:shadow-xl hover:bg-red-700 transition-all transform hover:scale-105"
        >
          Dashboard
        </button>
      </div>

      <div className="max-w-md mx-auto w-full flex flex-col h-full pt-6">
        <div className="bg-white rounded-3xl p-5 shadow-xl mx-4 mb-4 border-b-4 border-red-200">
          <h1 className="text-xl font-bold text-gray-800 text-center mb-4">
            {activeTab === 'daily' ? '🔥 Daily Quests' : '🏆 Monthly Quests'}
          </h1>
          
          {/* Progress bar */}
          <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                activeTab === 'daily' 
                  ? 'bg-orange-500' 
                  : 'bg-purple-500'
              }`}
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
          <p className="text-center text-xs text-gray-600 mt-2">
            {completedCount} of {totalCount} completed
          </p>
        </div>

        <div className="flex-1 px-4 overflow-y-auto space-y-3 pb-24">
          {currentQuests.length === 0 ? (
            <div className="bg-white/90 backdrop-blur rounded-3xl p-10 text-center shadow-xl border-2 border-white/50">
              <span className="text-5xl block mb-4">🎉</span>
              <h3 className="font-bold text-gray-800">All Quests Clear!</h3>
              <p className="text-sm text-gray-600">You're doing great, eh!</p>
            </div>
          ) : (
            currentQuests.map((quest, index) => (
              <div
                key={index}
                className={`w-full rounded-3xl p-4 flex items-start gap-3 shadow-md transition-all duration-300 ${
                  quest.completed 
                    ? activeTab === 'daily'
                      ? 'bg-green-50'
                      : 'bg-purple-50'
                    : 'bg-white'
                } border-2 ${
                  quest.completed 
                    ? activeTab === 'daily' 
                      ? 'border-green-200' 
                      : 'border-purple-200'
                    : 'border-transparent'
                }`}
              >
                <button
                  onClick={() => toggleQuestCompletion(index)}
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 relative transform transition-transform hover:rotate-12 hover:scale-105 cursor-pointer ${
                    activeTab === 'daily' 
                      ? 'bg-orange-100' 
                      : 'bg-purple-100'
                  }`}
                >
                  <span className="text-2xl">{activeTab === 'daily' ? '🍁' : '🏆'}</span>
                </button>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 text-sm">{quest.title}</h3>
                  <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{quest.description}</p>
                </div>
                {quest.completed && (
                  <button onClick={() => removeQuest(index)} className="bg-green-500 text-white w-8 h-8 rounded-full font-bold">✓</button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="bg-white p-4 rounded-t-[40px] shadow-2xl mt-auto">
          <div className="flex gap-4 max-w-xs mx-auto">
            <button 
              onClick={() => setActiveTab('daily')}
              className={`flex-1 py-3 rounded-full font-bold text-sm shadow-lg transition-all duration-300 ${
                activeTab === 'daily'
                  ? 'bg-[#CE5C5C] text-white scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              DAILY
            </button>
            <button 
              onClick={() => setActiveTab('monthly')}
              className={`flex-1 py-3 rounded-full font-bold text-sm shadow-lg transition-all duration-300 ${
                activeTab === 'monthly'
                  ? 'bg-[#CE5C5C] text-white scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              MONTHLY
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}