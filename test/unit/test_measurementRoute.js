import assert from 'assert';
import measurementRoute from '../../src/server/measurementRoute.js';
import fakePlant from './helpers/fakePlant.js';

describe('measurementRoute', function() {
    it('returns array of routes', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = measurementRoute('/api', plant, () => {return new Date()});
        assert(Array.isArray(routes) && routes.length === 1);
    });

    it('matches GET /machines/:machineId/measurements', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = measurementRoute('/api', plant, () => {return new Date()});
        const request = { method: 'GET', url: '/api/machines/icht1/measurements' };
        assert(routes[0].matches(request) === true);
    });

    it('returns measurements', async function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let body;
        const routes = measurementRoute('/api', plant, () => {return new Date()});
        const request = { method: 'GET', url: '/api/machines/icht1/measurements?step=1' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        await routes[0].handle(request, response);
        assert(JSON.parse(body).items.find((i) => {return i.key === 'voltage'}) !== undefined);
    });

    it('passes keys from query', async function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let body;
        const routes = measurementRoute('/api', plant, () => {return new Date()});
        const request = { method: 'GET', url: '/api/machines/icht1/measurements?keys=voltage&step=1' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        await routes[0].handle(request, response);
        const parsed = JSON.parse(body);
        assert(parsed.items.find((i) => {return i.key === 'voltage'}) !== undefined && parsed.items.find((i) => {return i.key === 'cosphi'}) === undefined);
    });

    it('returns items for machine', async function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let body;
        const routes = measurementRoute('/api', plant, () => {return new Date()});
        const request = { method: 'GET', url: '/api/machines/icht1/measurements?step=1' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        await routes[0].handle(request, response);
        assert(JSON.parse(body).items !== undefined);
    });

    it('returns empty items for unknown machine', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        let body;
        const routes = measurementRoute('/api', plant, () => {return new Date()});
        const request = { method: 'GET', url: '/api/machines/unknown/measurements?step=1' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        routes[0].handle(request, response);
        assert(JSON.parse(body).items.length === 0);
    });
});
