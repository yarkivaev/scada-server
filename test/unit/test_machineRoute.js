import assert from 'assert';
import machineRoute from '../../src/server/machineRoute.js';
import fakePlant from './helpers/fakePlant.js';

describe('machineRoute', function() {
    it('returns array of routes', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = machineRoute('/api', plant);
        assert(Array.isArray(routes) && routes.length === 6, 'routes array should have 6 routes');
    });

    it('matches GET /machines', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = machineRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines' };
        assert(routes[0].matches(request) === true);
    });

    it('matches GET /machines/:machineId', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = machineRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1' };
        assert(routes[1].matches(request) === true);
    });

    it('returns all machines', function() {
        const machineId = `m${Math.random()}`;
        const plant = fakePlant({ machineId });
        let body;
        const routes = machineRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        routes[0].handle(request, response);
        assert(JSON.parse(body).items[0].id === machineId);
    });

    it('returns machine by id', function() {
        const machineId = `m${Math.random()}`;
        const plant = fakePlant({ machineId });
        let body;
        const routes = machineRoute('/api', plant);
        const request = { method: 'GET', url: `/api/machines/${machineId}` };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        routes[1].handle(request, response);
        assert(JSON.parse(body).id === machineId);
    });

    it('returns 404 for unknown machine', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let statusCode;
        const routes = machineRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/unknown' };
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end() {}
        };
        routes[1].handle(request, response);
        assert(statusCode === 404);
    });

    it('returns NOT_FOUND error code for unknown machine', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let body;
        const routes = machineRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/unknown' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        routes[1].handle(request, response);
        assert(JSON.parse(body).error.code === 'NOT_FOUND');
    });

    it('matches GET /machines/:machineId/weight', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = machineRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1/weight' };
        assert(routes[2].matches(request) === true);
    });

    it('returns machine weight', function() {
        const plant = fakePlant({ machineId: 'icht1', weight: 150 });
        let body;
        const routes = machineRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/icht1/weight' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        routes[2].handle(request, response);
        assert(JSON.parse(body).amount === 150, 'should return weight amount');
    });

    it('returns 404 for weight of unknown machine', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let statusCode;
        const routes = machineRoute('/api', plant);
        const request = { method: 'GET', url: '/api/machines/unknown/weight' };
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end() {}
        };
        routes[2].handle(request, response);
        assert(statusCode === 404);
    });

    it('matches PUT /machines/:machineId/weight', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = machineRoute('/api', plant);
        const request = { method: 'PUT', url: '/api/machines/icht1/weight' };
        assert(routes[3].matches(request) === true);
    });

    it('updates machine weight', function(done) {
        const plant = fakePlant({ machineId: 'icht1', weight: 100 });
        let body;
        const routes = machineRoute('/api', plant);
        const handlers = {};
        const request = {
            method: 'PUT',
            url: '/api/machines/icht1/weight',
            on(event, handler) {
                handlers[event] = handler;
            }
        };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
                assert(JSON.parse(body).amount === 200, 'should return new weight');
                done();
            }
        };
        routes[3].handle(request, response);
        handlers.data(JSON.stringify({ amount: 200 }));
        handlers.end();
    });

    it('returns 404 for weight update of unknown machine', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let statusCode;
        const routes = machineRoute('/api', plant);
        const request = { method: 'PUT', url: '/api/machines/unknown/weight' };
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end() {}
        };
        routes[3].handle(request, response);
        assert(statusCode === 404);
    });

    it('matches POST /machines/:machineId/load', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = machineRoute('/api', plant);
        const request = { method: 'POST', url: '/api/machines/icht1/load' };
        assert(routes[4].matches(request) === true);
    });

    it('loads material into machine', function(done) {
        const plant = fakePlant({ machineId: 'icht1', weight: 100 });
        let body;
        const routes = machineRoute('/api', plant);
        const handlers = {};
        const request = {
            method: 'POST',
            url: '/api/machines/icht1/load',
            on(event, handler) {
                handlers[event] = handler;
            }
        };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
                assert(JSON.parse(body).amount === 50, 'should return loaded amount');
                done();
            }
        };
        routes[4].handle(request, response);
        handlers.data(JSON.stringify({ amount: 50 }));
        handlers.end();
    });

    it('returns 404 for load on unknown machine', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let statusCode;
        const routes = machineRoute('/api', plant);
        const request = { method: 'POST', url: '/api/machines/unknown/load' };
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end() {}
        };
        routes[4].handle(request, response);
        assert(statusCode === 404);
    });

    it('matches POST /machines/:machineId/dispense', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = machineRoute('/api', plant);
        const request = { method: 'POST', url: '/api/machines/icht1/dispense' };
        assert(routes[5].matches(request) === true);
    });

    it('dispenses material from machine', function(done) {
        const plant = fakePlant({ machineId: 'icht1', weight: 100 });
        let body;
        const routes = machineRoute('/api', plant);
        const handlers = {};
        const request = {
            method: 'POST',
            url: '/api/machines/icht1/dispense',
            on(event, handler) {
                handlers[event] = handler;
            }
        };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
                assert(JSON.parse(body).amount === 30, 'should return dispensed amount');
                done();
            }
        };
        routes[5].handle(request, response);
        handlers.data(JSON.stringify({ amount: 30 }));
        handlers.end();
    });

    it('returns 404 for dispense on unknown machine', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let statusCode;
        const routes = machineRoute('/api', plant);
        const request = { method: 'POST', url: '/api/machines/unknown/dispense' };
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end() {}
        };
        routes[5].handle(request, response);
        assert(statusCode === 404);
    });
});
