'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Quest {
  id: number;
  title: string;
  description: string;
  reward: number;
  completed: boolean;
}

export default function QuestsPage() {
  const [dailyQuests, setDailyQuests] = useState<Quest[]>([]);
  const [monthlyQuests, setMonthlyQuests] = useState<Quest[]>([]);
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');
  const [loading, setLoading] = useState(true);
  const [currentPoints, setCurrentPoints] = useState(500);
  const router = useRouter();

  useEffect(() => {
    const loadQuests = async () => {
      // Get user ID and token from localStorage
      const userData = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (!userData || !token) {
        router.push('/login');
        return;
      }
      
      const currentUser = JSON.parse(userData);
      
      try {
        // Fetch latest quest data from backend API
        const response = await fetch('http://localhost:5000/api/quests/check-today', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch quests');
        }

        const data = await response.json();
        
        if (data.hasGeneratedToday && data.quests) {
          console.log('Loaded quests from API:', data.quests);
          
          // Update sessionStorage with latest data
          sessionStorage.setItem(`generatedQuests_${currentUser.id}`, JSON.stringify(data.quests));
          sessionStorage.setItem(`monthlyQuests_${currentUser.id}`, JSON.stringify(data.monthlyQuests || []));
          
          setDailyQuests(data.quests);
          setMonthlyQuests(data.monthlyQuests || []);
          fetchUserPoints(token);
        } else {
          // No quests generated yet, redirect to dashboard
          router.push('/dashboard');
        }
        
      } catch (error) {
        console.error('Error loading quests:', error);
        // Fallback to sessionStorage if API fails
        const questsDataRaw = sessionStorage.getItem(`generatedQuests_${currentUser.id}`);
        const monthlyDataRaw = sessionStorage.getItem(`monthlyQuests_${currentUser.id}`);
        
        if (questsDataRaw) {
          const dailyArray = JSON.parse(questsDataRaw);
          const monthlyArray = monthlyDataRaw ? JSON.parse(monthlyDataRaw) : [];
          setDailyQuests(dailyArray);
          setMonthlyQuests(monthlyArray);
        } else {
          router.push('/dashboard');
        }
      } finally {
        setLoading(false);
      }
    };

    loadQuests();
  }, [router]);

  const toggleQuestCompletion = async (index: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No auth token found');
        return;
      }

      const isMonthly = activeTab === 'monthly';
      
      // Update local state immediately for better UX
      if (isMonthly) {
        const updated = [...monthlyQuests];
        updated[index].completed = true;
        setMonthlyQuests(updated);
      } else {
        const updated = [...dailyQuests];
        updated[index].completed = true;
        setDailyQuests(updated);
      }

      // Call API to persist the change
      const response = await fetch('http://localhost:5000/api/quests/complete', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          questIndex: index,
          completed: true,
          isMonthly: isMonthly,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update quest completion');
      }

      console.log('Quest completion updated successfully');
    } catch (error) {
      console.error('Error updating quest completion:', error);
      // Revert local state on error
      if (activeTab === 'monthly') {
        const updated = [...monthlyQuests];
        updated[index].completed = false;
        setMonthlyQuests(updated);
      } else {
        const updated = [...dailyQuests];
        updated[index].completed = false;
        setDailyQuests(updated);
      }
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
  const totalCount = activeTab === 'daily' ? dailyQuests.length : monthlyQuests.length;
  const completedCount = currentQuests.filter(q => q.completed).length;

  return (
    <main className="h-screen bg-[#f5f5f5] overflow-hidden flex flex-col relative">
      {/* Header - Glass */}
      <div className="relative h-20 flex items-center justify-between px-6 z-10" style={{
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        {/* Dashboard Button - Top Left */}
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm font-bold text-gray-800 hover:text-gray-900 transition-all px-4 py-2 rounded-xl bg-white/60 backdrop-blur-md shadow-lg border border-white/40"
        >
          🪵 Dashboard
        </button>

        {/* Points and Streak - Top Right */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-white/40">
            <span className="text-2xl">🍁</span>
            <span className="text-lg font-black text-gray-800">{currentPoints}</span>
          </div>
          <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-white/40">
            <span className="text-2xl">🔥</span>
            <span className="text-lg font-black text-gray-800">12</span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto w-full flex flex-col h-full">
        <div className="bg-white rounded-3xl p-5 shadow-xl mx-4 mb-4 border-b-4 border-red-200">
          <h1 className="text-xl font-bold text-gray-800 text-center mb-4">
            {activeTab === 'daily' ? '🔥 Daily Quests' : '� Monthly Quests'}
          </h1>
          
          {/* Progress bar */}
          <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                activeTab === 'daily' 
                  ? 'bg-orange-500' 
                  : 'bg-purple-500'
              }`}
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          <p className="text-center text-xs text-gray-600 mt-2">
            {completedCount} of {totalCount} completed
          </p>
        </div>

        <div className="flex-1 px-4 overflow-y-auto space-y-3 pb-24">
          {activeTab === 'daily' ? (
            // Daily quests - split into personalized and Canadian
            <div className="space-y-6">
              {/* Personalized AI Quests Section */}
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-3 px-2">Personalized Quests</h2>
                <div className="space-y-3">
                  {dailyQuests.slice(0, 2).map((quest, index) => (
                    <div
                      key={quest.id}
                      className={`w-full rounded-3xl p-4 flex items-start gap-3 shadow-md transition-all duration-300 ${
                        quest.completed 
                          ? 'bg-green-50'
                          : 'bg-white'
                      } border-2 ${
                        quest.completed 
                          ? 'border-green-200' 
                          : 'border-transparent'
                      }`}
                    >
                      <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 relative bg-blue-100">
                        <span className="text-2xl">🍁</span>
                        <span className="text-xs font-bold text-gray-700 mt-0.5">
                          x{quest.reward || 50}
                        </span>
                      </div>
                      <div className="flex-1 relative pb-6">
                        <h3 className="text-sm font-bold text-gray-900 mb-1">
                          {quest.title}
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed mb-2">
                          {quest.description}
                        </p>
                        {!quest.completed && (
                          <button
                            onClick={() => toggleQuestCompletion(index)}
                            className="absolute bottom-0 right-0 bg-[#CE5C5C] text-white px-3 py-1 rounded-full text-xs font-bold hover:bg-[#b54a4a] transition-colors"
                          >
                            Mark as Done
                          </button>
                        )}
                        {quest.completed && (
                          <button
                            className="absolute bottom-0 right-0 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold"
                          >
                            Completed
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Canadian Quests Section */}
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-3 px-2">Canadian Quests</h2>
                <div className="space-y-3">
                  {dailyQuests.slice(2, 4).map((quest, index) => (
                    <div
                      key={quest.id}
                      className={`w-full rounded-3xl p-4 flex items-start gap-3 shadow-md transition-all duration-300 ${
                        quest.completed 
                          ? 'bg-green-50'
                          : 'bg-white'
                      } border-2 ${
                        quest.completed 
                          ? 'border-green-200' 
                          : 'border-transparent'
                      }`}
                    >
                      <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 relative bg-red-100">
                        <span className="text-2xl">🍁</span>
                        <span className="text-xs font-bold text-gray-700 mt-0.5">
                          x{quest.reward || 50}
                        </span>
                      </div>
                      <div className="flex-1 relative pb-6">
                        <h3 className="text-sm font-bold text-gray-900 mb-1">
                          {quest.title}
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed mb-2">
                          {quest.description}
                        </p>
                        {!quest.completed && (
                          <button
                            onClick={() => toggleQuestCompletion(index + 2)}
                            className="absolute bottom-0 right-0 bg-[#CE5C5C] text-white px-3 py-1 rounded-full text-xs font-bold hover:bg-[#b54a4a] transition-colors"
                          >
                            Mark as Done
                          </button>
                        )}
                        {quest.completed && (
                          <button
                            className="absolute bottom-0 right-0 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold"
                          >
                            Completed
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Monthly quests - keep existing structure
            currentQuests.length === 0 ? (
              <div className="bg-white/90 backdrop-blur rounded-3xl p-10 text-center shadow-xl border-2 border-white/50">
                <span className="text-5xl block mb-4">🎉</span>
                <h3 className="font-bold text-gray-800">All Quests Clear!</h3>
                <p className="text-sm text-gray-600">You're doing great, eh!</p>
              </div>
            ) : (
              currentQuests.map((quest, index) => (
                <div
                  key={quest.id}
                  className={`w-full rounded-3xl p-4 flex items-start gap-3 shadow-md transition-all duration-300 ${
                    quest.completed 
                      ? 'bg-purple-50'
                      : 'bg-white'
                  } border-2 ${
                    quest.completed 
                      ? 'border-purple-200'
                      : 'border-transparent'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 relative bg-purple-100`}>
                    <span className="text-2xl">🍁</span>
                    <span className="text-xs font-bold text-gray-700 mt-0.5">
                      x{quest.reward || 50}
                    </span>
                  </div>
                  <div className="flex-1 relative pb-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-1">
                      {quest.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-2">
                      {quest.description}
                    </p>
                    {!quest.completed && (
                      <button
                        onClick={() => toggleQuestCompletion(index)}
                        className="absolute bottom-0 right-0 bg-[#CE5C5C] text-white px-3 py-1 rounded-full text-xs font-bold hover:bg-[#b54a4a] transition-colors"
                      >
                        Mark as Done
                      </button>
                    )}
                    {quest.completed && (
                      <button
                        className="absolute bottom-0 right-0 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold"
                      >
                        Completed
                      </button>
                    )}
                  </div>
                </div>
              ))
            )
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