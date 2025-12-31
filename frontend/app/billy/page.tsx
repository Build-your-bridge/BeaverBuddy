'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

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
        // Fetch all available outfits
        const outfitsResponse = await fetch('http://localhost:5000/api/outfits', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!outfitsResponse.ok) {
          throw new Error('Failed to fetch outfits');
        }

        const allOutfits = await outfitsResponse.json();

        // Fetch user's owned outfits
        const userOutfitsResponse = await fetch('http://localhost:5000/api/outfits/user', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const userOutfits = userOutfitsResponse.ok ? await userOutfitsResponse.json() : [];

        // Fetch user points
        const pointsResponse = await fetch('http://localhost:5000/api/outfits/user/points', {
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
        // Fallback to empty array
        setOutfits([]);
      }
    };

    fetchData();
  }, [router]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000); // Auto-hide after 3 seconds
  };

  const handlePurchase = async (outfit: Outfit) => {
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Please log in again', 'error');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/outfits/user/${outfit.id}/buy`, {
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

      // Update local state
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
      const response = await fetch(`http://localhost:5000/api/outfits/user/${outfitId}/equip`, {
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

      // Update local state
      setOutfits(prev => prev.map(o => ({
        ...o,
        equipped: o.id === outfitId ? result.equipped : false
      })));
      setSelectedOutfit(result.equipped ? outfitId.toString() : 'default');

      // Update user data in localStorage with new equipped outfit
      if (user) {
        let newEquippedOutfit = null;
        if (result.equipped) {
          // Just equipped this outfit
          newEquippedOutfit = outfits.find(o => o.id === outfitId) || null;
        } else {
          // Switched to default outfit
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

      {/* Header - Glass */}
      <Header 
        title="Billy's Wardrobe" 
        points={points} 
        onLogout={handleLogout}
        className="mb-10"
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col px-6 pb-4 relative z-10">
        {/* Billy Display */}
        <div className="flex justify-center mb-4 mt-2">
          <div className="relative w-32 h-32 md:w-40 md:h-36 lg:w-48 lg:h-40 flex items-center justify-center">
            <Image
              src={user?.equippedOutfit?.image || "/images/beaver/default/default.png"}
              alt="Billy the Beaver"
              width={160}
              height={160}
              className="object-contain drop-shadow-2xl"
              priority
              style={{ animation: 'float 3s ease-in-out infinite' }}
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="p-3 rounded-t-[40px] mt-auto max-w-md mx-auto w-full">
          <div className="flex gap-3 max-w-xs mx-auto">
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-28 md:pb-32">
          {activeTab === 'shop' ? (
            <div className="space-y-4">
              <h3 className="text-lg md:text-xl font-bold text-gray-800 text-center mb-4">Available Outfits</h3>
              {filteredOutfits.length === 0 ? (
                <div className="bg-[#ccab8b] rounded-3xl p-4 shadow-2xl max-w-4xl mx-auto text-center">
                  <span className="text-4xl block mb-4">🎉</span>
                  <h3 className="font-bold text-gray-800">All outfits purchased!</h3>
                  <p className="text-sm text-gray-600">Check back later for new items.</p>
                </div>
              ) : (
                <div className="bg-[#ccab8b] rounded-3xl p-6 shadow-xl max-w-4xl md:max-w-2xl lg:max-w-4xl mx-auto max-h-[calc(100vh-30rem)] md:max-h-[calc(100vh-28rem)] overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-4xl md:max-w-2xl lg:max-w-4xl mx-auto">
                    {filteredOutfits.map((outfit) => (
                      <div
                        key={outfit.id}
                        className={`flex flex-col items-center hover:scale-105 transition-transform ${points < outfit.price ? 'cursor-default' : ''}`}
                      >
                        <div className="w-28 h-24 md:w-32 md:h-28 lg:w-36 lg:h-32 rounded-xl mb-2 shadow-md border-2 border-gray-200 bg-white flex items-center justify-center">
                          <Image
                            src={outfit.image}
                            alt={outfit.name}
                            width={112}
                            height={96}
                            className="w-full h-full object-contain"
                            priority
                          />
                        </div>
                        
                        {/* Text div with name, price, and buy button */}
                        <div className="bg-white rounded-xl px-2 py-2 shadow-md border border-gray-200 text-center w-28 md:w-32 lg:w-36">
                          <h4 className="font-bold text-gray-800 text-[10px] md:text-xs mb-0.5">{outfit.name}</h4>
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <span className="text-sm md:text-base">🍁</span>
                            <span className="font-bold text-gray-800 text-[10px] md:text-xs">{outfit.price}</span>
                          </div>
                          
                          {/* Buy button */}
                          <button
                            onClick={() => handlePurchase(outfit)}
                            disabled={points < outfit.price}
                            className={`px-2 md:px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-200 ${
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
            <div className="space-y-4">
              <h3 className="text-lg md:text-xl font-bold text-gray-800 text-center mb-4">Your Collection</h3>
              {filteredOutfits.length === 0 ? (
                <div className="bg-[#ccab8b] rounded-3xl p-4 shadow-lg max-w-4xl mx-auto text-center">
                  <span className="text-4xl block mb-4">🛍️</span>
                  <h3 className="font-bold text-gray-800">No outfits yet!</h3>
                  <p className="text-sm text-gray-600">Visit the shop to buy some outfits for Billy.</p>
                </div>
              ) : (
                <div className="bg-[#ccab8b] rounded-3xl p-6 shadow-md max-w-4xl md:max-w-2xl lg:max-w-4xl mx-auto max-h-[calc(100vh-30rem)] md:max-h-[calc(100vh-28rem)] overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-4xl md:max-w-2xl lg:max-w-4xl mx-auto">
                    {filteredOutfits.map((outfit) => (
                      <div
                        key={outfit.id}
                        className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => handleEquip(outfit.id)}
                      >
                        <div className="w-28 h-24 md:w-32 md:h-28 lg:w-36 lg:h-32 rounded-xl mb-2 shadow-md border-2 border-gray-200 bg-white flex items-center justify-center">
                          <Image
                            src={outfit.image}
                            alt={outfit.name}
                            width={112}
                            height={96}
                            className="w-full h-full object-contain"
                            priority
                          />
                        </div>
                        
                        {/* Text div with name and status */}
                        <div className="bg-white rounded-xl px-2 py-2 shadow-md border border-gray-200 text-center w-28 md:w-32 lg:w-36">
                          <h4 className="font-bold text-gray-800 text-[10px] md:text-xs mb-1">{outfit.name}</h4>
                          <div className={`px-1 py-1 rounded-full text-[10px] font-bold ${outfit.equipped ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
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
        <div className="fixed top-16 right-4 md:bottom-4 md:top-auto z-50 animate-fade-in">
          <div className={`px-4 py-2 md:px-6 md:py-3 rounded-lg shadow-lg border-2 backdrop-blur-md ${
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