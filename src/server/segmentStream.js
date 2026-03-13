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
    /**
     * Builds an SSE payload object from a segment.
     *
     * @param {object} segment - segment domain object
     * @returns {object} serializable payload
     */
    function payload(segment) {
        const data = {
            name: segment.name,
            start: segment.startTime.toISOString(),
            end: segment.endTime.toISOString(),
            duration: segment.duration
        };
        if (segment.options) {
            data.options = segment.options;
        }
        if (segment.tags) {
            data.tags = segment.tags;
        }
        if (segment.properties) {
            data.properties = segment.properties;
        }
        return data;
    }
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
                        sse.emit('segment_created', payload(event.segment));
                    } else if (event.type === 'relabeled') {
                        sse.emit('segment_relabeled', payload(event.segment));
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
