import assert from 'assert';
import segmentRoute from '../../src/server/segmentRoute.js';
import fakePlant from './helpers/fakePlant.js';

describe('segmentRoute', function() {
    it('returns array of routes', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = segmentRoute('/api', plant);
        assert(Array.isArray(routes) && routes.length === 2);
    });

    it('matches GET /machines/:machineId/segments', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = segmentRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1/segments' };
        assert(routes[0].matches(request) === true);
    });

    it('returns segments for known machine', async function() {
        const plant = fakePlant({
            machineId: 'icht1',
            segments: [
                { name: 'on', start_time: new Date('2026-01-01T08:00:00Z'), end_time: new Date('2026-01-01T09:00:00Z'), duration: 3600 }
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
        await routes[0].handle(request, response);
        const parsed = JSON.parse(body);
        assert(parsed.items.length === 1, 'should return one segment');
        assert(parsed.items[0].name === 'on', 'should return segment name');
    });

    it('returns ISO timestamps', async function() {
        const start = new Date('2026-01-01T08:00:00Z');
        const end = new Date('2026-01-01T09:00:00Z');
        const plant = fakePlant({
            machineId: 'icht1',
            segments: [
                { name: 'heating', start_time: start, end_time: end, duration: 3600 }
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
        await routes[0].handle(request, response);
        const parsed = JSON.parse(body);
        assert(parsed.items[0].start === start.toISOString(), 'should return ISO start');
        assert(parsed.items[0].end === end.toISOString(), 'should return ISO end');
    });

    it('returns empty for unknown machine', async function() {
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
        await routes[0].handle(request, response);
        const parsed = JSON.parse(body);
        assert(parsed.items.length === 0, 'should return empty items');
    });

    it('substitutes end with current time for ongoing segment', async function() {
        const start = new Date('2026-01-01T08:00:00Z');
        const plant = fakePlant({
            machineId: 'icht1',
            segments: [
                { name: 'off', start_time: start, end_time: start, duration: 0 }
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
        const before = Date.now();
        await routes[0].handle(request, response);
        const parsed = JSON.parse(body);
        const end = new Date(parsed.items[0].end).getTime();
        assert(end >= before, 'ongoing segment end should be at or after request time');
    });

    it('includes options when present', async function() {
        const plant = fakePlant({
            machineId: 'icht1',
            segments: [
                { name: 'on', start_time: new Date(), end_time: new Date(), duration: 60, options: { power: 100 } }
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
        await routes[0].handle(request, response);
        const parsed = JSON.parse(body);
        assert(parsed.items[0].options.power === 100, 'should include options');
    });

    it('includes tags when present', async function() {
        const tags = `["tàg-${Math.random()}"]`;
        const plant = fakePlant({
            machineId: 'icht1',
            segments: [
                { name: 'off', start_time: new Date(), end_time: new Date(), duration: 60, tags }
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
        await routes[0].handle(request, response);
        const parsed = JSON.parse(body);
        assert(parsed.items[0].tags === tags, 'should include tags');
    });

    it('matches PATCH /machines/:machineId/segments', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = segmentRoute('/api', plant);
        const request = { method: 'PATCH', url: '/api/machines/icht1/segments' };
        assert(routes[1].matches(request) === true, 'PATCH route did not match');
    });

    it('retags segment via PATCH', async function() {
        const start = new Date('2026-03-15T10:00:00Z');
        const plant = fakePlant({
            machineId: `m-${Math.random()}`,
            segments: [
                { name: 'off', start_time: start, end_time: new Date(), duration: 60, tags: '[]', options: '["a","b"]' }
            ]
        });
        let body;
        const routes = segmentRoute('/api', plant);
        const payload = JSON.stringify({ start: start.toISOString(), tags: [`tàg-${Math.random()}`], properties: {} });
        const chunks = [payload];
        const listeners = {};
        const request = {
            method: 'PATCH',
            url: `/api/machines/${plant.machine.name()}/segments`,
            on(event, cb) {
                listeners[event] = cb;
                if (event === 'data') { chunks.forEach((chunk) => { cb(chunk); }); }
                if (event === 'end') { setTimeout(cb, 0); }
            }
        };
        const response = {
            writeHead() {},
            end(content) { body = content; }
        };
        await new Promise((resolve) => {
            const origEnd = response.end;
            response.end = (content) => { origEnd(content); resolve(); };
            routes[1].handle(request, response);
        });
        const parsed = JSON.parse(body);
        assert(parsed.status === 'updated', 'PATCH did not return updated status');
    });

    it('includes properties when present', async function() {
        const properties = `{"weight":${Math.floor(Math.random() * 1000)}}`;
        const plant = fakePlant({
            machineId: 'icht1',
            segments: [
                { name: 'off', start_time: new Date(), end_time: new Date(), duration: 60, tags: '["charge_loading"]', properties }
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
        await routes[0].handle(request, response);
        const parsed = JSON.parse(body);
        assert(parsed.items[0].properties === properties, 'should include properties');
    });
});
