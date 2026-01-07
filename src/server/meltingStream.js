import route from '../objects/route.js';
import sseResponse from '../objects/sseResponse.js';

/**
 * Melting stream route factory.
 * Creates SSE route for /machines/:machineId/meltings/stream.
 *
 * @param {string} basePath - base URL path
 * @param {object} plant - plant domain object from scada package
 * @param {function} clock - time provider
 * @returns {array} array of route objects
 *
 * @example
 *   const routes = meltingStream('/api/v1', plant, clock);
 */
export default function meltingStream(basePath, plant, clock) {
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
            `${basePath}/machines/:machineId/meltings/stream`,
            (req, res, params) => {
                const sse = sseResponse(res, clock);
                const result = findMachine(params.machineId);
                if (!result) {
                    sse.close();
                    return;
                }
                const { machine, shop } = result;
                const subscription = shop.meltings.stream((event) => {
                    if (event.type === 'started') {
                        const m = event.melting;
                        sse.emit('melting_started', {
                            id: m.id(),
                            start: m.start().toISOString()
                        });
                    } else if (event.type === 'completed') {
                        const m = event.melting;
                        sse.emit('melting_ended', {
                            id: m.id(),
                            end: m.end().toISOString(),
                            loaded: m.chronology().get().loaded,
                            dispensed: m.chronology().get().dispensed
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
