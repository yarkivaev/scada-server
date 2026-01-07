/**
 * SSE connection wrapper with event callbacks.
 * Returns immutable object with on() and close() methods.
 *
 * @param {string} url - SSE endpoint URL
 * @param {function} eventSource - EventSource constructor (for testing)
 * @returns {object} connection with on, close methods
 *
 * @example
 *   const conn = sseConnection(url, EventSource);
 *   conn.on('measurement', data => console.log(data));
 *   conn.close();
 */
export default function sseConnection(url, EventSourceCtor) {
    const source = new EventSourceCtor(url);
    const handlers = {};
    return {
        on(event, notify) {
            handlers[event] = notify;
            source.addEventListener(event, (ev) => {
                const payload = JSON.parse(ev.data);
                notify(payload);
            });
            return this;
        },
        close() {
            source.close();
        }
    };
}
