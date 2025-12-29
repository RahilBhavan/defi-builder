import { useLocalStorage } from '../hooks/useLocalStorage';

export interface AppSettings {
  appearance: {
    showAdvancedTooltips: boolean;
    highContrastMode: boolean;
  };
  notifications: {
    strategyExecutionAlerts: boolean;
    priceTriggerNotifications: boolean;
  };
  network: {
    sepoliaRpcUrl: string;
    mainnetRpcUrl: string;
    useTenderly: boolean;
  };
  apiKeys: {
    etherscanApiKey: string;
    oneInchApiKey: string;
    geminiApiKey: string;
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  appearance: {
    showAdvancedTooltips: true,
    highContrastMode: false,
  },
  notifications: {
    strategyExecutionAlerts: true,
    priceTriggerNotifications: false,
  },
  network: {
    sepoliaRpcUrl: 'https://rpc.sepolia.org',
    mainnetRpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/...',
    useTenderly: true,
  },
  apiKeys: {
    etherscanApiKey: '',
    oneInchApiKey: '',
    geminiApiKey: '',
  },
};

/**
 * Get settings from localStorage
 */
export function getSettings(): AppSettings {
  try {
    const stored = localStorage.getItem('defi-builder-settings');
    if (!stored) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(stored);
    // Merge with defaults to handle missing properties
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      appearance: { ...DEFAULT_SETTINGS.appearance, ...parsed.appearance },
      notifications: { ...DEFAULT_SETTINGS.notifications, ...parsed.notifications },
      network: { ...DEFAULT_SETTINGS.network, ...parsed.network },
      apiKeys: { ...DEFAULT_SETTINGS.apiKeys, ...parsed.apiKeys },
    };
  } catch (error) {
    console.error('Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem('defi-builder-settings', JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
    throw new Error('Failed to save settings');
  }
}

/**
 * Update a specific settings section
 */
export function updateSettingsSection<K extends keyof AppSettings>(
  section: K,
  values: Partial<AppSettings[K]>
): void {
  const current = getSettings();
  saveSettings({
    ...current,
    [section]: {
      ...current[section],
      ...values,
    },
  });
}

/**
 * Reset settings to defaults
 */
export function resetSettings(): void {
  saveSettings(DEFAULT_SETTINGS);
}

/**
 * Hook for using settings in components
 */
export function useSettings() {
  const [settings, setSettings] = useLocalStorage<AppSettings>(
    'defi-builder-settings',
    DEFAULT_SETTINGS
  );

  const updateSettings = (newSettings: AppSettings | ((prev: AppSettings) => AppSettings)) => {
    setSettings(newSettings);
  };

  const updateSection = <K extends keyof AppSettings>(
    section: K,
    values: Partial<AppSettings[K]>
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...values,
      },
    }));
  };

  return {
    settings,
    updateSettings,
    updateSection,
    resetSettings: () => setSettings(DEFAULT_SETTINGS),
  };
}
