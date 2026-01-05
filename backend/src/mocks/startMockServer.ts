#!/usr/bin/env node
/**
 * Standalone Mock Server Startup Script
 * Run this to start the mock server independently: bun run backend/src/mocks/startMockServer.ts
 */

import { logger } from '../utils/logger';
import { DeFiMocks } from './defiMocks';
import { MockAPIServer } from './mockServer';

const PORT = Number(process.env.MOCK_PORT) || 3001;
const SCENARIO = process.env.MOCK_SCENARIO || 'default';

async function startMockServer() {
  logger.info('Starting DeFi Builder Mock API Server...');

  // Create server
  const server = new MockAPIServer(PORT);

  // Load all DeFi mocks
  logger.info('Loading DeFi mock definitions...');
  const mocks = DeFiMocks.getAllMocks();
  for (const mock of mocks) {
    server.addStub(mock);
  }
  logger.info(`Loaded ${mocks.length} mock definitions`);

  // Create DeFi scenarios
  logger.info('Creating DeFi scenarios...');
  server.scenarioManager.createDeFiScenarios();

  const scenarios = server.scenarioManager.listScenarios();
  logger.info(`Created ${scenarios.length} scenarios:`);
  for (const scenario of scenarios) {
    logger.info(`  - ${scenario.name}: ${scenario.description}`);
  }

  // Set initial scenario
  if (SCENARIO !== 'default') {
    logger.info(`Setting scenario to: ${SCENARIO}`);
    server.setScenario(SCENARIO);
  }

  // Start server
  await server.start();

  logger.info(
    `
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║        DeFi Builder Mock API Server Running!               ║
║                                                            ║
║  URL:      http://localhost:${PORT}                         ║
║  Scenario: ${SCENARIO.padEnd(47)}║
║                                                            ║
║  Available endpoints:                                      ║
║    - GET  /api/price/:token                                ║
║    - GET  /api/pool/:address                               ║
║    - POST /api/transaction/submit                          ║
║    - POST /api/backtest/run                                ║
║    - GET  /api/strategies                                  ║
║    - GET  /health                                          ║
║                                                            ║
║  Admin endpoints:                                          ║
║    - POST /admin/scenario    - Change scenario             ║
║    - POST /admin/reset       - Reset state                 ║
║    - GET  /admin/requests    - View request history        ║
║                                                            ║
║  Change scenario:                                          ║
║    curl -X POST http://localhost:${PORT}/admin/scenario \\   ║
║      -H "Content-Type: application/json" \\                ║
║      -d '{"scenario":"bull_market"}'                       ║
║                                                            ║
║  Available scenarios:                                      ║
${scenarios.map((s) => `║    - ${s.name.padEnd(51)}║`).join('\n')}
║                                                            ║
║  Press Ctrl+C to stop                                      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `.trim()
  );

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('\nShutting down mock server...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('\nShutting down mock server...');
    await server.stop();
    process.exit(0);
  });
}

// Start the server
startMockServer().catch((error) => {
  logger.error('Failed to start mock server:', error);
  process.exit(1);
});
