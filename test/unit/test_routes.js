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

    it('handles OPTIONS request with CORS headers', async function() {
        let headers;
        const rt = routes([fakeRoute('GET', '/api/machines')]);
        const request = { method: 'OPTIONS', url: '/api/machines' };
        const response = {
            writeHead(code, hdrs) {
                headers = hdrs;
            },
            end() {}
        };
        await rt.handle(request, response);
        assert(headers['Access-Control-Allow-Origin'] === '*');
    });

    it('handles OPTIONS request with allowed methods', async function() {
        let headers;
        const rt = routes([fakeRoute('GET', '/api/machines')]);
        const request = { method: 'OPTIONS', url: '/api/machines' };
        const response = {
            writeHead(code, hdrs) {
                headers = hdrs;
            },
            end() {}
        };
        await rt.handle(request, response);
        assert(headers['Access-Control-Allow-Methods'].includes('GET'));
    });

    it('returns 200 for OPTIONS request', async function() {
        let statusCode;
        const rt = routes([fakeRoute('GET', '/api/machines')]);
        const request = { method: 'OPTIONS', url: '/api/machines' };
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end() {}
        };
        await rt.handle(request, response);
        assert(statusCode === 200);
    });

    it('dispatches to matching route', async function() {
        let body;
        const rt = routes([fakeRoute('GET', '/api/machines')]);
        const request = { method: 'GET', url: '/api/machines' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        await rt.handle(request, response);
        assert(JSON.parse(body).path === '/api/machines');
    });

    it('returns 404 for unknown route', async function() {
        let statusCode;
        const rt = routes([fakeRoute('GET', '/api/machines')]);
        const request = { method: 'GET', url: '/unknown/path' };
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end() {}
        };
        await rt.handle(request, response);
        assert(statusCode === 404);
    });

    it('returns NOT_FOUND error for unknown route', async function() {
        let body;
        const rt = routes([fakeRoute('GET', '/api/machines')]);
        const request = { method: 'GET', url: '/unknown/path' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        await rt.handle(request, response);
        assert(JSON.parse(body).error.code === 'NOT_FOUND');
    });

    it('includes POST in allowed methods for OPTIONS', async function() {
        let headers;
        const rt = routes([fakeRoute('GET', '/api/machines')]);
        const request = { method: 'OPTIONS', url: '/api/machines' };
        const response = {
            writeHead(code, hdrs) {
                headers = hdrs;
            },
            end() {}
        };
        await rt.handle(request, response);
        assert(headers['Access-Control-Allow-Methods'].includes('POST'), 'should include POST');
    });

    it('returns 500 when route handler throws', async function() {
        let statusCode;
        const failing = route('GET', '/api/explode', () => {
            throw new Error('Börkéd connection');
        });
        const rt = routes([failing]);
        const request = { method: 'GET', url: '/api/explode' };
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end() {}
        };
        await rt.handle(request, response);
        assert(statusCode === 500, 'expected 500 status on handler error');
    });

    it('returns INTERNAL_ERROR code when route handler throws', async function() {
        let body;
        const failing = route('GET', '/api/explode', () => {
            throw new Error('Börkéd connection');
        });
        const rt = routes([failing]);
        const request = { method: 'GET', url: '/api/explode' };
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        await rt.handle(request, response);
        assert(JSON.parse(body).error.code === 'INTERNAL_ERROR', 'expected INTERNAL_ERROR code');
    });

    it('destroys response when handler throws after headers sent', async function() {
        let destroyed = false;
        const failing = route('GET', '/api/stream', (req, res) => {
            res.writeHead(200);
            throw new Error('Börkéd mid-stream');
        });
        const rt = routes([failing]);
        const request = { method: 'GET', url: '/api/stream' };
        const response = {
            headersSent: false,
            writeHead() {
                this.headersSent = true;
            },
            end() {},
            destroy() {
                destroyed = true;
            }
        };
        await rt.handle(request, response);
        assert(destroyed, 'expected response to be destroyed when headers already sent');
    });

    it('includes DELETE in allowed methods for OPTIONS', async function() {
        let headers;
        const rt = routes([fakeRoute('GET', '/api/machines')]);
        const request = { method: 'OPTIONS', url: '/api/machines' };
        const response = {
            writeHead(code, hdrs) {
                headers = hdrs;
            },
            end() {}
        };
        await rt.handle(request, response);
        assert(headers['Access-Control-Allow-Methods'].includes('DELETE'), 'should include DELETE');
    });
});
