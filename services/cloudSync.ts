/**
 * Cloud Sync Service
 * Handles strategy storage and sharing via cloud backend
 * Supports Firebase Firestore or Supabase
 */

import { LegoBlock, type Strategy } from '../types';

export interface CloudStrategy extends Strategy {
  userId?: string;
  isPublic: boolean;
  shareToken?: string;
  shareUrl?: string;
  createdAt: number;
  updatedAt: number;
  views?: number;
  likes?: number;
}

export interface CloudSyncConfig {
  provider: 'firebase' | 'supabase' | 'custom';
  apiKey?: string;
  projectId?: string;
  url?: string;
}

class CloudSyncService {
  private config: CloudSyncConfig | null = null;
  private isInitialized = false;

  /**
   * Initialize cloud sync service
   */
  async initialize(config?: CloudSyncConfig): Promise<void> {
    if (this.isInitialized) return;

    // Use environment variables or provided config
    this.config = config || {
      provider: (import.meta.env.VITE_CLOUD_PROVIDER as 'firebase' | 'supabase') || 'firebase',
      apiKey: import.meta.env.VITE_CLOUD_API_KEY,
      projectId: import.meta.env.VITE_CLOUD_PROJECT_ID,
      url: import.meta.env.VITE_CLOUD_URL,
    };

    // For now, use localStorage as fallback
    // In production, initialize Firebase/Supabase client here
    this.isInitialized = true;
  }

  /**
   * Save strategy to cloud
   */
  async saveStrategy(strategy: Strategy, isPublic = false): Promise<CloudStrategy> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const cloudStrategy: CloudStrategy = {
      ...strategy,
      isPublic,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      views: 0,
      likes: 0,
    };

    // Generate share token if public
    if (isPublic) {
      cloudStrategy.shareToken = this.generateShareToken();
      cloudStrategy.shareUrl = `${window.location.origin}/share/${cloudStrategy.shareToken}`;
    }

    // In production, save to Firebase/Supabase
    // For now, use localStorage as fallback
    const saved = await this.saveToLocalStorage(cloudStrategy);

    return saved;
  }

  /**
   * Load strategy from cloud
   */
  async loadStrategy(strategyId: string): Promise<CloudStrategy | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // In production, load from Firebase/Supabase
    // For now, use localStorage as fallback
    return this.loadFromLocalStorage(strategyId);
  }

  /**
   * Load strategy by share token
   */
  async loadStrategyByShareToken(shareToken: string): Promise<CloudStrategy | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // In production, query Firebase/Supabase by shareToken
    // For now, use localStorage as fallback
    return this.loadFromLocalStorageByToken(shareToken);
  }

  /**
   * List public strategies
   */
  async listPublicStrategies(limit = 20, offset = 0): Promise<CloudStrategy[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // In production, query Firebase/Supabase for public strategies
    // For now, use localStorage as fallback
    return this.listFromLocalStorage(limit, offset);
  }

  /**
   * List user's strategies
   */
  async listUserStrategies(userId: string): Promise<CloudStrategy[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // In production, query Firebase/Supabase for user strategies
    // For now, use localStorage as fallback
    return this.listFromLocalStorageByUser(userId);
  }

  /**
   * Update strategy
   */
  async updateStrategy(
    strategyId: string,
    updates: Partial<CloudStrategy>
  ): Promise<CloudStrategy | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const existing = await this.loadStrategy(strategyId);
    if (!existing) return null;

    const updated: CloudStrategy = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    // In production, update in Firebase/Supabase
    // For now, use localStorage as fallback
    return this.saveToLocalStorage(updated);
  }

  /**
   * Delete strategy
   */
  async deleteStrategy(strategyId: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // In production, delete from Firebase/Supabase
    // For now, use localStorage as fallback
    return this.deleteFromLocalStorage(strategyId);
  }

  /**
   * Share strategy (make public and generate share link)
   */
  async shareStrategy(strategyId: string): Promise<string> {
    const strategy = await this.loadStrategy(strategyId);
    if (!strategy) {
      throw new Error('Strategy not found');
    }

    const updated = await this.updateStrategy(strategyId, {
      isPublic: true,
      shareToken: strategy.shareToken || this.generateShareToken(),
      shareUrl:
        strategy.shareUrl ||
        `${window.location.origin}/share/${strategy.shareToken || this.generateShareToken()}`,
    });

    if (!updated || !updated.shareUrl) {
      throw new Error('Failed to generate share URL');
    }

    return updated.shareUrl;
  }

  /**
   * Generate unique share token
   */
  private generateShareToken(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  }

  // LocalStorage fallback methods (for development)
  private async saveToLocalStorage(strategy: CloudStrategy): Promise<CloudStrategy> {
    const key = `cloud_strategy_${strategy.id}`;
    localStorage.setItem(key, JSON.stringify(strategy));
    return strategy;
  }

  private async loadFromLocalStorage(strategyId: string): Promise<CloudStrategy | null> {
    const key = `cloud_strategy_${strategyId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  private async loadFromLocalStorageByToken(shareToken: string): Promise<CloudStrategy | null> {
    // Search all cloud strategies
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('cloud_strategy_'));
    for (const key of keys) {
      const data = localStorage.getItem(key);
      if (data) {
        const strategy: CloudStrategy = JSON.parse(data);
        if (strategy.shareToken === shareToken) {
          return strategy;
        }
      }
    }
    return null;
  }

  private async listFromLocalStorage(limit: number, offset: number): Promise<CloudStrategy[]> {
    const keys = Object.keys(localStorage)
      .filter((k) => k.startsWith('cloud_strategy_'))
      .slice(offset, offset + limit);

    const strategies: CloudStrategy[] = [];
    for (const key of keys) {
      const data = localStorage.getItem(key);
      if (data) {
        const strategy: CloudStrategy = JSON.parse(data);
        if (strategy.isPublic) {
          strategies.push(strategy);
        }
      }
    }

    return strategies.sort((a, b) => b.createdAt - a.createdAt);
  }

  private async listFromLocalStorageByUser(userId: string): Promise<CloudStrategy[]> {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('cloud_strategy_'));
    const strategies: CloudStrategy[] = [];

    for (const key of keys) {
      const data = localStorage.getItem(key);
      if (data) {
        const strategy: CloudStrategy = JSON.parse(data);
        if (strategy.userId === userId) {
          strategies.push(strategy);
        }
      }
    }

    return strategies.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  private async deleteFromLocalStorage(strategyId: string): Promise<boolean> {
    const key = `cloud_strategy_${strategyId}`;
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      return true;
    }
    return false;
  }
}

// Singleton instance
export const cloudSyncService = new CloudSyncService();
