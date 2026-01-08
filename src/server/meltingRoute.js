import cursor from '../objects/cursor.js';
import errorResponse from '../objects/errorResponse.js';
import jsonResponse from '../objects/jsonResponse.js';
import route from '../objects/route.js';

/**
 * Melting routes factory.
 * Creates routes for GET /machines/:machineId/meltings.
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
        return null;
    }
    return [
        route(
            'GET',
            `${basePath}/machines/:machineId/meltings`,
            (req, res, params, query) => {
                const result = findMachine(params.machineId);
                if (!result) {
                    jsonResponse({ items: [], nextCursor: null, hasMore: false }).send(res);
                    return;
                }
                const { machine, shop } = result;
                const after = query.after || null;
                const before = query.before || null;
                const limit = query.limit ? parseInt(query.limit, 10) : 10;
                const meltings = shop.meltings.find(machine).map((m) => {return {
                    id: m.id(),
                    start: m.start().toISOString(),
                    end: m.end().toISOString(),
                    loaded: m.chronology().get().loaded,
                    dispensed: m.chronology().get().dispensed
                }});
                const paginated = cursor(after, before, limit, meltings).result();
                jsonResponse({ items: paginated.items, nextCursor: paginated.nextCursor, hasMore: paginated.hasMore }).send(res);
            }
        ),
        route(
            'GET',
            `${basePath}/machines/:machineId/meltings/:meltingId`,
            (req, res, params) => {
                const result = findMachine(params.machineId);
                if (!result) {
                    errorResponse(
                        'NOT_FOUND',
                        `Melting '${params.meltingId}' not found`,
                        404
                    ).send(res);
                    return;
                }
                const { machine, shop } = result;
                const meltings = shop.meltings.find(machine);
                const melting = meltings.find((m) => {
                    return m.id() === params.meltingId;
                });
                if (!melting) {
                    errorResponse(
                        'NOT_FOUND',
                        `Melting '${params.meltingId}' not found`,
                        404
                    ).send(res);
                    return;
                }
                jsonResponse({
                    id: melting.id(),
                    start: melting.start().toISOString(),
                    end: melting.end().toISOString(),
                    loaded: melting.chronology().get().loaded,
                    dispensed: melting.chronology().get().dispensed
                }).send(res);
            }
        )
    ];
}
