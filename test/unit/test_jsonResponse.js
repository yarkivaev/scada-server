import assert from 'assert';
import jsonResponse from '../../src/objects/jsonResponse.js';

describe('jsonResponse', function() {
    it('sends JSON content type header', function() {
        let headers;
        const response = {
            writeHead(code, hdrs) {
                headers = hdrs;
            },
            end() {}
        };
        jsonResponse({ key: 'value' }).send(response);
        assert(headers['Content-Type'] === 'application/json');
    });

    it('sends CORS header', function() {
        let headers;
        const response = {
            writeHead(code, hdrs) {
                headers = hdrs;
            },
            end() {}
        };
        jsonResponse({ key: 'value' }).send(response);
        assert(headers['Access-Control-Allow-Origin'] === '*');
    });

    it('sends default 200 status code', function() {
        let statusCode;
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            end() {}
        };
        jsonResponse({ key: 'value' }).send(response);
        assert(statusCode === 200);
    });

    it('sends custom status code', function() {
        const code = 400 + Math.floor(Math.random() * 100);
        let statusCode;
        const response = {
            writeHead(cd) {
                statusCode = cd;
            },
            end() {}
        };
        jsonResponse({ error: true }, code).send(response);
        assert(statusCode === code);
    });

    it('serializes payload to JSON', function() {
        const value = `v${Math.random()}`;
        let body;
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        jsonResponse({ key: value }).send(response);
        assert(JSON.parse(body).key === value);
    });

    it('serializes array payload', function() {
        const items = [Math.random(), Math.random()];
        let body;
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        jsonResponse(items).send(response);
        assert(JSON.parse(body)[0] === items[0] && JSON.parse(body)[1] === items[1]);
    });

    it('serializes nested objects', function() {
        const nested = { inner: { value: Math.random() } };
        let body;
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        jsonResponse(nested).send(response);
        assert(JSON.parse(body).inner.value === nested.inner.value);
    });
});
