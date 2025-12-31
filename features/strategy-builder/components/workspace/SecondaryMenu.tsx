import { Menu } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

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
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-10 h-10 bg-white border border-gray-300 hover:border-ink hover:bg-gray-50 transition-all flex items-center justify-center shadow-sm rounded-lg"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <div
            className="absolute right-0 top-12 w-64 bg-white border border-gray-300 rounded-lg z-50 shadow-xl overflow-hidden"
            role="menu"
            aria-label="Secondary menu"
          >
            {[
              { label: 'Backtest', action: onOpenBacktest },
              { label: 'Portfolio', action: onOpenPortfolio },
              { label: 'Strategy Library', action: onOpenLibrary },
              { label: 'Settings', action: onOpenSettings },
              { label: '---', action: () => {} },
              { label: 'Export Strategy', action: onExport },
              { label: 'Import Strategy', action: onImport },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  item.action();
                  setIsOpen(false);
                }}
                className={`w-full h-11 px-4 text-left text-xs font-mono hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                  item.label === '---'
                    ? 'bg-gray-100 cursor-default hover:bg-gray-100 h-1 p-0 border-0'
                    : 'uppercase font-bold'
                }`}
                disabled={item.label === '---'}
                aria-label={item.label === '---' ? undefined : item.label}
              >
                {item.label !== '---' && item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
