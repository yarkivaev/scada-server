import assert from 'assert';
import simulationRoute from '../../src/server/simulationRoute.js';
import virtualClock from '../../src/objects/virtualClock.js';

describe('simulationRoute', function() {
    it('returns array of three routes', function() {
        const clock = virtualClock(() => {return new Date()});
        const routes = simulationRoute('/api', clock);
        assert(Array.isArray(routes) && routes.length === 3, 'should return 3 routes');
    });

    it('matches POST on simulation jump path', function() {
        const clock = virtualClock(() => {return new Date()});
        const routes = simulationRoute('/api', clock);
        const request = { method: 'POST', url: '/api/simulation/jump' };
        assert(routes[0].matches(request) === true, 'should match POST /api/simulation/jump');
    });

    it('matches DELETE on simulation path', function() {
        const clock = virtualClock(() => {return new Date()});
        const routes = simulationRoute('/api', clock);
        const request = { method: 'DELETE', url: '/api/simulation' };
        assert(routes[1].matches(request) === true, 'should match DELETE /api/simulation');
    });

    it('matches GET on simulation path', function() {
        const clock = virtualClock(() => {return new Date()});
        const routes = simulationRoute('/api', clock);
        const request = { method: 'GET', url: '/api/simulation' };
        assert(routes[2].matches(request) === true, 'should match GET /api/simulation');
    });

    it('does not match GET on simulation jump path', function() {
        const clock = virtualClock(() => {return new Date()});
        const routes = simulationRoute('/api', clock);
        const request = { method: 'GET', url: '/api/simulation/jump' };
        assert(routes[0].matches(request) === false, 'should not match GET on jump path');
    });

    it('jumps clock to specified timestamp', function(done) {
        const clock = virtualClock(() => {return new Date()});
        const routes = simulationRoute('/api', clock);
        const timestamp = new Date(Date.now() - Math.random() * 86400000 * 30).toISOString();
        const handlers = {};
        const request = {
            method: 'POST',
            url: '/api/simulation/jump',
            on(event, handler) {
                handlers[event] = handler;
            }
        };
        const response = {
            writeHead() {},
            end(content) {
                assert(typeof JSON.parse(content).timestamp === 'string', 'should return timestamp string');
                done();
            }
        };
        routes[0].handle(request, response);
        handlers.data(JSON.stringify({ timestamp }));
        handlers.end();
    });

    it('returns jumped timestamp in response', function(done) {
        const clock = virtualClock(() => {return new Date()});
        const routes = simulationRoute('/api', clock);
        const handlers = {};
        const request = {
            method: 'POST',
            url: '/api/simulation/jump',
            on(event, handler) {
                handlers[event] = handler;
            }
        };
        const response = {
            writeHead() {},
            end(content) {
                assert(JSON.parse(content).timestamp.startsWith('2025-06-15'), 'timestamp should start with jumped date');
                done();
            }
        };
        routes[0].handle(request, response);
        handlers.data(JSON.stringify({ timestamp: '2025-06-15T10:00:00Z' }));
        handlers.end();
    });

    it('returns 400 for invalid timestamp', function(done) {
        const clock = virtualClock(() => {return new Date()});
        const routes = simulationRoute('/api', clock);
        let statusCode;
        const handlers = {};
        const request = {
            method: 'POST',
            url: '/api/simulation/jump',
            on(event, handler) {
                handlers[event] = handler;
            }
        };
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end() {
                assert(statusCode === 400, 'should return 400 for invalid timestamp');
                done();
            }
        };
        routes[0].handle(request, response);
        handlers.data(JSON.stringify({ timestamp: 'not-a-date' }));
        handlers.end();
    });

    it('resets clock offset on DELETE', function() {
        const clock = virtualClock(() => {return new Date()});
        clock.jump(new Date(Date.now() - 86400000));
        const routes = simulationRoute('/api', clock);
        let body;
        const request = { method: 'DELETE', url: '/api/simulation' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        routes[1].handle(request, response);
        assert(JSON.parse(body).offset === 0, 'offset should be zero after reset');
    });

    it('returns current virtual time on GET', function() {
        const clock = virtualClock(() => {return new Date()});
        const routes = simulationRoute('/api', clock);
        let body;
        const request = { method: 'GET', url: '/api/simulation' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        routes[2].handle(request, response);
        assert(!isNaN(Date.parse(JSON.parse(body).timestamp)), 'should return valid ISO timestamp');
    });

    it('returns offset in GET response', function(done) {
        const clock = virtualClock(() => {return new Date()});
        const routes = simulationRoute('/api', clock);
        const target = new Date(Date.now() - Math.random() * 86400000 * 30).toISOString();
        const handlers = {};
        const jumpRequest = {
            method: 'POST',
            url: '/api/simulation/jump',
            on(event, handler) {
                handlers[event] = handler;
            }
        };
        const jumpResponse = { writeHead() {}, end() {} };
        routes[0].handle(jumpRequest, jumpResponse);
        handlers.data(JSON.stringify({ timestamp: target }));
        handlers.end();
        let body;
        const getRequest = { method: 'GET', url: '/api/simulation' };
        const getResponse = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        routes[2].handle(getRequest, getResponse);
        assert(JSON.parse(body).offset !== 0, 'offset should be nonzero after jump');
        done();
    });
});
