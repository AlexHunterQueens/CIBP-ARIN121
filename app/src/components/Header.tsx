import React from 'react';

interface HeaderProps {
  activeTab: 'survey' | 'diagnostic' | 'results' | 'plan' | 'learn' | 'drill' | 'retest';
  onSelectTab: (tab: 'plan' | 'learn' | 'drill' | 'retest' | 'results') => void;
  hasPlan: boolean;
  onReset?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  hasPlan,
  onReset,
}) => {
  return (
    <header className="bg-[#071d49] text-white border-b border-[#071d49]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Title (no logo per instruction) */}
          <div className="flex items-baseline space-x-3">
            <span
              onClick={() => hasPlan ? onSelectTab('plan') : undefined}
              className={`text-2xl font-black tracking-tight ${hasPlan ? 'cursor-pointer' : ''}`}
              style={{ fontFamily: 'Lato, sans-serif', fontWeight: 900 }}
            >
              CIBP
            </span>
            <span className="hidden sm:inline text-sm font-normal text-[#a6b8db] tracking-normal">
              Commerce IB Prep · Queen's Commerce
            </span>
          </div>

          {/* Navigation Bar when plan exists */}
          {hasPlan && (
            <nav className="flex items-center space-x-1 sm:space-x-2">
              <button
                onClick={() => onSelectTab('plan')}
                className={`px-3 py-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-[2px] transition-colors ${
                  activeTab === 'plan'
                    ? 'bg-[#0047bb] text-white'
                    : 'text-[#e2e8f0] hover:text-white hover:bg-[#0c2a68]'
                }`}
              >
                My Plan
              </button>
              <button
                onClick={() => onSelectTab('learn')}
                className={`px-3 py-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-[2px] transition-colors ${
                  activeTab === 'learn'
                    ? 'bg-[#0047bb] text-white'
                    : 'text-[#e2e8f0] hover:text-white hover:bg-[#0c2a68]'
                }`}
              >
                Learn
              </button>
              <button
                onClick={() => onSelectTab('drill')}
                className={`px-3 py-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-[2px] transition-colors ${
                  activeTab === 'drill'
                    ? 'bg-[#0047bb] text-white'
                    : 'text-[#e2e8f0] hover:text-white hover:bg-[#0c2a68]'
                }`}
              >
                Interview Drill
              </button>
              <button
                onClick={() => onSelectTab('retest')}
                className={`px-3 py-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-[2px] transition-colors ${
                  activeTab === 'retest'
                    ? 'bg-[#0047bb] text-white'
                    : 'text-[#e2e8f0] hover:text-white hover:bg-[#0c2a68]'
                }`}
              >
                Weekly Retest
              </button>
              <button
                onClick={() => onSelectTab('results')}
                className={`hidden md:inline-block px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-[2px] transition-colors ${
                  activeTab === 'results'
                    ? 'bg-[#0047bb] text-white'
                    : 'text-[#a6b8db] hover:text-white hover:bg-[#0c2a68]'
                }`}
              >
                Results Table
              </button>
            </nav>
          )}

          {/* Reset button if plan exists */}
          {hasPlan && onReset && (
            <button
              onClick={onReset}
              className="text-xs uppercase tracking-wider text-[#a6b8db] hover:text-white underline ml-2 cursor-pointer"
              title="Restart Diagnostic Survey"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
