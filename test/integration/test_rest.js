import assert from 'assert';
import http from 'http';
import { meltingMachine } from '@yarkivaev/scada';
import testPlant from './helpers/testPlant.js';
import { scadaClient } from '../../client/index.js';
import { scadaServer } from '../../index.js';

describe('REST API Integration', function() {
    let server;
    let port;
    let client;
    let plant;

    beforeEach(function(done) {
        plant = testPlant(meltingMachine);
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

    it('fetches segments for known machine', async function() {
        const machine = client.machine('icht1');
        const result = await machine.segments({ from: 'now-1h', to: 'now' });
        assert(Array.isArray(result.items), 'segments items is not an array');
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
        assert(result.items.every((a) => {return a.acknowledged === true}), 'unacknowledged alert in response');
    });

    it('filters alerts by acknowledged false', async function() {
        const shop = plant.shops.get().meltingShop;
        shop.alerts.trigger(`unack ${Math.random()}`, new Date(), 'icht1');
        const toAck = shop.alerts.trigger(`toack ${Math.random()}`, new Date(), 'icht1');
        toAck.acknowledge();
        const machine = client.machine('icht1');
        const result = await machine.alerts({ acknowledged: false });
        assert(result.items.every((a) => {return a.acknowledged === false}), 'acknowledged alert in response');
    });

    it('fetches single melting by id', async function() {
        const shop = plant.shops.get().meltingShop;
        const machineObj = shop.machines.get().icht1;
        const active = shop.meltings.add(machineObj);
        machineObj.load(500);
        machineObj.dispense(480);
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
        const voltage = result.items.find((i) => {return i.key === 'voltage'});
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
        const active = shop.meltings.add(machineObj);
        active.stop();
        const machine = client.machine('icht1');
        const result = await machine.meltings({ limit: 10 });
        assert(result.items.length > 0, 'no meltings returned');
        assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/u.test(result.items[0].start), 'start not ISO8601');
        assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/u.test(result.items[0].end), 'end not ISO8601');
    });

    it('fetches machine weight', async function() {
        const machine = client.machine('icht1');
        const result = await machine.weight();
        assert(typeof result.amount === 'number', 'weight amount not returned');
    });

    it('sets machine weight', async function() {
        const machine = client.machine('icht1');
        const amount = Math.floor(Math.random() * 1000);
        const result = await machine.setWeight(amount);
        assert(result.amount === amount, 'weight not set correctly');
    });

    it('loads material into machine', async function() {
        const machine = client.machine('icht1');
        const amount = Math.floor(Math.random() * 100);
        const result = await machine.load(amount);
        assert(result.amount === amount, 'loaded amount not returned');
    });

    it('dispenses material from machine', async function() {
        const machine = client.machine('icht1');
        const shop = plant.shops.get().meltingShop;
        const machineObj = shop.machines.get().icht1;
        machineObj.load(500);
        const amount = Math.floor(Math.random() * 50);
        const result = await machine.dispense(amount);
        assert(result.amount === amount, 'dispensed amount not returned');
    });

    it('starts melting via client', async function() {
        const machine = client.machine('icht1');
        const result = await machine.startMelting();
        assert(result.id !== undefined, 'melting id not returned');
        assert(result.start !== undefined, 'start time not returned');
    });

    it('stops melting via client', async function() {
        const machine = client.machine('icht1');
        const started = await machine.startMelting();
        const result = await machine.stopMelting(started.id);
        assert(result.id === started.id, 'wrong melting id');
        assert(result.end !== undefined, 'end time not returned');
    });

    it('creates melting with data via POST', async function() {
        const response = await fetch(`http://localhost:${port}/api/machines/icht1/meltings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start: '2024-01-01T00:00:00Z', end: '2024-01-01T01:00:00Z' })
        });
        assert(response.status === 201, 'expected 201 status');
        const result = await response.json();
        assert(result.id !== undefined, 'melting id not returned');
    });

    it('updates melting via PUT', async function() {
        const shop = plant.shops.get().meltingShop;
        const machineObj = shop.machines.get().icht1;
        const active = shop.meltings.add(machineObj);
        const response = await fetch(`http://localhost:${port}/api/machines/icht1/meltings/${active.id()}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weight: 500 })
        });
        assert(response.status === 200, 'expected 200 status');
        const result = await response.json();
        assert(result.id === active.id(), 'wrong melting id');
    });

    it('fetches meltings with after cursor', async function() {
        const shop = plant.shops.get().meltingShop;
        const machineObj = shop.machines.get().icht1;
        const first = shop.meltings.add(machineObj, { start: '2024-01-01T00:00:00Z', end: '2024-01-01T01:00:00Z' });
        shop.meltings.add(machineObj, { start: '2024-01-02T00:00:00Z', end: '2024-01-02T01:00:00Z' });
        const machine = client.machine('icht1');
        const result = await machine.meltings({ after: '2024-01-01T12:00:00Z' });
        assert(result.items.every((m) => {return new Date(m.start) > new Date('2024-01-01T12:00:00Z')}), 'items before cursor included');
    });

    it('fetches meltings with before cursor', async function() {
        const shop = plant.shops.get().meltingShop;
        const machineObj = shop.machines.get().icht1;
        shop.meltings.add(machineObj, { start: '2024-01-01T00:00:00Z', end: '2024-01-01T01:00:00Z' });
        shop.meltings.add(machineObj, { start: '2024-01-03T00:00:00Z', end: '2024-01-03T01:00:00Z' });
        const machine = client.machine('icht1');
        const result = await machine.meltings({ before: '2024-01-02T00:00:00Z' });
        assert(result.items.every((m) => {return new Date(m.start) < new Date('2024-01-02T00:00:00Z')}), 'items after cursor included');
    });

    it('fetches only active meltings', async function() {
        const shop = plant.shops.get().meltingShop;
        const machineObj = shop.machines.get().icht1;
        shop.meltings.add(machineObj);
        const completed = shop.meltings.add(machineObj, { start: '2024-01-01T00:00:00Z', end: '2024-01-01T01:00:00Z' });
        const machine = client.machine('icht1');
        const result = await machine.meltings({ active: true });
        assert(result.items.every((m) => {return m.end === undefined}), 'completed melting in active results');
    });

    it('fetches measurements with beginning time', async function() {
        const machine = client.machine('icht1');
        const result = await machine.measurements({ from: 'beginning', to: 'now', step: 86400 });
        assert(result.items !== undefined, 'items not returned');
    });

    it('returns 404 for stop on unknown melting', async function() {
        const machine = client.machine('icht1');
        let thrown;
        try {
            await machine.stopMelting('unknown-id');
        } catch (err) {
            thrown = err;
        }
        assert(thrown.error !== undefined, 'error lacks error wrapper');
        assert(thrown.error.code === 'NOT_FOUND', 'expected NOT_FOUND error');
    });

    it('returns 404 for weight on unknown machine', async function() {
        const response = await fetch(`http://localhost:${port}/api/machines/unknown-${Math.random()}/weight`);
        assert(response.status === 404, 'expected 404 status');
    });

    it('returns 404 for set weight on unknown machine', async function() {
        const response = await fetch(`http://localhost:${port}/api/machines/unknown-${Math.random()}/weight`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 100 })
        });
        assert(response.status === 404, 'expected 404 status');
    });

    it('returns 404 for load on unknown machine', async function() {
        const response = await fetch(`http://localhost:${port}/api/machines/unknown-${Math.random()}/load`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 100 })
        });
        assert(response.status === 404, 'expected 404 status');
    });

    it('returns 404 for dispense on unknown machine', async function() {
        const response = await fetch(`http://localhost:${port}/api/machines/unknown-${Math.random()}/dispense`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 100 })
        });
        assert(response.status === 404, 'expected 404 status');
    });

    it('returns 404 for start melting on unknown machine', async function() {
        const response = await fetch(`http://localhost:${port}/api/machines/unknown-${Math.random()}/meltings/start`, {
            method: 'POST'
        });
        assert(response.status === 404, 'expected 404 status');
    });

    it('returns 404 for stop melting on unknown machine', async function() {
        const response = await fetch(`http://localhost:${port}/api/machines/unknown-${Math.random()}/meltings/m1/stop`, {
            method: 'POST'
        });
        assert(response.status === 404, 'expected 404 status');
    });

    it('returns 404 for create melting on unknown machine', async function() {
        const response = await fetch(`http://localhost:${port}/api/machines/unknown-${Math.random()}/meltings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start: '2024-01-01T00:00:00Z', end: '2024-01-01T01:00:00Z' })
        });
        assert(response.status === 404, 'expected 404 status');
    });

    it('returns 404 for update melting on unknown machine', async function() {
        const response = await fetch(`http://localhost:${port}/api/machines/unknown-${Math.random()}/meltings/m1`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weight: 500 })
        });
        assert(response.status === 404, 'expected 404 status');
    });

    it('returns 404 for update on unknown melting', async function() {
        const response = await fetch(`http://localhost:${port}/api/machines/icht1/meltings/unknown-${Math.random()}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weight: 500 })
        });
        assert(response.status === 404, 'expected 404 status');
    });

    it('returns empty alerts for unknown machine', async function() {
        const response = await fetch(`http://localhost:${port}/api/machines/unknown-${Math.random()}/alerts`);
        const body = await response.json();
        assert(body.items.length === 0, 'expected empty items');
        assert(body.total === 0, 'expected zero total');
    });

    it('returns empty meltings for unknown machine', async function() {
        const response = await fetch(`http://localhost:${port}/api/machines/unknown-${Math.random()}/meltings`);
        const body = await response.json();
        assert(body.items.length === 0, 'expected empty items');
        assert(body.hasMore === false, 'expected hasMore false');
    });

    it('returns 404 for single melting on unknown machine', async function() {
        const response = await fetch(`http://localhost:${port}/api/machines/unknown-${Math.random()}/meltings/m1`);
        assert(response.status === 404, 'expected 404 status');
    });

    it('fetches measurements with ISO8601 time range', async function() {
        const machine = client.machine('icht1');
        const result = await machine.measurements({
            from: '2024-01-01T00:00:00Z',
            to: '2024-01-01T01:00:00Z',
            step: 60
        });
        assert(result.items !== undefined, 'items not returned');
    });

    it('fetches measurements with invalid time expression', async function() {
        const response = await fetch(`http://localhost:${port}/api/machines/icht1/measurements?from=invalid&to=now`);
        const body = await response.json();
        assert(body.items !== undefined, 'items not returned');
    });
});
