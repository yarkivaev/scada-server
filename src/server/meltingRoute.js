import cursor from '../objects/cursor.js';
import errorResponse from '../objects/errorResponse.js';
import jsonResponse from '../objects/jsonResponse.js';
import route from '../objects/route.js';

/**
 * Converts melting domain object to API response format.
 *
 * @param {object} melting - melting domain object
 * @returns {object} API response object
 */
function format(melting) {
    const data = melting.chronology().get();
    const result = {
        id: melting.id(),
        start: data.start.toISOString(),
        initial: data.initial,
        weight: data.weight,
        loaded: data.loaded,
        dispensed: data.dispensed
    };
    if (data.end) {
        result.end = data.end.toISOString();
    }
    return result;
}

/**
 * Melting read routes factory.
 * Creates routes for GET /machines/:machineId/meltings.
 *
 * @param {string} basePath - base URL path
 * @param {function} findMachine - function to find machine by ID
 * @returns {array} array of route objects
 */
function readRoutes(basePath, findMachine) {
    return [
        route('GET', `${basePath}/machines/:machineId/meltings`, (req, res, params, query) => {
            const result = findMachine(params.machineId);
            if (!result) {
                jsonResponse({ items: [], hasMore: false }).send(res);
                return;
            }
            const { machine, shop } = result;
            const {after} = query;
            const {before} = query;
            const limit = query.limit ? parseInt(query.limit, 10) : 10;
            const active = query.active === 'true';
            const meltings = shop.meltings.query({ machine }).map(format).sort((a, b) => {
                return new Date(b.start).getTime() - new Date(a.start).getTime();
            });
            const paginated = cursor(after, before, limit, meltings, active).result();
            jsonResponse({ items: paginated.items, nextCursor: paginated.nextCursor, hasMore: paginated.hasMore }).send(res);
        }),
        route('GET', `${basePath}/machines/:machineId/meltings/:meltingId`, (req, res, params) => {
            const result = findMachine(params.machineId);
            if (!result) {
                errorResponse('NOT_FOUND', `Melting '${params.meltingId}' not found`, 404).send(res);
                return;
            }
            const { machine, shop } = result;
            const melting = shop.meltings.query({ machine }).find((m) => {
                return m.id() === params.meltingId;
            });
            if (!melting) {
                errorResponse('NOT_FOUND', `Melting '${params.meltingId}' not found`, 404).send(res);
                return;
            }
            jsonResponse(format(melting)).send(res);
        })
    ];
}

/**
 * Melting write routes factory.
 * Creates routes for POST/PUT /machines/:machineId/meltings.
 *
 * @param {string} basePath - base URL path
 * @param {function} findMachine - function to find machine by ID
 * @returns {array} array of route objects
 */
function writeRoutes(basePath, findMachine) {
    return [
        route('POST', `${basePath}/machines/:machineId/meltings/start`, (req, res, params) => {
            const result = findMachine(params.machineId);
            if (!result) {
                errorResponse('NOT_FOUND', `Machine '${params.machineId}' not found`, 404).send(res);
                return;
            }
            const { machine, shop } = result;
            const active = shop.meltings.add(machine, {});
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(format(active)));
        }),
        route('POST', `${basePath}/machines/:machineId/meltings/:meltingId/stop`, (req, res, params) => {
            const result = findMachine(params.machineId);
            if (!result) {
                errorResponse('NOT_FOUND', `Active melting '${params.meltingId}' not found`, 404).send(res);
                return;
            }
            const { shop } = result;
            const melting = shop.meltings.query({ id: params.meltingId });
            if (!melting || !melting.stop) {
                errorResponse('NOT_FOUND', `Active melting '${params.meltingId}' not found`, 404).send(res);
                return;
            }
            const completed = melting.stop();
            jsonResponse(format(completed)).send(res);
        }),
        route('POST', `${basePath}/machines/:machineId/meltings`, (req, res, params) => {
            const result = findMachine(params.machineId);
            if (!result) {
                errorResponse('NOT_FOUND', `Machine '${params.machineId}' not found`, 404).send(res);
                return;
            }
            let body = '';
            req.on('data', (chunk) => {
                body += chunk;
            });
            req.on('end', () => {
                const data = JSON.parse(body);
                const { machine, shop } = result;
                const melting = shop.meltings.add(machine, data);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(format(melting)));
            });
        }),
        route('PUT', `${basePath}/machines/:machineId/meltings/:meltingId`, (req, res, params) => {
            const result = findMachine(params.machineId);
            if (!result) {
                errorResponse('NOT_FOUND', `Melting '${params.meltingId}' not found`, 404).send(res);
                return;
            }
            let body = '';
            req.on('data', (chunk) => {
                body += chunk;
            });
            req.on('end', () => {
                const data = JSON.parse(body);
                const { shop } = result;
                const melting = shop.meltings.query({ id: params.meltingId });
                if (!melting) {
                    errorResponse('NOT_FOUND', `Melting '${params.meltingId}' not found`, 404).send(res);
                    return;
                }
                const updated = melting.update(data);
                jsonResponse(format(updated)).send(res);
            });
        })
    ];
}

/**
 * Melting routes factory.
 * Creates routes for /machines/:machineId/meltings.
 *
 * @param {string} basePath - base URL path
 * @param {object} plant - plant domain object from scada package
 * @returns {array} array of route objects
 *
 * @example
 *   const routes = meltingRoute('/api/v1', plant);
 */
export default function meltingRoute(basePath, plant) {
    function findMachine(id) {
        for (const shop of Object.values(plant.shops.get())) {
            const machine = shop.machines.get()[id];
            if (machine) {
                return { machine, shop };
            }
        }
        return undefined;
    }
    return [...readRoutes(basePath, findMachine), ...writeRoutes(basePath, findMachine)];
}
