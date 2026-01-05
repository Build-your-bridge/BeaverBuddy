'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

export default function ResourcesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [hasJournalPrompts, setHasJournalPrompts] = useState(false);
  const [remainingJournalCount, setRemainingJournalCount] = useState(0);

  const resources = [
    {
      category: 'Mental Health Support',
      items: [
        { name: 'Crisis Text Line', description: 'Text HOME to 741741', type: 'text' },
        { name: 'NAMI Helpline', description: '1-800-950-6264 (M-F 10am-10pm ET)', type: 'phone' },
        { name: 'AFSP Support', description: 'Support for those affected by suicide', type: 'phone' }
      ],
      color: 'bg-pink-100 border-pink-300'
    },
    {
      category: 'Immigration & Settlement',
      items: [
        { name: 'Settlement.Org', description: 'Information for newcomers to Ontario', type: 'web' },
        { name: 'IRCC', description: 'Government immigration information', type: 'web' },
        { name: 'Immigrant Services', description: 'Local settlement services finder', type: 'web' }
      ],
      color: 'bg-blue-100 border-blue-300'
    },
    {
      category: 'Community Support',
      items: [
        { name: 'Meetup Groups', description: 'Connect with others who share your interests', type: 'web' },
        { name: 'Religious Communities', description: 'Faith-based support groups', type: 'web' },
        { name: 'Sports & Recreation', description: 'Local clubs and community centers', type: 'web' }
      ],
      color: 'bg-green-100 border-green-300'
    },
    {
      category: 'Education & Employment',
      items: [
        { name: 'Job Training Programs', description: 'Skills and employment support', type: 'web' },
        { name: 'Language Classes', description: 'Free or low-cost English/French courses', type: 'web' },
        { name: 'Credential Recognition', description: 'Help with professional credential assessment', type: 'web' }
      ],
      color: 'bg-yellow-100 border-yellow-300'
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
          title="Community Resources" 
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
            <p className="text-center text-gray-700 mb-8">
              You're not alone. Here are resources that can help.
            </p>

            <div className="space-y-6">
              {resources.map((resourceGroup, groupIndex) => (
                <div key={groupIndex}>
                  <h3 className="text-lg font-black text-gray-800 mb-3">
                    {resourceGroup.category}
                  </h3>

                  <div className="space-y-3">
                    {resourceGroup.items.map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className={`p-4 rounded-lg border-2 transition-all ${resourceGroup.color}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-2xl mt-1">
                            {item.type === 'phone' && '📞'}
                            {item.type === 'text' && '💬'}
                            {item.type === 'web' && '🌐'}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-black text-gray-800 text-sm mb-1">
                              {item.name}
                            </h4>
                            <p className="text-xs text-gray-700">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="mt-8 p-6 rounded-lg border-2"
              style={{
                background: 'rgba(255, 255, 255, 0.6)',
                borderColor: 'rgba(0, 0, 0, 0.1)'
              }}
            >
              <h4 className="font-black text-gray-800 mb-2">In Crisis?</h4>
              <p className="text-sm text-gray-700 mb-4">
                If you're in immediate danger, please call 911 or go to your nearest emergency room.
              </p>
              <button
                onClick={() => router.push('/local-help')}
                className="w-full py-3 font-black rounded-lg transition-all transform hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
                  color: 'white'
                }}
              >
                Find Local Emergency Help
              </button>
            </div>

            <button
              onClick={() => router.push('/quests')}
              className="w-full mt-6 py-3 font-semibold rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
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
