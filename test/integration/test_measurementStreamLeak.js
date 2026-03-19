import assert from 'assert';
import http from 'http';
import { acknowledgedAlert, activeMelting, alert, alerts, initialized, meltingMachine, meltings, meltingShop, plant, requests, segments } from '@yarkivaev/scada';
import { scadaServer } from '../../index.js';

/**
 * Sensor that tracks subscription lifecycle.
 *
 * Its stream() method increments a counter on subscribe and decrements on
 * cancel. Its current() method always rejects, simulating a ClickHouse
 * connection failure.
 *
 * @param {string} sensorName - display name
 * @param {string} unit - measurement unit
 * @returns {object} sensor with subscriptions() counter
 *
 * @example
 *   const sensor = failingSensor('Voltage', 'V');
 *   sensor.subscriptions(); // 0
 *   const sub = sensor.stream(new Date(), 1000, () => {});
 *   sensor.subscriptions(); // 1
 *   sub.cancel();
 *   sensor.subscriptions(); // 0
 */
function failingSensor(sensorName, unit) {
    let active = 0;
    return {
        name() { return sensorName; },
        current() { return Promise.reject(new Error('read ECONNRESET')); },
        measurements() { return []; },
        stream(since, step, callback, clock) {
            active += 1;
            const timer = setInterval(() => {}, step);
            return {
                cancel() {
                    active -= 1;
                    clearInterval(timer);
                }
            };
        },
        subscriptions() { return active; }
    };
}

/**
 * Plant with a single machine whose sensor fails on current().
 *
 * @param {object} sensor - sensor object
 * @returns {object} plant domain object
 *
 * @example
 *   const p = plantWith(failingSensor('V', 'V'));
 *   p.init();
 */
function plantWith(sensor) {
    const history = alerts(alert, acknowledgedAlert);
    const machine = meltingMachine(`ïcht_${Math.random()}`, { voltage: sensor }, history);
    const decorated = {
        ...machine,
        name: machine.name,
        segments: segments(),
        requests: requests(),
        init: machine.init
    };
    const shop = meltingShop(`shöp_${Math.random()}`, initialized({ icht1: decorated }, Object.values), meltings(activeMelting), history);
    return plant(initialized({ meltingShop: shop }, Object.values));
}

describe('measurementStream subscription leak', function () {
    it('leaks subscriptions when retain throws during SSE connection', async function () {
        this.timeout(15000);
        const sensor = failingSensor(`Völtage_${Math.random()}`, `V_${Math.random()}`);
        const p = plantWith(sensor);
        const api = scadaServer('/api', p);
        const log = console;
        const errors = log.error;
        log.error = () => {};
        const server = http.createServer((req, res) => { api.handle(req, res); });
        await new Promise((resolve) => { server.listen(0, resolve); });
        const port = server.address().port;
        const clients = [];
        for (let i = 0; i < 10; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            await new Promise((resolve) => {
                const req = http.get(
                    `http://localhost:${port}/api/machines/icht1/measurements/stream`,
                    (res) => {
                        res.resume();
                        res.on('error', () => {});
                    }
                );
                req.on('error', () => {});
                clients.push(req);
                setTimeout(resolve, 100);
            });
        }
        await new Promise((resolve) => { setTimeout(resolve, 1000); });
        clients.forEach((client) => { client.destroy(); });
        await new Promise((resolve) => { setTimeout(resolve, 1000); });
        await new Promise((resolve) => { server.close(resolve); });
        log.error = errors;
        assert(
            sensor.subscriptions() === 0,
            `${sensor.subscriptions()} subscriptions were not cancelled after clients disconnected`
        );
    });
});
