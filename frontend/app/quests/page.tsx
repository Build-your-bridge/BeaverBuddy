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
  const [monthlyQuests, setMonthlyQuests] = useState<Quest[]>([
    {
      title: 'Networking Champion 🤝',
      description: 'Connect with 10 professionals in your field on LinkedIn and send personalized messages to build your network.',
      points: 100,
      difficulty: 'hard',
      category: 'networking',
      completed: false
    },
    {
      title: 'Career Visionary 🎯',
      description: 'Complete a comprehensive career assessment and create a detailed 5-year professional development plan.',
      points: 150,
      difficulty: 'hard',
      category: 'planning',
      completed: false
    }
  ]);
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');
  const [loading, setLoading] = useState(true);
  const [totalDailyQuests, setTotalDailyQuests] = useState(0);
  const [totalMonthlyQuests, setTotalMonthlyQuests] = useState(2);
  const router = useRouter();

  useEffect(() => {
    // Get quests from sessionStorage
    const questsData = sessionStorage.getItem('generatedQuests');
    
    if (!questsData) {
      // No quests, redirect back
      router.push('/dashboard');
      return;
    }

    const parsedQuests = JSON.parse(questsData);
    setDailyQuests(parsedQuests.map((q: Quest) => ({ ...q, completed: false })));
    setTotalDailyQuests(parsedQuests.length);
    setLoading(false);
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
      const newQuests = dailyQuests.filter((_, i) => i !== index);
      setDailyQuests(newQuests);
    } else {
      const newQuests = monthlyQuests.filter((_, i) => i !== index);
      setMonthlyQuests(newQuests);
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
  const totalQuests = activeTab === 'daily' ? totalDailyQuests : totalMonthlyQuests;
  const completedCount = totalQuests - currentQuests.length;

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

      <div className="max-w-md mx-auto w-full flex flex-col h-full pt-4">

        {/* Header Card */}
        <div className="bg-white rounded-3xl p-5 shadow-lg mx-4 mb-4">
          <h1 className="text-xl font-bold text-gray-800 text-center mb-3">
            {activeTab === 'daily' ? '🔥 Daily Quests' : '🏆 Monthly Quests'}
          </h1>
          <div className="flex items-center justify-center gap-6 mb-3">
            <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full shadow-sm">
              <span className="text-xl">🔥</span>
              <span className="font-bold text-gray-800">12</span>
            </div>
            <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-full shadow-sm">
              <span className="text-xl">🍁</span>
              <span className="font-bold text-gray-800">500</span>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                activeTab === 'daily' 
                  ? 'bg-orange-500' 
                  : 'bg-purple-500'
              }`}
              style={{ width: `${(completedCount / totalQuests) * 100}%` }}
            />
          </div>
          <p className="text-center text-xs text-gray-600 mt-2">
            {completedCount} of {totalQuests} completed
          </p>
        </div>

        {/* Quests List - Scrollable but contained */}
        <div className="flex-1 px-4 overflow-y-auto space-y-3 mb-4">
          {currentQuests.length === 0 ? (
            <div className="bg-white rounded-3xl p-6 text-center shadow-md">
              <div className="text-5xl mb-3">🎉</div>
              <h3 className="font-bold text-gray-800 text-base mb-2">
                All Done!
              </h3>
              <p className="text-gray-600 text-sm">
                You've completed all your {activeTab} quests. Great job, eh!
              </p>
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
                  <span className={`absolute bottom-1 text-xs font-bold ${
                    activeTab === 'daily' ? 'text-red-600' : 'text-purple-600'
                  }`}>
                    ✕{quest.points}
                  </span>
                </button>
                <div className="flex-1 pt-1 text-left">
                  <h3 className="font-bold text-gray-900 text-sm mb-1">
                    {quest.title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {quest.description}
                  </p>
                </div>
                {quest.completed && (
                  <button
                    onClick={() => removeQuest(index)}
                    className="flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                  >
                    <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white text-lg">→</span>
                    </div>
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer Tabs */}
        <div className="bg-white rounded-t-3xl p-4 shadow-2xl">
          <div className="flex gap-3">
            <button 
              onClick={() => setActiveTab('daily')}
              className={`flex-1 py-3 rounded-full font-bold text-sm shadow-lg transition-all duration-300 ${
                activeTab === 'daily'
                  ? 'bg-[#CE5C5C] text-white scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🔥 DAILY
            </button>
            <button 
              onClick={() => setActiveTab('monthly')}
              className={`flex-1 py-3 rounded-full font-bold text-sm shadow-lg transition-all duration-300 ${
                activeTab === 'monthly'
                  ? 'bg-[#CE5C5C] text-white scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🏆 MONTHLY
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}