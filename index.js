/**
 * SCADA Server - Composable server implementing Supervisor API.
 * Provides routes and scadaServer factory for integration with scada domain.
 *
 * @example
 *   import http from 'http';
 *   import { scadaServer } from 'scada-server';
 *   import { sokolPlant, meltingMachine } from 'sokol-scada';
 *
 *   const plant = sokolPlant(meltingMachine);
 *   const server = scadaServer('/supervisor/api/v1', plant);
 *   http.createServer((req, res) => server.handle(req, res)).listen(3000);
 */

// Server
export { default as scadaServer } from './src/server/scadaServer.js';
export { default as routes } from './src/server/routes.js';

// Objects
export { default as route } from './src/objects/route.js';
export { default as jsonResponse } from './src/objects/jsonResponse.js';
export { default as errorResponse } from './src/objects/errorResponse.js';
export { default as sseResponse } from './src/objects/sseResponse.js';
export { default as timeExpression } from './src/objects/timeExpression.js';
export { default as pagination } from './src/objects/pagination.js';
export { default as cursor } from './src/objects/cursor.js';
