export const DEFAULT_REQUEST_TIMEOUT_MS = 30000;

/**
 * Parses REQUEST_TIMEOUT_MS env value into a positive millisecond deadline.
 *
 * @param {string|number|undefined} raw - env or option value
 * @returns {number} timeout in milliseconds
 */
export function parseRequestTimeoutMs(raw) {
    if (raw === undefined || raw === null || String(raw).trim() === '') {
        return DEFAULT_REQUEST_TIMEOUT_MS;
    }
    const ms = Number(raw);
    if (!Number.isFinite(ms) || ms <= 0) {
        return DEFAULT_REQUEST_TIMEOUT_MS;
    }
    return ms;
}

function requestTimeoutError(ms) {
    const err = new Error(`Request exceeded ${ms}ms deadline`);
    err.code = 'TIMEOUT';
    return err;
}

/**
 * Runs a route handler under a hard deadline; rejects with TIMEOUT when exceeded.
 *
 * @param {function} handler - route handler (req, res)
 * @param {object} req - HTTP request
 * @param {object} res - HTTP response
 * @param {number} timeoutMs - deadline in milliseconds
 * @returns {Promise<void>}
 */
export default async function runWithRequestTimeout(handler, req, res, timeoutMs) {
    let timer;
    const deadline = new Promise((unused, reject) => {
        timer = setTimeout(() => {
            reject(requestTimeoutError(timeoutMs));
        }, timeoutMs);
    });
    try {
        await Promise.race([Promise.resolve(handler(req, res)), deadline]);
    } finally {
        clearTimeout(timer);
    }
}
