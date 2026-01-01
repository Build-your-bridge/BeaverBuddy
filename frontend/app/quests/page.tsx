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
  const [eventPools, setEventPools] = useState<{quest1: any[], quest2: any[]}>({quest1: [], quest2: []});
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');
  const [loading, setLoading] = useState(true);
  const [currentPoints, setCurrentPoints] = useState(500);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showMonthlyFilters, setShowMonthlyFilters] = useState(true);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadQuests = async () => {
      const userData = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (!userData || !token) {
        router.push('/login');
        return;
      }
      
      const currentUser = JSON.parse(userData);
      
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quests/check-today`, {
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
          console.log('Loaded monthly quests from API:', data.monthlyQuests);
          
          let validMonthlyQuests = [];
          if (data.monthlyQuests && Array.isArray(data.monthlyQuests) && data.monthlyQuests.length > 0) {
            validMonthlyQuests = data.monthlyQuests.map((quest: any) => {
              if (quest.text && !quest.title) {
                return {
                  id: quest.id,
                  title: quest.text,
                  description: "Complete this Canadian cultural experience to earn points!",
                  reward: quest.reward || 500,
                  completed: quest.completed || false
                };
              }
              return quest;
            });
            
            validMonthlyQuests = validMonthlyQuests.filter((quest: any) => {
              if (quest.url === undefined || quest.url === '') {
                return !quest.title?.includes('Winterlude') && !quest.title?.includes('TIFF');
              }
              return true;
            });
          }
          
          console.log('Valid monthly quests:', validMonthlyQuests);
          
          sessionStorage.setItem(`generatedQuests_${currentUser.id}`, JSON.stringify(data.quests));
          sessionStorage.setItem(`monthlyQuests_${currentUser.id}`, JSON.stringify(validMonthlyQuests));
          
          setDailyQuests(data.quests);
          setMonthlyQuests(validMonthlyQuests);
          
          if (validMonthlyQuests.length > 0) {
            setShowMonthlyFilters(false);
          } else {
            setShowMonthlyFilters(true);
          }
          
          fetchUserPoints(token);
        } else {
          router.push('/dashboard');
        }
        
      } catch (error) {
        console.error('Error loading quests:', error);
        const questsDataRaw = sessionStorage.getItem(`generatedQuests_${currentUser.id}`);
        const monthlyDataRaw = sessionStorage.getItem(`monthlyQuests_${currentUser.id}`);
        
        if (questsDataRaw) {
          const dailyArray = JSON.parse(questsDataRaw);
          const monthlyArray = monthlyDataRaw ? JSON.parse(monthlyDataRaw) : [];
          setDailyQuests(dailyArray);
          setMonthlyQuests(monthlyArray);
          
          if (monthlyArray.length > 0) {
            setShowMonthlyFilters(false);
          }
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
      
      if (isMonthly) {
        const updated = [...monthlyQuests];
        updated[index].completed = true;
        setMonthlyQuests(updated);
      } else {
        const updated = [...dailyQuests];
        updated[index].completed = true;
        setDailyQuests(updated);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quests/complete`, {
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
      fetchUserPoints(token);
    } catch (error) {
      console.error('Error updating quest completion:', error);
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/outfits/user/points`, {
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
    setTimeout(() => setToast(null), 3000);
  };

  const toggleFilter = (filter: string) => {
    setSelectedFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const handleSearchEvents = async () => {
    try {
      setSearchLoading(true);
      const token = localStorage.getItem('token');
      const locationData = localStorage.getItem('userLocation');
      let city, province;
      
      if (locationData) {
        try {
          const location = JSON.parse(locationData);
          city = location.city;
          province = location.province;
        } catch (e) {
          console.error('Failed to parse location:', e);
        }
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quests/generate-monthly`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ filters: selectedFilters, city, province })
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Failed to generate monthly quests', 'error');
        throw new Error(data.error || 'Failed to generate monthly quests');
      }

      // Save monthly quests and event pools to sessionStorage
      const userData = localStorage.getItem('user');
      if (userData) {
        const currentUser = JSON.parse(userData);
        sessionStorage.setItem(`monthlyQuests_${currentUser.id}`, JSON.stringify(data.monthlyQuests));
        if (data.eventPools) {
          sessionStorage.setItem(`eventPools_${currentUser.id}`, JSON.stringify(data.eventPools));
          setEventPools(data.eventPools);
        }
      }

      setMonthlyQuests(data.monthlyQuests);
      setShowMonthlyFilters(false);
      showToast('Monthly quests generated successfully!', 'success');
    } catch (error: any) {
      console.error('Error generating monthly quests:', error);
      showToast(error.message || 'Failed to generate quests', 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleRerollQuest = (questId: number) => {
    // Determine which pool to use based on which EVENT quest this is (not all quests)
    const eventQuests = monthlyQuests.filter(q => q.url); // Only event quests
    const questIndex = eventQuests.findIndex(q => q.id === questId);
    const poolKey = questIndex === 0 ? 'quest1' : 'quest2';
    const currentPool = eventPools[poolKey];
    
    console.log(`Rerolling quest ${questId}, eventQuestIndex: ${questIndex}, using pool: ${poolKey}`, currentPool);
    
    if (!currentPool || currentPool.length === 0) {
      showToast('No more events available to reroll', 'error');
      return;
    }

    // Get the next event from this quest's pool
    const nextEvent = currentPool[0];
    const remainingPool = currentPool.slice(1);

    // Update the quest with the new event
    const updatedQuests = monthlyQuests.map(quest => {
      if (quest.id === questId && quest.url) {
        // This is an event quest, swap it
        const oldEvent = {
          id: quest.eventId,
          name: quest.title,
          description: quest.description,
          url: quest.url,
          category: quest.category
        };
        
        // Add old event back to this quest's pool
        remainingPool.push(oldEvent);
        
        return {
          ...quest,
          title: nextEvent.name,
          description: nextEvent.description,
          url: nextEvent.url,
          eventId: nextEvent.id,
          category: nextEvent.category
        };
      }
      return quest;
    });

    setMonthlyQuests(updatedQuests);
    setEventPools({
      ...eventPools,
      [poolKey]: remainingPool
    });

    // Update sessionStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      const currentUser = JSON.parse(userData);
      sessionStorage.setItem(`monthlyQuests_${currentUser.id}`, JSON.stringify(updatedQuests));
      sessionStorage.setItem(`eventPools_${currentUser.id}`, JSON.stringify({
        ...eventPools,
        [poolKey]: remainingPool
      }));
    }

    showToast('Event rerolled!', 'success');
  };

  const getCategoryEmoji = (category: string) => {
    const emojiMap: { [key: string]: string } = {
      music: '🎵',
      sports: '🏒',
      comedy: '🎤',
      theatre: '🎭',
      arts: '🎨',
      children: '🎪'
    };
    return emojiMap[category] || '🎉';
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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom, #E8D4C0 0%, #F5E6D3 100%)' }}>
        <div className="animate-bounce">
          <p className="text-white text-base sm:text-lg font-bold">Loading quests... 🍁</p>
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
      
      <Header 
        title="Daily Quests" 
        points={currentPoints} 
        onLogout={handleLogout}
        className="mb-4 sm:mb-6"
      />

      <div className="absolute top-16 sm:top-20 left-1/2 ml-28 sm:ml-40 md:ml-48 z-20">
        <button
          onClick={() => router.push('/dashboard')}
          className="w-10 h-10 sm:w-12 sm:h-12 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-white/50 flex items-center justify-center hover:bg-white/95 hover:scale-110 transition-all cursor-pointer"
        >
          <span className="text-gray-700 font-bold text-xl sm:text-3xl leading-none">×</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto w-full px-4 flex flex-col h-full">
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xl mb-4 border-b-4 border-red-200">
            <h1 className="text-base sm:text-lg font-bold text-gray-800 text-center mb-3">
              {activeTab === 'daily' ? '🔥 Daily Quests' : '📅 Monthly Quests'}
            </h1>
            
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

          <div className="flex-1 overflow-y-auto pb-24 space-y-3">
            {activeTab === 'daily' ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-gray-800 mb-2">Personalized Quests</h2>
                  <div className="space-y-2">
                    {dailyQuests.slice(0, 2).map((quest, index) => (
                      <div
                        key={quest.id}
                        className={`w-full rounded-2xl p-3 sm:p-4 flex items-start gap-3 shadow-md transition-all duration-300 ${
                          quest.completed 
                            ? 'bg-green-50 border-2 border-green-200'
                            : 'bg-white'
                        }`}
                      >
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex flex-col items-center justify-center flex-shrink-0 bg-blue-100">
                          <span className="text-xl sm:text-2xl">🍁</span>
                          <span className="text-xs font-bold text-gray-700">x{quest.reward || 50}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-gray-900 mb-1 break-words">
                            {quest.title}
                          </h3>
                          <p className="text-xs text-gray-600 leading-relaxed mb-3 break-words">
                            {quest.description}
                          </p>
                          <div className="flex items-center justify-end">
                            {!quest.completed ? (
                              <button
                                onClick={() => toggleQuestCompletion(index)}
                                className="bg-[#a12b2b] text-white px-3 py-1.5 rounded-full text-xs font-bold hover:bg-[#b54a4a] transition-colors whitespace-nowrap"
                              >
                                Mark as Done
                              </button>
                            ) : (
                              <span className="bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap">
                                Completed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-bold text-gray-800 mb-2">Canadian Quests</h2>
                  <div className="space-y-2">
                    {dailyQuests.slice(2, 4).map((quest, index) => (
                      <div
                        key={quest.id}
                        className={`w-full rounded-2xl p-3 sm:p-4 flex items-start gap-3 shadow-md transition-all duration-300 ${
                          quest.completed 
                            ? 'bg-green-50 border-2 border-green-200'
                            : 'bg-white'
                        }`}
                      >
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex flex-col items-center justify-center flex-shrink-0 bg-red-100">
                          <span className="text-xl sm:text-2xl">🍁</span>
                          <span className="text-xs font-bold text-gray-700">x{quest.reward || 50}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-gray-900 mb-1 break-words">
                            {quest.title}
                          </h3>
                          <p className="text-xs text-gray-600 leading-relaxed mb-3 break-words">
                            {quest.description}
                          </p>
                          <div className="flex items-center justify-end">
                            {!quest.completed ? (
                              <button
                                onClick={() => toggleQuestCompletion(index + 2)}
                                className="bg-[#a12b2b] text-white px-3 py-1.5 rounded-full text-xs font-bold hover:bg-[#b54a4a] transition-colors whitespace-nowrap"
                              >
                                Mark as Done
                              </button>
                            ) : (
                              <span className="bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap">
                                Completed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              showMonthlyFilters ? (
                <div className="bg-white/95 backdrop-blur rounded-3xl p-5 sm:p-6 shadow-xl max-w-md mx-auto">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 text-center">Find Events Near You</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mb-5 text-center">Select your interests to discover local events</p>
                  
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-5">
                    {[
                      { id: 'music', label: 'Music', emoji: '🎵' },
                      { id: 'sports', label: 'Sports', emoji: '⚽' },
                      { id: 'children', label: 'Children\'s Events', emoji: '🎪' },
                      { id: 'comedy', label: 'Comedy', emoji: '😂' },
                      { id: 'theatre', label: 'Theatre', emoji: '🎭' },
                      { id: 'arts', label: 'Arts & Culture', emoji: '🎨' }
                    ].map(filter => (
                      <button
                        key={filter.id}
                        onClick={() => toggleFilter(filter.id)}
                        className={`p-3 sm:p-4 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-300 ${
                          selectedFilters.includes(filter.id)
                            ? 'bg-[#a12b2b] text-white scale-105 shadow-lg'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <div className="text-xl sm:text-2xl mb-1">{filter.emoji}</div>
                        {filter.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleSearchEvents}
                    disabled={selectedFilters.length === 0 || searchLoading}
                    className={`w-full py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base shadow-lg transition-all ${
                      selectedFilters.length > 0 && !searchLoading
                        ? 'bg-[#a12b2b] text-white hover:bg-[#b54a4a] cursor-pointer hover:scale-105'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {searchLoading 
                      ? 'SEARCHING...'
                      : selectedFilters.length > 0 
                        ? `Search Events (${selectedFilters.length} ${selectedFilters.length === 1 ? 'filter' : 'filters'})` 
                        : 'Select at least one interest'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={() => setShowMonthlyFilters(true)}
                    className="px-4 py-2 bg-white/90 backdrop-blur rounded-full text-xs sm:text-sm font-bold text-gray-700 hover:bg-white transition-all shadow-md"
                  >
                    ← Change Filters
                  </button>
                  
                  <div>
                    <h2 className="text-sm font-bold text-gray-800 mb-2">Event Quests</h2>
                    <div className="space-y-2">
                      {currentQuests.filter((q: any) => q.url).map((quest, index) => {
                        const categoryMap: Record<string, {emoji: string, name: string, color: string}> = {
                          'music': {emoji: '🎵', name: 'Music', color: 'bg-purple-500'},
                          'sports': {emoji: '⚽', name: 'Sports', color: 'bg-blue-500'},
                          'children': {emoji: '🎪', name: 'Family', color: 'bg-pink-500'},
                          'comedy': {emoji: '😂', name: 'Comedy', color: 'bg-yellow-500'},
                          'theatre': {emoji: '🎭', name: 'Theatre', color: 'bg-red-500'},
                          'arts': {emoji: '🎨', name: 'Arts', color: 'bg-green-500'},
                        };
                        
                        const questCategory = (quest as any).category?.toLowerCase() || 'general';
                        const categoryInfo = categoryMap[questCategory] || {emoji: '🎫', name: questCategory.charAt(0).toUpperCase() + questCategory.slice(1), color: 'bg-gray-500'};
                        
                        return (
                          <div
                            key={quest.id}
                            className={`w-full rounded-2xl p-3 sm:p-4 flex items-start gap-3 shadow-md transition-all duration-300 ${
                              quest.completed 
                                ? 'bg-green-50 border-2 border-green-200'
                                : 'bg-white'
                            }`}
                          >
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex flex-col items-center justify-center flex-shrink-0 bg-purple-100">
                              <span className="text-xl sm:text-2xl">🍁</span>
                              <span className="text-xs font-bold text-gray-700">x{quest.reward || 50}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-bold text-gray-900 mb-1 break-words">
                                {quest.title}
                              </h3>
                              <p className="text-xs text-gray-600 leading-relaxed mb-2 break-words">
                                {quest.description}
                              </p>
                              {(quest as any).url && (
                                <a
                                  href={(quest as any).url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block mb-3 text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  🎟️ View Event Details
                                </a>
                              )}
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className={`${categoryInfo.color} text-white px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap`}>
                                  {categoryInfo.name}
                                </span>
                                {!quest.completed ? (
                                  <button
                                    onClick={() => toggleQuestCompletion(currentQuests.indexOf(quest))}
                                    className="bg-[#a12b2b] text-white px-3 py-1.5 rounded-full text-xs font-bold hover:bg-[#b54a4a] transition-colors whitespace-nowrap flex-shrink-0"
                                  >
                                    Mark as Done
                                  </button>
                                ) : (
                                  <span className="bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0">
                                    Completed
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                          </div>
                          <div className="flex-1 relative pb-4">
                            <h3 className="text-xs sm:text-sm md:text-xs lg:text-sm font-bold text-gray-900 mb-1">
                              {quest.title}
                            </h3>
                            <p className="text-xs sm:text-sm md:text-xs lg:text-sm text-gray-600 leading-relaxed mb-2">
                              {quest.description}
                            </p>
                            
                            {/* Show event URL link if available */}
                            {(quest as any).url && (
                              <a
                                href={(quest as any).url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block mb-2 text-xs text-blue-600 hover:text-blue-800 underline"
                              >
                                🎟️ View Event Details
                              </a>
                            )}
                            
                            {/* Category tag aligned with maple leaf at bottom */}
                            <div className={`absolute bottom-0 -left-18 px-2 py-0.5 rounded-full text-xs font-semibold ${categoryInfo.color} whitespace-nowrap`}>
                              {categoryInfo.name}
                            </div>
                            
                            {/* Reroll button (left of Mark as Done) */}
                            {!quest.completed && (() => {
                              const questIndex = currentQuests.filter((q: any) => q.url).findIndex(q => q.id === quest.id);
                              const poolKey = questIndex === 0 ? 'quest1' : 'quest2';
                              return eventPools[poolKey]?.length > 0;
                            })() && (
                              <button
                                onClick={() => handleRerollQuest(quest.id)}
                                className="absolute bottom-0 right-28 bg-gray-600 text-white px-2 py-1 rounded-full text-xs font-bold hover:bg-gray-700 transition-colors cursor-pointer"
                                title="Reroll for different event"
                              >
                                🔄 Reroll
                              </button>
                            )}
                            
                            {!quest.completed && (
                              <button
                                onClick={() => toggleQuestCompletion(currentQuests.indexOf(quest))}
                                className="absolute bottom-0 right-0 bg-[#a12b2b] text-white px-2 py-1 rounded-full text-xs font-bold hover:bg-[#b54a4a] transition-colors cursor-pointer"
                              >
                                Mark as Done
                              </button>
                            )}
                            {quest.completed && (
                              <button
                                className="absolute bottom-0 right-0 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold"
                              >
                                Completed
                              </button>
                            )}
                          </div>
                        </div>
                      )})}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-gray-800 mb-2">Landmark Quest</h2>
                    <div className="space-y-2">
                      {currentQuests.filter((q: any) => !q.url).map((quest, index) => (
                        <div
                          key={quest.id}
                          className={`w-full rounded-2xl p-3 sm:p-4 flex items-start gap-3 shadow-md transition-all duration-300 ${
                            quest.completed 
                              ? 'bg-green-50 border-2 border-green-200'
                              : 'bg-white'
                          }`}
                        >
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex flex-col items-center justify-center flex-shrink-0 bg-purple-100">
                            <span className="text-xl sm:text-2xl">🍁</span>
                            <span className="text-xs font-bold text-gray-700">x{quest.reward || 50}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 mb-1 break-words">
                              {quest.title}
                            </h3>
                            <p className="text-xs text-gray-600 leading-relaxed mb-3 break-words">
                              {quest.description}
                            </p>
                            <div className="flex items-center justify-end">
                              {!quest.completed ? (
                                <button
                                  onClick={() => toggleQuestCompletion(currentQuests.indexOf(quest))}
                                  className="bg-[#a12b2b] text-white px-3 py-1.5 rounded-full text-xs font-bold hover:bg-[#b54a4a] transition-colors whitespace-nowrap"
                                >
                                  Mark as Done
                                </button>
                              ) : (
                                <span className="bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap">
                                  Completed
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white rounded-t-[32px] shadow-2xl">
        <div className="p-3 sm:p-4">
          <div className="flex gap-2 sm:gap-3 w-full max-w-xs mx-auto">
            <button 
              onClick={() => setActiveTab('daily')}
              className={`flex-1 py-2.5 px-4 rounded-full font-bold text-xs sm:text-sm shadow-lg transition-all duration-300 cursor-pointer ${
                activeTab === 'daily'
                  ? 'bg-[#a12b2b] text-white scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              DAILY
            </button>
            <button 
              onClick={() => setActiveTab('monthly')}
              className={`flex-1 py-2.5 px-4 rounded-full font-bold text-xs sm:text-sm shadow-lg transition-all duration-300 cursor-pointer ${
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

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-lg border-2 backdrop-blur-md ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <p className="font-medium text-sm">{toast.message}</p>
          </div>
        </div>
      )}
    </main>
  );
}