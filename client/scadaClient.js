import machineClient from './machineClient.js';
import sseConnection from './sseConnection.js';

/**
 * Main SCADA API client.
 * Returns object with machines() and machine() methods.
 *
 * @param {string} baseUrl - server base URL
 * @param {function} fetcher - fetch function
 * @param {function} eventSource - EventSource constructor
 * @returns {object} client with machines, machine, jump, reset, simulation methods
 *
 * @example
 *   const client = scadaClient('http://localhost:3000/api/v1', fetch, EventSource);
 *   const machines = await client.machines();
 *   const machine = client.machine('icht1');
 *   await client.jump('2025-06-15T10:00:00Z');
 *   await client.reset();
 */
export default function scadaClient(baseUrl, fetcher, eventSource) {
    return {
        async machines() {
            const response = await fetcher(`${baseUrl}/machines`);
            const payload = await response.json();
            if (!response.ok) {
                const error = new Error(payload.error.message);
                error.code = payload.error.code;
                throw error;
            }
            return payload;
        },
        machine(machineId) {
            return machineClient(baseUrl, machineId, fetcher, eventSource);
        },
        async jump(timestamp) {
            const response = await fetcher(`${baseUrl}/simulation/jump`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ timestamp })
            });
            const payload = await response.json();
            if (!response.ok) {
                const error = new Error(payload.error.message);
                error.code = payload.error.code;
                throw error;
            }
            return payload;
        },
        async reset() {
            const response = await fetcher(`${baseUrl}/simulation`, {
                method: 'DELETE'
            });
            const payload = await response.json();
            if (!response.ok) {
                const error = new Error(payload.error.message);
                error.code = payload.error.code;
                throw error;
            }
            return payload;
        },
        heartbeatStream() {
            return sseConnection(`${baseUrl}/heartbeat/stream`, eventSource);
        },
        async simulation() {
            const response = await fetcher(`${baseUrl}/simulation`);
            const payload = await response.json();
            if (!response.ok) {
                const error = new Error(payload.error.message);
                error.code = payload.error.code;
                throw error;
            }
            return payload;
        }
    };
}
