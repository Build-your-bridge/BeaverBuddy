'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

interface CheckInEntry {
  date: string;
  feeling: string;
  emoji: string;
  mood: 'light' | 'neutral' | 'heavy';
  timestamp?: string;
}

interface TrendData {
  date: string;
  value: number;
  emoji: string;
}

export default function GrowthPage() {
  const [user, setUser] = useState<any>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [hasJournalPrompts, setHasJournalPrompts] = useState(false);
  const [remainingJournalCount, setRemainingJournalCount] = useState(0);
  const [trendObservation, setTrendObservation] = useState('');
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

    // Load check-in history and process trends
    const journeyData = localStorage.getItem(`growthCheckInHistory_${parsedUser.id}`);
    if (journeyData) {
      try {
        const parsed = JSON.parse(journeyData);
        processTrendData(parsed);
      } catch (e) {
        console.error('Error loading trend data:', e);
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

  const getMoodValue = (feeling: string): number => {
    const feelingLower = feeling.toLowerCase();
    
    if (feelingLower.includes('great') || feelingLower.includes('amazing') || feelingLower.includes('happy') || feelingLower.includes('joy')) {
      return 5;
    } else if (feelingLower.includes('good') || feelingLower.includes('okay') || feelingLower.includes('calm')) {
      return 4;
    } else if (feelingLower.includes('alright') || feelingLower.includes('fine') || feelingLower.includes('neutral')) {
      return 3;
    } else if (feelingLower.includes('sad') || feelingLower.includes('down') || feelingLower.includes('blue')) {
      return 2;
    } else if (feelingLower.includes('anxious') || feelingLower.includes('worried') || feelingLower.includes('stress') || feelingLower.includes('alone') || feelingLower.includes('lost')) {
      return 1;
    }
    return 3;
  };

  const getMoodEmoji = (value: number): string => {
    switch (value) {
      case 5: return '☀️';
      case 4: return '🌤️';
      case 3: return '💫';
      case 2: return '🌧️';
      case 1: return '⛈️';
      default: return '💫';
    }
  };

  const getMoodValueFromMoodString = (mood: string): number => {
    switch (mood) {
      case 'amazing': return 5;
      case 'happy': return 5;
      case 'calm': return 4;
      case 'okay': return 3;
      case 'sad': return 2;
      case 'stressed': return 1;
      case 'angry': return 1;
      default: return 3;
    }
  };

  const processTrendData = (entries: CheckInEntry[]) => {
    const trends = entries.map((entry: any) => {
      // If mood is already selected, use that; otherwise calculate from feeling
      const value = entry.mood ? getMoodValueFromMoodString(entry.mood) : getMoodValue(entry.feeling);
      const emoji = entry.emoji || getMoodEmoji(value);
      
      return {
        date: entry.date,
        value: value,
        emoji: emoji
      };
    });

    setTrendData(trends);
    generateTrendObservation(trends);
  };

  const generateTrendObservation = (trends: TrendData[]) => {
    if (trends.length === 0) {
      setTrendObservation("Your journey is just beginning. Check in regularly to see patterns emerge over time.");
      return;
    }

    const recentTrends = trends.slice(-7);
    const recentAvg = recentTrends.reduce((sum, t) => sum + t.value, 0) / recentTrends.length;
    const olderTrends = trends.slice(0, Math.max(1, trends.length - 14)).slice(-7);
    const olderAvg = olderTrends.length > 0 ? olderTrends.reduce((sum, t) => sum + t.value, 0) / olderTrends.length : recentAvg;

    const trend = recentAvg - olderAvg;
    
    if (trends.length < 7) {
      setTrendObservation("You're building your journey, moment by moment. Keep showing up for yourself.");
    } else if (recentAvg >= 4.5) {
      setTrendObservation("Feeling steadier lately — you're cultivating lightness in your moments. ✨");
    } else if (recentAvg >= 3.5) {
      setTrendObservation("Your recent moments show a nice balance — both ease and depth are present. 🌙");
    } else if (trend > 0.5) {
      setTrendObservation("Things are shifting toward lighter feelings. That movement matters. 🌱");
    } else if (trend < -0.5) {
      setTrendObservation("This period feels heavier — and that's okay. You're still showing up. 🤍");
    } else {
      setTrendObservation("Your journey shows a steady rhythm of ups and downs. That's the natural flow. 💫");
    }
  };

  const getMaxValue = () => trendData.length > 0 ? Math.max(...trendData.map(t => t.value), 5) : 5;
  const maxValue = getMaxValue();

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ 
        background: 'linear-gradient(135deg, #ffa69e 0%, #ffddd2 100%)'
      }}>
        <p className="text-gray-800 font-semibold">Loading your growth...</p>
      </div>
    );
  }

  return (
    <>
      <main className="h-screen flex flex-col overflow-hidden relative" style={{ background: 'linear-gradient(to bottom, #FAF3E0 0%, #FEF5E7 100%)' }}>
        <style jsx>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .chart-bar {
            transition: all 0.3s ease;
          }
          .chart-bar:hover {
            transform: translateY(-4px);
          }
        `}</style>

        {/* Floating decorative elements */}
        <div className="absolute top-24 right-8 text-5xl opacity-15 z-0">📊</div>
        <div className="absolute bottom-32 left-8 text-4xl opacity-15 z-0">📈</div>

        {/* Header */}
        <Header 
          title="Your Growth & Trends" 
          points={0}
          streak={0}
          onLogout={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            router.push('/');
          }}
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-y-auto pb-24 px-4 pt-4 relative z-10">
          <div className="max-w-2xl w-full mx-auto">
            
            {/* Observation card */}
            <div className="mb-6" style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
              borderRadius: '28px',
              padding: '20px',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              animation: 'fadeIn 0.5s ease-out'
            }}>
              <h2 className="text-lg font-black text-gray-800 mb-2">What your moments show</h2>
              <p className="text-sm text-gray-700 leading-relaxed">{trendObservation}</p>
              <p className="text-xs text-gray-600 mt-3 italic">This is just for you — ups and downs are a normal part of any journey.</p>
            </div>

            {/* Feeling Trends Chart - Line Graph */}
            {trendData.length > 0 && (
              <div className="mb-6" style={{
                background: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(20px)',
                borderRadius: '28px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
                animation: 'fadeIn 0.6s ease-out'
              }}>
                <h3 className="text-lg font-black text-gray-800 mb-6">Your feeling over time</h3>
                
                {/* Line chart with SVG */}
                <div className="relative mb-8">
                  <svg 
                    width="100%" 
                    height="300" 
                    viewBox="0 0 600 300"
                    style={{ overflow: 'visible' }}
                    className="w-full"
                  >
                    {/* Grid lines */}
                    {[1, 2, 3, 4, 5].map((level) => (
                      <line
                        key={`grid-${level}`}
                        x1="40"
                        y1={270 - (level - 1) * 50}
                        x2="570"
                        y2={270 - (level - 1) * 50}
                        stroke="rgba(200, 200, 200, 0.3)"
                        strokeWidth="1"
                        strokeDasharray="5,5"
                      />
                    ))}

                    {/* Y-axis labels with emojis and circles */}
                    <g>
                      {/* 5 - Great (Green) */}
                      <circle cx="20" cy="20" r="14" fill="#22C55E" />
                      <text x="20" y="26" textAnchor="middle" fontSize="16" fontWeight="bold" fill="white">5</text>
                      <text x="32" y="27" fontSize="20">☀️</text>

                      {/* 4 - Good (Light Green) */}
                      <circle cx="20" cy="70" r="14" fill="#84CC16" />
                      <text x="20" y="76" textAnchor="middle" fontSize="16" fontWeight="bold" fill="white">4</text>
                      <text x="32" y="77" fontSize="20">🌤️</text>

                      {/* 3 - Neutral (Blue) */}
                      <circle cx="20" cy="120" r="14" fill="#06B6D4" />
                      <text x="20" y="126" textAnchor="middle" fontSize="16" fontWeight="bold" fill="white">3</text>
                      <text x="32" y="127" fontSize="20">💫</text>

                      {/* 2 - Sad (Orange) */}
                      <circle cx="20" cy="170" r="14" fill="#F97316" />
                      <text x="20" y="176" textAnchor="middle" fontSize="16" fontWeight="bold" fill="white">2</text>
                      <text x="32" y="177" fontSize="20">🌧️</text>

                      {/* 1 - Stressed (Red) */}
                      <circle cx="20" cy="220" r="14" fill="#EF4444" />
                      <text x="20" y="226" textAnchor="middle" fontSize="16" fontWeight="bold" fill="white">1</text>
                      <text x="32" y="227" fontSize="20">⛈️</text>
                    </g>

                    {/* X-axis */}
                    <line x1="40" y1="270" x2="570" y2="270" stroke="rgba(100, 100, 100, 0.3)" strokeWidth="2" />

                    {/* Plot data points and lines */}
                    {trendData.slice(-14).length > 0 && (() => {
                      const lastPoints = trendData.slice(-14);
                      const xStep = (530) / Math.max(lastPoints.length - 1, 1);
                      
                      // Color mapping for each mood value
                      const getLineColor = (value: number) => {
                        if (value >= 4.5) return '#22C55E';
                        if (value >= 3.5) return '#84CC16';
                        if (value >= 2.5) return '#06B6D4';
                        if (value >= 1.5) return '#F97316';
                        return '#EF4444';
                      };

                      return (
                        <g>
                          {/* Lines connecting points */}
                          {lastPoints.map((point, idx) => {
                            if (idx === 0) return null;
                            const prevPoint = lastPoints[idx - 1];
                            const x1 = 40 + idx * xStep - xStep;
                            const y1 = 270 - (prevPoint.value - 1) * 50;
                            const x2 = 40 + idx * xStep;
                            const y2 = 270 - (point.value - 1) * 50;
                            
                            return (
                              <line
                                key={`line-${idx}`}
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke={getLineColor(point.value)}
                                strokeWidth="3"
                                strokeLinecap="round"
                              />
                            );
                          })}

                          {/* Data points */}
                          {lastPoints.map((point, idx) => {
                            const x = 40 + idx * xStep;
                            const y = 270 - (point.value - 1) * 50;
                            
                            return (
                              <g key={`point-${idx}`}>
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="6"
                                  fill={getLineColor(point.value)}
                                  stroke="white"
                                  strokeWidth="2"
                                />
                                <text
                                  x={x}
                                  y={y + 25}
                                  textAnchor="middle"
                                  fontSize="16"
                                >
                                  {point.emoji}
                                </text>
                              </g>
                            );
                          })}
                        </g>
                      );
                    })()}
                  </svg>
                </div>

                {/* Chart labels */}
                <div className="flex justify-between items-center text-xs text-gray-600 font-semibold mb-4">
                  <span>14 days ago</span>
                  <span>Today</span>
                </div>

                {/* Legend */}
                <div className="flex justify-between gap-4 text-xs text-gray-700 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <span className="block font-semibold text-gray-600">Lighter</span>
                  </div>
                  <div className="text-center">
                    <span className="block font-semibold text-gray-600">Balanced</span>
                  </div>
                  <div className="text-center">
                    <span className="block font-semibold text-gray-600">Heavier</span>
                  </div>
                </div>
              </div>
            )}

            {/* Insight cards */}
            <div className="grid grid-cols-1 gap-3 mb-4">
              {/* Most common feeling */}
              {trendData.length > 0 && (
                <div style={{
                  background: 'rgba(254, 240, 242, 0.5)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '20px',
                  padding: '16px',
                  border: '1px solid rgba(236, 72, 153, 0.2)',
                  animation: 'fadeIn 0.7s ease-out'
                }}>
                  <p className="text-sm font-black text-gray-800 mb-1">Most common feeling</p>
                  <p className="text-xs text-gray-700">
                    Your moments have been {trendData.reduce((sum, t) => sum + t.value, 0) / trendData.length >= 4 ? 'leaning lighter' : trendData.reduce((sum, t) => sum + t.value, 0) / trendData.length >= 3 ? 'well balanced' : 'leaning heavier'}.
                  </p>
                </div>
              )}

              {/* Check-in streak insight */}
              {trendData.length > 0 && (
                <div style={{
                  background: 'rgba(240, 253, 250, 0.5)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '20px',
                  padding: '16px',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  animation: 'fadeIn 0.8s ease-out'
                }}>
                  <p className="text-sm font-black text-gray-800 mb-1">Showing up for yourself</p>
                  <p className="text-xs text-gray-700">
                    You've checked in {trendData.length} times. Every moment counts — this consistency is what builds belonging.
                  </p>
                </div>
              )}
            </div>

            {/* Empty state */}
            {trendData.length === 0 && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(10px)',
                borderRadius: '25px',
                padding: '40px 24px',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                animation: 'fadeIn 0.6s ease-out'
              }}>
                <p className="text-4xl mb-3">📊</p>
                <p className="text-gray-700 font-semibold">No trends yet</p>
                <p className="text-xs text-gray-600 mt-2">Start checking in on your dashboard to see your patterns and journey unfold over time.</p>
              </div>
            )}

            {/* Supportive message */}
            <div className="flex justify-center mt-8 mb-4">
              <div className="text-center">
                <p className="text-sm text-gray-700 leading-relaxed">
                  <span className="text-lg mr-1">💭</span> Your feelings aren't data points—they're moments of your life worth reflecting on.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <BottomNav 
          currentPage="growth" 
          hasJournalPrompts={hasJournalPrompts} 
          remainingJournalCount={remainingJournalCount} 
        />
      </main>
    </>
  );
}
