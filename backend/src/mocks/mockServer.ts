/**
 * Mock API Server for DeFi Builder
 * Enables development and testing without real blockchain/API dependencies
 */

import cors from 'cors';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import { logger } from '../utils/logger';
import { MockDataGenerator } from './dataGenerator';
import { RequestTracker } from './requestTracker';
import { ScenarioManager } from './scenarioManager';
import { StubbingEngine } from './stubbingEngine';
import type { MockResponse, MockRoute, MockScenario, MockState } from './types';

export class MockAPIServer {
  private app: express.Application;
  private routes: Map<string, MockRoute> = new Map();
  private scenarioManager: ScenarioManager;
  private stubbingEngine: StubbingEngine;
  private dataGenerator: MockDataGenerator;
  private requestTracker: RequestTracker;
  private state: MockState = {};
  private port: number;

  constructor(port = 3001) {
    this.app = express();
    this.port = port;
    this.scenarioManager = new ScenarioManager();
    this.stubbingEngine = new StubbingEngine();
    this.dataGenerator = new MockDataGenerator();
    this.requestTracker = new RequestTracker();

    this.setupMiddleware();
  }

  private setupMiddleware(): void {
    // CORS
    this.app.use(
      cors({
        origin: '*',
        credentials: true,
      })
    );

    // JSON parsing
    this.app.use(express.json());

    // Mock server headers
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Mock-Server', 'true');
      res.setHeader('X-Mock-Scenario', this.scenarioManager.getCurrentScenario());
      next();
    });

    // Request tracking
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      this.requestTracker.track({
        method: req.method,
        path: req.path,
        headers: req.headers as Record<string, string>,
        body: req.body,
        query: req.query as Record<string, string>,
        timestamp: new Date(),
      });
      next();
    });

    // Latency simulation
    this.app.use(async (req: Request, res: Response, next: NextFunction) => {
      const latency = this.calculateLatency(req.path);
      if (latency > 0) {
        await new Promise((resolve) => setTimeout(resolve, latency));
      }
      next();
    });
  }

  private calculateLatency(path: string): number {
    // Simulate realistic network latency based on endpoint type
    if (path.includes('/price')) return Math.random() * 100 + 50; // 50-150ms
    if (path.includes('/transaction')) return Math.random() * 500 + 200; // 200-700ms
    if (path.includes('/backtest')) return Math.random() * 2000 + 1000; // 1-3s
    return Math.random() * 50; // 0-50ms default
  }

  public loadScenarios(scenarios: Record<string, MockScenario>): void {
    for (const [name, scenario] of Object.entries(scenarios)) {
      this.scenarioManager.defineScenario(name, scenario);
    }
  }

  public setScenario(name: string): void {
    this.scenarioManager.setScenario(name);
    logger.info(`Mock server scenario changed to: ${name}`);
  }

  public addStub(stub: MockRoute): void {
    const id = this.stubbingEngine.createStub(stub);
    this.routes.set(id, stub);
  }

  public setupDynamicRoutes(): void {
    // Catch-all route handler
    this.app.all('*', async (req: Request, res: Response) => {
      try {
        // Find matching stub
        const stub = this.stubbingEngine.matchRequest({
          method: req.method,
          path: req.path,
          headers: req.headers as Record<string, string>,
          body: req.body,
          query: req.query as Record<string, string>,
        });

        if (!stub) {
          logger.warn(`No mock found for ${req.method} ${req.path}`);
          return res.status(404).json({
            error: 'No mock found for this endpoint',
            method: req.method,
            path: req.path,
          });
        }

        // Process mock response
        const mockResponse = await this.processMockResponse(stub, req);

        // Send response
        res.status(mockResponse.status);

        // Set headers
        if (mockResponse.headers) {
          for (const [key, value] of Object.entries(mockResponse.headers)) {
            res.setHeader(key, value);
          }
        }

        // Send body
        if (mockResponse.body !== undefined) {
          res.json(mockResponse.body);
        } else {
          res.end();
        }

        logger.info(`Mock response: ${req.method} ${req.path} -> ${mockResponse.status}`);
      } catch (error) {
        logger.error('Mock server error:', error);
        res.status(500).json({
          error: 'Mock server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }

  private async processMockResponse(stub: MockRoute, req: Request): Promise<MockResponse> {
    // Check for conditional responses
    if (stub.conditions) {
      for (const condition of stub.conditions) {
        if (this.evaluateCondition(condition, req)) {
          return this.generateResponse(condition.response, req);
        }
      }
    }

    // Check for sequence responses
    if (stub.sequence) {
      const response = this.scenarioManager.getSequenceResponse(stub.sequence.name, req);
      if (response) {
        return this.generateResponse(response, req);
      }
    }

    // Use default response
    return this.generateResponse(stub.response, req);
  }

  private evaluateCondition(
    condition: { match: Record<string, any>; response: any },
    req: Request
  ): boolean {
    const { match } = condition;

    // Body matching
    if (match.body) {
      if (!this.deepMatch(req.body, match.body)) {
        return false;
      }
    }

    // Query matching
    if (match.query) {
      if (!this.deepMatch(req.query, match.query)) {
        return false;
      }
    }

    // Header matching
    if (match.headers) {
      if (!this.deepMatch(req.headers, match.headers)) {
        return false;
      }
    }

    return true;
  }

  private deepMatch(actual: any, expected: any): boolean {
    if (typeof expected !== 'object' || expected === null) {
      return actual === expected;
    }

    for (const [key, value] of Object.entries(expected)) {
      if (!this.deepMatch(actual[key], value)) {
        return false;
      }
    }

    return true;
  }

  private generateResponse(responseTemplate: any, req: Request): MockResponse {
    const response: MockResponse = {
      status: responseTemplate.status || 200,
      headers: responseTemplate.headers || {},
      body: this.processResponseBody(responseTemplate.body, req),
    };

    // Apply transformations
    if (responseTemplate.transformations) {
      return this.applyTransformations(response, responseTemplate.transformations);
    }

    return response;
  }

  private processResponseBody(body: any, req: Request): any {
    if (typeof body === 'string') {
      // Replace path parameters
      return body.replace(/\{(\w+)\}/g, (match, param) => {
        const pathParts = req.path.split('/');
        const paramIndex = pathParts.indexOf(`:${param}`);
        return paramIndex >= 0 ? pathParts[paramIndex] : match;
      });
    }

    if (typeof body === 'object' && body !== null) {
      if (body.$generate) {
        // Generate data dynamically
        return this.dataGenerator.generate(body.$generate);
      }

      // Recursively process object
      const processed: any = Array.isArray(body) ? [] : {};
      for (const [key, value] of Object.entries(body)) {
        processed[key] = this.processResponseBody(value, req);
      }
      return processed;
    }

    return body;
  }

  private applyTransformations(
    response: MockResponse,
    transformations: Array<{ type: string; params: any }>
  ): MockResponse {
    let result = { ...response };

    for (const transform of transformations) {
      switch (transform.type) {
        case 'delay':
          // Delay is handled in middleware
          break;
        case 'error_rate':
          if (Math.random() < transform.params.rate) {
            result = {
              status: transform.params.status || 500,
              body: transform.params.body || { error: 'Simulated error' },
            };
          }
          break;
        case 'paginate':
          result.body = this.paginateResponse(result.body, transform.params);
          break;
      }
    }

    return result;
  }

  private paginateResponse(data: any[], params: { page: number; pageSize: number }): any {
    const { page = 1, pageSize = 10 } = params;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      data: data.slice(start, end),
      page,
      pageSize,
      total: data.length,
      totalPages: Math.ceil(data.length / pageSize),
    };
  }

  public getRequests(filter?: {
    method?: string;
    path?: string;
    since?: Date;
  }): Array<any> {
    return this.requestTracker.getRequests(filter);
  }

  public reset(): void {
    this.requestTracker.clear();
    this.scenarioManager.reset();
    this.state = {};
    logger.info('Mock server state reset');
  }

  public async start(): Promise<void> {
    this.setupDynamicRoutes();

    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        scenario: this.scenarioManager.getCurrentScenario(),
        requestCount: this.requestTracker.getCount(),
      });
    });

    // Admin endpoints
    this.app.post('/admin/scenario', (req: Request, res: Response) => {
      const { scenario } = req.body;
      this.setScenario(scenario);
      res.json({ success: true, scenario });
    });

    this.app.post('/admin/reset', (req: Request, res: Response) => {
      this.reset();
      res.json({ success: true });
    });

    this.app.get('/admin/requests', (req: Request, res: Response) => {
      const requests = this.requestTracker.getRequests();
      res.json({ requests });
    });

    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        logger.info(`Mock API server running on port ${this.port}`);
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    // Express doesn't have a built-in stop method
    // In production, you'd store the server instance and call close()
    logger.info('Mock server stopped');
  }
}
