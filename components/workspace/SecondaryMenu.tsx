import React, { useState } from 'react';
import { Menu } from 'lucide-react';

interface SecondaryMenuProps {
  onOpenBacktest: () => void;
  onOpenPortfolio: () => void;
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
  onExport: () => void;
  onImport: () => void;
}

export const SecondaryMenu: React.FC<SecondaryMenuProps> = ({
  onOpenBacktest,
  onOpenPortfolio,
  onOpenLibrary,
  onOpenSettings,
  onExport,
  onImport,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed top-6 right-6 z-50">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-10 h-10 bg-white border border-gray-300 hover:border-ink transition-colors flex items-center justify-center shadow-sm"
      >
        <Menu size={20} />
      </button>

      {isOpen && (
        <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 top-12 w-56 bg-white border border-ink z-50 shadow-xl">
            {[
                { label: 'Backtest', action: onOpenBacktest },
                { label: 'Portfolio', action: onOpenPortfolio },
                { label: 'Strategy Library', action: onOpenLibrary },
                { label: 'Settings', action: onOpenSettings },
                { label: '---', action: () => {} },
                { label: 'Export Strategy', action: onExport },
                { label: 'Import Strategy', action: onImport },
            ].map(item => (
                <button
                key={item.label}
                onClick={() => {
                    item.action();
                    setIsOpen(false);
                }}
                className={`w-full h-12 px-6 text-left text-sm font-mono hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0 ${item.label === '---' ? 'bg-gray-100 cursor-default hover:bg-gray-100' : 'uppercase'}`}
                disabled={item.label === '---'}
                >
                {item.label}
                </button>
            ))}
            </div>
        </>
      )}
    </div>
  );
};
