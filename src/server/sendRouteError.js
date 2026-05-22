import errorResponse from '../objects/errorResponse.js';

function isTimeoutError(err) {
    return Boolean(err && err.code === 'TIMEOUT');
}

/**
 * Maps handler failures to structured API errors.
 *
 * @param {object} res - HTTP response
 * @param {Error} err - thrown error
 */
export default function sendRouteError(res, err) {
    if (res.headersSent) {
        res.destroy();
        return;
    }
    if (isTimeoutError(err)) {
        errorResponse('TIMEOUT', err.message, 504).send(res);
        return;
    }
    if (err instanceof SyntaxError) {
        errorResponse('BAD_REQUEST', 'invalid JSON body', 400).send(res);
        return;
    }
    const message = err && err.message ? err.message : 'internal error';
    errorResponse('INTERNAL_ERROR', message, 500).send(res);
}
