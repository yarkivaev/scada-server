import assert from 'assert';
import runWithRequestTimeout, {
    DEFAULT_REQUEST_TIMEOUT_MS,
    parseRequestTimeoutMs
} from '../../src/server/requestTimeout.js';
import route from '../../src/objects/route.js';
import routes from '../../src/server/routes.js';

describe('parseRequestTimeoutMs', function() {
    it('returns default when env value is missing', function() {
        const ms = parseRequestTimeoutMs(undefined);
        assert.strictEqual(ms, DEFAULT_REQUEST_TIMEOUT_MS, 'should use default deadline');
    });

    it('returns parsed positive milliseconds from env string', function() {
        const ms = parseRequestTimeoutMs('12000');
        assert.strictEqual(ms, 12000, 'should parse numeric env value');
    });
});

describe('runWithRequestTimeout', function() {
    it('rejects when handler exceeds configured deadline', async function() {
        let body;
        const slow = route('GET', '/api/slow', async () => {
            await new Promise((resolve) => {
                setTimeout(resolve, 200);
            });
        });
        const api = routes([slow], { requestTimeoutMs: 50 });
        const request = { method: 'GET', url: '/api/slow' };
        const response = {
            headersSent: false,
            statusCode: 0,
            writeHead() {},
            end(content) {
                body = content;
            }
        };
        await api.handle(request, response);
        const payload = JSON.parse(body);
        assert.strictEqual(payload.error.code, 'TIMEOUT', 'should expose TIMEOUT error code');
    });
});
