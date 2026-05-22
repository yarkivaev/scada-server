/**
 * Reads the full HTTP request body as a UTF-8 string.
 *
 * @param {import('http').IncomingMessage} request - Node HTTP request
 * @returns {Promise<string>} raw body text
 */
export default function readBody(request) {
    return new Promise((resolve, reject) => {
        let body = '';
        request.on('data', (chunk) => {
            body += chunk;
        });
        request.on('end', () => {
            resolve(body);
        });
        request.on('error', reject);
    });
}
