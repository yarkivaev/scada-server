import assert from 'assert';
import heartbeatStream from '../../src/server/heartbeatStream.js';
import { EventEmitter } from 'events';

describe('heartbeatStream', function() {
    it('returns array of routes', function() {
        const routes = heartbeatStream('/api', () => {return new Date()});
        assert(Array.isArray(routes) && routes.length === 1, 'should return single-element array');
    });

    it('matches GET /heartbeat/stream', function() {
        const routes = heartbeatStream('/api', () => {return new Date()});
        const request = { method: 'GET', url: '/api/heartbeat/stream' };
        assert(routes[0].matches(request) === true, 'should match heartbeat stream path');
    });

    it('does not match POST /heartbeat/stream', function() {
        const routes = heartbeatStream('/api', () => {return new Date()});
        const request = { method: 'POST', url: '/api/heartbeat/stream' };
        assert(routes[0].matches(request) === false, 'should not match POST method');
    });

    it('sends SSE headers', function() {
        let headers;
        const routes = heartbeatStream('/api', () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/heartbeat/stream';
        const response = {
            writeHead(code, hdrs) { headers = hdrs; },
            write() {},
            end() {}
        };
        routes[0].handle(request, response);
        assert(headers['Content-Type'] === 'text/event-stream', 'should set SSE content type');
    });

    it('emits heartbeat event on connect', function() {
        const routes = heartbeatStream('/api', () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/heartbeat/stream';
        let written = '';
        const response = {
            writeHead() {},
            write(data) { written += data; },
            end() {}
        };
        routes[0].handle(request, response);
        assert(written.includes('event: heartbeat'), 'should emit heartbeat on connect');
    });

    it('clears interval on close', function() {
        const routes = heartbeatStream('/api', () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/heartbeat/stream';
        let written = '';
        const response = {
            writeHead() {},
            write(data) { written += data; },
            end() {}
        };
        routes[0].handle(request, response);
        written = '';
        request.emit('close');
        assert(written === '', 'should not write after close');
    });
});
