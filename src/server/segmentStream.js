import route from '../objects/route.js';
import sseResponse from '../objects/sseResponse.js';

/**
 * Segment stream route factory.
 * Creates SSE route for /machines/:machineId/segments/stream.
 * Streams segment_created and segment_relabeled events for the specified machine.
 *
 * @param {string} basePath - base URL path
 * @param {object} plant - plant domain object from scada package
 * @param {function} clock - time provider
 * @returns {array} array of route objects
 *
 * @example
 *   const routes = segmentStream('/api/v1', plant, clock);
 */
export default function segmentStream(basePath, plant, clock) {
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
            `${basePath}/machines/:machineId/segments/stream`,
            (req, res, params) => {
                const sse = sseResponse(res, clock);
                sse.heartbeat();
                const result = find(params.machineId);
                if (!result) {
                    sse.close();
                    return;
                }
                const { machine } = result;
                const subscription = machine.segments.stream((event) => {
                    if (event.type === 'created') {
                        sse.emit('segment_created', {
                            name: event.segment.name,
                            start: event.segment.startTime.toISOString(),
                            end: event.segment.endTime.toISOString(),
                            duration: event.segment.duration
                        });
                    } else if (event.type === 'relabeled') {
                        sse.emit('segment_relabeled', {
                            name: event.segment.name,
                            start: event.segment.startTime.toISOString(),
                            end: event.segment.endTime.toISOString(),
                            duration: event.segment.duration
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
