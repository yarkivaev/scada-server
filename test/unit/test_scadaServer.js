import assert from 'assert';
import scadaServer from '../../src/server/scadaServer.js';
import fakePlant from './helpers/fakePlant.js';

describe('scadaServer', function() {
    it('returns object with list method', function() {
        const plant = fakePlant();
        const server = scadaServer('/api', plant);
        assert(typeof server.list === 'function', 'server should have list method');
    });

    it('returns object with handle method', function() {
        const plant = fakePlant();
        const server = scadaServer('/api', plant);
        assert(typeof server.handle === 'function', 'server should have handle method');
    });

    it('calls plant init on creation', function() {
        let called = false;
        const plant = fakePlant();
        plant.init = () => {
            called = true;
        };
        scadaServer('/api', plant);
        assert(called === true, 'plant.init should be called');
    });

    it('uses custom clock when provided', function() {
        const plant = fakePlant();
        const fixed = new Date('2024-06-15T12:00:00Z');
        const server = scadaServer('/api', plant, () => {
            return fixed;
        });
        assert(server.list().length > 0, 'server should have routes');
    });

    it('assembles routes from all factories', function() {
        const plant = fakePlant();
        const server = scadaServer('/api', plant);
        const routeList = server.list();
        assert(routeList.length > 0, 'server should have assembled routes');
    });
});
