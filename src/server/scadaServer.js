import alertRoute from './alertRoute.js';
import alertStream from './alertStream.js';
import machineRoute from './machineRoute.js';
import measurementRoute from './measurementRoute.js';
import measurementStream from './measurementStream.js';
import meltingRoute from './meltingRoute.js';
import meltingStream from './meltingStream.js';
import routes from './routes.js';

/**
 * SCADA server factory that creates routes from a plant domain object.
 * Assembles all route handlers for the Supervisor API.
 *
 * @param {string} basePath - base URL path for all routes
 * @param {object} plant - plant domain object from scada package
 * @param {function} clock - time provider function (optional)
 * @returns {object} routes object with list() and handle() methods
 *
 * @example
 *   import { scadaServer } from 'scada-server';
 *   import { sokolPlant, meltingMachine } from 'sokol-scada';
 *   const plant = sokolPlant(meltingMachine);
 *   const server = scadaServer('/supervisor/api/v1', plant);
 *   http.createServer((req, res) => server.handle(req, res)).listen(3000);
 */
export default function scadaServer(basePath, plant, clock) {
    plant.init();
    const time = clock || (() => {
        return new Date();
    });
    const routeList = [
        ...machineRoute(basePath, plant),
        ...measurementStream(basePath, plant, time),
        ...measurementRoute(basePath, plant, time),
        ...alertStream(basePath, plant, time),
        ...alertRoute(basePath, plant),
        ...meltingStream(basePath, plant, time),
        ...meltingRoute(basePath, plant)
    ];
    return routes(routeList);
}
