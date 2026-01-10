import sseConnection from './sseConnection.js';

/**
 * Client for single machine endpoints.
 * Returns object with methods for machine operations.
 *
 * @param {string} baseUrl - API base URL
 * @param {string} machineId - machine identifier
 * @param {function} fetcher - fetch function
 * @param {function} eventSource - EventSource constructor
 * @returns {object} client with info, measurements, alerts, meltings methods
 *
 * @example
 *   const machine = machineClient(baseUrl, 'icht1', fetch, EventSource);
 *   const info = await machine.info();
 */
export default function machineClient(baseUrl, machineId, fetcher, eventSource) {
    const url = `${baseUrl}/machines/${machineId}`;
    async function request(path, options) {
        const response = await fetcher(`${url}${path}`, options);
        const payload = await response.json();
        if (!response.ok) {
            throw payload;
        }
        return payload;
    }
    return {
        async info() {
            return request('');
        },
        async measurements(options) {
            const params = new URLSearchParams();
            if (options && options.keys) {
                params.set('keys', options.keys.join(','));
            }
            if (options && options.from) {
                params.set('from', options.from);
            }
            if (options && options.to) {
                params.set('to', options.to);
            }
            if (options && options.step) {
                params.set('step', String(options.step));
            }
            const qs = params.toString();
            return request(`/measurements${qs ? `?${qs}` : ''}`);
        },
        measurementStream(options) {
            const params = new URLSearchParams();
            if (options && options.keys) {
                params.set('keys', options.keys.join(','));
            }
            if (options && options.since) {
                params.set('since', options.since);
            }
            if (options && options.step) {
                params.set('step', String(options.step));
            }
            const qs = params.toString();
            return sseConnection(
                `${url}/measurements/stream${qs ? `?${qs}` : ''}`,
                eventSource
            );
        },
        async alerts(options) {
            const params = new URLSearchParams();
            if (options && options.page) {
                params.set('page', String(options.page));
            }
            if (options && options.size) {
                params.set('size', String(options.size));
            }
            if (options && Object.hasOwn(options, 'acknowledged')) {
                params.set('acknowledged', String(options.acknowledged));
            }
            const qs = params.toString();
            return request(`/alerts${qs ? `?${qs}` : ''}`);
        },
        alertStream() {
            return sseConnection(`${url}/alerts/stream`, eventSource);
        },
        async acknowledge(alertId) {
            return request(`/alerts/${alertId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ acknowledged: true })
            });
        },
        async meltings(options) {
            const params = new URLSearchParams();
            if (options && options.after) {
                params.set('after', options.after);
            }
            if (options && options.before) {
                params.set('before', options.before);
            }
            if (options && options.limit) {
                params.set('limit', String(options.limit));
            }
            if (options && options.active) {
                params.set('active', 'true');
            }
            const qs = params.toString();
            return request(`/meltings${qs ? `?${qs}` : ''}`);
        },
        async melting(meltingId) {
            return request(`/meltings/${meltingId}`);
        },
        meltingStream() {
            return sseConnection(`${url}/meltings/stream`, eventSource);
        },
        async startMelting() {
            return request('/meltings/start', { method: 'POST' });
        },
        async stopMelting(meltingId) {
            return request(`/meltings/${meltingId}/stop`, { method: 'POST' });
        },
        async weight() {
            return request('/weight');
        },
        async setWeight(amount) {
            return request('/weight', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount })
            });
        },
        async load(amount) {
            return request('/load', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount })
            });
        },
        async dispense(amount) {
            return request('/dispense', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount })
            });
        }
    };
}
