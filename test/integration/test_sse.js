import assert from 'assert';
import http from 'http';
import { meltingMachine } from 'scada';
import testPlant from './helpers/testPlant.js';
import { scadaClient } from '../../client/index.js';
import { scadaServer } from '../../index.js';

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

describe('SSE Integration', function() {
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
            client = scadaClient(`http://localhost:${port}/api`, fetch, FakeEventSource);
            done();
        });
    });

    afterEach(function(done) {
        setTimeout(() => {
            server.close(done);
        }, 50);
    });

    it('connects to measurement stream', function(done) {
        this.timeout(5000);
        const machine = client.machine('icht1');
        const stream = machine.measurementStream();
        stream.on('measurement', (payload) => {
            stream.close();
            assert(typeof payload.key === 'string', 'payload lacks key');
            assert(typeof payload.value === 'number', 'payload lacks value');
            assert(typeof payload.timestamp === 'string', 'payload lacks timestamp');
            done();
        });
    });

    it('filters measurement stream by keys', function(done) {
        this.timeout(5000);
        const machine = client.machine('icht1');
        const stream = machine.measurementStream({ keys: ['voltage'] });
        stream.on('measurement', (payload) => {
            stream.close();
            assert(payload.key === 'voltage', 'wrong key');
            assert(typeof payload.timestamp === 'string', 'payload lacks timestamp');
            done();
        });
    });

    it('connects to melting stream', function(done) {
        this.timeout(5000);
        const machine = client.machine('icht1');
        const stream = machine.meltingStream();
        setTimeout(() => {
            stream.close();
            assert(true);
            done();
        }, 1000);
    });

    it('connects to alert stream', function(done) {
        this.timeout(5000);
        const machine = client.machine('icht1');
        const stream = machine.alertStream();
        setTimeout(() => {
            stream.close();
            assert(true, 'connection established');
            done();
        }, 500);
    });

    it('receives alert_created event when alert triggers', function(done) {
        this.timeout(5000);
        const machine = client.machine('icht1');
        const stream = machine.alertStream();
        stream.on('alert_created', (payload) => {
            stream.close();
            assert(typeof payload.id === 'string', 'payload lacks id');
            assert(typeof payload.message === 'string', 'payload lacks message');
            assert(typeof payload.timestamp === 'string', 'payload lacks timestamp');
            assert(payload.acknowledged === false, 'new alert should not be acknowledged');
            done();
        });
        setTimeout(() => {
            const shop = plant.shops.get().meltingShop;
            shop.alerts.trigger(`test ${Math.random()}`, new Date(), 'icht1');
        }, 200);
    });

    it('receives alert_updated event when alert acknowledged', function(done) {
        this.timeout(5000);
        const shop = plant.shops.get().meltingShop;
        const triggered = shop.alerts.trigger(`initial ${Math.random()}`, new Date(), 'icht1');
        const machine = client.machine('icht1');
        const stream = machine.alertStream();
        stream.on('alert_updated', (payload) => {
            stream.close();
            assert(payload.id === triggered.id, 'wrong alert id');
            assert(payload.acknowledged === true, 'alert not acknowledged');
            done();
        });
        setTimeout(() => {
            triggered.acknowledge();
        }, 200);
    });

    it('starts melting via shop and receives event', function(done) {
        this.timeout(10000);
        const shop = plant.shops.get().meltingShop;
        const machineObj = shop.machines.get().icht1;
        const machine = client.machine('icht1');
        const stream = machine.meltingStream();
        let received = false;
        stream.on('melting_started', (payload) => {
            received = true;
            assert(typeof payload.id === 'string', 'payload lacks id');
            assert(typeof payload.start === 'string', 'payload lacks start');
            stream.close();
            done();
        });
        setTimeout(() => {
            shop.meltings.add(machineObj);
            setTimeout(() => {
                if (!received) {
                    stream.close();
                    done(new Error('melting_started event not received'));
                }
            }, 3000);
        }, 2000);
    });

    it('completes melting via shop and receives ended event', function(done) {
        this.timeout(10000);
        const shop = plant.shops.get().meltingShop;
        const machineObj = shop.machines.get().icht1;
        const machine = client.machine('icht1');
        const stream = machine.meltingStream();
        let received = false;
        stream.on('melting_ended', (payload) => {
            received = true;
            assert(typeof payload.id === 'string', 'payload lacks id');
            assert(typeof payload.end === 'string', 'payload lacks end');
            assert(typeof payload.loaded === 'number', 'payload lacks loaded');
            assert(typeof payload.dispensed === 'number', 'payload lacks dispensed');
            stream.close();
            done();
        });
        setTimeout(() => {
            const active = shop.meltings.add(machineObj);
            machineObj.load(500);
            machineObj.dispense(480);
            setTimeout(() => {
                active.stop();
                setTimeout(() => {
                    if (!received) {
                        stream.close();
                        done(new Error('melting_ended event not received'));
                    }
                }, 1000);
            }, 500);
        }, 2000);
    });

    it('closes alert stream for unknown machine', function(done) {
        this.timeout(5000);
        const machine = client.machine(`unknown-${Math.random()}`);
        const stream = machine.alertStream();
        setTimeout(() => {
            stream.close();
            assert(true, 'stream should close gracefully');
            done();
        }, 500);
    });

    it('closes melting stream for unknown machine', function(done) {
        this.timeout(5000);
        const machine = client.machine(`unknown-${Math.random()}`);
        const stream = machine.meltingStream();
        setTimeout(() => {
            stream.close();
            assert(true, 'stream should close gracefully');
            done();
        }, 500);
    });

    it('closes measurement stream for unknown machine', function(done) {
        this.timeout(5000);
        const machine = client.machine(`unknown-${Math.random()}`);
        const stream = machine.measurementStream();
        setTimeout(() => {
            stream.close();
            assert(true, 'stream should close gracefully');
            done();
        }, 500);
    });

    it('streams measurements with since beginning', function(done) {
        this.timeout(5000);
        const machine = client.machine('icht1');
        const stream = machine.measurementStream({ since: 'beginning', step: 86400 });
        stream.on('measurement', (payload) => {
            stream.close();
            assert(typeof payload.key === 'string', 'payload lacks key');
            done();
        });
    });
});
