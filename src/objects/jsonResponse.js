/**
 * JSON response formatter for HTTP.
 * Returns immutable object with send() method.
 *
 * @param {object} payload - JSON-serializable data
 * @param {number} statusCode - HTTP status (default 200)
 * @returns {object} response with send method
 *
 * @example
 *   jsonResponse({ items: [] }).send(response);
 *   jsonResponse({ error: {...} }, 404).send(response);
 */
export default function jsonResponse(payload, statusCode) {
    const code = statusCode || 200;
    return {
        send(response) {
            response.writeHead(code, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            response.end(JSON.stringify(payload));
        }
    };
}
