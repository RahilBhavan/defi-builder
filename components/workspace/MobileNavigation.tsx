import { Home, Menu, Settings, TrendingUp, Wallet } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useBreakpoint } from '../../hooks/useTouchGestures';

interface MobileNavigationProps {
  onOpenBacktest: () => void;
  onOpenPortfolio: () => void;
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
  onOpenMarketplace?: () => void;
}

/**
 * Mobile-optimized bottom navigation bar
 * Only visible on mobile devices
 */
export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  onOpenBacktest,
  onOpenPortfolio,
  onOpenLibrary,
  onOpenSettings,
  onOpenMarketplace,
}) => {
  const breakpoint = useBreakpoint();
  const [activeTab, setActiveTab] = useState<string | null>(null);

  if (breakpoint !== 'mobile') {
    return null;
  }

  const navItems = [
    { id: 'portfolio', icon: Wallet, label: 'Portfolio', action: onOpenPortfolio },
    { id: 'backtest', icon: TrendingUp, label: 'Backtest', action: onOpenBacktest },
    { id: 'library', icon: Home, label: 'Library', action: onOpenLibrary },
    ...(onOpenMarketplace ? [{ id: 'marketplace', icon: Menu, label: 'Market', action: onOpenMarketplace }] : []),
    { id: 'settings', icon: Settings, label: 'Settings', action: onOpenSettings },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-gray-300 safe-area-bottom"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                item.action();
              }}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                activeTab === item.id ? 'text-orange' : 'text-gray-600'
              }`}
              aria-label={item.label}
            >
              <Icon size={20} aria-hidden="true" />
              <span className="text-[10px] font-mono uppercase mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

