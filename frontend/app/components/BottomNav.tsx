'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface BottomNavProps {
  currentPage: 'billy' | 'dashboard' | 'journal';
  hasJournalPrompts?: boolean;
  remainingJournalCount?: number;
}

export default function BottomNav({ currentPage, hasJournalPrompts = false, remainingJournalCount = 0 }: BottomNavProps) {
  const router = useRouter();

  return (
    <div className="fixed bottom-0 left-0 right-0 h-28 flex items-center justify-center px-4 z-10 border-t-2 border-gray-200 shadow-lg" style={{ background: 'linear-gradient(to bottom, #E8D4C0 0%, #F5E6D3 100%)' }}>
      <div className="flex justify-center items-center gap-8 w-full max-w-2xl pb-4">
        {/* Billy Button */}
        <button 
          onClick={() => router.push('/billy')}
          className="flex flex-col items-center gap-1 transition-transform hover:scale-110 cursor-pointer"
        >
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border-2 ${
            currentPage === 'billy' 
              ? 'bg-white border-red-800' 
              : 'bg-white border-gray-300'
          }`}>
            <Image 
              src="/images/icons/billy.png" 
              alt="Billy" 
              width={42} 
              height={42} 
              className="object-contain" 
            />
          </div>
          <span className="text-xs font-bold text-gray-700">Billy</span>
        </button>
        
        {/* Home Button */}
        <button 
          onClick={() => router.push('/dashboard')}
          className="flex flex-col items-center gap-1 transition-transform hover:scale-110 cursor-pointer"
        >
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border-2 ${
            currentPage === 'dashboard' 
              ? 'bg-white border-red-800' 
              : 'bg-white border-gray-300'
          }`}>
            <Image 
              src="/images/icons/house.png" 
              alt="Home" 
              width={85} 
              height={85} 
              className="object-contain" 
            />
          </div>
          <span className="text-xs font-bold text-gray-700">Home</span>
        </button>
        
        {/* Journal Button */}
        <button 
          onClick={() => router.push('/journal')}
          className="flex flex-col items-center gap-1 transition-transform hover:scale-110 relative cursor-pointer"
        >
          {hasJournalPrompts && remainingJournalCount > 0 && (
            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white text-xs font-black rounded-full w-7 h-7 flex items-center justify-center z-10 shadow-lg border-2 border-white animate-pulse">
              {remainingJournalCount}
            </div>
          )}
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border-2 ${
            currentPage === 'journal' 
              ? 'bg-white border-red-800' 
              : 'bg-white border-gray-300'
          }`}>
            <Image 
              src={(hasJournalPrompts || currentPage === 'journal') ? "/images/icons/journal.png" : "/images/icons/grey_journal.png"}
              alt="Journal" 
              width={85} 
              height={85} 
              className="object-contain" 
            />
          </div>
          <span className="text-xs font-bold text-gray-700 drop-shadow-md">Journal</span>
        </button>
      </div>
    </div>
  );
}
