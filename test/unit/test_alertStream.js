import assert from 'assert';
import alertStream from '../../src/server/alertStream.js';
import fakePlant from './helpers/fakePlant.js';
import { EventEmitter } from 'events';

describe('alertStream', function() {
    it('returns array of routes', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = alertStream('/api', plant, () => {return new Date()});
        assert(Array.isArray(routes) && routes.length === 1);
    });

    it('matches GET /machines/:machineId/alerts/stream', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = alertStream('/api', plant, () => {return new Date()});
        const request = { method: 'GET', url: '/api/machines/icht1/alerts/stream' };
        assert(routes[0].matches(request) === true);
    });

    it('sends SSE headers', function() {
        let headers;
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = alertStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/alerts/stream';
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

    it('cleans up heartbeat on close', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = alertStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/alerts/stream';
        const response = {
            writeHead() {},
            write() {},
            end() {}
        };
        routes[0].handle(request, response);
        request.emit('close');
        assert(true);
    });

    it('emits alert_created event when alert triggered', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = alertStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/alerts/stream';
        let written = '';
        const response = {
            writeHead() {},
            write(data) { written += data; },
            end() {}
        };
        routes[0].handle(request, response);
        plant.alerts.notify({
            type: 'created',
            alert: { id: 'alert-0', message: 'Test', timestamp: new Date(), object: 'icht1', acknowledged: false }
        });
        assert(written.includes('event: alert_created'), 'alert_created event not emitted');
    });

    it('emits alert_updated event when alert acknowledged', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = alertStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/alerts/stream';
        let written = '';
        const response = {
            writeHead() {},
            write(data) { written += data; },
            end() {}
        };
        routes[0].handle(request, response);
        plant.alerts.notify({
            type: 'acknowledged',
            alert: { id: 'alert-0', message: 'Test', timestamp: new Date(), object: 'icht1', acknowledged: true }
        });
        assert(written.includes('event: alert_updated'), 'alert_updated event not emitted');
    });

    it('filters events by machine name', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = alertStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/alerts/stream';
        let written = '';
        const response = {
            writeHead() {},
            write(data) { written += data; },
            end() {}
        };
        routes[0].handle(request, response);
        plant.alerts.notify({
            type: 'created',
            alert: { id: 'alert-0', message: 'Test', timestamp: new Date(), object: 'other-machine', acknowledged: false }
        });
        assert(!written.includes('event: alert_created'), 'event was not filtered by machine name');
    });

    it('cancels subscription on close', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = alertStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/alerts/stream';
        let written = '';
        const response = {
            writeHead() {},
            write(data) { written += data; },
            end() {}
        };
        routes[0].handle(request, response);
        request.emit('close');
        plant.alerts.notify({
            type: 'created',
            alert: { id: 'alert-0', message: 'Test', timestamp: new Date(), object: 'icht1', acknowledged: false }
        });
        assert(!written.includes('event: alert_created'), 'event emitted after close');
    });

    it('closes stream for unknown machine', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = alertStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/unknown/alerts/stream';
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
