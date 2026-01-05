/**
 * Request Tracker for Mock Server
 * Tracks all requests for verification and debugging
 */

import type { TrackedRequest } from './types';

export class RequestTracker {
  private requests: TrackedRequest[] = [];
  private maxRequests = 1000; // Keep last 1000 requests

  public track(request: TrackedRequest): void {
    this.requests.push(request);

    // Trim old requests if exceeding limit
    if (this.requests.length > this.maxRequests) {
      this.requests = this.requests.slice(-this.maxRequests);
    }
  }

  public getRequests(filter?: {
    method?: string;
    path?: string;
    since?: Date;
  }): TrackedRequest[] {
    if (!filter) {
      return [...this.requests];
    }

    return this.requests.filter((req) => {
      if (filter.method && req.method !== filter.method) {
        return false;
      }

      if (filter.path && !this.matchPath(req.path, filter.path)) {
        return false;
      }

      if (filter.since && req.timestamp < filter.since) {
        return false;
      }

      return true;
    });
  }

  private matchPath(requestPath: string, filterPath: string): boolean {
    // Exact match
    if (requestPath === filterPath) {
      return true;
    }

    // Wildcard match
    if (filterPath.includes('*')) {
      const pattern = filterPath.replace(/\*/g, '.*').replace(/\//g, '\\/');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(requestPath);
    }

    return false;
  }

  public getCount(filter?: {
    method?: string;
    path?: string;
    since?: Date;
  }): number {
    return this.getRequests(filter).length;
  }

  public clear(): void {
    this.requests = [];
  }

  public getLastRequest(filter?: {
    method?: string;
    path?: string;
  }): TrackedRequest | undefined {
    const filtered = this.getRequests(filter);
    return filtered[filtered.length - 1];
  }

  public verifyRequest(
    method: string,
    path: string,
    bodyMatcher?: (body: any) => boolean
  ): boolean {
    const requests = this.getRequests({ method, path });

    if (requests.length === 0) {
      return false;
    }

    if (bodyMatcher) {
      return requests.some((req) => bodyMatcher(req.body));
    }

    return true;
  }

  public verifyRequestCount(method: string, path: string, expectedCount: number): boolean {
    const count = this.getCount({ method, path });
    return count === expectedCount;
  }

  public getStatistics(): {
    total: number;
    byMethod: Record<string, number>;
    byPath: Record<string, number>;
    byStatus: Record<string, number>;
    averageLatency: number;
  } {
    const stats = {
      total: this.requests.length,
      byMethod: {} as Record<string, number>,
      byPath: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      averageLatency: 0,
    };

    for (const req of this.requests) {
      // Count by method
      stats.byMethod[req.method] = (stats.byMethod[req.method] || 0) + 1;

      // Count by path
      stats.byPath[req.path] = (stats.byPath[req.path] || 0) + 1;
    }

    return stats;
  }
}
