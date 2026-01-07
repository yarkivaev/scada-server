/**
 * Server-Sent Events response.
 * Returns immutable object with emit(), heartbeat(), close() methods.
 *
 * @param {object} response - HTTP response object
 * @param {function} clock - time provider for heartbeats
 * @returns {object} sse with emit, heartbeat, close methods
 *
 * @example
 *   const sse = sseResponse(response, () => new Date());
 *   sse.emit('measurement', { key: 'voltage', value: 380 });
 *   sse.heartbeat();
 *   sse.close();
 */
export default function sseResponse(response, clock) {
    response.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    return {
        emit(event, payload) {
            response.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
        },
        heartbeat() {
            const timestamp = clock().toISOString();
            response.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp })}\n\n`);
        },
        close() {
            response.end();
        }
    };
}
