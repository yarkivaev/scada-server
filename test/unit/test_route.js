import assert from 'assert';
import route from '../../src/objects/route.js';

describe('route', function() {
    it('matches request with correct method and path', function() {
        const rt = route('GET', '/machines', () => {});
        const request = { method: 'GET', url: '/machines' };
        assert(rt.matches(request) === true);
    });

    it('does not match request with wrong method', function() {
        const rt = route('GET', '/machines', () => {});
        const request = { method: 'POST', url: '/machines' };
        assert(rt.matches(request) === false);
    });

    it('does not match request with wrong path', function() {
        const rt = route('GET', '/machines', () => {});
        const request = { method: 'GET', url: '/users' };
        assert(rt.matches(request) === false);
    });

    it('matches request with path parameter', function() {
        const id = `id${Math.random()}`;
        const rt = route('GET', '/machines/:id', () => {});
        const request = { method: 'GET', url: `/machines/${id}` };
        assert(rt.matches(request) === true);
    });

    it('extracts single path parameter', function() {
        const id = `id${Math.random()}`;
        let extracted;
        const rt = route('GET', '/machines/:id', (req, res, params) => {
            extracted = params;
        });
        const request = { method: 'GET', url: `/machines/${id}` };
        rt.handle(request, {});
        assert(extracted.id === id);
    });

    it('extracts multiple path parameters', function() {
        const machineId = `m${Math.random()}`;
        const alertId = `a${Math.random()}`;
        let extracted;
        const rt = route('GET', '/machines/:machineId/alerts/:alertId', (req, res, params) => {
            extracted = params;
        });
        const request = { method: 'GET', url: `/machines/${machineId}/alerts/${alertId}` };
        rt.handle(request, {});
        assert(extracted.machineId === machineId && extracted.alertId === alertId);
    });

    it('extracts query parameters', function() {
        const value = `v${Math.random()}`;
        let extracted;
        const rt = route('GET', '/machines', (req, res, params, query) => {
            extracted = query;
        });
        const request = { method: 'GET', url: `/machines?key=${value}` };
        rt.handle(request, {});
        assert(extracted.key === value);
    });

    it('extracts multiple query parameters', function() {
        const val1 = `v${Math.random()}`;
        const val2 = `v${Math.random()}`;
        let extracted;
        const rt = route('GET', '/machines', (req, res, params, query) => {
            extracted = query;
        });
        const request = { method: 'GET', url: `/machines?a=${val1}&b=${val2}` };
        rt.handle(request, {});
        assert(extracted.a === val1 && extracted.b === val2);
    });

    it('decodes URL-encoded query values', function() {
        let extracted;
        const rt = route('GET', '/machines', (req, res, params, query) => {
            extracted = query;
        });
        const request = { method: 'GET', url: '/machines?key=%D1%82%D0%B5%D1%81%D1%82' };
        rt.handle(request, {});
        assert(extracted.key === '\u0442\u0435\u0441\u0442');
    });

    it('returns empty query object when no query string', function() {
        let extracted;
        const rt = route('GET', '/machines', (req, res, params, query) => {
            extracted = query;
        });
        const request = { method: 'GET', url: '/machines' };
        rt.handle(request, {});
        assert(Object.keys(extracted).length === 0);
    });

    it('ignores query string when matching path', function() {
        const rt = route('GET', '/machines', () => {});
        const request = { method: 'GET', url: '/machines?key=value' };
        assert(rt.matches(request) === true);
    });

    it('calls action with request and response', function() {
        let receivedReq;
        let receivedRes;
        const rt = route('GET', '/machines', (req, res) => {
            receivedReq = req;
            receivedRes = res;
        });
        const request = { method: 'GET', url: '/machines' };
        const response = { data: Math.random() };
        rt.handle(request, response);
        assert(receivedReq === request && receivedRes === response);
    });

    it('handles query parameter without value', function() {
        let extracted;
        const rt = route('GET', '/machines', (req, res, params, query) => {
            extracted = query;
        });
        const request = { method: 'GET', url: '/machines?flag' };
        rt.handle(request, {});
        assert(extracted.flag === '', 'empty value should be empty string');
    });
});
