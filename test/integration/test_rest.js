import assert from 'assert';
import http from 'http';
import meltingMachine from '../../../scada/src/meltingMachine.js';
import sokolPlant from '../../../sokol-scada/src/sokolPlant.js';
import { scadaClient } from '../../client/index.js';
import { scadaServer } from '../../index.js';

describe('REST API Integration', function() {
    let server;
    let port;
    let client;
    let plant;

    beforeEach(function(done) {
        plant = sokolPlant(meltingMachine);
        const api = scadaServer('/api', plant);
        server = http.createServer((req, res) => {
            api.handle(req, res);
        });
        server.listen(0, () => {
            ({ port } = server.address());
            client = scadaClient(`http://localhost:${port}/api`, fetch, function() {});
            done();
        });
    });

    afterEach(function(done) {
        server.close(done);
    });

    it('fetches machines list', async function() {
        const result = await client.machines();
        assert(result.items !== undefined, 'response lacks items wrapper');
        assert(Array.isArray(result.items), 'items is not an array');
    });

    it('fetches exactly one machine', async function() {
        const result = await client.machines();
        assert(result.items.length === 1, 'expected exactly one machine');
    });

    it('fetches machine by id', async function() {
        const machine = client.machine('icht1');
        const result = await machine.info();
        assert(result.id === 'icht1');
    });

    it('returns error for unknown machine', async function() {
        const machine = client.machine(`unknown_${Math.random()}`);
        let thrown;
        try {
            await machine.info();
        } catch (err) {
            thrown = err;
        }
        assert(thrown.error !== undefined, 'error lacks error wrapper');
        assert(thrown.error.code === 'NOT_FOUND', 'wrong error code');
    });

    it('fetches measurements', async function() {
        const machine = client.machine('icht1');
        const result = await machine.measurements({
            from: 'now-1h',
            to: 'now',
            step: 60
        });
        assert(result.items !== undefined, 'response lacks items');
        assert(Array.isArray(result.items), 'items is not an array');
    });

    it('fetches filtered measurements by keys', async function() {
        const machine = client.machine('icht1');
        const result = await machine.measurements({
            keys: ['voltage'],
            from: 'now-1h',
            to: 'now'
        });
        const voltage = result.items.find((item) => {
            return item.key === 'voltage';
        });
        assert(voltage !== undefined, 'voltage measurement not found');
        assert(voltage.name !== undefined, 'voltage lacks name');
        assert(voltage.unit !== undefined, 'voltage lacks unit');
        assert(Array.isArray(voltage.values), 'voltage lacks values array');
    });

    it('fetches alerts with pagination', async function() {
        const machine = client.machine('icht1');
        const result = await machine.alerts({
            page: 1,
            size: 5
        });
        assert(Array.isArray(result.items), 'response lacks items array');
        assert(typeof result.page === 'number', 'page is not flat');
        assert(typeof result.size === 'number', 'size is not flat');
        assert(typeof result.total === 'number', 'total is not flat');
    });

    it('returns empty alerts when none exist', async function() {
        const machine = client.machine('icht1');
        const result = await machine.alerts({
            page: 1,
            size: 100
        });
        assert(result.items.length === 0, 'expected no alerts initially');
    });

    it('fetches meltings with cursor pagination', async function() {
        const machine = client.machine('icht1');
        const result = await machine.meltings({
            limit: 5
        });
        assert(Array.isArray(result.items), 'response lacks items array');
        assert(result.hasMore !== undefined, 'response lacks hasMore');
    });

    it('returns empty meltings when none completed', async function() {
        const machine = client.machine('icht1');
        const result = await machine.meltings({ limit: 10 });
        assert(result.items.length === 0, 'expected no meltings initially');
    });

    it('returns error for unknown melting', async function() {
        const machine = client.machine('icht1');
        let thrown;
        try {
            await machine.melting('unknown-melting-id');
        } catch (err) {
            thrown = err;
        }
        assert(thrown.error !== undefined, 'error lacks error wrapper');
        assert(thrown.error.code === 'NOT_FOUND', 'expected NOT_FOUND error');
    });

    it('acknowledges alert via PATCH', async function() {
        const shop = plant.shops.get().meltingShop;
        const triggered = shop.alerts.trigger(`test ${Math.random()}`, new Date(), 'icht1');
        const machine = client.machine('icht1');
        const result = await machine.acknowledge(triggered.id);
        assert(result.acknowledged === true, 'alert not acknowledged');
    });

    it('returns error when acknowledging unknown alert', async function() {
        const machine = client.machine('icht1');
        let thrown;
        try {
            await machine.acknowledge(`unknown-${Math.random()}`);
        } catch (err) {
            thrown = err;
        }
        assert(thrown.error !== undefined, 'error lacks error wrapper');
        assert(thrown.error.code === 'NOT_FOUND', 'expected NOT_FOUND error');
    });

    it('filters alerts by acknowledged true', async function() {
        const shop = plant.shops.get().meltingShop;
        shop.alerts.trigger(`unack ${Math.random()}`, new Date(), 'icht1');
        const toAck = shop.alerts.trigger(`toack ${Math.random()}`, new Date(), 'icht1');
        toAck.acknowledge();
        const machine = client.machine('icht1');
        const result = await machine.alerts({ acknowledged: true });
        assert(result.items.every((a) => a.acknowledged === true), 'unacknowledged alert in response');
    });

    it('filters alerts by acknowledged false', async function() {
        const shop = plant.shops.get().meltingShop;
        shop.alerts.trigger(`unack ${Math.random()}`, new Date(), 'icht1');
        const toAck = shop.alerts.trigger(`toack ${Math.random()}`, new Date(), 'icht1');
        toAck.acknowledge();
        const machine = client.machine('icht1');
        const result = await machine.alerts({ acknowledged: false });
        assert(result.items.every((a) => a.acknowledged === false), 'acknowledged alert in response');
    });

    it('fetches single melting by id', async function() {
        const shop = plant.shops.get().meltingShop;
        const machineObj = shop.machines.get().icht1;
        const active = shop.meltings.start(machineObj);
        active.chronology().load(500);
        active.chronology().dispense(480);
        active.stop();
        const machine = client.machine('icht1');
        const result = await machine.melting(active.id());
        assert(result.id === active.id(), 'wrong melting id');
        assert(result.loaded !== undefined, 'loaded not returned');
        assert(result.dispensed !== undefined, 'dispensed not returned');
    });

    it('returns empty measurements for unknown machine', async function() {
        const machine = client.machine(`unknown-${Math.random()}`);
        const result = await machine.measurements({ from: 'now-1h', to: 'now' });
        assert(result.items.length === 0, 'expected empty items');
    });

    it('returns 404 for unknown route', async function() {
        const response = await fetch(`http://localhost:${port}/api/unknown/route`);
        assert(response.status === 404, 'expected 404 status');
        const body = await response.json();
        assert(body.error.code === 'NOT_FOUND', 'expected NOT_FOUND error');
    });

    it('responds to OPTIONS with CORS headers', async function() {
        const response = await fetch(`http://localhost:${port}/api/machines`, {
            method: 'OPTIONS'
        });
        assert(response.status === 200, 'expected 200 status');
        assert(response.headers.get('Access-Control-Allow-Origin') === '*', 'missing CORS header');
    });

    it('returns ISO8601 timestamps in measurements', async function() {
        const machine = client.machine('icht1');
        const result = await machine.measurements({ from: 'now-1h', to: 'now', step: 60 });
        const voltage = result.items.find((i) => i.key === 'voltage');
        assert(voltage.values.length > 0, 'no values returned');
        assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/u.test(voltage.values[0].timestamp), 'timestamp not ISO8601');
    });

    it('returns ISO8601 timestamps in alerts', async function() {
        const shop = plant.shops.get().meltingShop;
        shop.alerts.trigger(`test ${Math.random()}`, new Date(), 'icht1');
        const machine = client.machine('icht1');
        const result = await machine.alerts({ page: 1, size: 10 });
        assert(result.items.length > 0, 'no alerts returned');
        assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/u.test(result.items[0].timestamp), 'timestamp not ISO8601');
    });

    it('returns ISO8601 timestamps in meltings', async function() {
        const shop = plant.shops.get().meltingShop;
        const machineObj = shop.machines.get().icht1;
        const active = shop.meltings.start(machineObj);
        active.stop();
        const machine = client.machine('icht1');
        const result = await machine.meltings({ limit: 10 });
        assert(result.items.length > 0, 'no meltings returned');
        assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/u.test(result.items[0].start), 'start not ISO8601');
        assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/u.test(result.items[0].end), 'end not ISO8601');
    });
});
