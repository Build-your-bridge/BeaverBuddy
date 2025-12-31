'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';

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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
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
      const questReward = isMonthly ? monthlyQuests[index].reward : dailyQuests[index].reward;
      
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

      // Call API to persist the change and update points
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
      
      // Refresh points from server (backend now handles point updates)
      fetchUserPoints(token);
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
      
      // Note: Points are not reverted here since they're handled by the backend
      // The next fetchUserPoints call will get the correct value from server
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

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000); // Auto-hide after 3 seconds
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

  const removeQuest = (index: number) => {
    if (activeTab === 'daily') {
      setDailyQuests(prev => prev.filter((_, i) => i !== index));
    } else {
      setMonthlyQuests(prev => prev.filter((_, i) => i !== index));
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom, #E8D4C0 0%, #F5E6D3 100%)' }}>
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
    <main className="h-screen overflow-hidden flex flex-col relative" style={{ background: 'linear-gradient(to bottom, #E8D4C0 0%, #F5E6D3 100%)' }}>
      <style jsx>{`
        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
      {/* Header */}
      <Header 
        title="Daily Quests" 
        points={currentPoints} 
        onLogout={handleLogout}
        className="mb-10"
      />

      {/* X Button positioned next to title */}
      <div className="absolute top-24 left-1/2 ml-64 z-20">
        <button
          onClick={() => router.push('/dashboard')}
          className="w-16 h-16 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-white/50 flex items-center justify-center hover:bg-white/95 hover:scale-110 transition-all cursor-pointer"
        >
          <span className="text-gray-700 font-bold text-4xl leading-none -mt-1">×</span>
        </button>
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

        <div className="flex-1 px-4 overflow-y-auto space-y-3 pb-16 md:pb-20">
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
                            className="absolute bottom-0 right-0 bg-[#a12b2b] text-white px-3 py-1 rounded-full text-xs font-bold hover:bg-[#b54a4a] transition-colors cursor-pointer"
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
                            className="absolute bottom-0 right-0 bg-[#a12b2b] text-white px-3 py-1 rounded-full text-xs font-bold hover:bg-[#b54a4a] transition-colors cursor-pointer"
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
                        className="absolute bottom-0 right-0 bg-[#a12b2b] text-white px-3 py-1 rounded-full text-xs font-bold hover:bg-[#b54a4a] transition-colors cursor-pointer"
                      >
                        Mark as Done
                      </button>
                    )}
                    {quest.completed && (
                      <button
                        className="absolute bottom-0 right-0 bg-[#8B0000] text-white px-3 py-1 rounded-full text-xs font-bold"
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

        {/* Floating Daily/Monthly Tabs */}
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-white p-4 rounded-[40px] shadow-2xl">
            <div className="flex gap-4 w-80 mx-auto">
              <button 
                onClick={() => setActiveTab('daily')}
                className={`flex-1 py-3 px-6 rounded-full font-bold text-sm shadow-lg transition-all duration-300 cursor-pointer ${
                  activeTab === 'daily'
                    ? 'bg-[#a12b2b] text-white scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                DAILY
              </button>
              <button 
                onClick={() => setActiveTab('monthly')}
                className={`flex-1 py-3 px-6 rounded-full font-bold text-sm shadow-lg transition-all duration-300 cursor-pointer ${
                  activeTab === 'monthly'
                    ? 'bg-[#a12b2b] text-white scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                MONTHLY
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
          <div className={`px-6 py-3 rounded-lg shadow-lg border-2 backdrop-blur-md ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <p className="font-medium">{toast.message}</p>
          </div>
        </div>
      )}
    </main>
  );
}