import errorResponse from '../objects/errorResponse.js';
import jsonResponse from '../objects/jsonResponse.js';
import route from '../objects/route.js';

/**
 * Label request routes factory.
 * Creates routes for GET and POST /machines/:machineId/requests.
 *
 * @param {string} basePath - base URL path
 * @param {object} plant - plant domain object from scada package
 * @returns {array} array of route objects
 *
 * @example
 *   const routes = requestRoute('/api/v1', plant);
 */
export default function requestRoute(basePath, plant) {
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
            `${basePath}/machines/:machineId/requests`,
            async (req, res, params) => {
                const result = find(params.machineId);
                if (!result) {
                    jsonResponse({ items: [] }).send(res);
                    return;
                }
                const { machine } = result;
                const requests = await machine.requests.query();
                const items = requests.map((item) => {
                    return {
                        id: item.id,
                        segment: {
                            name: item.name,
                            start: item.start_time.toISOString(),
                            end: item.end_time.toISOString(),
                            duration: item.duration
                        },
                        options: item.options
                    };
                });
                jsonResponse({ items }).send(res);
            }
        ),
        route(
            'POST',
            `${basePath}/machines/:machineId/requests/:requestId/respond`,
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
                    const response = await machine.requests.respond(params.requestId, JSON.parse(body));
                    if (!response) {
                        errorResponse(
                            'NOT_FOUND',
                            `Request '${params.requestId}' not found`,
                            404
                        ).send(res);
                        return;
                    }
                    jsonResponse({ id: params.requestId, status: 'resolved' }).send(res);
                });
            }
        )
    ];
}
