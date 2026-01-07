import assert from 'assert';
import meltingStream from '../../src/server/meltingStream.js';
import fakePlant from './helpers/fakePlant.js';
import { EventEmitter } from 'events';

describe('meltingStream', function() {
    it('returns array of routes', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = meltingStream('/api', plant, () => {return new Date()});
        assert(Array.isArray(routes) && routes.length === 1);
    });

    it('matches GET /machines/:machineId/meltings/stream', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = meltingStream('/api', plant, () => {return new Date()});
        const request = { method: 'GET', url: '/api/machines/icht1/meltings/stream' };
        assert(routes[0].matches(request) === true);
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
        assert(headers['Content-Type'] === 'text/event-stream');
    });

    it('subscribes to meltings stream', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let subscribed = false;
        const origStream = plant.meltings.stream;
        plant.meltings.stream = (callback) => {
            subscribed = true;
            return origStream(callback);
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
        assert(subscribed === true);
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
        plant.meltings.notify({ type: 'started', melting: { id: () => {return 'm1'}, start: () => {return new Date()} } });
        assert(written.includes('event: melting_started'));
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
        plant.meltings.notify({ type: 'completed', melting: { id: () => {return 'm1'}, end: () => {return new Date()}, chronology: () => {return { get: () => { return { loaded: 100, dispensed: 80 }; } };} } });
        assert(written.includes('event: melting_ended'));
    });

    it('cancels subscription on close', function() {
        let cancelled = false;
        const plant = fakePlant({ machineId: 'icht1' });
        const origStream = plant.meltings.stream;
        plant.meltings.stream = (callback) => {
            const sub = origStream(callback);
            return {
                cancel() {
                    cancelled = true;
                    sub.cancel();
                }
            };
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
        assert(cancelled === true);
    });
});
