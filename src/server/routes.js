import errorResponse from '../objects/errorResponse.js';
import sendRouteError from './sendRouteError.js';
import runWithRequestTimeout, { parseRequestTimeoutMs } from './requestTimeout.js';

/**
 * Route collection that dispatches requests to matching routes.
 * Accepts a list of route objects, each with matches() and handle() methods.
 *
 * @param {Array} routeList - array of route objects
 * @returns {object} routes with list() and handle() methods
 *
 * @example
 *   const api = routes([...machineRoute(basePath, machines), ...alertRoute(basePath, alerts)]);
 *   http.createServer((req, res) => api.handle(req, res)).listen(3000);
 */
export default function routes(routeList, options = {}) {
    const timeoutMs = parseRequestTimeoutMs(options.requestTimeoutMs);
    return {
        list() {
            return routeList;
        },
        async handle(req, res) {
            if (req.method === 'OPTIONS') {
                res.writeHead(200, {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                });
                res.end();
                return;
            }
            const matching = routeList.find((rt) => {
                return rt.matches(req);
            });
            if (matching) {
                try {
                    await runWithRequestTimeout(
                        (request, response) => {
                            return matching.handle(request, response);
                        },
                        req,
                        res,
                        timeoutMs
                    );
                } catch (err) {
                    sendRouteError(res, err);
                }
            } else {
                errorResponse('NOT_FOUND', 'Route not found', 404).send(res);
            }
        }
    };
}
