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
            (req, res, params, query) => {
                const result = find(params.machineId);
                if (!result) {
                    jsonResponse({ items: [] }).send(res);
                    return;
                }
                const { machine, shop } = result;
                const options = { machine: machine.name() };
                if (query.from) {
                    options.from = query.from;
                }
                if (query.to) {
                    options.to = query.to;
                }
                const segments = shop.segments.query(options);
                const items = segments.map((s) => {
                    const mapped = {
                        name: s.name,
                        start: s.start_time.toISOString(),
                        end: s.end_time.toISOString(),
                        duration: s.duration
                    };
                    if (s.options) {
                        mapped.options = s.options;
                    }
                    return mapped;
                });
                jsonResponse({ items }).send(res);
            }
        )
    ];
}
