'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import LocationPermissionModal from '../components/LocationPermissionModal';
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

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [feeling, setFeeling] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasJournalPrompts, setHasJournalPrompts] = useState(false);
  const [remainingJournalCount, setRemainingJournalCount] = useState(0);
  const [hasGeneratedToday, setHasGeneratedToday] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [isInCrisis, setIsInCrisis] = useState(false);
  const [crisisData, setCrisisData] = useState<any>(null);
  const [checkingStreak, setCheckingStreak] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showBreathingPrompt, setShowBreathingPrompt] = useState(false);
  const [submittedFeeling, setSubmittedFeeling] = useState('');
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [previousIssue, setPreviousIssue] = useState('');
  const [previousCategory, setPreviousCategory] = useState('');
  const [welcomeBackResponse, setWelcomeBackResponse] = useState('');
  const [showMedicalRecommendation, setShowMedicalRecommendation] = useState(false);
  
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
    const currentUserId = parsedUser.id;

    // Check if location has been set
    const locationData = localStorage.getItem('userLocation');
    if (!locationData) {
      // Show location permission modal
      setShowLocationModal(true);
      // Still initialize dashboard checks, but don't wait for location
      checkStreakStatus(token).then((shouldRedirect) => {
        if (!shouldRedirect) {
          // Only proceed with other checks if we're not redirecting to streak page
          checkCrisisAndQuests(token, currentUserId);
        }
      });
    } else {
      // Location is set, proceed normally
      checkStreakStatus(token).then((shouldRedirect) => {
        if (!shouldRedirect) {
          checkCrisisAndQuests(token, currentUserId);
        }
      });
    }
  }, [router]);

  const checkCrisisAndQuests = async (token: string, currentUserId: number) => {
    // Check for crisis lockout
    const crisisLockout = localStorage.getItem(`crisisLockout_${currentUserId}`);
    const crisisDataStored = localStorage.getItem(`crisisData_${currentUserId}`);
    const questGeneratedDate = localStorage.getItem(`questGeneratedDate_${currentUserId}`);
    const previousIssueData = localStorage.getItem(`previousIssue_${currentUserId}`);
    const previousCategoryData = localStorage.getItem(`previousCategory_${currentUserId}`);
    const today = new Date().toDateString();
    
    // Check if crisis lockout is active
    if (crisisLockout === 'true' && questGeneratedDate === today) {
      setIsInCrisis(true);
      setHasGeneratedToday(true);
      if (crisisDataStored) {
        try {
          setCrisisData(JSON.parse(crisisDataStored));
        } catch (e) {
          console.error('Error parsing crisis data:', e);
        }
      }
    }
    // Clear crisis lockout if it's a new day and show welcome back if we have previous issue data
    else if (crisisLockout === 'true' && questGeneratedDate !== today) {
      localStorage.removeItem(`crisisLockout_${currentUserId}`);
      localStorage.removeItem(`crisisData_${currentUserId}`);
      setIsInCrisis(false);
      
      // Show welcome back check-in if user had a previous crisis issue
      if (previousIssueData && previousCategoryData) {
        setPreviousIssue(previousIssueData);
        setPreviousCategory(previousCategoryData);
        setShowWelcomeBack(true);
      }
    }
    
    updateJournalCount(currentUserId);

    const existingQuests = sessionStorage.getItem(`generatedQuests_${currentUserId}`);

    if (existingQuests && questGeneratedDate === today && !isInCrisis) {
      setHasGeneratedToday(true);
      fetchUserPoints(token);
    } else if (questGeneratedDate && questGeneratedDate !== today) {
      sessionStorage.removeItem(`generatedQuests_${currentUserId}`);
      sessionStorage.removeItem(`monthlyQuests_${currentUserId}`);
      sessionStorage.removeItem(`journalPrompts_${currentUserId}`);
      localStorage.removeItem(`questGeneratedDate_${currentUserId}`);
      setHasJournalPrompts(false);
      setCheckingStatus(true);
      checkTodayStatus(token);
      fetchUserPoints(token);
    } else if (!isInCrisis) {
      setCheckingStatus(true);
      checkTodayStatus(token);
      fetchUserPoints(token);
    } else {
      fetchUserPoints(token);
    }
  };

  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        updateJournalCount(user.id);
      }
    };
    
    const handleJournalUpdate = () => {
      if (user) {
        updateJournalCount(user.id);
      }
    };
    
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        updateJournalCount(user.id);
      }
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('journalUpdated', handleJournalUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('journalUpdated', handleJournalUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const checkStreakStatus = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(api.streak.check, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentStreak(data.currentStreak); // Update streak state
        setCheckingStreak(false);
        
        if (data.shouldShowPopup) {
          // Redirect to Streak page
          router.push(`/Streak?streak=${data.currentStreak}&prize=${data.todayPrize}`);
          return true; // Indicate we're redirecting
        }
        return false; // No redirect needed
      }
      
      setCheckingStreak(false);
      return false;
    } catch (error) {
      console.error('Error checking streak:', error);
      setCheckingStreak(false);
      return false;
    }
  };

  const updateJournalCount = (userId: number) => {
    const journalPromptsData = sessionStorage.getItem(`journalPrompts_${userId}`);
    
    if (journalPromptsData) {
      try {
        const prompts = JSON.parse(journalPromptsData);
        const normalizedPrompts = Array.isArray(prompts) ? prompts.map((p: any) => {
          if (typeof p === 'string') {
            return { question: p, answer: null, answeredAt: null };
          }
          return { question: p.question, answer: p.answer || null, answeredAt: p.answeredAt || null };
        }) : [];
        
        const remaining = normalizedPrompts.filter((p: any) => p.answer === null).length;
        setRemainingJournalCount(remaining);
        setHasJournalPrompts(remaining > 0);
      } catch (error) {
        console.error('Error parsing journal prompts:', error);
        setHasJournalPrompts(false);
        setRemainingJournalCount(0);
      }
    } else {
      setHasJournalPrompts(false);
      setRemainingJournalCount(0);
    }
  };

  const checkTodayStatus = async (token: string) => {
    const timeoutId = setTimeout(() => {
      setCheckingStatus(false);
    }, 10000);
    
    try {
      const response = await fetch(api.quests.checkToday, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setHasGeneratedToday(data.hasGeneratedToday);
        
        if (data.hasGeneratedToday && data.quests) {
          const userData = localStorage.getItem('user');
          if (userData) {
            const currentUser = JSON.parse(userData);
            sessionStorage.setItem(`generatedQuests_${currentUser.id}`, JSON.stringify(data.quests));
            sessionStorage.setItem(`monthlyQuests_${currentUser.id}`, JSON.stringify(data.monthlyQuests || []));
            sessionStorage.setItem(`journalPrompts_${currentUser.id}`, JSON.stringify(data.journalPrompts));
            localStorage.setItem(`questGeneratedDate_${currentUser.id}`, new Date().toDateString());
            updateJournalCount(currentUser.id);
          }
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Error checking today status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const fetchUserPoints = async (token: string) => {
    try {
      const response = await fetch(api.outfits.points, {
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

  const handleSubmitFeeling = async () => {
    // If in crisis, redirect to emergency page
    if (isInCrisis && crisisData) {
      const helplineString = encodeURIComponent(JSON.stringify(crisisData.helplines));
      router.push(`/Emergency?type=${crisisData.crisisType}&message=${encodeURIComponent(crisisData.message)}&helplines=${helplineString}&additional=${encodeURIComponent(crisisData.additionalMessage)}`);
      return;
    }

    // If already generated (non-crisis), go to quests
    if (hasGeneratedToday && !isInCrisis) {
      router.push('/quests');
      return;
    }

    if (feeling.trim().length < 20) {
      setError('Please share at least 20 characters about how you\'re feeling');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      // Get user location
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
      
      const response = await fetch(api.quests.generate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ feeling, city, province }) // Only daily quests, no filters
      });

      const data = await response.json();

      // Check if this is a crisis response
      if (data.isCrisis) {
        // Mark as generated today to lock them out
        if (data.lockedOut) {
          const userData = localStorage.getItem('user');
          if (userData) {
            const currentUser = JSON.parse(userData);
            localStorage.setItem(`questGeneratedDate_${currentUser.id}`, new Date().toDateString());
            localStorage.setItem(`crisisLockout_${currentUser.id}`, 'true');
            // Store the previous issue/category for welcome back message
            localStorage.setItem(`previousIssue_${currentUser.id}`, data.crisisType || 'this issue');
            localStorage.setItem(`previousCategory_${currentUser.id}`, data.category || data.crisisType || 'this issue');
            localStorage.setItem(`crisisData_${currentUser.id}`, JSON.stringify({
              crisisType: data.crisisType,
              message: data.message,
              helplines: data.helplines,
              additionalMessage: data.additionalMessage
            }));
          }
          setIsInCrisis(true);
          setHasGeneratedToday(true);
          setCrisisData({
            crisisType: data.crisisType,
            message: data.message,
            helplines: data.helplines,
            additionalMessage: data.additionalMessage
          });
        }

        // Redirect to emergency page with data
        const helplineString = encodeURIComponent(JSON.stringify(data.helplines));
        router.push(`/Emergency?type=${data.crisisType}&message=${encodeURIComponent(data.message)}&helplines=${helplineString}&additional=${encodeURIComponent(data.additionalMessage)}`);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate quests');
      }

      const userDataStr = localStorage.getItem('user');
      if (userDataStr) {
        const currentUser = JSON.parse(userDataStr);
        sessionStorage.setItem(`generatedQuests_${currentUser.id}`, JSON.stringify(data.quests));
        sessionStorage.setItem(`journalPrompts_${currentUser.id}`, JSON.stringify(data.journalPrompts));
        localStorage.setItem(`questGeneratedDate_${currentUser.id}`, new Date().toDateString());
        
        // Save to growth tracking
        const growthHistory = localStorage.getItem(`growthCheckInHistory_${currentUser.id}`) || '[]';
        const history = JSON.parse(growthHistory);
        history.push({
          date: new Date().toDateString(),
          feeling: feeling,
          timestamp: new Date().toISOString(),
          emoji: '💭',
          mood: 'neutral'
        });
        localStorage.setItem(`growthCheckInHistory_${currentUser.id}`, JSON.stringify(history));
        
        updateJournalCount(currentUser.id);
      }

      // Analyze sentiment of the feeling
      const sentiment = analyzeSentiment(feeling);
      
      // If positive sentiment, skip breathing and assessment - go straight to journal
      if (sentiment === 'positive') {
        setHasGeneratedToday(true);
        setSubmittedFeeling(feeling);
        router.push(`/journal?feeling=${encodeURIComponent(feeling)}&skipLayers=true`);
        return;
      }

      // For neutral or negative sentiment, show breathing prompt
      setHasGeneratedToday(true);
      setSubmittedFeeling(feeling);
      setShowBreathingPrompt(true);

    } catch (err: any) {
      setError(err.message || 'Failed to generate quests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const analyzeSentiment = (text: string): 'positive' | 'negative' | 'neutral' => {
    const positiveWords = ['great', 'amazing', 'wonderful', 'excellent', 'fantastic', 'awesome', 'happy', 'joyful', 'grateful', 'blessed', 'good', 'better', 'best', 'love', 'excited', 'proud', 'confident'];
    const negativeWords = ['sad', 'stressed', 'anxious', 'overwhelmed', 'worried', 'tired', 'exhausted', 'depressed', 'upset', 'angry', 'frustrated', 'scared', 'afraid', 'lonely', 'isolated', 'hopeless', 'desperate'];
    
    const lowerText = text.toLowerCase();
    
    const hasPositive = positiveWords.some(word => lowerText.includes(word));
    const hasNegative = negativeWords.some(word => lowerText.includes(word));
    
    if (hasPositive && !hasNegative) {
      return 'positive';
    }
    if (hasNegative) {
      return 'negative';
    }
    return 'neutral';
  };

  const handleLogout = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const currentUser = JSON.parse(userData);
      localStorage.removeItem(`questGeneratedDate_${currentUser.id}`);
      localStorage.removeItem(`crisisLockout_${currentUser.id}`);
      localStorage.removeItem(`crisisData_${currentUser.id}`);
      sessionStorage.removeItem(`generatedQuests_${currentUser.id}`);
      sessionStorage.removeItem(`monthlyQuests_${currentUser.id}`);
      sessionStorage.removeItem(`journalPrompts_${currentUser.id}`);
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleWelcomeBackResponse = (status: 'better' | 'same' | 'worse') => {
    // If user says it's worse, show medical recommendation
    if (status === 'worse') {
      setShowMedicalRecommendation(true);
    } else {
      // For better or same, dismiss the modal and proceed to quests
      setShowWelcomeBack(false);
      router.push('/quests');
    }
  };

  const handleMedicalRecommendation = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const currentUser = JSON.parse(userData);
      // Store that they acknowledged medical recommendation
      localStorage.setItem(`medicalRecommendationAcknowledged_${currentUser.id}`, 'true');
    }
    setShowMedicalRecommendation(false);
    setShowWelcomeBack(false);
    router.push('/quests');
  };

  if (!user || (checkingStreak && !showLocationModal)) {
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
      {/* Show only the location modal if it's needed */}
      {showLocationModal && (
        <LocationPermissionModal 
          onClose={(success) => {
            setShowLocationModal(false);
            // Reload the page to reinitialize with location data
            window.location.reload();
          }}
        />
      )}

      {/* Only show dashboard content if location is set */}
      {!showLocationModal && (
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
      `}</style>

      {/* Floating sparkles */}
      <div className="absolute top-20 left-20 text-gray-400 text-3xl z-5" style={{ animation: 'sparkle 3s ease-in-out infinite' }}>✦</div>
      <div className="absolute top-32 right-32 text-gray-400 text-2xl z-5" style={{ animation: 'sparkle 3s ease-in-out infinite', animationDelay: '1s' }}>✦</div>
      <div className="absolute bottom-40 left-40 text-gray-400 text-2xl z-5" style={{ animation: 'sparkle 3s ease-in-out infinite', animationDelay: '2s' }}>✦</div>

      {/* Header */}
      <Header 
        title="Dashboard" 
        points={currentPoints}
        streak={currentStreak}
        onLogout={handleLogout}
      />

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-24 relative z-10 overflow-y-auto">
        {/* Breathing Prompt Modal */}
        {showBreathingPrompt && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="w-full max-w-md" style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '28px',
              padding: '28px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.5)'
            }}>
              <div className="text-center">
                <p className="text-4xl mb-4">🌬️</p>
                <h2 className="text-2xl font-black text-gray-800 mb-3">Would you like to pause for a moment?</h2>
                <p className="text-sm text-gray-700 mb-6">
                  Taking a few deep breaths can help you feel more centered before you continue.
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => router.push(`/breathing-exercise?feeling=${encodeURIComponent(submittedFeeling)}`)}
                    className="w-full py-4 font-black text-lg tracking-wider transition-all transform hover:scale-105 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)',
                      color: 'white'
                    }}
                  >
                    Yes, Let's Breathe
                  </button>

                  <button
                    onClick={() => {
                      setShowBreathingPrompt(false);
                      router.push('/quests');
                    }}
                    className="w-full py-3 font-semibold rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    Skip & Go to Quests
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Welcome Back Modal */}
        {showWelcomeBack && !showMedicalRecommendation && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="w-full max-w-md" style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '28px',
              padding: '28px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.5)'
            }}>
              <div className="text-center">
                <p className="text-4xl mb-4">👋</p>
                <h2 className="text-2xl font-black text-gray-800 mb-3">Welcome back!</h2>
                <p className="text-sm text-gray-700 mb-6">
                  I remember you said you were dealing with <span className="font-bold">{previousCategory}</span>. How is that going right now?
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => handleWelcomeBackResponse('better')}
                    className="w-full py-3 font-black text-sm tracking-wider transition-all transform hover:scale-105 rounded-xl text-white"
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)'
                    }}
                  >
                    ✨ I'm Feeling Better
                  </button>

                  <button
                    onClick={() => handleWelcomeBackResponse('same')}
                    className="w-full py-3 font-black text-sm tracking-wider transition-all transform hover:scale-105 rounded-xl text-white"
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
                    }}
                  >
                    😐 About the Same
                  </button>

                  <button
                    onClick={() => handleWelcomeBackResponse('worse')}
                    className="w-full py-3 font-black text-sm tracking-wider transition-all transform hover:scale-105 rounded-xl text-white"
                    style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)'
                    }}
                  >
                    😞 It's Getting Worse
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Medical Recommendation Modal */}
        {showMedicalRecommendation && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="w-full max-w-md" style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '28px',
              padding: '28px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              border: '2px solid rgba(239, 68, 68, 0.3)'
            }}>
              <div className="text-center">
                <p className="text-5xl mb-4">❤️‍🩹</p>
                <h2 className="text-2xl font-black text-gray-800 mb-3">I'm here for you</h2>
                <p className="text-sm text-gray-700 mb-6 leading-relaxed">
                  Since things have been getting harder with your <span className="font-bold">{previousCategory}</span>, I'd really recommend talking to someone who can help. This could be:
                </p>
                
                <ul className="text-xs text-gray-700 mb-6 text-left space-y-2 bg-red-50 p-3 rounded-lg">
                  <li>✓ A school counselor or trusted teacher</li>
                  <li>✓ A family doctor or mental health professional</li>
                  <li>✓ A crisis helpline (available 24/7)</li>
                  <li>✓ A trusted family member or friend</li>
                </ul>

                <p className="text-xs text-red-700 font-semibold mb-6">
                  You don't have to handle this alone. Please reach out to someone today.
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={handleMedicalRecommendation}
                    className="w-full py-3 font-black text-sm tracking-wider transition-all transform hover:scale-105 rounded-xl text-white"
                    style={{
                      background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                    }}
                  >
                    I Understand, Let's Continue
                  </button>

                  <button
                    onClick={() => router.push('/local-help')}
                    className="w-full py-3 font-black text-sm tracking-wider transition-all transform hover:scale-105 rounded-xl text-white"
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)'
                    }}
                  >
                    🆘 View Crisis Resources
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-md py-4">
          {/* Glass card */}
          <div className="relative" style={{
            background: 'rgba(255, 255, 255, 1)',
            backdropFilter: 'blur(20px)',
            borderRadius: '40px',
            padding: '24px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}>
            
            {/* Speech bubble */}
            <div className="mb-4 text-left relative" style={{ 
              background: isInCrisis 
                ? 'rgba(254, 226, 226, 0.8)' 
                : hasGeneratedToday 
                  ? 'rgba(220, 252, 231, 0.6)' 
                  : 'rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(10px)',
              borderRadius: '25px',
              padding: '16px 20px',
              boxShadow: '0 8px 10px rgba(0, 0, 0, 0.2)',
              border: isInCrisis ? '2px solid rgba(252, 165, 165, 0.5)' : 'none'
            }}>
              <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
                <svg width="30" height="20" viewBox="0 0 30 20" fill="none">
                  <path d="M 5 0 Q 15 10 25 0 L 18 15 L 12 15 Z" fill={isInCrisis ? 'rgba(254, 226, 226, 0.8)' : 'white'}/>
                </svg>
              </div>
              <h1 className={`text-xl font-black leading-tight ${isInCrisis ? 'text-red-900' : 'text-gray-800'}`}>
                {isInCrisis 
                  ? "🆘 Emergency Support Active" 
                  : hasGeneratedToday 
                    ? "Today's Check-in Complete! ✓" 
                    : `Hi ${user.name}, how are you feeling today?`}
              </h1>
              <p className="text-xs text-gray-700 mt-1 font-semibold">
                {isInCrisis 
                  ? "You're in our crisis support mode. Help resources are available." 
                  : hasGeneratedToday 
                    ? "Come back tomorrow for a new check-in" 
                    : "Share what's on your mind"}
              </p>
            </div>

            {/* Billy Beaver */}
            <div className="flex justify-center mb-4">
              <div className="relative w-40 h-40">
                <Image
                  src={user?.equippedOutfit?.image || "/images/beaver/default/default.png"}
                  alt="Beaver mascot"
                  width={160}
                  height={160}
                  className="object-contain drop-shadow-2xl"
                  priority
                  style={{ animation: 'float 3s ease-in-out infinite' }}
                />
              </div>
            </div>

            {/* Growth Rate Button */}
            <button
              onClick={() => router.push('/growth')}
              className="w-full py-3 mb-4 font-black text-sm tracking-wider transition-all transform hover:scale-105"
              style={{ 
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #FBBF24 0%, #FCD34D 100%)',
                color: '#78350F',
                boxShadow: '0 4px 15px rgba(251, 191, 36, 0.4)'
              }}
            >
              📈 CHECK YOUR GROWTH & STREAK
            </button>

            {/* Success/Error/Crisis messages */}
            {isInCrisis && (
              <div className="mb-3 p-3 text-center font-bold text-xs" style={{
                background: 'rgba(239, 68, 68, 0.3)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '2px solid rgba(239, 68, 68, 0.5)',
                color: '#991b1b'
              }}>
                🆘 For your safety, we've paused your daily check-ins for 24 hours. Please reach out to the crisis resources available. They're here to help you.
              </div>
            )}

            {hasGeneratedToday && !isInCrisis && (
              <div className="mb-3 p-2 text-center font-bold text-xs" style={{
                background: 'rgba(34, 197, 94, 0.3)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                color: '#166534'
              }}>
                ✓ You've already completed today's daily check-in! View your quests below.
              </div>
            )}

            {error && (
              <div className="mb-3 p-2 text-center font-bold text-xs" style={{
                background: 'rgba(239, 68, 68, 0.3)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#991b1b'
              }}>
                {error}
              </div>
            )}

            {/* Input field - disabled if in crisis or already generated */}
            {!hasGeneratedToday && !isInCrisis && (
              <div className="mb-3">
                <textarea
                  value={feeling}
                  onChange={(e) => {
                    setFeeling(e.target.value);
                    setError('');
                  }}
                  placeholder="Type your answer here... e.g., 'I feel great because hockey season started!' 🏒"
                  className="w-full p-3 resize-none text-gray-800 placeholder-gray-500 text-xs leading-relaxed"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '16px',
                    border: '2px solid rgba(236, 72, 153, 0.3)',
                    outline: 'none',
                    boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.05)'
                  }}
                  rows={3}
                  onFocus={(e) => e.currentTarget.style.border = '2px solid rgba(236, 72, 153, 0.6)'}
                  onBlur={(e) => e.currentTarget.style.border = '2px solid rgba(236, 72, 153, 0.3)'}
                />
                <p className="text-xs text-gray-700 mt-1 ml-1 font-semibold">
                  {feeling.length}/50 characters minimum
                </p>
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={handleSubmitFeeling}
              disabled={loading || (!hasGeneratedToday && !isInCrisis && feeling.trim().length < 20)}
              className={`w-full py-3 font-black text-sm tracking-wider transition-all transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer ${
                (hasGeneratedToday || isInCrisis || (!loading && feeling.trim().length >= 20)) ? 'hover:scale-105' : ''
              }`}
              style={{ 
                borderRadius: '16px',
                background: loading || (!hasGeneratedToday && !isInCrisis && feeling.trim().length < 20) 
                  ? '#9CA3AF' 
                  : isInCrisis 
                    ? '#DC2626' 
                    : '#a12b2b',
                color: 'white'
              }}
            >
              {loading 
                ? 'GENERATING...' 
                : isInCrisis 
                  ? '🆘 VIEW EMERGENCY HELP' 
                  : hasGeneratedToday 
                    ? 'VIEW MY QUESTS' 
                    : 'SUBMIT & VIEW QUESTS'}
            </button>

            <p className="text-center text-xs mt-2 text-gray-700 font-semibold">
              {isInCrisis 
                ? 'Crisis support active until tomorrow at midnight.' 
                : hasGeneratedToday 
                  ? 'One check-in per day. Reset at midnight.' 
                  : 'Share how you\'re feeling to unlock today\'s quests!'}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav currentPage="dashboard" hasJournalPrompts={hasJournalPrompts} remainingJournalCount={remainingJournalCount} />
    </main>
      )}
    </>
  );
}