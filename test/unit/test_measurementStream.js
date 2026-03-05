import assert from 'assert';
import measurementStream from '../../src/server/measurementStream.js';
import fakePlant from './helpers/fakePlant.js';
import { EventEmitter } from 'events';

describe('measurementStream', function() {
    it('returns array of routes', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = measurementStream('/api', plant, () => {return new Date()});
        assert(Array.isArray(routes) && routes.length === 1);
    });

    it('matches GET /machines/:machineId/measurements/stream', function() {
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = measurementStream('/api', plant, () => {return new Date()});
        const request = { method: 'GET', url: '/api/machines/icht1/measurements/stream' };
        assert(routes[0].matches(request) === true);
    });

    it('sends SSE headers', function() {
        let headers;
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = measurementStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/measurements/stream?step=1';
        const response = {
            writeHead(code, hdrs) {
                headers = hdrs;
            },
            write() {},
            end() {}
        };
        routes[0].handle(request, response);
        request.emit('close');
        assert(headers['Content-Type'] === 'text/event-stream');
    });

    it('streams measurements from sensors', function() {
        const written = [];
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = measurementStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/measurements/stream?step=1';
        const response = {
            writeHead() {},
            write(content) {
                written.push(content);
            },
            end() {}
        };
        routes[0].handle(request, response);
        request.emit('close');
        assert(written.some((w) => {return w.includes('event: measurement')}));
    });

    it('filters by keys from query', function() {
        const written = [];
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = measurementStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/measurements/stream?keys=voltage&step=1';
        const response = {
            writeHead() {},
            write(content) {
                written.push(content);
            },
            end() {}
        };
        routes[0].handle(request, response);
        request.emit('close');
        const hasVoltage = written.some((w) => {return w.includes('"key":"voltage"')});
        const hasCosphi = written.some((w) => {return w.includes('"key":"cosphi"')});
        assert(hasVoltage && !hasCosphi);
    });

    it('closes stream for unknown machine', function() {
        let ended = false;
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = measurementStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/unknown/measurements/stream?step=1';
        const response = {
            writeHead() {},
            write() {},
            end() {
                ended = true;
            }
        };
        routes[0].handle(request, response);
        assert(ended === true);
    });

    it('cancels subscriptions on close', async function() {
        let cancelled = false;
        const plant = fakePlant({ machineId: 'icht1' });
        const origStream = plant.machine.sensors.voltage.stream;
        plant.machine.sensors.voltage.stream = function(since, step, callback) {
            const sub = origStream.call(this, since, step, callback);
            return {
                cancel() {
                    cancelled = true;
                    sub.cancel();
                }
            };
        };
        const routes = measurementStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/measurements/stream?keys=voltage&step=1';
        const response = {
            writeHead() {},
            write() {},
            end() {}
        };
        await routes[0].handle(request, response);
        request.emit('close');
        assert(cancelled === true);
    });

    it('emits retained value when sensor data is fresh', async function() {
        const written = [];
        const now = new Date();
        const plant = fakePlant({ machineId: 'icht1', voltage: [{ timestamp: now, value: 380, unit: 'V' }] });
        plant.machine.sensors.voltage.current = function() {
            return Promise.resolve({ found: true, timestamp: now, value: 380, unit: 'V' });
        };
        const routes = measurementStream('/api', plant, () => {return now});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/measurements/stream?keys=voltage&step=1';
        const response = {
            writeHead() {},
            write(content) {
                written.push(content);
            },
            end() {}
        };
        await routes[0].handle(request, response);
        request.emit('close');
        assert(written.some((w) => {return w.includes('"value":380')}), 'retained value not emitted');
    });

    it('skips retained value when sensor data is stale', async function() {
        const written = [];
        const now = new Date();
        const stale = new Date(now.getTime() - 20000);
        const plant = fakePlant({ machineId: 'icht1' });
        plant.machine.sensors.voltage.current = function() {
            return Promise.resolve({ found: true, timestamp: stale, value: 380, unit: 'V' });
        };
        plant.machine.sensors.voltage.stream = function() {
            return { cancel() {} };
        };
        const routes = measurementStream('/api', plant, () => {return now});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/measurements/stream?keys=voltage&step=1';
        const response = {
            writeHead() {},
            write(content) {
                written.push(content);
            },
            end() {}
        };
        await routes[0].handle(request, response);
        request.emit('close');
        const measurements = written.filter((w) => {return w.includes('event: measurement')});
        assert(measurements.length === 0, 'stale retained value should not be emitted');
    });

    it('skips retained value when sensor has no data', async function() {
        const written = [];
        const now = new Date();
        const plant = fakePlant({ machineId: 'icht1' });
        plant.machine.sensors.voltage.current = function() {
            return Promise.resolve({ found: false });
        };
        plant.machine.sensors.voltage.stream = function() {
            return { cancel() {} };
        };
        const routes = measurementStream('/api', plant, () => {return now});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/measurements/stream?keys=voltage&step=1';
        const response = {
            writeHead() {},
            write(content) {
                written.push(content);
            },
            end() {}
        };
        await routes[0].handle(request, response);
        request.emit('close');
        const measurements = written.filter((w) => {return w.includes('event: measurement')});
        assert(measurements.length === 0, 'should not emit measurement when sensor has no data');
    });

    it('resolves beginning time expression', function() {
        const written = [];
        const plant = fakePlant({ machineId: 'icht1' });
        const routes = measurementStream('/api', plant, () => {return new Date()});
        const request = new EventEmitter();
        request.method = 'GET';
        request.url = '/api/machines/icht1/measurements/stream?since=beginning&step=1';
        const response = {
            writeHead() {},
            write(content) {
                written.push(content);
            },
            end() {}
        };
        routes[0].handle(request, response);
        request.emit('close');
        assert(written.some((w) => {return w.includes('event: measurement')}), 'should stream with beginning expression');
    });
});
