/**
 * HTTP route with path matching and parameter extraction.
 * Returns immutable object with matches() and handle() methods.
 *
 * @param {string} method - HTTP method (GET, PATCH, etc)
 * @param {string} path - URL pattern with :param placeholders
 * @param {function} action - receives (request, response, params, query)
 * @returns {object} route with matches, handle methods
 *
 * @example
 *   const rt = route('GET', '/machines/:id', action);
 *   rt.matches(request); // boolean
 *   rt.handle(request, response);
 */
export default function route(method, path, action) {
    const parts = path.split('/');
    const params = parts
        .map((part, index) => {
            return { part, index };
        })
        .filter((item) => {
            return item.part.startsWith(':');
        })
        .map((item) => {
            return { name: item.part.slice(1), index: item.index };
        });
    const pattern = parts
        .map((part) => {
            return part.startsWith(':') ? '[^/]+' : part;
        })
        .join('/');
    const regex = new RegExp(`^${pattern}$`, 'u');
    return {
        matches(request) {
            const url = request.url.split('?')[0];
            return request.method === method && regex.test(url);
        },
        handle(request, response) {
            const url = request.url.split('?')[0];
            const urlParts = url.split('/');
            const extracted = params.reduce((acc, param) => {
                return { ...acc, [param.name]: urlParts[param.index] };
            }, {});
            const queryString = request.url.split('?')[1];
            const query = queryString
                ? queryString.split('&').reduce((acc, pair) => {
                    const [key, val] = pair.split('=');
                    return { ...acc, [key]: decodeURIComponent(val || '') };
                }, {})
                : {};
            action(request, response, extracted, query);
        }
    };
}
