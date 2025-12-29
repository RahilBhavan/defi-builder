import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Settings, Network, Key, Shield } from 'lucide-react';
import { Button } from '../ui/Button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'general' | 'network' | 'api';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('general');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-12">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-canvas w-full max-w-4xl h-[70vh] border-2 border-ink shadow-2xl relative flex flex-col"
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-300 bg-white">
            <h2 className="text-lg font-bold font-mono uppercase">Settings</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 text-ink transition-colors">
                <X size={24} />
            </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-64 bg-gray-50 border-r border-gray-300 flex flex-col">
                <button 
                    onClick={() => setActiveTab('general')}
                    className={`px-6 py-4 text-left text-sm font-bold uppercase transition-colors flex items-center gap-3 ${activeTab === 'general' ? 'bg-white border-l-4 border-l-orange text-ink' : 'text-gray-500 hover:text-ink border-l-4 border-l-transparent'}`}
                >
                    <Settings size={18} /> General
                </button>
                <button 
                    onClick={() => setActiveTab('network')}
                    className={`px-6 py-4 text-left text-sm font-bold uppercase transition-colors flex items-center gap-3 ${activeTab === 'network' ? 'bg-white border-l-4 border-l-orange text-ink' : 'text-gray-500 hover:text-ink border-l-4 border-l-transparent'}`}
                >
                    <Network size={18} /> Network & RPC
                </button>
                <button 
                    onClick={() => setActiveTab('api')}
                    className={`px-6 py-4 text-left text-sm font-bold uppercase transition-colors flex items-center gap-3 ${activeTab === 'api' ? 'bg-white border-l-4 border-l-orange text-ink' : 'text-gray-500 hover:text-ink border-l-4 border-l-transparent'}`}
                >
                    <Key size={18} /> API Keys
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-white">
                {activeTab === 'general' && (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-sm font-bold uppercase text-ink mb-4 border-b border-gray-200 pb-2">Appearance</h3>
                            <div className="space-y-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked readOnly className="w-5 h-5 accent-orange" />
                                    <span className="text-sm text-gray-700">Show advanced tooltips</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" className="w-5 h-5 accent-orange" />
                                    <span className="text-sm text-gray-700">High contrast mode</span>
                                </label>
                            </div>
                        </div>
                        
                        <div>
                            <h3 className="text-sm font-bold uppercase text-ink mb-4 border-b border-gray-200 pb-2">Notifications</h3>
                            <div className="space-y-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked readOnly className="w-5 h-5 accent-orange" />
                                    <span className="text-sm text-gray-700">Strategy execution alerts</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" className="w-5 h-5 accent-orange" />
                                    <span className="text-sm text-gray-700">Price trigger notifications</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'network' && (
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-sm font-bold uppercase text-ink mb-4 border-b border-gray-200 pb-2">RPC Configuration</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Sepolia RPC URL</label>
                                    <input type="text" defaultValue="https://rpc.sepolia.org" className="w-full h-10 px-3 border border-gray-300 font-mono text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Mainnet RPC URL</label>
                                    <input type="text" defaultValue="https://eth-mainnet.g.alchemy.com/v2/..." className="w-full h-10 px-3 border border-gray-300 font-mono text-sm" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold uppercase text-ink mb-4 border-b border-gray-200 pb-2">Simulations</h3>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked readOnly className="w-5 h-5 accent-orange" />
                                <span className="text-sm text-gray-700">Use Tenderly for simulations</span>
                            </label>
                        </div>
                    </div>
                )}

                {activeTab === 'api' && (
                    <div className="space-y-8">
                         <div>
                            <h3 className="text-sm font-bold uppercase text-ink mb-4 border-b border-gray-200 pb-2">External Services</h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Etherscan API Key</label>
                                    <input type="password" value="************************" readOnly className="w-full h-10 px-3 border border-gray-300 font-mono text-sm bg-gray-50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">1Inch API Key</label>
                                    <input type="password" value="************************" readOnly className="w-full h-10 px-3 border border-gray-300 font-mono text-sm bg-gray-50" />
                                </div>
                                <div className="p-4 bg-orange/10 border border-orange/20 flex gap-3 items-start">
                                    <Shield className="text-orange shrink-0 mt-1" size={18} />
                                    <div>
                                        <h4 className="text-sm font-bold text-ink uppercase mb-1">Security Note</h4>
                                        <p className="text-xs text-gray-600">API keys are stored locally in your browser and never sent to our servers except when proxied to the service itself.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="h-20 border-t border-gray-300 bg-white px-8 flex items-center justify-end gap-4">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={onClose}>Save Changes</Button>
        </div>
      </motion.div>
    </div>
  );
};
