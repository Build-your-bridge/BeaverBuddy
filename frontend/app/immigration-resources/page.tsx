'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

export default function ImmigrationResourcesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'mental-health' | 'legal' | 'community' | 'crisis'>('mental-health');
  const [hasJournalPrompts, setHasJournalPrompts] = useState(false);
  const [remainingJournalCount, setRemainingJournalCount] = useState(0);

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

  const mentalHealthResources = [
    {
      title: 'Mental Health Hotlines',
      items: [
        { name: 'Canada 988 Suicide Crisis Line', phone: '9-8-8', description: 'Free 24/7 support (call or text)' },
        { name: 'Immigrant Services Society Crisis Line', phone: '1-888-639-0882', description: 'Specialized for immigrant communities' },
        { name: 'Beyond Borders Therapy', phone: 'Online', description: 'Culturally sensitive therapy for immigrants' }
      ]
    },
    {
      title: 'Virtual Counseling (Confidential)',
      items: [
        { name: 'BetterHelp', link: 'betterhelp.com', description: 'Affordable online therapy' },
        { name: 'Talkspace', link: 'talkspace.com', description: 'On-demand therapy, many languages' },
        { name: 'ICCBC', link: 'iccbc.org', description: 'Intercultural Counselling Centre BC' }
      ]
    }
  ];

  const legalResources = [
    {
      title: 'Immigration Legal Aid',
      items: [
        { name: 'Canada Visa & Immigration Helpline', phone: '1-888-242-2342', description: 'Official government support' },
        { name: 'Refugee Law Centre', link: 'refugeelawcentre.ca', description: 'Free legal help for refugees' },
        { name: 'Justice Centre', link: 'jccf.ca', description: 'Free legal services for vulnerable populations' }
      ]
    },
    {
      title: 'Immigration Advocacy',
      items: [
        { name: 'Canadian Immigration Council', link: 'cicic.ca', description: 'Credential recognition & settlement' },
        { name: 'Settlement Agencies Directory', link: 'settlement.org', description: 'Find services in your area' },
        { name: 'Immigration Lawyer Association', link: 'flsc.ca', description: 'Find qualified immigration lawyers' }
      ]
    }
  ];

  const communityResources = [
    {
      title: 'Community Support',
      items: [
        { name: 'Local Settlement Agencies', link: 'settlement.org', description: 'Job training, language classes, housing' },
        { name: 'Newcomer Integration', link: 'Ontario.ca', description: 'Provincial integration programs' },
        { name: 'Ethnocultural Centers', description: 'Language, cultural, and social support groups' }
      ]
    },
    {
      title: 'Family Connection',
      items: [
        { name: 'Immigrant Support Groups', description: 'Connect with others sharing similar experiences' },
        { name: 'Language Exchange Programs', description: 'Practice English/French while making friends' },
        { name: 'Cultural Community Centers', description: 'Food, celebrations, cultural activities' }
      ]
    }
  ];

  const crisisResources = [
    {
      title: 'Immediate Crisis Support',
      items: [
        { name: '911 Emergency', phone: '911', description: 'Life-threatening situations' },
        { name: '988 Crisis Line', phone: '988', description: 'Suicidal thoughts or self-harm' },
        { name: 'Crisis Text Line', phone: 'Text HOME to 741741', description: 'Text-based crisis support' }
      ]
    },
    {
      title: 'Immigration Status Crisis',
      items: [
        { name: 'Migrant Rights Network', link: 'migrant-rights.ca', description: 'Rights & emergency resources for migrants' },
        { name: 'Canadian Bar Association', link: 'cba.org', description: 'Emergency legal referral' },
        { name: 'Your Provincial Health Authority', description: 'Emergency medical care regardless of status' }
      ]
    }
  ];

  const renderResourceList = (resources: any[]) => (
    <div className="space-y-6">
      {resources.map((section, idx) => (
        <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-black text-gray-900 mb-4">{section.title}</h3>
          <div className="space-y-4">
            {section.items.map((item: any, itemIdx: number) => (
              <div key={itemIdx} className="border-l-4 border-blue-400 pl-4">
                <p className="font-bold text-gray-900">{item.name}</p>
                {item.phone && (
                  <p className="text-sm text-blue-600 font-semibold">📞 {item.phone}</p>
                )}
                {item.link && (
                  <a 
                    href={`https://${item.link}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    🌐 {item.link}
                  </a>
                )}
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ 
        background: 'linear-gradient(to bottom, #E8D4C0 0%, #F5E6D3 100%)'
      }}>
        <p className="text-gray-800 font-semibold">Loading...</p>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <>
      <Header 
        title="Immigration Support" 
        points={user?.points || 0} 
        onLogout={handleLogout}
      />
      <main className="flex-1 pb-20" style={{ 
        background: 'linear-gradient(to bottom, #FEF2F2 0%, #FFFBFB 100%)'
      }}>
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
          {/* Title Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-black text-gray-900 mb-2">🌍 Immigration Support</h1>
            <p className="text-gray-700">You don't have to navigate this alone. Here are resources that can help.</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: 'mental-health', label: '💭 Mental Health', emoji: '💭' },
              { id: 'legal', label: '⚖️ Legal', emoji: '⚖️' },
              { id: 'community', label: '👥 Community', emoji: '👥' },
              { id: 'crisis', label: '🆘 Crisis', emoji: '🆘' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-red-500 text-white shadow-lg'
                    : 'bg-white text-gray-700 border-2 border-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Resource Content */}
          {activeTab === 'mental-health' && renderResourceList(mentalHealthResources)}
          {activeTab === 'legal' && renderResourceList(legalResources)}
          {activeTab === 'community' && renderResourceList(communityResources)}
          {activeTab === 'crisis' && renderResourceList(crisisResources)}

          {/* Empowerment Message */}
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-200">
            <p className="text-sm text-gray-800 leading-relaxed">
              <span className="font-black">Remember:</span> Your immigration journey is valid. The stress you feel is real and understandable. Seeking help is a sign of strength, not weakness. You belong here, and you deserve support. 💙
            </p>
          </div>

          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="w-full mt-6 py-3 font-bold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all"
          >
            ← Back
          </button>
        </div>
      </main>

      <BottomNav 
        currentPage="dashboard" 
        hasJournalPrompts={hasJournalPrompts}
        remainingJournalCount={remainingJournalCount}
      />
    </>
  );
}
