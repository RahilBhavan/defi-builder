/**
 * Stubbing Engine for Request/Response Matching
 */

import type { MockRoute, MockRequest, MockMatcher } from './types';
import { logger } from '../utils/logger';

export class StubbingEngine {
  private stubs: Map<string, MockRoute & { id: string; callCount: number }> = new Map();
  private stubCounter = 0;

  public createStub(stub: MockRoute): string {
    const id = `stub_${++this.stubCounter}`;

    this.stubs.set(id, {
      ...stub,
      id,
      callCount: 0,
      priority: stub.priority ?? 0,
      times: stub.times ?? -1 // -1 means unlimited
    });

    logger.info(`Created stub ${id}: ${stub.method} ${stub.path}`);
    return id;
  }

  public removeStub(id: string): boolean {
    return this.stubs.delete(id);
  }

  public clearStubs(): void {
    this.stubs.clear();
    this.stubCounter = 0;
  }

  public matchRequest(request: MockRequest): MockRoute | null {
    const candidates: Array<MockRoute & { id: string; callCount: number }> = [];

    for (const stub of this.stubs.values()) {
      if (this.matchesStub(request, stub)) {
        candidates.push(stub);
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    // Sort by priority (highest first)
    candidates.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    // Get the best match
    const match = candidates[0];

    // Increment call count
    match.callCount++;

    // Check if stub should be removed (times limit reached)
    if (match.times !== -1 && match.callCount >= match.times) {
      this.stubs.delete(match.id);
      logger.info(`Stub ${match.id} reached call limit and was removed`);
    }

    return match;
  }

  private matchesStub(
    request: MockRequest,
    stub: MockRoute & { id: string; callCount: number }
  ): boolean {
    // Check if stub has reached its call limit
    if (stub.times !== -1 && stub.callCount >= stub.times) {
      return false;
    }

    // Check method
    if (request.method !== stub.method) {
      return false;
    }

    // Check path
    if (!this.matchesPath(request.path, stub.path)) {
      return false;
    }

    // Check matchers if present
    if (stub.matchers && stub.matchers.length > 0) {
      for (const matcher of stub.matchers) {
        if (!this.evaluateMatcher(request, matcher)) {
          return false;
        }
      }
    }

    return true;
  }

  private matchesPath(requestPath: string, stubPath: string): boolean {
    // Exact match
    if (requestPath === stubPath) {
      return true;
    }

    // Wildcard match
    if (stubPath.includes('*')) {
      const pattern = stubPath
        .replace(/\*/g, '.*')
        .replace(/\//g, '\\/');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(requestPath);
    }

    // Path parameter match (e.g., /users/:id)
    if (stubPath.includes(':')) {
      const stubParts = stubPath.split('/');
      const requestParts = requestPath.split('/');

      if (stubParts.length !== requestParts.length) {
        return false;
      }

      for (let i = 0; i < stubParts.length; i++) {
        if (stubParts[i].startsWith(':')) {
          // Path parameter - always matches
          continue;
        }
        if (stubParts[i] !== requestParts[i]) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  private evaluateMatcher(request: MockRequest, matcher: MockMatcher): boolean {
    switch (matcher.type) {
      case 'query_params':
        return this.matchQueryParams(request.query || {}, matcher.params || {});

      case 'headers':
        return this.matchHeaders(request.headers, matcher.headers || {});

      case 'body':
        return this.matchBody(request.body, matcher.body, matcher.matchType);

      case 'path_params':
        return this.matchPathParams(request.path, matcher.params || {});

      default:
        logger.warn(`Unknown matcher type: ${matcher.type}`);
        return true;
    }
  }

  private matchQueryParams(
    requestQuery: Record<string, string>,
    expectedQuery: Record<string, any>
  ): boolean {
    for (const [key, value] of Object.entries(expectedQuery)) {
      if (requestQuery[key] !== String(value)) {
        return false;
      }
    }
    return true;
  }

  private matchHeaders(
    requestHeaders: Record<string, string>,
    expectedHeaders: Record<string, string>
  ): boolean {
    for (const [key, value] of Object.entries(expectedHeaders)) {
      const headerKey = key.toLowerCase();
      const requestValue = requestHeaders[headerKey] || requestHeaders[key];

      if (requestValue !== value) {
        return false;
      }
    }
    return true;
  }

  private matchBody(
    requestBody: any,
    expectedBody: any,
    matchType: 'exact' | 'partial' | 'regex' | undefined = 'exact'
  ): boolean {
    if (matchType === 'exact') {
      return JSON.stringify(requestBody) === JSON.stringify(expectedBody);
    }

    if (matchType === 'partial') {
      return this.partialMatch(requestBody, expectedBody);
    }

    if (matchType === 'regex') {
      const bodyStr = JSON.stringify(requestBody);
      const pattern = new RegExp(expectedBody);
      return pattern.test(bodyStr);
    }

    return false;
  }

  private partialMatch(actual: any, expected: any): boolean {
    if (typeof expected !== 'object' || expected === null) {
      return actual === expected;
    }

    if (typeof actual !== 'object' || actual === null) {
      return false;
    }

    for (const [key, value] of Object.entries(expected)) {
      if (!(key in actual)) {
        return false;
      }

      if (typeof value === 'object' && value !== null) {
        if (!this.partialMatch(actual[key], value)) {
          return false;
        }
      } else {
        if (actual[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  private matchPathParams(
    requestPath: string,
    expectedParams: Record<string, string>
  ): boolean {
    // Extract path parameters from request
    // This is a simplified implementation
    const parts = requestPath.split('/');

    for (const [key, value] of Object.entries(expectedParams)) {
      // Find the parameter in the path
      const found = parts.some(part => part === value);
      if (!found) {
        return false;
      }
    }

    return true;
  }

  public getStubStats(): Array<{
    id: string;
    method: string;
    path: string;
    callCount: number;
    remainingCalls: number;
  }> {
    return Array.from(this.stubs.values()).map(stub => ({
      id: stub.id,
      method: stub.method,
      path: stub.path,
      callCount: stub.callCount,
      remainingCalls: stub.times === -1 ? -1 : stub.times - stub.callCount
    }));
  }
}

/**
 * Fluent API for creating stubs
 */
export class StubBuilder {
  private stub: Partial<MockRoute> = {
    priority: 0,
    times: -1
  };

  public when(method: string, path: string): this {
    this.stub.method = method;
    this.stub.path = path;
    return this;
  }

  public withQueryParams(params: Record<string, string>): this {
    if (!this.stub.matchers) {
      this.stub.matchers = [];
    }
    this.stub.matchers.push({
      type: 'query_params',
      params
    });
    return this;
  }

  public withHeaders(headers: Record<string, string>): this {
    if (!this.stub.matchers) {
      this.stub.matchers = [];
    }
    this.stub.matchers.push({
      type: 'headers',
      headers
    });
    return this;
  }

  public withBody(body: any, matchType: 'exact' | 'partial' | 'regex' = 'exact'): this {
    if (!this.stub.matchers) {
      this.stub.matchers = [];
    }
    this.stub.matchers.push({
      type: 'body',
      body,
      matchType
    });
    return this;
  }

  public thenReturn(status: number, body?: any, headers?: Record<string, string>): this {
    this.stub.response = {
      status,
      body,
      headers
    };
    return this;
  }

  public withPriority(priority: number): this {
    this.stub.priority = priority;
    return this;
  }

  public times(count: number): this {
    this.stub.times = count;
    return this;
  }

  public withDelay(ms: number): this {
    this.stub.delay = ms;
    return this;
  }

  public withCondition(match: Record<string, any>, response: any): this {
    if (!this.stub.conditions) {
      this.stub.conditions = [];
    }
    this.stub.conditions.push({ match, response });
    return this;
  }

  public build(): MockRoute {
    if (!this.stub.method || !this.stub.path || !this.stub.response) {
      throw new Error('Stub must have method, path, and response');
    }

    return this.stub as MockRoute;
  }
}

// Usage example:
// const stub = new StubBuilder()
//   .when('GET', '/api/price/:token')
//   .withQueryParams({ currency: 'USD' })
//   .thenReturn(200, { price: 100 })
//   .withPriority(10)
//   .build();
