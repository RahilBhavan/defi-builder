import { ChevronDown, Wallet } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useNetwork } from '../../hooks/useNetwork';
import { useWallet } from '../../hooks/useWallet';
import { Button } from '../ui/Button';

export const NetworkBadge: React.FC = () => {
  const { address, isConnected, connect, disconnect, chainName } = useWallet();
  const { chainId, isSupported, switchNetwork, getSupportedChains } = useNetwork();
  const [showNetworkMenu, setShowNetworkMenu] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);

  const truncateAddress = (addr: string | undefined): string => {
    if (!addr) return 'Not Connected';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleNetworkSwitch = (targetChainId: number) => {
    switchNetwork(targetChainId);
    setShowNetworkMenu(false);
  };

  if (!isConnected) {
    return (
      <div className="fixed top-6 right-6 z-40">
        <Button
          onClick={() => connect()}
          variant="secondary"
          className="text-xs font-mono uppercase flex items-center gap-2 rounded-lg shadow-sm"
        >
          <Wallet size={14} />
          Connect Wallet
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed top-6 right-6 z-40 flex items-center gap-2">
      {/* Network Selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowNetworkMenu(!showNetworkMenu);
            setShowWalletMenu(false);
          }}
          className={`px-4 py-2 bg-white border border-gray-300 text-xs font-mono z-40 flex items-center gap-2 shadow-sm hover:border-ink hover:bg-gray-50 transition-all rounded-lg ${
            !isSupported ? 'border-alert-red' : ''
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${isSupported ? 'bg-success-green animate-pulse' : 'bg-alert-red'}`}
          />
          <span className="uppercase font-bold">{chainName || 'Unknown'}</span>
          <ChevronDown size={12} />
        </button>

        {showNetworkMenu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowNetworkMenu(false)} />
            <div className="absolute top-full mt-2 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[200px] overflow-hidden">
              <div className="p-3 text-[10px] font-bold uppercase text-gray-500 border-b border-gray-200 bg-gray-50">
                Switch Network
              </div>
              {getSupportedChains().map((chain) => (
                <button
                  key={chain.id}
                  type="button"
                  onClick={() => handleNetworkSwitch(chain.id)}
                  className={`w-full text-left px-4 py-2.5 text-xs font-mono hover:bg-gray-50 transition-colors ${
                    chainId === chain.id ? 'bg-orange/10 font-bold text-orange' : ''
                  }`}
                >
                  {chain.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Wallet Address */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowWalletMenu(!showWalletMenu);
            setShowNetworkMenu(false);
          }}
          className="px-4 py-2 bg-white border border-gray-300 text-xs font-mono z-40 flex items-center gap-2 shadow-sm hover:border-ink hover:bg-gray-50 transition-all rounded-lg"
        >
          <span className="text-gray-600">{truncateAddress(address)}</span>
          <ChevronDown size={12} />
        </button>

        {showWalletMenu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowWalletMenu(false)} />
            <div className="absolute top-full mt-2 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[250px] overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="text-[10px] font-bold uppercase text-gray-500 mb-2">
                  Connected Wallet
                </div>
                <div className="text-xs font-mono text-ink break-all bg-white p-2 rounded border border-gray-200">
                  {address}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  disconnect();
                  setShowWalletMenu(false);
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-mono hover:bg-red-50 transition-colors text-alert-red font-bold uppercase"
              >
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
