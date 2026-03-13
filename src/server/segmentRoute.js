import errorResponse from '../objects/errorResponse.js';
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
                const items = segments.map(({ name, start_time: startTime, end_time: endTime, duration, options: opts, tags, properties }) => {
                    const mapped = {
                        name,
                        start: startTime.toISOString(),
                        end: duration === 0 ? new Date().toISOString() : endTime.toISOString(),
                        duration
                    };
                    if (opts) {
                        mapped.options = opts;
                    }
                    if (tags) {
                        mapped.tags = tags;
                    }
                    if (properties) {
                        mapped.properties = properties;
                    }
                    return mapped;
                });
                jsonResponse({ items }).send(res);
            }
        ),
        route(
            'PATCH',
            `${basePath}/machines/:machineId/segments`,
            (req, res, params) => {
                let body = '';
                req.on('data', (chunk) => {
                    body += chunk;
                });
                req.on('end', async () => {
                    const result = find(params.machineId);
                    if (!result) {
                        errorResponse(
                            'NOT_FOUND',
                            `Machine '${params.machineId}' not found`,
                            404
                        ).send(res);
                        return;
                    }
                    const { machine } = result;
                    const parsed = JSON.parse(body);
                    await machine.segments.retag(new Date(parsed.start), parsed.tags, parsed.properties);
                    jsonResponse({ status: 'updated' }).send(res);
                });
            }
        )
    ];
}
