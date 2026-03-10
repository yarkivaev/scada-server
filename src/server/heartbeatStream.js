import route from '../objects/route.js';
import sseResponse from '../objects/sseResponse.js';

/**
 * Heartbeat stream route factory.
 * Creates SSE route for /heartbeat/stream that sends periodic heartbeat events.
 * Used by frontend watchdog to detect connection loss.
 *
 * @param {string} basePath - base URL path
 * @param {function} clock - time provider
 * @returns {array} array of route objects
 *
 * @example
 *   const routes = heartbeatStream('/api/v1', () => new Date());
 */
export default function heartbeatStream(basePath, clock) {
    return [
        route(
            'GET',
            `${basePath}/heartbeat/stream`,
            (req, res) => {
                const sse = sseResponse(res, clock);
                sse.heartbeat();
                const interval = setInterval(() => {
                    sse.heartbeat();
                }, 5000);
                req.on('close', () => {
                    clearInterval(interval);
                });
            }
        )
    ];
}
