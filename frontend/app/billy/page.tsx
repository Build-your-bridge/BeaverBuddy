'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));

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

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-600 bg-gray-100';
      case 'rare': return 'text-blue-600 bg-blue-100';
      case 'epic': return 'text-purple-600 bg-purple-100';
      case 'legendary': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handlePurchase = async (outfit: Outfit) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in again');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/outfits/user/${outfit.id}/buy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`❌ ${error.error}`);
        return;
      }

      const result = await response.json();

      // Update local state
      setPoints(prev => prev - outfit.price);
      setOutfits(prev => prev.map(o =>
        o.id === outfit.id ? { ...o, owned: true } : o
      ));

      alert(`🎉 Purchased ${outfit.name}!`);
    } catch (error) {
      console.error('Error purchasing outfit:', error);
      alert('❌ Failed to purchase outfit. Please try again.');
    }
  };

  const handleEquip = async (outfitId: number) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in again');
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
        alert(`❌ ${error.error}`);
        return;
      }

      const result = await response.json();

      // Update local state
      setOutfits(prev => prev.map(o => ({
        ...o,
        equipped: o.id === outfitId ? result.equipped : false
      })));
      setSelectedOutfit(outfitId.toString());

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

      alert(`✅ Outfit ${result.equipped ? 'equipped' : 'unequipped'}!`);
    } catch (error) {
      console.error('Error equipping outfit:', error);
      alert('❌ Failed to equip outfit. Please try again.');
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
    <main className="h-screen flex flex-col relative overflow-hidden bg-white">
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>

      {/* Floating sparkles */}
      <div className="absolute top-20 left-20 text-gray-400 text-3xl z-5" style={{ animation: 'sparkle 3s ease-in-out infinite' }}>✦</div>
      <div className="absolute top-32 right-32 text-gray-400 text-2xl z-5" style={{ animation: 'sparkle 3s ease-in-out infinite', animationDelay: '1s' }}>✦</div>
      <div className="absolute bottom-40 left-40 text-gray-400 text-2xl z-5" style={{ animation: 'sparkle 3s ease-in-out infinite', animationDelay: '2s' }}>✦</div>

      {/* Header - Glass */}
      <div className="relative h-20 flex items-center justify-between px-6 z-10" style={{
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <button
          onClick={handleLogout}
          className="text-sm font-bold text-gray-800 hover:text-gray-900 transition-all px-4 py-2 rounded-xl bg-white/60 backdrop-blur-md shadow-lg border border-white/40"
        >
          🪵 Logout
        </button>

        <div className="absolute left-1/2 transform -translate-x-1/2">
          <h2 className="text-2xl font-black text-gray-800 drop-shadow-sm">
            Billy's Wardrobe
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-white/40">
            <span className="text-2xl">🍁</span>
            <span className="text-lg font-black text-gray-800">{points}</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col px-6 pb-28 relative z-10">
        {/* Billy Display */}
        <div className="flex justify-center mb-6 mt-6">
          <div className="relative w-48 h-48 flex items-center justify-center">
            <Image
              src={user?.equippedOutfit?.image || "/images/beaver/default/default.png"}
              alt="Billy the Beaver"
              width={200}
              height={200}
              className="object-contain drop-shadow-2xl"
              priority
              style={{ animation: 'float 3s ease-in-out infinite' }}
            />
            {/* Show equipped outfit overlay */}
            {selectedOutfit !== 'default' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl">✨</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-6">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-1 shadow-lg border border-white/50">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('shop')}
                className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${
                  activeTab === 'shop'
                    ? 'bg-red-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                🛍️ Shop
              </button>
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${
                  activeTab === 'inventory'
                    ? 'bg-red-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                🎒 Inventory
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'shop' ? (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800 text-center mb-4">Available Outfits</h3>
              {filteredOutfits.length === 0 ? (
                <div className="bg-white/90 backdrop-blur rounded-3xl p-8 text-center shadow-xl border-2 border-white/50">
                  <span className="text-4xl block mb-4">🎉</span>
                  <h3 className="font-bold text-gray-800">All outfits purchased!</h3>
                  <p className="text-sm text-gray-600">Check back later for new items.</p>
                </div>
              ) : (
                <div className="bg-[#c68649] rounded-3xl p-6 border-2 border-amber-900/30 max-w-4xl mx-auto">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                    {filteredOutfits.map((outfit) => (
                      <div
                        key={outfit.id}
                        className={`flex flex-col items-center ${!outfit.owned ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
                        onClick={() => !outfit.owned && handlePurchase(outfit)}
                      >
                        <div className="w-32 h-32 rounded-xl mb-2 shadow-md border-2 border-gray-200 bg-white flex items-center justify-center">
                          <Image
                            src={outfit.image}
                            alt={outfit.name}
                            width={128}
                            height={128}
                            className="w-full h-full object-contain"
                            priority
                          />
                        </div>
                        
                        {/* Text div with name and price */}
                        <div className="bg-white rounded-xl px-4 py-2 shadow-md border border-gray-200 text-center">
                          <h4 className="font-bold text-gray-800 text-sm mb-1">{outfit.name}</h4>
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-lg">🍁</span>
                            <span className="font-bold text-gray-800 text-sm">{outfit.price}</span>
                          </div>
                        </div>
                    </div>
                  ))}
                </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800 text-center mb-4">Your Collection</h3>
              {filteredOutfits.length === 0 ? (
                <div className="bg-white/90 backdrop-blur rounded-3xl p-8 text-center shadow-xl border-2 border-white/50">
                  <span className="text-4xl block mb-4">🛍️</span>
                  <h3 className="font-bold text-gray-800">No outfits yet!</h3>
                  <p className="text-sm text-gray-600">Visit the shop to buy some outfits for Billy.</p>
                </div>
              ) : (
                <div className="bg-[#c68649] rounded-3xl p-6 border-2 border-amber-900/30 max-w-4xl mx-auto">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                    {filteredOutfits.map((outfit) => (
                      <div
                        key={outfit.id}
                        className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => handleEquip(outfit.id)}
                      >
                        <div className="w-32 h-32 rounded-xl mb-2 shadow-md border-2 border-gray-200 bg-white flex items-center justify-center">
                          <Image
                            src={outfit.image}
                            alt={outfit.name}
                            width={128}
                            height={128}
                            className="w-full h-full object-contain"
                            priority
                          />
                        </div>
                        
                        {/* Text div with name and status */}
                        <div className="bg-white rounded-xl px-4 py-2 shadow-md border border-gray-200 text-center">
                          <h4 className="font-bold text-gray-800 text-sm mb-1">{outfit.name}</h4>
                          <div className={`px-2 py-1 rounded-full text-xs font-bold ${outfit.equipped ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
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

      {/* Bottom navigation - solid */}
      <div className="absolute bottom-0 left-0 right-0 h-28 flex items-center justify-center px-4 z-10 bg-white border-t-2 border-gray-200 shadow-lg">
        <div className="flex justify-center items-center gap-8 w-full max-w-2xl pb-4">
          <button className="flex flex-col items-center">
            <div className="w-24 h-24 flex flex-col items-center justify-center rounded-3xl px-3 py-2" style={{
              background: 'rgba(255, 22, 22, 0.22)',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(236, 72, 72, 0.4)',
              boxShadow: '0 8px 24px rgba(236, 72, 153, 0.3)'
            }}>
              <Image
                src="/images/icons/billy.png"
                alt="Billy"
                width={64}
                height={64}
                className="w-14 h-14 object-contain mb-1"
              />
              <span className="text-xs font-black text-pink-700">Billy</span>
            </div>
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            className="flex flex-col items-center transition-transform hover:scale-110"
          >
            <div className="w-24 h-24 flex flex-col items-center justify-center rounded-3xl px-3 py-2" style={{
              background: 'rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)'
            }}>
              <Image
                src="/images/icons/house.png"
                alt="Home"
                width={64}
                height={64}
                className="w-14 h-14 object-contain mb-1"
              />
              <span className="text-xs font-black text-gray-800">Home</span>
            </div>
          </button>

          <button
            onClick={() => router.push('/journal')}
            className="flex flex-col items-center transition-transform hover:scale-110 relative"
          >
            {(() => {
              const userData = localStorage.getItem('user');
              const journalPrompts = userData ? sessionStorage.getItem(`journalPrompts_${JSON.parse(userData).id}`) : null;
              return journalPrompts && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white text-xs font-black rounded-full w-7 h-7 flex items-center justify-center z-10 shadow-lg border-2 border-white animate-pulse">
                  3
                </div>
              );
            })()}
            <div className="w-24 h-24 flex flex-col items-center justify-center rounded-3xl px-3 py-2" style={{
              background: 'rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)'
            }}>
              <Image
                src="/images/icons/journal.png"
                alt="Journal"
                width={64}
                height={64}
                className="w-14 h-14 object-contain mb-1"
              />
              <span className="text-xs font-black text-gray-800">Journal</span>
            </div>
          </button>
        </div>
      </div>
    </main>
  );
}