import jsonResponse from './jsonResponse.js';

/**
 * Structured error response per API contract.
 * Returns immutable object with send() method.
 *
 * @param {string} code - error code (NOT_FOUND, BAD_REQUEST, etc)
 * @param {string} message - human-readable message
 * @param {number} statusCode - HTTP status
 * @returns {object} error with send method
 *
 * @example
 *   errorResponse('NOT_FOUND', "Machine 'icht99' not found", 404).send(res);
 */
export default function errorResponse(code, message, statusCode) {
    const payload = {
        error: { code, message }
    };
    return jsonResponse(payload, statusCode);
}
