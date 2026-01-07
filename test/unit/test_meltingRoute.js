import assert from 'assert';
import meltingRoute from '../../src/server/meltingRoute.js';
import fakePlant from './helpers/fakePlant.js';

function fakeMelting(id, machineId) {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 3600000);
    const loaded = Math.random() * 500;
    const dispensed = Math.random() * 400;
    return {
        machineId,
        id() { return id; },
        start() { return startTime; },
        end() { return endTime; },
        chronology() {
            return {
                get() {
                    return { loaded, dispensed };
                }
            };
        }
    };
}

describe('meltingRoute', function() {
    it('returns array of routes', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = meltingRoute('/api', plant);
        assert(Array.isArray(routes) && routes.length === 2);
    });

    it('matches GET /machines/:machineId/meltings', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = meltingRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1/meltings' };
        assert(routes[0].matches(request) === true);
    });

    it('matches GET /machines/:machineId/meltings/:meltingId', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = meltingRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1/meltings/m5' };
        assert(routes[1].matches(request) === true);
    });

    it('returns meltings data', function() {
        const plant = fakePlant({ machineId: 'icht1', meltings: [fakeMelting('m1', 'icht1')] });
        let body;
        const routes = meltingRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1/meltings' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        routes[0].handle(request, response);
        assert(JSON.parse(body).items.length === 1, 'items array not returned');
    });

    it('returns meltings with cursor info', function() {
        const plant = fakePlant({ machineId: 'icht1', meltings: [fakeMelting('m1', 'icht1')] });
        let body;
        const routes = meltingRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1/meltings' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        routes[0].handle(request, response);
        const parsed = JSON.parse(body);
        assert(parsed.hasMore !== undefined, 'hasMore not returned');
    });

    it('returns empty meltings for unknown machine', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let body;
        const routes = meltingRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/unknown/meltings' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        routes[0].handle(request, response);
        assert(JSON.parse(body).items.length === 0, 'items should be empty');
    });

    it('returns melting by id', function() {
        const plant = fakePlant({ machineId: 'icht1', meltings: [fakeMelting('m5', 'icht1')] });
        let body;
        const routes = meltingRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1/meltings/m5' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        routes[1].handle(request, response);
        assert(JSON.parse(body).id === 'm5');
    });

    it('returns 404 for unknown melting', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let statusCode;
        const routes = meltingRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1/meltings/m999' };
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end() {}
        };
        routes[1].handle(request, response);
        assert(statusCode === 404);
    });

    it('returns 404 for unknown machine on melting by id', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let statusCode;
        const routes = meltingRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/unknown/meltings/m1' };
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end() {}
        };
        routes[1].handle(request, response);
        assert(statusCode === 404);
    });
});
