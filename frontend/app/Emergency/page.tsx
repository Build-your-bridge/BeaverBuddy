'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Header from '../components/Header';

interface Helpline {
  name: string;
  number: string;
  available: string;
  description: string;
}

interface EmergencyData {
  message: string;
  helplines: Helpline[];
  additionalMessage: string;
  crisisType: string;
}

function EmergencyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [emergencyData, setEmergencyData] = useState<EmergencyData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Get emergency data from search params
    const crisisType = searchParams.get('type');
    const message = searchParams.get('message');
    const helplinesJson = searchParams.get('helplines');
    const additionalMessage = searchParams.get('additional');

    if (crisisType && message && helplinesJson) {
      try {
        const helplines = JSON.parse(decodeURIComponent(helplinesJson));
        setEmergencyData({
          crisisType,
          message,
          helplines,
          additionalMessage: additionalMessage || ''
        });
      } catch (error) {
        console.error('Failed to parse emergency data:', error);
        router.push('/dashboard');
      }
    }

    // Fetch user points
    if (token) {
      fetch('http://localhost:5001/api/outfits/user/points', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => setCurrentPoints(data.points))
        .catch(err => console.error('Error fetching points:', err))
        .finally(() => setLoading(false));
    }
  }, [router, searchParams]);

  const handleLogout = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const currentUser = JSON.parse(userData);
      localStorage.removeItem(`questGeneratedDate_${currentUser.id}`);
      localStorage.removeItem(`wasInCrisis_${currentUser.id}`);
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
      <div className="h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #ffa69e 0%, #ffddd2 100%)'
      }}>
        <p className="text-gray-800 font-semibold">Loading...</p>
      </div>
    );
  }

  if (!emergencyData) {
    return (
      <div className="h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #ffa69e 0%, #ffddd2 100%)'
      }}>
        <p className="text-gray-800 font-semibold">No emergency data found.</p>
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
      `}</style>

      {/* Header */}
      <Header
        title="Emergency Support"
        points={currentPoints}
        onLogout={handleLogout}
      />

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 relative z-10 overflow-y-auto pb-6">
        <div className="w-full max-w-md h-full flex flex-col justify-center">
          {/* Glass card */}
          <div className="relative" style={{
            background: 'rgba(255, 255, 255, 1)',
            backdropFilter: 'blur(20px)',
            borderRadius: '40px',
            padding: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column'
          }}>

            {/* Speech bubble */}
            <div className="text-left relative flex-shrink-0" style={{
              background: 'rgba(254, 226, 226, 0.8)',
              backdropFilter: 'blur(10px)',
              borderRadius: '18px',
              padding: '14px 18px',
              boxShadow: '0 8px 10px rgba(0, 0, 0, 0.2)',
              border: '2px solid rgba(252, 165, 165, 0.5)',
              marginBottom: '12px'
            }}>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <svg width="25" height="15" viewBox="0 0 30 20" fill="none">
                  <path d="M 5 0 Q 15 10 25 0 L 18 15 L 12 15 Z" fill="rgba(254, 226, 226, 0.8)" />
                </svg>
              </div>
              <h1 className="text-lg font-black text-red-900 leading-tight mb-0.5">
                🆘 Support Available Now
              </h1>
              <p className="text-xs text-gray-800 leading-snug font-semibold">
                {emergencyData.message}
              </p>
            </div>

            {/* Billy - Smaller */}
            <div className="flex justify-center flex-shrink-0 my-2">
              <div className="relative w-24 h-24">
                <Image
                  src={user?.equippedOutfit?.image || "/images/beaver/default/default.png"}
                  alt="Billy is here to help"
                  width={96}
                  height={96}
                  className="object-contain drop-shadow-lg"
                  priority
                />
              </div>
            </div>

            {/* Helplines - Ultra Compact */}
            <div className="space-y-1.5 flex-1 overflow-y-auto mb-2">
              <h2 className="text-sm font-black text-gray-900 text-center mb-1.5 flex-shrink-0">
                📞 Reach Out Now
              </h2>
              {emergencyData.helplines.map((helpline, idx) => (
                <div key={idx} className="rounded-lg p-1.5 border-2 shadow-sm flex-shrink-0" style={{
                  background: 'linear-gradient(to right, rgba(219, 234, 254, 0.8), rgba(191, 219, 254, 0.8))',
                  borderColor: 'rgba(147, 197, 253, 0.8)'
                }}>
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-gray-900 text-xs mb-0.5 leading-tight line-clamp-1">{helpline.name}</h3>
                      <p className="text-xs text-gray-700 mb-0.5 leading-snug line-clamp-2">{helpline.description}</p>
                      <p className="text-xs text-gray-600 font-semibold line-clamp-1">{helpline.available}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <a
                        href={helpline.number.startsWith('1-') ? `tel:${helpline.number}` : '#'}
                        className="block bg-blue-600 text-white px-1.5 py-1 rounded-lg font-black text-xs hover:bg-blue-700 transition-all text-center whitespace-nowrap"
                      >
                        {helpline.number.includes('Text') ? 'TEXT' :
                          helpline.number.includes('Visit') ? 'VISIT' : 'CALL'}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Additional message */}
            <div className="rounded-lg p-2 border-2 text-center text-xs flex-shrink-0 mb-2" style={{
              background: 'rgba(220, 252, 231, 0.8)',
              borderColor: 'rgba(134, 239, 172, 0.8)'
            }}>
              <p className="font-bold text-green-900 leading-snug line-clamp-3">
                {emergencyData.additionalMessage}
              </p>
            </div>

            {/* Back button */}
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-3 rounded-full font-black text-sm text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 flex-shrink-0 tracking-wide"
              style={{ background: '#DC2626' }}
            >
              🏠 DASHBOARD
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function EmergencyPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-gradient-to-b from-[#ffa69e] to-[#ffddd2]"><p>Loading...</p></div>}>
      <EmergencyContent />
    </Suspense>
  );
}