import assert from 'assert';
import sseResponse from '../../src/objects/sseResponse.js';

describe('sseResponse', function() {
    it('sends event stream content type header', function() {
        let headers;
        const response = {
            writeHead(code, hdrs) {
                headers = hdrs;
            },
            write() {},
            end() {}
        };
        sseResponse(response, () => {return new Date()});
        assert(headers['Content-Type'] === 'text/event-stream');
    });

    it('sends no-cache header', function() {
        let headers;
        const response = {
            writeHead(code, hdrs) {
                headers = hdrs;
            },
            write() {},
            end() {}
        };
        sseResponse(response, () => {return new Date()});
        assert(headers['Cache-Control'] === 'no-cache');
    });

    it('sends keep-alive header', function() {
        let headers;
        const response = {
            writeHead(code, hdrs) {
                headers = hdrs;
            },
            write() {},
            end() {}
        };
        sseResponse(response, () => {return new Date()});
        assert(headers.Connection === 'keep-alive');
    });

    it('sends CORS header', function() {
        let headers;
        const response = {
            writeHead(code, hdrs) {
                headers = hdrs;
            },
            write() {},
            end() {}
        };
        sseResponse(response, () => {return new Date()});
        assert(headers['Access-Control-Allow-Origin'] === '*');
    });

    it('sends 200 status code', function() {
        let statusCode;
        const response = {
            writeHead(code) {
                statusCode = code;
            },
            write() {},
            end() {}
        };
        sseResponse(response, () => {return new Date()});
        assert(statusCode === 200);
    });

    it('emits event with correct format', function() {
        const event = `event_${Math.random()}`;
        let written;
        const response = {
            writeHead() {},
            write(content) {
                written = content;
            },
            end() {}
        };
        const sse = sseResponse(response, () => {return new Date()});
        sse.emit(event, { key: 'value' });
        assert(written.startsWith(`event: ${event}\n`));
    });

    it('emits event with JSON data', function() {
        const value = Math.random();
        let written;
        const response = {
            writeHead() {},
            write(content) {
                written = content;
            },
            end() {}
        };
        const sse = sseResponse(response, () => {return new Date()});
        sse.emit('test', { value });
        const dataLine = written.split('\n').find((ln) => {
            return ln.startsWith('data:');
        });
        const parsed = JSON.parse(dataLine.slice(5).trim());
        assert(parsed.value === value);
    });

    it('emits heartbeat with timestamp', function() {
        const timestamp = new Date();
        let written;
        const response = {
            writeHead() {},
            write(content) {
                written = content;
            },
            end() {}
        };
        const sse = sseResponse(response, () => {return timestamp});
        sse.heartbeat();
        const dataLine = written.split('\n').find((ln) => {
            return ln.startsWith('data:');
        });
        const parsed = JSON.parse(dataLine.slice(5).trim());
        assert(parsed.timestamp === timestamp.toISOString());
    });

    it('emits heartbeat event type', function() {
        let written;
        const response = {
            writeHead() {},
            write(content) {
                written = content;
            },
            end() {}
        };
        const sse = sseResponse(response, () => {return new Date()});
        sse.heartbeat();
        assert(written.startsWith('event: heartbeat\n'));
    });

    it('closes response on close', function() {
        let ended = false;
        const response = {
            writeHead() {},
            write() {},
            end() {
                ended = true;
            }
        };
        const sse = sseResponse(response, () => {return new Date()});
        sse.close();
        assert(ended === true);
    });
});
