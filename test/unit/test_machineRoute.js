import assert from 'assert';
import machineRoute from '../../src/server/machineRoute.js';
import fakePlant from './helpers/fakePlant.js';

describe('machineRoute', function() {
    it('returns array of routes', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = machineRoute('/api', plant);
        assert(Array.isArray(routes) && routes.length === 2);
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
});
