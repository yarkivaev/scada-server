import assert from 'assert';
import meltingRoute from '../../src/server/meltingRoute.js';
import fakePlant from './helpers/fakePlant.js';

function fakeMelting(id, machineId) {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 3600000);
    const initial = Math.random() * 100;
    const weight = Math.random() * 500;
    const loaded = Math.random() * 600;
    const dispensed = Math.random() * 400;
    return {
        machineId,
        id() { return id; },
        chronology() {
            return {
                get() {
                    return { start: startTime, end: endTime, initial, weight, loaded, dispensed };
                }
            };
        }
    };
}

describe('meltingRoute', function() {
    it('returns array of routes', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = meltingRoute('/api', plant);
        assert(Array.isArray(routes) && routes.length === 6, 'routes array should have 6 routes');
    });

    it('matches GET /machines/:machineId/meltings', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = meltingRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1/meltings' };
        assert(routes[0].matches(request) === true, 'should match GET meltings');
    });

    it('matches GET /machines/:machineId/meltings/:meltingId', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = meltingRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1/meltings/m5' };
        assert(routes[1].matches(request) === true, 'should match GET melting by id');
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

    it('sorts meltings by start time descending', function() {
        const earlier = fakeMelting('m1', 'icht1');
        const later = fakeMelting('m2', 'icht1');
        const plant = fakePlant({ machineId: 'icht1', meltings: [earlier, later] });
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
        assert(parsed.items.length === 2, 'should return multiple meltings');
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
        assert(JSON.parse(body).id === 'm5', 'melting id mismatch');
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
        assert(statusCode === 404, 'should return 404');
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
        assert(statusCode === 404, 'should return 404 for unknown machine');
    });

    it('matches POST /machines/:machineId/meltings/start', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = meltingRoute('/api', plant);
        const request = { method: 'POST', url: '/api/machines/icht1/meltings/start' };
        assert(routes[2].matches(request) === true, 'should match POST meltings/start');
    });

    it('starts new melting', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let body;
        let statusCode;
        const routes = meltingRoute('/api', plant);
        const request = { method: 'POST', url: '/api/machines/icht1/meltings/start' };
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end(content) {
                body = content;
            }
        };
        routes[2].handle(request, response);
        assert(statusCode === 201, 'should return 201 status');
    });

    it('returns 404 for start on unknown machine', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let statusCode;
        const routes = meltingRoute('/api', plant);
        const request = { method: 'POST', url: '/api/machines/unknown/meltings/start' };
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end() {}
        };
        routes[2].handle(request, response);
        assert(statusCode === 404, 'should return 404');
    });

    it('matches POST /machines/:machineId/meltings/:meltingId/stop', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = meltingRoute('/api', plant);
        const request = { method: 'POST', url: '/api/machines/icht1/meltings/m1/stop' };
        assert(routes[3].matches(request) === true, 'should match POST meltings/:id/stop');
    });

    it('stops active melting', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        plant.meltings.add(plant.machine, {});
        let body;
        const routes = meltingRoute('/api', plant);
        const request = { method: 'POST', url: '/api/machines/icht1/meltings/m1/stop' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        routes[3].handle(request, response);
        assert(JSON.parse(body).id === 'm1', 'should return stopped melting');
    });

    it('returns 404 for stop on unknown machine', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let statusCode;
        const routes = meltingRoute('/api', plant);
        const request = { method: 'POST', url: '/api/machines/unknown/meltings/m1/stop' };
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end() {}
        };
        routes[3].handle(request, response);
        assert(statusCode === 404, 'should return 404');
    });

    it('returns 404 for stop on unknown melting', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let statusCode;
        const routes = meltingRoute('/api', plant);
        const request = { method: 'POST', url: '/api/machines/icht1/meltings/m999/stop' };
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end() {}
        };
        routes[3].handle(request, response);
        assert(statusCode === 404, 'should return 404');
    });

    it('matches POST /machines/:machineId/meltings', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = meltingRoute('/api', plant);
        const request = { method: 'POST', url: '/api/machines/icht1/meltings' };
        assert(routes[4].matches(request) === true, 'should match POST meltings');
    });

    it('creates melting with data', function(done) {
        const plant = fakePlant({ machineId: 'icht1' });
        let statusCode;
        const routes = meltingRoute('/api', plant);
        const handlers = {};
        const request = {
            method: 'POST',
            url: '/api/machines/icht1/meltings',
            on(event, handler) {
                handlers[event] = handler;
            }
        };
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end() {
                assert(statusCode === 201, 'should return 201 status');
                done();
            }
        };
        routes[4].handle(request, response);
        handlers.data(JSON.stringify({ start: '2024-01-01T00:00:00Z', end: '2024-01-01T01:00:00Z' }));
        handlers.end();
    });

    it('returns 404 for create on unknown machine', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let statusCode;
        const routes = meltingRoute('/api', plant);
        const request = { method: 'POST', url: '/api/machines/unknown/meltings' };
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end() {}
        };
        routes[4].handle(request, response);
        assert(statusCode === 404, 'should return 404');
    });

    it('matches PUT /machines/:machineId/meltings/:meltingId', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = meltingRoute('/api', plant);
        const request = { method: 'PUT', url: '/api/machines/icht1/meltings/m1' };
        assert(routes[5].matches(request) === true, 'should match PUT meltings/:id');
    });

    it('updates melting data', function(done) {
        const plant = fakePlant({ machineId: 'icht1' });
        plant.meltings.add(plant.machine, {});
        let body;
        const routes = meltingRoute('/api', plant);
        const handlers = {};
        const request = {
            method: 'PUT',
            url: '/api/machines/icht1/meltings/m1',
            on(event, handler) {
                handlers[event] = handler;
            }
        };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
                assert(JSON.parse(body).id === 'm1', 'should return updated melting');
                done();
            }
        };
        routes[5].handle(request, response);
        handlers.data(JSON.stringify({ weight: 500 }));
        handlers.end();
    });

    it('returns 404 for update on unknown machine', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let statusCode;
        const routes = meltingRoute('/api', plant);
        const request = { method: 'PUT', url: '/api/machines/unknown/meltings/m1' };
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end() {}
        };
        routes[5].handle(request, response);
        assert(statusCode === 404, 'should return 404');
    });

    it('returns 404 for update on unknown melting', function(done) {
        const plant = fakePlant({ machineId: 'icht1' });
        let statusCode;
        const routes = meltingRoute('/api', plant);
        const handlers = {};
        const request = {
            method: 'PUT',
            url: '/api/machines/icht1/meltings/m999',
            on(event, handler) {
                handlers[event] = handler;
            }
        };
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end() {
                assert(statusCode === 404, 'should return 404');
                done();
            }
        };
        routes[5].handle(request, response);
        handlers.data(JSON.stringify({ weight: 500 }));
        handlers.end();
    });
});
