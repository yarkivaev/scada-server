import alertRoute from './alertRoute.js';
import alertStream from './alertStream.js';
import machineRoute from './machineRoute.js';
import measurementRoute from './measurementRoute.js';
import measurementStream from './measurementStream.js';
import meltingRoute from './meltingRoute.js';
import meltingStream from './meltingStream.js';
import segmentRoute from './segmentRoute.js';
import segmentStream from './segmentStream.js';
import requestRoute from './requestRoute.js';
import requestStream from './requestStream.js';
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
 *   import { plant, meltingShop, meltingMachine } from 'scada';
 *   const p = createPlant(meltingMachine); // your plant factory
 *   const server = scadaServer('/api/v1', p);
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
        ...meltingRoute(basePath, plant),
        ...segmentRoute(basePath, plant),
        ...segmentStream(basePath, plant, time),
        ...requestRoute(basePath, plant),
        ...requestStream(basePath, plant, time)
    ];
    return routes(routeList);
}
