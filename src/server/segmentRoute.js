import jsonResponse from '../objects/jsonResponse.js';
import route from '../objects/route.js';

/**
 * Segment routes factory.
 * Creates route for GET /machines/:machineId/segments.
 *
 * @param {string} basePath - base URL path
 * @param {object} plant - plant domain object from scada package
 * @returns {array} array of route objects
 *
 * @example
 *   const routes = segmentRoute('/api/v1', plant);
 */
export default function segmentRoute(basePath, plant) {
    function find(id) {
        for (const shop of Object.values(plant.shops.get())) {
            const machine = shop.machines.get()[id];
            if (machine) {
                return { machine, shop };
            }
        }
        return undefined;
    }
    return [
        route(
            'GET',
            `${basePath}/machines/:machineId/segments`,
            async (req, res, params, query) => {
                const result = find(params.machineId);
                if (!result) {
                    jsonResponse({ items: [] }).send(res);
                    return;
                }
                const { machine } = result;
                const options = {};
                if (query.from) {
                    options.from = query.from;
                }
                if (query.to) {
                    options.to = query.to;
                }
                const segments = await machine.segments.query(options);
                const items = segments.map((s) => {
                    const mapped = {
                        name: s.name,
                        start: s.startTime.toISOString(),
                        end: s.duration === 0 ? new Date().toISOString() : s.endTime.toISOString(),
                        duration: s.duration
                    };
                    if (s.options) {
                        mapped.options = s.options;
                    }
                    if (s.label) {
                        mapped.label = s.label;
                    }
                    return mapped;
                });
                jsonResponse({ items }).send(res);
            }
        )
    ];
}
