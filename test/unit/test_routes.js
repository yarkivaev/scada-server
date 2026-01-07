import assert from 'assert';
import routes from '../../src/server/routes.js';
import route from '../../src/objects/route.js';

function fakeRoute(method, path) {
    return route(method, path, (req, res) => {
        res.writeHead(200);
        res.end(JSON.stringify({ path }));
    });
}

describe('routes', function() {
    it('returns object with list method', function() {
        const rt = routes([fakeRoute('GET', '/api/test')]);
        assert(typeof rt.list === 'function');
    });

    it('returns object with handle method', function() {
        const rt = routes([fakeRoute('GET', '/api/test')]);
        assert(typeof rt.handle === 'function');
    });

    it('returns routes from list', function() {
        const routeList = [fakeRoute('GET', '/api/test')];
        const rt = routes(routeList);
        assert(rt.list().length === 1);
    });

    it('handles OPTIONS request with CORS headers', function() {
        let headers;
        const rt = routes([fakeRoute('GET', '/api/machines')]);
        const request = { method: 'OPTIONS', url: '/api/machines' };
        const response = {
            writeHead(code, hdrs) {
                headers = hdrs;
            },
            end() {}
        };
        rt.handle(request, response);
        assert(headers['Access-Control-Allow-Origin'] === '*');
    });

    it('handles OPTIONS request with allowed methods', function() {
        let headers;
        const rt = routes([fakeRoute('GET', '/api/machines')]);
        const request = { method: 'OPTIONS', url: '/api/machines' };
        const response = {
            writeHead(code, hdrs) {
                headers = hdrs;
            },
            end() {}
        };
        rt.handle(request, response);
        assert(headers['Access-Control-Allow-Methods'].includes('GET'));
    });

    it('returns 200 for OPTIONS request', function() {
        let statusCode;
        const rt = routes([fakeRoute('GET', '/api/machines')]);
        const request = { method: 'OPTIONS', url: '/api/machines' };
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end() {}
        };
        rt.handle(request, response);
        assert(statusCode === 200);
    });

    it('dispatches to matching route', function() {
        let body;
        const rt = routes([fakeRoute('GET', '/api/machines')]);
        const request = { method: 'GET', url: '/api/machines' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        rt.handle(request, response);
        assert(JSON.parse(body).path === '/api/machines');
    });

    it('returns 404 for unknown route', function() {
        let statusCode;
        const rt = routes([fakeRoute('GET', '/api/machines')]);
        const request = { method: 'GET', url: '/unknown/path' };
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end() {}
        };
        rt.handle(request, response);
        assert(statusCode === 404);
    });

    it('returns NOT_FOUND error for unknown route', function() {
        let body;
        const rt = routes([fakeRoute('GET', '/api/machines')]);
        const request = { method: 'GET', url: '/unknown/path' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        rt.handle(request, response);
        assert(JSON.parse(body).error.code === 'NOT_FOUND');
    });
});
