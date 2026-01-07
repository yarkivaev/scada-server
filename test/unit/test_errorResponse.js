import assert from 'assert';
import errorResponse from '../../src/objects/errorResponse.js';

describe('errorResponse', function() {
    it('sends error code in payload', function() {
        const code = `CODE_${Math.random()}`;
        let body;
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        errorResponse(code, 'msg', 400).send(response);
        assert(JSON.parse(body).error.code === code);
    });

    it('sends error message in payload', function() {
        const message = `message_${Math.random()}`;
        let body;
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        errorResponse('CODE', message, 400).send(response);
        assert(JSON.parse(body).error.message === message);
    });

    it('sends specified HTTP status code', function() {
        const statusCode = 400 + Math.floor(Math.random() * 100);
        let sentCode;
        const response = {
            writeHead(code) {
                sentCode = code;
            },
            end() {}
        };
        errorResponse('CODE', 'msg', statusCode).send(response);
        assert(sentCode === statusCode);
    });

    it('sends JSON content type header', function() {
        let headers;
        const response = {
            writeHead(code, hdrs) {
                headers = hdrs;
            },
            end() {}
        };
        errorResponse('CODE', 'msg', 400).send(response);
        assert(headers['Content-Type'] === 'application/json');
    });

    it('wraps error in error object', function() {
        let body;
        const response = {
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        errorResponse('CODE', 'msg', 400).send(response);
        const parsed = JSON.parse(body);
        assert(typeof parsed.error === 'object');
    });
});
