'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import { api } from '../../lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  points: number;
  equippedOutfit?: {
    id: number;
    name: string;
    image: string;
  } | null;
}

interface Outfit {
  id: number;
  name: string;
  description: string;
  image: string;
  price: number;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  owned?: boolean;
  equipped?: boolean;
}

export default function BillyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'shop' | 'inventory'>('shop');
  const [points, setPoints] = useState(500);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [selectedOutfit, setSelectedOutfit] = useState<string>('default');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [hasJournalPrompts, setHasJournalPrompts] = useState(false);
  const [remainingJournalCount, setRemainingJournalCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    
    // Check journal prompts
    const journalPromptsData = sessionStorage.getItem(`journalPrompts_${parsedUser.id}`);
    if (journalPromptsData) {
      const prompts = JSON.parse(journalPromptsData);
      const unanswered = prompts.filter((p: any) => !p.answer || p.answer === null);
      setHasJournalPrompts(unanswered.length > 0);
      setRemainingJournalCount(unanswered.length);
    }

    // Fetch all outfits and user data
    const fetchData = async () => {
      try {
        // Fetch streak
        const streakResponse = await fetch(api.streak.info, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (streakResponse.ok) {
          const streakData = await streakResponse.json();
          setCurrentStreak(streakData.currentStreak || 0);
        }

        // Fetch all available outfits
        const outfitsResponse = await fetch(api.outfits.all, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!outfitsResponse.ok) {
          throw new Error('Failed to fetch outfits');
        }

        const allOutfits = await outfitsResponse.json();

        // Fetch user's owned outfits
        const userOutfitsResponse = await fetch(api.outfits.user, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const userOutfits = userOutfitsResponse.ok ? await userOutfitsResponse.json() : [];

        // Fetch user points
        const pointsResponse = await fetch(api.outfits.points, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (pointsResponse.ok) {
          const pointsData = await pointsResponse.json();
          setPoints(pointsData.points);
        }

        // Combine outfit data
        const outfitsWithOwnership = allOutfits.map((outfit: any) => {
          const userOutfit = userOutfits.find((uo: any) => uo.outfitId === outfit.id);
          return {
            ...outfit,
            owned: !!userOutfit,
            equipped: userOutfit?.equipped || false
          };
        });

        setOutfits(outfitsWithOwnership);
      } catch (error) {
        console.error('Error fetching outfit data:', error);
        setOutfits([]);
      }
    };

    fetchData();
  }, [router]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePurchase = async (outfit: Outfit) => {
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Please log in again', 'error');
      return;
    }

    try {
      const response = await fetch(api.outfits.buy(outfit.id), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        showToast(`❌ ${error.error}`, 'error');
        return;
      }

      const result = await response.json();

      setPoints(prev => prev - outfit.price);
      setOutfits(prev => prev.map(o =>
        o.id === outfit.id ? { ...o, owned: true } : o
      ));

      showToast(`🎉 Purchased ${outfit.name}!`, 'success');
    } catch (error) {
      console.error('Error purchasing outfit:', error);
      showToast('❌ Failed to purchase outfit. Please try again.', 'error');
    }
  };

  const handleEquip = async (outfitId: number) => {
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Please log in again', 'error');
      return;
    }

    try {
      const response = await fetch(api.outfits.equip(outfitId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        showToast(`❌ ${error.error}`, 'error');
        return;
      }

      const result = await response.json();

      setOutfits(prev => prev.map(o => ({
        ...o,
        equipped: o.id === outfitId ? result.equipped : false
      })));
      setSelectedOutfit(result.equipped ? outfitId.toString() : 'default');

      if (user) {
        let newEquippedOutfit = null;
        if (result.equipped) {
          newEquippedOutfit = outfits.find(o => o.id === outfitId) || null;
        } else {
          newEquippedOutfit = outfits.find(o => o.name === 'Default Beaver') || null;
        }
        
        const updatedUser = {
          ...user,
          equippedOutfit: newEquippedOutfit
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }

      showToast(`✅ Outfit ${result.equipped ? 'equipped' : 'unequipped'}!`, 'success');
    } catch (error) {
      console.error('Error equipping outfit:', error);
      showToast('❌ Failed to equip outfit. Please try again.', 'error');
    }
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

  const filteredOutfits = activeTab === 'shop'
    ? outfits.filter(o => !o.owned)
    : outfits.filter(o => o.owned);

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #ffa69e 0%, #ffddd2 100%)'
      }}>
        <p className="text-gray-800 font-semibold">Loading Billy...</p>
      </div>
    );
  }

  return (
    <main className="h-screen flex flex-col overflow-hidden relative" style={{ background: 'linear-gradient(to bottom, #E8D4C0 0%, #F5E6D3 100%)' }}>
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>

      {/* Floating sparkles */}
      <div className="absolute top-20 left-20 text-gray-400 text-3xl z-5" style={{ animation: 'sparkle 3s ease-in-out infinite' }}>✦</div>
      <div className="absolute top-32 right-32 text-gray-400 text-2xl z-5" style={{ animation: 'sparkle 3s ease-in-out infinite', animationDelay: '1s' }}>✦</div>
      <div className="absolute bottom-40 left-40 text-gray-400 text-2xl z-5" style={{ animation: 'sparkle 3s ease-in-out infinite', animationDelay: '2s' }}>✦</div>

      {/* Header */}
      <Header 
        title="Billy's Wardrobe" 
        points={points}
        streak={currentStreak}
        onLogout={handleLogout}
        className="mb-6"
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col px-4 pb-4 relative z-10 overflow-hidden">
        {/* Billy Display */}
        <div className="flex justify-center mb-3">
          <div className="relative w-28 h-28 md:w-36 md:h-36 flex items-center justify-center">
            <Image
              src={user?.equippedOutfit?.image || "/images/beaver/default/default.png"}
              alt="Billy the Beaver"
              width={112}
              height={112}
              className="object-contain drop-shadow-2xl"
              priority
              style={{ animation: 'float 3s ease-in-out infinite' }}
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-3">
          <div className="flex gap-2 max-w-xs mx-auto">
            <button
              onClick={() => setActiveTab('shop')}
              className={`flex-1 py-2 rounded-full font-bold text-xs shadow-lg transition-all duration-300 cursor-pointer ${
                activeTab === 'shop'
                  ? 'bg-[#a12b2b] text-white scale-105'
                  : 'bg-white text-gray-600 hover:bg-gray-200'
              }`}
            >
              🛍️ SHOP
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex-1 py-2 rounded-full font-bold text-xs shadow-lg transition-all duration-300 cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-[#a12b2b] text-white scale-105'
                  : 'bg-white text-gray-600 hover:bg-gray-200'
              }`}
            >
              🎒 INVENTORY
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto pb-20">
          {activeTab === 'shop' ? (
            <div className="space-y-3">
              <h3 className="text-base md:text-lg font-bold text-gray-800 text-center">Available Outfits</h3>
              {filteredOutfits.length === 0 ? (
                <div className="bg-[#ccab8b] rounded-3xl p-4 shadow-xl mx-auto max-w-md text-center">
                  <span className="text-3xl block mb-3">🎉</span>
                  <h3 className="font-bold text-gray-800">All outfits purchased!</h3>
                  <p className="text-xs text-gray-600">Check back later for new items.</p>
                </div>
              ) : (
                <div className="bg-[#ccab8b] rounded-3xl p-3 md:p-6 shadow-xl mx-auto max-w-5xl">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 md:gap-6">
                    {filteredOutfits.map((outfit) => (
                      <div
                        key={outfit.id}
                        className="flex flex-col items-center hover:scale-105 transition-transform"
                      >
                        <div className="w-full aspect-square rounded-lg md:rounded-xl mb-1 shadow-md border-2 border-gray-200 bg-white flex items-center justify-center p-2 md:p-2">
                          <Image
                            src={outfit.image}
                            alt={outfit.name}
                            width={64}
                            height={64}
                            className="w-full h-full object-contain"
                            priority
                          />
                        </div>
                        
                        <div className="bg-white rounded-lg md:rounded-xl px-1.5 py-1 md:px-3 md:py-2 shadow-md border border-gray-200 text-center w-full">
                          <h4 className="font-bold text-gray-800 text-[9px] md:text-xs mb-0.5 line-clamp-1">{outfit.name}</h4>
                          <div className="flex items-center justify-center gap-0.5 mb-1">
                            <span className="text-[10px] md:text-sm">🍁</span>
                            <span className="font-bold text-gray-800 text-[9px] md:text-xs">{outfit.price}</span>
                          </div>
                          
                          <button
                            onClick={() => handlePurchase(outfit)}
                            disabled={points < outfit.price}
                            className={`w-full px-1 py-0.5 md:px-2 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-bold transition-all duration-200 ${
                              points >= outfit.price
                                ? 'bg-green-500 hover:bg-green-600 text-white shadow-sm hover:shadow-md cursor-pointer'
                                : 'bg-gray-200 text-gray-600 cursor-default'
                            }`}
                          >
                            {points >= outfit.price ? 'Buy' : 'Not enough 🍁'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-base md:text-lg font-bold text-gray-800 text-center">Your Collection</h3>
              {filteredOutfits.length === 0 ? (
                <div className="bg-[#ccab8b] rounded-3xl p-4 shadow-xl mx-auto max-w-md text-center">
                  <span className="text-3xl block mb-3">🛍️</span>
                  <h3 className="font-bold text-gray-800">No outfits yet!</h3>
                  <p className="text-xs text-gray-600">Visit the shop to buy some outfits for Billy.</p>
                </div>
              ) : (
                <div className="bg-[#ccab8b] rounded-3xl p-3 md:p-6 shadow-xl mx-auto max-w-5xl">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 md:gap-6">
                    {filteredOutfits.map((outfit) => (
                      <div
                        key={outfit.id}
                        className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => handleEquip(outfit.id)}
                      >
                        <div className="w-full aspect-square rounded-lg md:rounded-xl mb-1 shadow-md border-2 border-gray-200 bg-white flex items-center justify-center p-2 md:p-2">
                          <Image
                            src={outfit.image}
                            alt={outfit.name}
                            width={64}
                            height={64}
                            className="w-full h-full object-contain"
                            priority
                          />
                        </div>
                        
                        <div className="bg-white rounded-lg md:rounded-xl px-1.5 py-1 md:px-3 md:py-2 shadow-md border border-gray-200 text-center w-full">
                          <h4 className="font-bold text-gray-800 text-[9px] md:text-xs mb-0.5 line-clamp-1">{outfit.name}</h4>
                          <div className={`w-full px-1 py-0.5 md:px-2 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-bold ${outfit.equipped ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                            {outfit.equipped ? 'Equipped' : 'Owned'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav currentPage="billy" hasJournalPrompts={hasJournalPrompts} remainingJournalCount={remainingJournalCount} />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 animate-fade-in">
          <div className={`px-4 py-3 rounded-lg shadow-lg border-2 backdrop-blur-md ${
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
