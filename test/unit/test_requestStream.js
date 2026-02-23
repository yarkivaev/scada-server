import assert from 'assert';
import requestStream from '../../src/server/requestStream.js';
import fakePlant from './helpers/fakePlant.js';
import { EventEmitter } from 'events';

describe('requestStream', function() {
    it('returns array of routes', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = requestStream('/api', plant, () => {return new Date()});
        assert(Array.isArray(routes) && routes.length === 1);
    });

    it('matches GET /machines/:machineId/requests/stream', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = requestStream('/api', plant, () => {return new Date()});
        const request = { method: 'GET', url: '/api/machines/icht1/requests/stream' };
        assert(routes[0].matches(request) === true);
    });

    it('sends SSE headers', function() {
        let headers;
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = requestStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/requests/stream';
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

    it('emits request_created event', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = requestStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/requests/stream';
        let written = '';
        const response = {
            writeHead() {},
            write(data) { written += data; },
            end() {}
        };
        routes[0].handle(request, response);
        plant.requests.notify({
            type: 'created',
            request: { id: 'req-1', name: 'unknown', startTime: new Date(), endTime: new Date(), duration: 1800, options: ['on', 'off'] }
        });
        assert(written.includes('event: request_created'), 'request_created event not emitted');
    });

    it('emits request_resolved event', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = requestStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/requests/stream';
        let written = '';
        const response = {
            writeHead() {},
            write(data) { written += data; },
            end() {}
        };
        routes[0].handle(request, response);
        plant.requests.notify({
            type: 'resolved',
            request: { id: 'req-1' }
        });
        assert(written.includes('event: request_resolved'), 'request_resolved event not emitted');
    });

    it('streams all events from machine requests collection', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = requestStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/requests/stream';
        let written = '';
        const response = {
            writeHead() {},
            write(data) { written += data; },
            end() {}
        };
        routes[0].handle(request, response);
        plant.requests.notify({
            type: 'created',
            request: { id: `req-${Math.random()}`, name: 'unknown', startTime: new Date(), endTime: new Date(), duration: 1800, options: ['on'] }
        });
        assert(written.includes('event: request_created'), 'request_created event not streamed');
    });

    it('cancels subscription on close', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = requestStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/requests/stream';
        let written = '';
        const response = {
            writeHead() {},
            write(data) { written += data; },
            end() {}
        };
        routes[0].handle(request, response);
        request.emit('close');
        plant.requests.notify({
            type: 'created',
            request: { id: 'req-1', name: 'unknown', startTime: new Date(), endTime: new Date(), duration: 1800, options: ['on'] }
        });
        assert(!written.includes('event: request_created'), 'event emitted after close');
    });

    it('closes stream for unknown machine', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = requestStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/unknown/requests/stream';
        let ended = false;
        const response = {
            writeHead() {},
            write() {},
            end() { ended = true; }
        };
        routes[0].handle(request, response);
        assert(ended === true, 'stream was not closed for unknown machine');
    });
});
