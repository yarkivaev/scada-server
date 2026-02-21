import assert from 'assert';
import segmentRoute from '../../src/server/segmentRoute.js';
import fakePlant from './helpers/fakePlant.js';

describe('segmentRoute', function() {
    it('returns array of routes', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = segmentRoute('/api', plant);
        assert(Array.isArray(routes) && routes.length === 1);
    });

    it('matches GET /machines/:machineId/segments', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = segmentRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1/segments' };
        assert(routes[0].matches(request) === true);
    });

    it('returns segments for known machine', function() {
        const plant = fakePlant({
            machineId: 'icht1',
            segments: [
                { machine: 'icht1', name: 'on', start_time: new Date('2026-01-01T08:00:00Z'), end_time: new Date('2026-01-01T09:00:00Z'), duration: 3600 }
            ]
        });
        let body;
        const routes = segmentRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1/segments' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        routes[0].handle(request, response);
        const parsed = JSON.parse(body);
        assert(parsed.items.length === 1, 'should return one segment');
        assert(parsed.items[0].name === 'on', 'should return segment name');
    });

    it('returns ISO timestamps', function() {
        const start = new Date('2026-01-01T08:00:00Z');
        const end = new Date('2026-01-01T09:00:00Z');
        const plant = fakePlant({
            machineId: 'icht1',
            segments: [
                { machine: 'icht1', name: 'heating', start_time: start, end_time: end, duration: 3600 }
            ]
        });
        let body;
        const routes = segmentRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1/segments' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        routes[0].handle(request, response);
        const parsed = JSON.parse(body);
        assert(parsed.items[0].start === start.toISOString(), 'should return ISO start');
        assert(parsed.items[0].end === end.toISOString(), 'should return ISO end');
    });

    it('returns empty for unknown machine', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let body;
        const routes = segmentRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/unknown/segments' };
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

    it('includes options when present', function() {
        const plant = fakePlant({
            machineId: 'icht1',
            segments: [
                { machine: 'icht1', name: 'on', start_time: new Date(), end_time: new Date(), duration: 60, options: { power: 100 } }
            ]
        });
        let body;
        const routes = segmentRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1/segments' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        routes[0].handle(request, response);
        const parsed = JSON.parse(body);
        assert(parsed.items[0].options.power === 100, 'should include options');
    });
});
