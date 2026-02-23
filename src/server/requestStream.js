import route from '../objects/route.js';
import sseResponse from '../objects/sseResponse.js';

/**
 * Request stream route factory.
 * Creates SSE route for /machines/:machineId/requests/stream.
 * Streams request_created and request_resolved events for the specified machine.
 *
 * @param {string} basePath - base URL path
 * @param {object} plant - plant domain object from scada package
 * @param {function} clock - time provider
 * @returns {array} array of route objects
 *
 * @example
 *   const routes = requestStream('/api/v1', plant, clock);
 */
export default function requestStream(basePath, plant, clock) {
    function find(machineId) {
        for (const shop of Object.values(plant.shops.get())) {
            const machine = shop.machines.get()[machineId];
            if (machine) {
                return { machine, shop };
            }
        }
        return undefined;
    }
    return [
        route(
            'GET',
            `${basePath}/machines/:machineId/requests/stream`,
            (req, res, params) => {
                const sse = sseResponse(res, clock);
                sse.heartbeat();
                const result = find(params.machineId);
                if (!result) {
                    sse.close();
                    return;
                }
                const { machine } = result;
                const subscription = machine.requests.stream((event) => {
                    if (event.type === 'created') {
                        sse.emit('request_created', {
                            id: event.request.id,
                            segment: {
                                name: event.request.name,
                                start: event.request.startTime.toISOString(),
                                end: event.request.endTime.toISOString(),
                                duration: event.request.duration
                            },
                            options: event.request.options
                        });
                    } else if (event.type === 'resolved') {
                        sse.emit('request_resolved', {
                            id: event.request.id
                        });
                    }
                });
                const heartbeat = setInterval(() => {
                    sse.heartbeat();
                }, 30000);
                req.on('close', () => {
                    clearInterval(heartbeat);
                    subscription.cancel();
                });
            }
        )
    ];
}
