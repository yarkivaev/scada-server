import errorResponse from '../objects/errorResponse.js';
import jsonResponse from '../objects/jsonResponse.js';
import route from '../objects/route.js';

/**
 * Machine routes factory.
 * Creates routes for GET /machines and GET /machines/:machineId.
 *
 * @param {string} basePath - base URL path
 * @param {object} plant - plant domain object from scada package
 * @returns {array} array of route objects
 *
 * @example
 *   const routes = machineRoute('/api/v1', plant);
 */
export default function machineRoute(basePath, plant) {
    function all() {
        return Object.values(plant.shops.get()).flatMap((shop) => {
            return Object.values(shop.machines.get()).map((machine) => {
                return { id: machine.name(), name: machine.name() };
            });
        });
    }
    function find(id) {
        for (const shop of Object.values(plant.shops.get())) {
            const machine = shop.machines.get()[id];
            if (machine) {
                return { id: machine.name(), name: machine.name() };
            }
        }
        return undefined;
    }
    function findMachine(id) {
        for (const shop of Object.values(plant.shops.get())) {
            const machine = shop.machines.get()[id];
            if (machine) {
                return machine;
            }
        }
        return undefined;
    }
    return [
        route('GET', `${basePath}/machines`, (req, res) => {
            jsonResponse({ items: all() }).send(res);
        }),
        route('GET', `${basePath}/machines/:machineId`, (req, res, params) => {
            const machine = find(params.machineId);
            if (!machine) {
                errorResponse(
                    'NOT_FOUND',
                    `Machine '${params.machineId}' not found`,
                    404
                ).send(res);
                return;
            }
            jsonResponse(machine).send(res);
        }),
        route('GET', `${basePath}/machines/:machineId/weight`, async (req, res, params) => {
            const machine = findMachine(params.machineId);
            if (!machine) {
                errorResponse('NOT_FOUND', `Machine '${params.machineId}' not found`, 404).send(res);
                return;
            }
            jsonResponse({ amount: (await machine.chronology().get({ type: 'current' })).weight }).send(res);
        }),
        route('PUT', `${basePath}/machines/:machineId/weight`, (req, res, params) => {
            const machine = findMachine(params.machineId);
            if (!machine) {
                errorResponse('NOT_FOUND', `Machine '${params.machineId}' not found`, 404).send(res);
                return;
            }
            let body = '';
            req.on('data', (chunk) => {
                body += chunk;
            });
            req.on('end', async () => {
                const data = JSON.parse(body);
                machine.reset(data.amount);
                jsonResponse({ amount: (await machine.chronology().get({ type: 'current' })).weight }).send(res);
            });
        }),
        route('POST', `${basePath}/machines/:machineId/load`, (req, res, params) => {
            const machine = findMachine(params.machineId);
            if (!machine) {
                errorResponse('NOT_FOUND', `Machine '${params.machineId}' not found`, 404).send(res);
                return;
            }
            let body = '';
            req.on('data', (chunk) => {
                body += chunk;
            });
            req.on('end', () => {
                const data = JSON.parse(body);
                machine.load(data.amount);
                jsonResponse({ amount: data.amount }).send(res);
            });
        }),
        route('POST', `${basePath}/machines/:machineId/dispense`, (req, res, params) => {
            const machine = findMachine(params.machineId);
            if (!machine) {
                errorResponse('NOT_FOUND', `Machine '${params.machineId}' not found`, 404).send(res);
                return;
            }
            let body = '';
            req.on('data', (chunk) => {
                body += chunk;
            });
            req.on('end', () => {
                const data = JSON.parse(body);
                machine.dispense(data.amount);
                jsonResponse({ amount: data.amount }).send(res);
            });
        })
    ];
}
