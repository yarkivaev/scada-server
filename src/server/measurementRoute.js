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
        return null;
    }
    return [
        route(
            'GET',
            `${basePath}/machines/:machineId/measurements`,
            (req, res, params, query) => {
                const machine = find(params.machineId);
                if (!machine) {
                    jsonResponse({ items: [] }).send(res);
                    return;
                }
                const keys = query.keys ? query.keys.split(',') : Object.keys(machine.sensors);
                const fromExpr = query.from || 'now-1M';
                const toExpr = query.to || 'now';
                const from = timeExpression(fromExpr, clock, beginning).resolve();
                const to = timeExpression(toExpr, clock, beginning).resolve();
                const step = query.step ? parseInt(query.step, 10) * 1000 : 1000;
                const range = { start: from, end: to };
                const items = [];
                keys.forEach((key) => {
                    const sensor = machine.sensors[key];
                    if (sensor) {
                        const measurements = sensor.measurements(range, step);
                        const unit = measurements.length > 0 ? measurements[0].unit : '';
                        const values = measurements.map((m) => ({
                            timestamp: m.timestamp.toISOString(),
                            value: m.value
                        }));
                        items.push({ key, name: sensor.name(), unit, values });
                    }
                });
                jsonResponse({ items }).send(res);
            }
        )
    ];
}
