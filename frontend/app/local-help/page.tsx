'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

export default function LocalHelpPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [location, setLocation] = useState('');
  const [hasJournalPrompts, setHasJournalPrompts] = useState(false);
  const [remainingJournalCount, setRemainingJournalCount] = useState(0);

  const emergencyContacts = [
    {
      title: '🚨 Emergency Services',
      items: [
        { label: 'Police, Fire, Medical', number: '911', available: '24/7' }
      ]
    },
    {
      title: '💬 Crisis Text & Chat',
      items: [
        { label: 'Crisis Text Line', number: 'Text HOME to 741741', available: '24/7' },
        { label: 'Canada Suicide Prevention', number: '1-833-456-4566', available: '24/7' },
        { label: 'Talk Suicide Canada', number: '1-833-456-4566', available: '24/7' }
      ]
    },
    {
      title: '📞 Hotlines by Province',
      items: [
        { label: 'Ontario', number: '1-855-375-9411 (Back Home Office)', available: '24/7' },
        { label: 'British Columbia', number: '1-800-784-2433', available: '24/7' },
        { label: 'Alberta', number: '1-877-303-2642', available: '24/7' },
        { label: 'Quebec', number: '1-866-APPELLE (1-866-277-3553)', available: '24/7' },
        { label: 'Manitoba', number: '1-877-435-3733', available: '24/7' },
        { label: 'Saskatchewan', number: '1-306-757-0127', available: '24/7' }
      ]
    },
    {
      title: '🏥 Hospitals & Emergency Rooms',
      items: [
        { label: 'Find your nearest ER', number: 'Search "[your city] Emergency Room"', available: '24/7' },
        { label: 'Urgent Care', number: 'Walk-in clinics in your area', available: 'Varies' }
      ]
    },
    {
      title: '🌍 Immigrant-Specific Support',
      items: [
        { label: 'Immigrant Services', number: 'Call 211 Ontario', available: '24/7' },
        { label: 'Multicultural Mental Health', number: 'Search local organizations', available: 'Varies' }
      ]
    }
  ];

  const localServiceTypes = [
    {
      icon: '🏥',
      title: 'Find a Mental Health Professional',
      description: 'Therapists, counselors, and psychiatrists near you',
      action: 'Search Online'
    },
    {
      icon: '👥',
      title: 'Support Groups',
      description: 'Connect with people going through similar experiences',
      action: 'Find Groups'
    },
    {
      icon: '🏛️',
      title: 'Community Mental Health Centers',
      description: 'Free or low-cost services in your area',
      action: 'Search by ZIP'
    },
    {
      icon: '📱',
      title: 'Telehealth Services',
      description: 'Online counseling and therapy options',
      action: 'Browse Options'
    }
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Get saved location if available
    const savedLocation = localStorage.getItem(`userLocation_${parsedUser.id}`);
    if (savedLocation) {
      try {
        const loc = JSON.parse(savedLocation);
        setLocation(loc.city || '');
      } catch (e) {
        console.error('Error parsing location:', e);
      }
    }

    // Update journal count
    const journalPromptsData = sessionStorage.getItem(`journalPrompts_${parsedUser.id}`);
    if (journalPromptsData) {
      try {
        const prompts = JSON.parse(journalPromptsData);
        const normalizedPrompts = Array.isArray(prompts) ? prompts : [];
        const remaining = normalizedPrompts.filter((p: any) => !p.answer).length;
        setRemainingJournalCount(remaining);
        setHasJournalPrompts(remaining > 0);
      } catch (e) {
        console.error('Error parsing journal prompts:', e);
      }
    }
  }, [router]);

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ 
        background: 'linear-gradient(135deg, #ffa69e 0%, #ffddd2 100%)'
      }}>
        <p className="text-gray-800 font-semibold">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <main className="h-screen flex flex-col overflow-hidden relative" style={{ background: 'linear-gradient(to bottom, #FEF2F2 0%, #FFFBFB 100%)' }}>
        <style jsx>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <Header 
          title="Get Help Locally" 
          points={0}
          streak={0}
          onLogout={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            router.push('/');
          }}
        />

        <div className="flex-1 overflow-y-auto px-4 pb-24">
          <div className="max-w-2xl mx-auto py-6">
            
            {/* Emergency Banner */}
            <div
              className="p-6 rounded-lg mb-8 border-2"
              style={{
                background: 'linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)',
                borderColor: 'rgba(220, 38, 38, 0.3)'
              }}
            >
              <h3 className="font-black text-gray-900 mb-2">In Crisis Right Now?</h3>
              <p className="text-sm text-gray-900 mb-4">
                These numbers are available 24/7 and are free and confidential.
              </p>
              <div className="space-y-2">
                <div className="font-black text-gray-900">
                  🚨 Emergency: <span className="text-lg">911</span>
                </div>
                <div className="font-black text-gray-900">
                  💬 Text: <span className="text-sm">HOME to 741741</span>
                </div>
                <div className="font-black text-gray-900">
                  📞 Canada Suicide Prevention: <span className="text-sm">1-833-456-4566</span>
                </div>
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="space-y-6 mb-8">
              {emergencyContacts.map((group, groupIndex) => (
                <div key={groupIndex}>
                  <h4 className="text-lg font-black text-gray-800 mb-3">
                    {group.title}
                  </h4>
                  <div className="space-y-2">
                    {group.items.map((contact, itemIndex) => (
                      <div
                        key={itemIndex}
                        className="p-4 rounded-lg"
                        style={{
                          background: 'rgba(255, 255, 255, 0.7)',
                          border: '1px solid rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">
                              {contact.label}
                            </p>
                            <p className="font-black text-gray-900 mt-1">
                              {contact.number}
                            </p>
                          </div>
                          <span className="text-xs bg-green-100 text-green-900 px-2 py-1 rounded-full font-semibold">
                            {contact.available}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Local Services */}
            <div className="mb-8">
              <h4 className="text-lg font-black text-gray-800 mb-3">
                Finding Services Near You
              </h4>
              <div className="space-y-3">
                {localServiceTypes.map((service, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border-2 transition-all hover:scale-102"
                    style={{
                      background: 'rgba(255, 255, 255, 0.6)',
                      borderColor: 'rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{service.icon}</span>
                      <div className="flex-1">
                        <h5 className="font-black text-gray-800 text-sm mb-1">
                          {service.title}
                        </h5>
                        <p className="text-xs text-gray-700 mb-3">
                          {service.description}
                        </p>
                        <button
                          onClick={() => window.open(`https://www.google.com/search?q=${service.title}+near+me`, '_blank')}
                          className="text-xs font-black px-3 py-1 rounded-lg transition-all"
                          style={{
                            background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
                            color: 'white'
                          }}
                        >
                          {service.action}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div
              className="p-6 rounded-lg mb-6 border-2"
              style={{
                background: 'rgba(255, 255, 255, 0.6)',
                borderColor: 'rgba(59, 130, 246, 0.3)'
              }}
            >
              <h4 className="font-black text-gray-800 mb-3">💡 Tips for Getting Help</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>✓ It's okay to ask for help - many people do</li>
                <li>✓ Confidentiality is protected (with legal exceptions for safety)</li>
                <li>✓ You can talk to your doctor for referrals</li>
                <li>✓ Many services are free or sliding scale</li>
                <li>✓ No judgment - therapists are trained professionals</li>
              </ul>
            </div>

            <button
              onClick={() => router.push('/quests')}
              className="w-full py-3 font-semibold rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
            >
              Back to Quests
            </button>
          </div>
        </div>

        <BottomNav 
          currentPage="dashboard" 
          hasJournalPrompts={hasJournalPrompts} 
          remainingJournalCount={remainingJournalCount} 
        />
      </main>
    </>
  );
}
