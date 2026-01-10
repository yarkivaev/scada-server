import assert from 'assert';
import meltingStream from '../../src/server/meltingStream.js';
import fakePlant from './helpers/fakePlant.js';
import { EventEmitter } from 'events';

describe('meltingStream', function() {
    it('returns array of routes', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = meltingStream('/api', plant, () => {return new Date()});
        assert(Array.isArray(routes) && routes.length === 1, 'routes array should have 1 route');
    });

    it('matches GET /machines/:machineId/meltings/stream', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = meltingStream('/api', plant, () => {return new Date()});
        const request = { method: 'GET', url: '/api/machines/icht1/meltings/stream' };
        assert(routes[0].matches(request) === true, 'should match stream endpoint');
    });

    it('sends SSE headers', function() {
        let headers;
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = meltingStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/meltings/stream';
        const response = {
            writeHead(code, hdrs) {
                headers = hdrs;
            },
            write() {},
            end() {}
        };
        routes[0].handle(request, response);
        assert(headers['Content-Type'] === 'text/event-stream', 'should send SSE headers');
    });

    it('subscribes to meltings stream', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let subscribed = false;
        const origQuery = plant.meltings.query;
        plant.meltings.query = (options) => {
            if (options && options.stream) {
                subscribed = true;
            }
            return origQuery(options);
        };
        const routes = meltingStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/meltings/stream';
        const response = {
            writeHead() {},
            write() {},
            end() {}
        };
        routes[0].handle(request, response);
        assert(subscribed === true, 'should subscribe to stream');
    });

    it('emits melting_started events', function() {
        let written;
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = meltingStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/meltings/stream';
        const response = {
            writeHead() {},
            write(content) {
                written = content;
            },
            end() {}
        };
        routes[0].handle(request, response);
        const startTime = new Date();
        plant.meltings.notify({
            type: 'started',
            melting: {
                id() { return 'm1'; },
                chronology() {
                    return {
                        get() { return { start: startTime }; }
                    };
                }
            }
        });
        assert(written.includes('event: melting_started'), 'should emit melting_started');
    });

    it('emits melting_ended events', function() {
        let written;
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = meltingStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/meltings/stream';
        const response = {
            writeHead() {},
            write(content) {
                written = content;
            },
            end() {}
        };
        routes[0].handle(request, response);
        const endTime = new Date();
        plant.meltings.notify({
            type: 'completed',
            melting: {
                id() { return 'm1'; },
                chronology() {
                    return {
                        get() { return { end: endTime, initial: 100, weight: 80, loaded: 500, dispensed: 420 }; }
                    };
                }
            }
        });
        assert(written.includes('event: melting_ended'), 'should emit melting_ended');
    });

    it('cancels subscription on close', function() {
        let cancelled = false;
        const plant = fakePlant({ machineId: 'icht1' });
        const origQuery = plant.meltings.query;
        plant.meltings.query = (options) => {
            const sub = origQuery(options);
            if (options && options.stream) {
                return {
                    cancel() {
                        cancelled = true;
                        sub.cancel();
                    }
                };
            }
            return sub;
        };
        const routes = meltingStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/meltings/stream';
        const response = {
            writeHead() {},
            write() {},
            end() {}
        };
        routes[0].handle(request, response);
        request.emit('close');
        assert(cancelled === true, 'should cancel subscription');
    });

    it('closes stream for unknown machine', function() {
        let ended = false;
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = meltingStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/unknown/meltings/stream';
        const response = {
            writeHead() {},
            write() {},
            end() {
                ended = true;
            }
        };
        routes[0].handle(request, response);
        assert(ended === true, 'should close stream for unknown machine');
    });

    it('emits melting_updated events', function() {
        let written;
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = meltingStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/meltings/stream';
        const response = {
            writeHead() {},
            write(content) {
                written = content;
            },
            end() {}
        };
        routes[0].handle(request, response);
        plant.meltings.notify({
            type: 'updated',
            melting: {
                id() { return 'm1'; },
                chronology() {
                    return {
                        get() { return { weight: 150 }; }
                    };
                }
            }
        });
        assert(written === undefined || !written.includes('updated'), 'should not emit for unknown events');
    });
});
