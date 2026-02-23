import assert from 'assert';
import segmentStream from '../../src/server/segmentStream.js';
import fakePlant from './helpers/fakePlant.js';
import { EventEmitter } from 'events';

describe('segmentStream', function() {
    it('returns array of routes', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = segmentStream('/api', plant, () => {return new Date()});
        assert(Array.isArray(routes) && routes.length === 1);
    });

    it('matches GET /machines/:machineId/segments/stream', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = segmentStream('/api', plant, () => {return new Date()});
        const request = { method: 'GET', url: '/api/machines/icht1/segments/stream' };
        assert(routes[0].matches(request) === true);
    });

    it('sends SSE headers', function() {
        let headers;
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = segmentStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/segments/stream';
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

    it('emits segment_created event', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = segmentStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/segments/stream';
        let written = '';
        const response = {
            writeHead() {},
            write(data) { written += data; },
            end() {}
        };
        routes[0].handle(request, response);
        plant.segments.notify({
            type: 'created',
            segment: { name: 'on', startTime: new Date(), endTime: new Date(), duration: 3600 }
        });
        assert(written.includes('event: segment_created'), 'segment_created event not emitted');
    });

    it('emits segment_relabeled event', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = segmentStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/segments/stream';
        let written = '';
        const response = {
            writeHead() {},
            write(data) { written += data; },
            end() {}
        };
        routes[0].handle(request, response);
        plant.segments.notify({
            type: 'relabeled',
            segment: { name: 'heating', startTime: new Date(), endTime: new Date(), duration: 3600 }
        });
        assert(written.includes('event: segment_relabeled'), 'segment_relabeled event not emitted');
    });

    it('streams all events from machine segments collection', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = segmentStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/segments/stream';
        let written = '';
        const response = {
            writeHead() {},
            write(data) { written += data; },
            end() {}
        };
        routes[0].handle(request, response);
        plant.segments.notify({
            type: 'created',
            segment: { name: `on-${Math.random()}`, startTime: new Date(), endTime: new Date(), duration: 3600 }
        });
        assert(written.includes('event: segment_created'), 'segment_created event not streamed');
    });

    it('cancels subscription on close', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = segmentStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/segments/stream';
        let written = '';
        const response = {
            writeHead() {},
            write(data) { written += data; },
            end() {}
        };
        routes[0].handle(request, response);
        request.emit('close');
        plant.segments.notify({
            type: 'created',
            segment: { name: 'on', startTime: new Date(), endTime: new Date(), duration: 3600 }
        });
        assert(!written.includes('event: segment_created'), 'event emitted after close');
    });

    it('closes stream for unknown machine', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = segmentStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/unknown/segments/stream';
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
