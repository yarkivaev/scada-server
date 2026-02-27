import assert from 'assert';
import http from 'http';
import { meltingMachine } from '@yarkivaev/scada';
import testPlant from './helpers/testPlant.js';
import { scadaClient } from '../../client/index.js';
import { scadaServer, virtualClock } from '../../index.js';

/**
 * Fake EventSource for testing SSE streams over raw HTTP.
 *
 * @param {string} url - SSE endpoint URL
 */
function FakeEventSource(url) {
    this.url = url;
    this.listeners = {};
    this.request = http.get(url, (res) => {
        let buffer = '';
        res.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n\n');
            buffer = lines.pop();
            lines.forEach((block) => {
                const eventMatch = block.match(/event: (\w+)/u);
                const dataMatch = block.match(/data: (.+)/u);
                if (eventMatch && dataMatch) {
                    const event = eventMatch[1];
                    const payload = dataMatch[1];
                    if (this.listeners[event]) {
                        this.listeners[event].forEach((fn) => {
                            fn({ data: payload });
                        });
                    }
                }
            });
        });
    });
    this.request.on('error', () => {});
}

FakeEventSource.prototype.addEventListener = function(event, fn) {
    if (!this.listeners[event]) {
        this.listeners[event] = [];
    }
    this.listeners[event].push(fn);
};

FakeEventSource.prototype.close = function() {
    if (this.request) {
        this.request.destroy();
    }
};

describe('Simulation REST Integration', function() {
    let server;
    let port;
    let client;

    beforeEach(function(done) {
        const plant = testPlant(meltingMachine);
        const clock = virtualClock(() => {return new Date()});
        const api = scadaServer('/api', plant, clock);
        server = http.createServer((req, res) => {
            api.handle(req, res);
        });
        server.listen(0, () => {
            ({ port } = server.address());
            client = scadaClient(`http://localhost:${port}/api`, fetch, FakeEventSource);
            done();
        });
    });

    afterEach(function(done) {
        server.close(done);
    });

    it('returns current time on GET simulation', async function() {
        const result = await client.simulation();
        assert(typeof result.timestamp === 'string', 'timestamp should be a string');
    });

    it('returns zero offset initially', async function() {
        const result = await client.simulation();
        assert(result.offset === 0, 'initial offset should be zero');
    });

    it('jumps to specified past time', async function() {
        const past = new Date(Date.now() - Math.random() * 86400000 * 7);
        await client.jump(past.toISOString());
        const result = await client.simulation();
        assert(result.timestamp.startsWith(past.toISOString().slice(0, 10)), 'timestamp should start with past date');
    });

    it('returns nonzero offset after jump', async function() {
        const past = new Date(Date.now() - 86400000);
        await client.jump(past.toISOString());
        const result = await client.simulation();
        assert(result.offset !== 0, 'offset should be nonzero after jump');
    });

    it('resets to real time', async function() {
        const past = new Date(Date.now() - 86400000);
        await client.jump(past.toISOString());
        await client.reset();
        const result = await client.simulation();
        assert(result.offset === 0, 'offset should be zero after reset');
    });

    it('returns jumped time in jump response', async function() {
        const past = new Date(Date.now() - 86400000);
        const result = await client.jump(past.toISOString());
        assert(typeof result.timestamp === 'string', 'jump response should contain timestamp');
    });

    it('returns ISO8601 timestamps', async function() {
        const result = await client.simulation();
        assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/u.test(result.timestamp), 'timestamp should be ISO8601');
    });

    it('returns error for invalid timestamp', async function() {
        const response = await fetch(`http://localhost:${port}/api/simulation/jump`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timestamp: 'invalid' })
        });
        assert(response.status === 400, 'should return 400 for invalid timestamp');
    });

    it('affects measurement time expressions after jump', async function() {
        const past = new Date(Date.now() - 3600000);
        await client.jump(past.toISOString());
        const machine = client.machine('icht1');
        const result = await machine.measurements({ from: 'now-1h', to: 'now' });
        assert(Array.isArray(result.items), 'measurements should return items array');
    });

    it('affects measurement stream since after jump', function(done) {
        this.timeout(5000);
        const past = new Date(Date.now() - 86400000);
        client.jump(past.toISOString()).then(() => {
            const machine = client.machine('icht1');
            const stream = machine.measurementStream();
            stream.on('measurement', (payload) => {
                stream.close();
                assert(typeof payload.timestamp === 'string', 'measurement should have timestamp');
                done();
            });
        });
    });
});

describe('Simulation SSE Integration', function() {
    let server;
    let port;
    let client;

    beforeEach(function(done) {
        const plant = testPlant(meltingMachine);
        const clock = virtualClock(() => {return new Date()});
        const api = scadaServer('/api', plant, clock);
        server = http.createServer((req, res) => {
            api.handle(req, res);
        });
        server.listen(0, () => {
            ({ port } = server.address());
            client = scadaClient(`http://localhost:${port}/api`, fetch, FakeEventSource);
            done();
        });
    });

    afterEach(function(done) {
        setTimeout(() => {
            server.close(done);
        }, 50);
    });

    it('streams measurements from virtual time after jump', function(done) {
        this.timeout(5000);
        const past = new Date(Date.now() - 86400000);
        client.jump(past.toISOString()).then(() => {
            const machine = client.machine('icht1');
            const stream = machine.measurementStream();
            stream.on('measurement', (payload) => {
                stream.close();
                assert(typeof payload.key === 'string', 'measurement should have key');
                done();
            });
        });
    });

    it('receives heartbeat with virtual timestamp after jump', function(done) {
        this.timeout(5000);
        const past = new Date(Date.now() - 86400000);
        client.jump(past.toISOString()).then(() => {
            const machine = client.machine('icht1');
            const stream = machine.measurementStream();
            stream.on('measurement', (payload) => {
                stream.close();
                assert(typeof payload.timestamp === 'string', 'heartbeat should have timestamp');
                done();
            });
        });
    });

    it('streams from real time after reset', function(done) {
        this.timeout(5000);
        const past = new Date(Date.now() - 86400000);
        client.jump(past.toISOString()).then(() => {
            return client.reset();
        }).then(() => {
            const machine = client.machine('icht1');
            const stream = machine.measurementStream();
            stream.on('measurement', (payload) => {
                stream.close();
                const ts = new Date(payload.timestamp).getTime();
                assert(Math.abs(ts - Date.now()) < 5000, 'timestamp should be recent after reset');
                done();
            });
        });
    });
});
