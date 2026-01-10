import jsonResponse from '../objects/jsonResponse.js';
import route from '../objects/route.js';
import timeExpression from '../objects/timeExpression.js';

/**
 * Measurement routes factory.
 * Creates route for GET /machines/:machineId/measurements.
 *
 * @param {string} basePath - base URL path
 * @param {object} plant - plant domain object from scada package
 * @param {function} clock - time provider
 * @returns {array} array of route objects
 *
 * @example
 *   const routes = measurementRoute('/api/v1', plant, clock);
 */
export default function measurementRoute(basePath, plant, clock) {
    function beginning() {
        return new Date(clock().getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    function find(id) {
        for (const shop of Object.values(plant.shops.get())) {
            const machine = shop.machines.get()[id];
            if (machine) {
                return machine;
            }
        }
        return undefined;
    }
    return [
        route(
            'GET',
            `${basePath}/machines/:machineId/measurements`,
            async (req, res, params, query) => {
                const machine = find(params.machineId);
                if (!machine) {
                    jsonResponse({ items: [] }).send(res);
                    return;
                }
                const requested = query.keys ? query.keys.split(',') : Object.keys(machine.sensors);
                const keys = requested.filter((key) => {return machine.sensors[key]});
                const fromExpr = query.from || 'now-1M';
                const toExpr = query.to || 'now';
                const from = timeExpression(fromExpr, clock, beginning).resolve();
                const to = timeExpression(toExpr, clock, beginning).resolve();
                const step = query.step ? parseInt(query.step, 10) * 1000 : 1000;
                const range = { start: from, end: to };
                const promises = keys.map(async (key) => {
                    const sensor = machine.sensors[key];
                    const measurements = await sensor.measurements(range, step);
                    const unit = measurements.length > 0 ? measurements[0].unit : '';
                    const values = measurements.map((m) => {return {
                        timestamp: m.timestamp.toISOString(),
                        value: m.value
                    }});
                    return { key, name: sensor.name(), unit, values };
                });
                const items = await Promise.all(promises);
                jsonResponse({ items }).send(res);
            }
        )
    ];
}
