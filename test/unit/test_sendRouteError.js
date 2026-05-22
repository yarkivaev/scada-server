import assert from 'assert';
import sendRouteError from '../../src/server/sendRouteError.js';

describe('sendRouteError', function() {
    it('responds with 504 when error code is TIMEOUT', function() {
        let status;
        const res = {
            headersSent: false,
            writeHead(code) {
                status = code;
            },
            end() {},
            destroy() {}
        };
        const err = new Error('Request exceeded 50ms deadline');
        err.code = 'TIMEOUT';
        sendRouteError(res, err);
        assert.strictEqual(status, 504, 'should map timeout to gateway timeout status');
    });
});
