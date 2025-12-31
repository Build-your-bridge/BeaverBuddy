'use client';

import { useRouter } from 'next/navigation';

interface HeaderProps {
  title: string;
  points: number;
  streak?: number; // Add streak prop
  onLogout: () => void;
  backgroundColor?: string;
  borderColor?: string;
  className?: string;
}

export default function Header({ 
  title, 
  points, 
  streak = 0, // Default to 0 if not provided
  onLogout, 
  backgroundColor = '#a12b2b', 
  borderColor = '#660000',
  className = ''
}: HeaderProps) {
  return (
    <header className={`flex-shrink-0 relative z-10 ${className}`} style={{ background: backgroundColor, borderBottom: `3px solid ${borderColor}` }}>
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-xl md:text-2xl">🍁</span>
          <h1 className="text-base md:text-lg font-black text-white">{title}</h1>
        </div>
        
        {/* Points & Logout */}
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex items-center gap-1 md:gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-2 py-1 md:px-3 md:py-1.5 border border-white/30">
            <span className="text-xs md:text-sm">🍁</span>
            <span className="text-[10px] md:text-xs font-bold text-white">{points}</span>
          </div>
          <div className="flex items-center gap-1 md:gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-2 py-1 md:px-3 md:py-1.5 border border-white/30">
            <span className="text-xs md:text-sm">🔥</span>
            <span className="text-[10px] md:text-xs font-bold text-white">{streak}</span>
          </div>
          <button
            onClick={onLogout}
            className="px-2 py-1 md:px-3 md:py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-full font-bold text-[10px] md:text-xs text-white transition-all"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}