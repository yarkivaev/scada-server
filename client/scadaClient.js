import machineClient from './machineClient.js';

/**
 * Main SCADA API client.
 * Returns object with machines() and machine() methods.
 *
 * @param {string} baseUrl - server base URL
 * @param {function} fetcher - fetch function
 * @param {function} eventSource - EventSource constructor
 * @returns {object} client with machines, machine methods
 *
 * @example
 *   const client = scadaClient('http://localhost:3000/api/v1', fetch, EventSource);
 *   const machines = await client.machines();
 *   const machine = client.machine('icht1');
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
        }
    };
}
