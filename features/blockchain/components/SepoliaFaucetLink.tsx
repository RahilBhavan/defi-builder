/**
 * Sepolia Faucet Link Component
 * Displays a link to Sepolia faucets for getting testnet ETH
 */

import { ExternalLink } from 'lucide-react';
import type React from 'react';
import { SEPOLIA_FAUCETS } from '../services/sepolia';

interface SepoliaFaucetLinkProps {
  className?: string;
  variant?: 'button' | 'link' | 'dropdown';
}

export const SepoliaFaucetLink: React.FC<SepoliaFaucetLinkProps> = ({
  className = '',
  variant = 'link',
}) => {
  if (variant === 'dropdown') {
    return (
      <div className={`dropdown dropdown-end ${className}`}>
        <button type="button" tabIndex={0} className="btn btn-sm btn-outline">
          Get Sepolia ETH
          <ExternalLink className="ml-1 h-3 w-3" />
        </button>
        <ul
          tabIndex={0}
          className="dropdown-content menu bg-base-100 rounded-box z-[1] w-64 border border-base-300 p-2 shadow-lg"
        >
          {SEPOLIA_FAUCETS.map((faucet) => (
            <li key={faucet.url}>
              <a
                href={faucet.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-start"
              >
                <span className="font-semibold">{faucet.name}</span>
                <span className="text-xs text-base-content/70">{faucet.description}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (variant === 'button') {
    return (
      <a
        href={SEPOLIA_FAUCETS[0].url}
        target="_blank"
        rel="noopener noreferrer"
        className={`btn btn-sm btn-outline ${className}`}
      >
        Get Sepolia ETH
        <ExternalLink className="ml-1 h-3 w-3" />
      </a>
    );
  }

  return (
    <a
      href={SEPOLIA_FAUCETS[0].url}
      target="_blank"
      rel="noopener noreferrer"
      className={`link link-primary inline-flex items-center gap-1 ${className}`}
    >
      Get Sepolia ETH
      <ExternalLink className="h-3 w-3" />
    </a>
  );
};
