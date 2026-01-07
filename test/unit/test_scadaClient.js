import assert from 'assert';
import scadaClient from '../../client/scadaClient.js';

describe('scadaClient', function() {
    it('returns object with machines method', function() {
        const client = scadaClient('http://localhost', () => {}, function() {});
        assert(typeof client.machines === 'function');
    });

    it('returns object with machine method', function() {
        const client = scadaClient('http://localhost', () => {}, function() {});
        assert(typeof client.machine === 'function');
    });

    it('fetches machines from correct URL', async function() {
        let fetchedUrl;
        const fakeFetch = async (url) => {
            fetchedUrl = url;
            return {
                ok: true,
                json: async () => {return { items: [] }}
            };
        };
        const client = scadaClient('http://localhost/api', fakeFetch, function() {});
        await client.machines();
        assert(fetchedUrl === 'http://localhost/api/machines');
    });

    it('returns machines response', async function() {
        const items = [{ id: `m${Math.random()}` }];
        const fakeFetch = async () => {return {
            ok: true,
            json: async () => {return { items }}
        }};
        const client = scadaClient('http://localhost/api', fakeFetch, function() {});
        const result = await client.machines();
        assert(result.items[0].id === items[0].id);
    });

    it('throws error on failed machines request', async function() {
        const fakeFetch = async () => {return {
            ok: false,
            json: async () => {return { error: { code: 'ERROR', message: 'Failed' } }}
        }};
        const client = scadaClient('http://localhost/api', fakeFetch, function() {});
        let thrown;
        try {
            await client.machines();
        } catch (err) {
            thrown = err;
        }
        assert(thrown.code === 'ERROR');
    });

    it('returns machine client for machine id', function() {
        const client = scadaClient('http://localhost/api', () => {}, function() {});
        const machine = client.machine('icht1');
        assert(typeof machine.info === 'function');
    });
});
