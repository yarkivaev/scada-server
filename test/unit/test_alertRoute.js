import assert from 'assert';
import alertRoute from '../../src/server/alertRoute.js';
import fakePlant from './helpers/fakePlant.js';
import { EventEmitter } from 'events';

describe('alertRoute', function() {
    it('returns array of routes', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = alertRoute('/api', plant);
        assert(Array.isArray(routes) && routes.length === 2);
    });

    it('matches GET /machines/:machineId/alerts', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = alertRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1/alerts' };
        assert(routes[0].matches(request) === true);
    });

    it('matches PATCH /machines/:machineId/alerts/:alertId', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = alertRoute('/api', plant);
        const request = { method: 'PATCH', url: '/api/machines/icht1/alerts/alert-1' };
        assert(routes[1].matches(request) === true);
    });

    it('returns alerts with pagination', function() {
        const plant = fakePlant({ machineId: 'icht1', alerts: [{ id: 'a1', message: 'test', timestamp: new Date(), object: 'icht1', acknowledged: false }] });
        let body;
        const routes = alertRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1/alerts' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        routes[0].handle(request, response);
        const parsed = JSON.parse(body);
        assert(parsed.page !== undefined && parsed.size !== undefined && parsed.total !== undefined);
    });

    it('returns alerts items', function() {
        const plant = fakePlant({ machineId: 'icht1', alerts: [{ id: 'a1', message: 'test', timestamp: new Date(), object: 'icht1', acknowledged: false }] });
        let body;
        const routes = alertRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1/alerts' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        routes[0].handle(request, response);
        assert(JSON.parse(body).items.length === 1);
    });

    it('filters by acknowledged true', function() {
        const plant = fakePlant({ machineId: 'icht1', alerts: [
            { id: 'a1', message: 'test1', timestamp: new Date(), object: 'icht1', acknowledged: false },
            { id: 'a2', message: 'test2', timestamp: new Date(), object: 'icht1', acknowledged: true }
        ] });
        let body;
        const routes = alertRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1/alerts?acknowledged=true' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        routes[0].handle(request, response);
        assert(JSON.parse(body).items.length === 1 && JSON.parse(body).items[0].acknowledged === true);
    });

    it('filters by acknowledged false', function() {
        const plant = fakePlant({ machineId: 'icht1', alerts: [
            { id: 'a1', message: 'test1', timestamp: new Date(), object: 'icht1', acknowledged: false },
            { id: 'a2', message: 'test2', timestamp: new Date(), object: 'icht1', acknowledged: true }
        ] });
        let body;
        const routes = alertRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1/alerts?acknowledged=false' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        routes[0].handle(request, response);
        assert(JSON.parse(body).items.length === 1 && JSON.parse(body).items[0].acknowledged === false);
    });

    it('acknowledges alert on PATCH', function(done) {
        let acknowledged = false;
        const alert = { id: 'alert-1', message: 'test', timestamp: new Date(), object: 'icht1', acknowledged: false, acknowledge: () => { acknowledged = true; } };
        const plant = fakePlant({ machineId: 'icht1', alerts: [alert] });
        const routes = alertRoute('/api', plant);
        const request = new EventEmitter();
        request.method = 'PATCH';
        request.url = '/api/machines/icht1/alerts/alert-1';
        const response = {
            writeHead() {},
            end() {
                assert(acknowledged === true);
                done();
            }
        };
        routes[1].handle(request, response);
        request.emit('data', JSON.stringify({ acknowledged: true }));
        request.emit('end');
    });

    it('returns 404 when updating unknown alert', function(done) {
        let statusCode;
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = alertRoute('/api', plant);
        const request = new EventEmitter();
        request.method = 'PATCH';
        request.url = '/api/machines/icht1/alerts/unknown';
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end() {
                assert(statusCode === 404);
                done();
            }
        };
        routes[1].handle(request, response);
        request.emit('data', JSON.stringify({ acknowledged: true }));
        request.emit('end');
    });

    it('returns empty alerts for unknown machine', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let body;
        const routes = alertRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/unknown/alerts' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        routes[0].handle(request, response);
        const parsed = JSON.parse(body);
        assert(parsed.items.length === 0 && parsed.total === 0, 'should return empty alerts');
    });
});
