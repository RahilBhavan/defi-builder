import { motion } from 'framer-motion';
import { Key, Network, Settings, Shield, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { type AppSettings, useSettings } from '../../services/settingsStorage';
import { Button } from '../ui/Button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'general' | 'network' | 'api';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSection, resetSettings } = useSettings();
  const { success: showSuccess, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state with settings when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      setHasChanges(false);
    }
  }, [isOpen, settings]);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(localSettings) !== JSON.stringify(settings);
    setHasChanges(changed);
  }, [localSettings, settings]);

  const handleSave = () => {
    try {
      // Validate settings
      if (!localSettings.network.sepoliaRpcUrl.trim()) {
        showError('Sepolia RPC URL is required');
        return;
      }

      // Save all settings
      (Object.keys(localSettings) as Array<keyof AppSettings>).forEach((key) => {
        updateSection(key, localSettings[key]);
      });

      showSuccess('Settings saved successfully');
      setHasChanges(false);
      onClose();
    } catch (error) {
      showError('Failed to save settings. Please try again.');
      console.error('Error saving settings:', error);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      resetSettings();
      setLocalSettings(settings);
      showSuccess('Settings reset to defaults');
    }
  };

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
                  <h3 className="text-sm font-bold uppercase text-ink mb-4 border-b border-gray-200 pb-2">
                    Appearance
                  </h3>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.appearance.showAdvancedTooltips}
                        onChange={(e) =>
                          setLocalSettings((prev) => ({
                            ...prev,
                            appearance: {
                              ...prev.appearance,
                              showAdvancedTooltips: e.target.checked,
                            },
                          }))
                        }
                        className="w-5 h-5 accent-orange"
                      />
                      <span className="text-sm text-gray-700">Show advanced tooltips</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.appearance.highContrastMode}
                        onChange={(e) =>
                          setLocalSettings((prev) => ({
                            ...prev,
                            appearance: { ...prev.appearance, highContrastMode: e.target.checked },
                          }))
                        }
                        className="w-5 h-5 accent-orange"
                      />
                      <span className="text-sm text-gray-700">High contrast mode</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold uppercase text-ink mb-4 border-b border-gray-200 pb-2">
                    Notifications
                  </h3>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.notifications.strategyExecutionAlerts}
                        onChange={(e) =>
                          setLocalSettings((prev) => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              strategyExecutionAlerts: e.target.checked,
                            },
                          }))
                        }
                        className="w-5 h-5 accent-orange"
                      />
                      <span className="text-sm text-gray-700">Strategy execution alerts</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettings.notifications.priceTriggerNotifications}
                        onChange={(e) =>
                          setLocalSettings((prev) => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              priceTriggerNotifications: e.target.checked,
                            },
                          }))
                        }
                        className="w-5 h-5 accent-orange"
                      />
                      <span className="text-sm text-gray-700">Price trigger notifications</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'network' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-bold uppercase text-ink mb-4 border-b border-gray-200 pb-2">
                    RPC Configuration
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
                        Sepolia RPC URL
                      </label>
                      <input
                        type="text"
                        value={localSettings.network.sepoliaRpcUrl}
                        onChange={(e) =>
                          setLocalSettings((prev) => ({
                            ...prev,
                            network: { ...prev.network, sepoliaRpcUrl: e.target.value },
                          }))
                        }
                        className="w-full h-10 px-3 border border-gray-300 font-mono text-sm focus:border-orange focus:outline-none"
                        placeholder="https://rpc.sepolia.org"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
                        Mainnet RPC URL
                      </label>
                      <input
                        type="text"
                        value={localSettings.network.mainnetRpcUrl}
                        onChange={(e) =>
                          setLocalSettings((prev) => ({
                            ...prev,
                            network: { ...prev.network, mainnetRpcUrl: e.target.value },
                          }))
                        }
                        className="w-full h-10 px-3 border border-gray-300 font-mono text-sm focus:border-orange focus:outline-none"
                        placeholder="https://eth-mainnet.g.alchemy.com/v2/..."
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase text-ink mb-4 border-b border-gray-200 pb-2">
                    Simulations
                  </h3>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.network.useTenderly}
                      onChange={(e) =>
                        setLocalSettings((prev) => ({
                          ...prev,
                          network: { ...prev.network, useTenderly: e.target.checked },
                        }))
                      }
                      className="w-5 h-5 accent-orange"
                    />
                    <span className="text-sm text-gray-700">Use Tenderly for simulations</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-bold uppercase text-ink mb-4 border-b border-gray-200 pb-2">
                    External Services
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
                        Etherscan API Key
                      </label>
                      <input
                        type="password"
                        value={localSettings.apiKeys.etherscanApiKey}
                        onChange={(e) =>
                          setLocalSettings((prev) => ({
                            ...prev,
                            apiKeys: { ...prev.apiKeys, etherscanApiKey: e.target.value },
                          }))
                        }
                        className="w-full h-10 px-3 border border-gray-300 font-mono text-sm focus:border-orange focus:outline-none"
                        placeholder="Enter Etherscan API key"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
                        1Inch API Key
                      </label>
                      <input
                        type="password"
                        value={localSettings.apiKeys.oneInchApiKey}
                        onChange={(e) =>
                          setLocalSettings((prev) => ({
                            ...prev,
                            apiKeys: { ...prev.apiKeys, oneInchApiKey: e.target.value },
                          }))
                        }
                        className="w-full h-10 px-3 border border-gray-300 font-mono text-sm focus:border-orange focus:outline-none"
                        placeholder="Enter 1Inch API key"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
                        Gemini API Key
                      </label>
                      <input
                        type="password"
                        value={localSettings.apiKeys.geminiApiKey}
                        onChange={(e) =>
                          setLocalSettings((prev) => ({
                            ...prev,
                            apiKeys: { ...prev.apiKeys, geminiApiKey: e.target.value },
                          }))
                        }
                        className="w-full h-10 px-3 border border-gray-300 font-mono text-sm focus:border-orange focus:outline-none"
                        placeholder="Enter Gemini API key (or use VITE_GEMINI_API_KEY env var)"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty to use environment variable
                      </p>
                    </div>
                    <div className="p-4 bg-orange/10 border border-orange/20 flex gap-3 items-start">
                      <Shield className="text-orange shrink-0 mt-1" size={18} />
                      <div>
                        <h4 className="text-sm font-bold text-ink uppercase mb-1">Security Note</h4>
                        <p className="text-xs text-gray-600">
                          API keys are stored locally in your browser and never sent to our servers
                          except when proxied to the service itself.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-20 border-t border-gray-300 bg-white px-8 flex items-center justify-between">
          <div>
            {hasChanges && <span className="text-xs text-gray-500 font-mono">Unsaved changes</span>}
          </div>
          <div className="flex items-center gap-4">
            <Button variant="secondary" onClick={handleReset}>
              Reset to Defaults
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={!hasChanges}>
              Save Changes
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
