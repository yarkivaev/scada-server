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

    it('emits segment_resolved event', function() {
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
            type: 'resolved',
            segment: { name: 'heating', startTime: new Date(), endTime: new Date(), duration: 3600 }
        });
        assert(written.includes('event: segment_resolved'), 'segment_resolved event not emitted');
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

    it('includes options in segment_created payload when present', function() {
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
        const optionKey = `ключ_${Math.random()}`;
        const optionValue = `значение_${Math.random()}`;
        plant.segments.notify({
            type: 'created',
            segment: { name: 'on', startTime: new Date(), endTime: new Date(), duration: 3600, options: { [optionKey]: optionValue } }
        });
        assert(written.includes(optionKey), 'options not included in segment_created payload');
    });

    it('includes tags in segment_created payload when present', function() {
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
        const tag = `тег_${Math.random()}`;
        plant.segments.notify({
            type: 'created',
            segment: { name: 'off', startTime: new Date(), endTime: new Date(), duration: 3600, tags: [tag] }
        });
        assert(written.includes(tag), 'tags not included in segment_created payload');
    });

    it('includes properties in segment_created payload when present', function() {
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
        const key = `свойство_${Math.random()}`;
        plant.segments.notify({
            type: 'created',
            segment: { name: 'off', startTime: new Date(), endTime: new Date(), duration: 3600, tags: ['charge_loading'], properties: { [key]: 42 } }
        });
        assert(written.includes(key), 'properties not included in segment_created payload');
    });

    it('omits options from segment_created payload when absent', function() {
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
        assert(!written.includes('options'), 'options present in payload when absent on segment');
    });

    it('includes options in segment_resolved payload when present', function() {
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
        const optionKey = `опция_${Math.random()}`;
        plant.segments.notify({
            type: 'resolved',
            segment: { name: 'heating', startTime: new Date(), endTime: new Date(), duration: 3600, options: { [optionKey]: true }, tags: ['heating'] }
        });
        assert(written.includes(optionKey), 'options not included in segment_resolved payload');
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
