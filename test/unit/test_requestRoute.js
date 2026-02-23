import assert from 'assert';
import requestRoute from '../../src/server/requestRoute.js';
import fakePlant from './helpers/fakePlant.js';
import { EventEmitter } from 'events';

describe('requestRoute', function() {
    it('returns array of routes', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = requestRoute('/api', plant);
        assert(Array.isArray(routes) && routes.length === 2);
    });

    it('matches GET /machines/:machineId/requests', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = requestRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1/requests' };
        assert(routes[0].matches(request) === true);
    });

    it('returns pending requests for known machine', async function() {
        const plant = fakePlant({
            machineId: 'icht1',
            requests: [
                { id: 'req-1', name: 'unknown', startTime: new Date('2026-01-01T10:00:00Z'), endTime: new Date('2026-01-01T10:30:00Z'), duration: 1800, options: ['on', 'off'], resolved: false }
            ]
        });
        let body;
        const routes = requestRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1/requests' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        await routes[0].handle(request, response);
        const parsed = JSON.parse(body);
        assert(parsed.items.length === 1, 'should return one request');
        assert(parsed.items[0].id === 'req-1', 'should return request id');
    });

    it('returns empty for unknown machine', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let body;
        const routes = requestRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/unknown/requests' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        routes[0].handle(request, response);
        const parsed = JSON.parse(body);
        assert(parsed.items.length === 0, 'should return empty items');
    });

    it('responds to request with label', function(done) {
        const plant = fakePlant({
            machineId: 'icht1',
            requests: [
                { id: 'req-1', name: 'unknown', startTime: new Date(), endTime: new Date(), duration: 1800, options: ['on', 'off'], resolved: false }
            ]
        });
        const routes = requestRoute('/api', plant);
        const request = new EventEmitter();
        request.method = 'POST';
        request.url = '/api/machines/icht1/requests/req-1/respond';
        const response = {
            writeHead() {},
            end(content) {
                const parsed = JSON.parse(content);
                assert(parsed.id === 'req-1', 'should return request id');
                assert(parsed.status === 'resolved', 'should return resolved status');
                done();
            }
        };
        routes[1].handle(request, response);
        request.emit('data', JSON.stringify({ label: 'heating' }));
        request.emit('end');
    });

    it('responds to request with splits', function(done) {
        const plant = fakePlant({
            machineId: 'icht1',
            requests: [
                { id: 'req-2', name: 'unknown', startTime: new Date(), endTime: new Date(), duration: 1800, options: ['on', 'off'], resolved: false }
            ]
        });
        const routes = requestRoute('/api', plant);
        const request = new EventEmitter();
        request.method = 'POST';
        request.url = '/api/machines/icht1/requests/req-2/respond';
        const response = {
            writeHead() {},
            end(content) {
                const parsed = JSON.parse(content);
                assert(parsed.status === 'resolved', 'should return resolved status');
                done();
            }
        };
        routes[1].handle(request, response);
        request.emit('data', JSON.stringify({ splits: [{ start: 0, end: 900, label: 'on' }, { start: 900, end: 1800, label: 'off' }] }));
        request.emit('end');
    });

    it('returns 404 for unknown request', function(done) {
        let statusCode;
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = requestRoute('/api', plant);
        const request = new EventEmitter();
        request.method = 'POST';
        request.url = '/api/machines/icht1/requests/unknown/respond';
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end() {
                assert(statusCode === 404, 'should return 404');
                done();
            }
        };
        routes[1].handle(request, response);
        request.emit('data', JSON.stringify({ label: 'on' }));
        request.emit('end');
    });

    it('maps request to segment format', async function() {
        const start = new Date('2026-01-01T10:00:00Z');
        const end = new Date('2026-01-01T10:30:00Z');
        const plant = fakePlant({
            machineId: 'icht1',
            requests: [
                { id: 'req-1', machine: 'icht1', name: 'unknown', startTime: start, endTime: end, duration: 1800, options: ['on', 'off'], resolved: false }
            ]
        });
        let body;
        const routes = requestRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1/requests' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        await routes[0].handle(request, response);
        const parsed = JSON.parse(body);
        assert(parsed.items[0].segment.start === start.toISOString(), 'should have ISO start in segment');
        assert(parsed.items[0].segment.end === end.toISOString(), 'should have ISO end in segment');
    });
});
