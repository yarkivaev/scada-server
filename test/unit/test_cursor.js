import assert from 'assert';
import cursor from '../../src/objects/cursor.js';

describe('cursor', function() {
    it('returns first N items when no cursors', function() {
        const items = [
            { start: '2024-01-05T00:00:00Z' },
            { start: '2024-01-04T00:00:00Z' },
            { start: '2024-01-03T00:00:00Z' }
        ];
        const result = cursor(null, null, 2, items).result();
        assert(result.items.length === 2);
    });

    it('returns items after cursor time', function() {
        const items = [
            { start: '2024-01-05T00:00:00Z' },
            { start: '2024-01-04T00:00:00Z' },
            { start: '2024-01-03T00:00:00Z' }
        ];
        const result = cursor('2024-01-03T12:00:00Z', null, 10, items).result();
        assert(result.items.length === 2);
    });

    it('returns items before cursor time', function() {
        const items = [
            { start: '2024-01-05T00:00:00Z' },
            { start: '2024-01-04T00:00:00Z' },
            { start: '2024-01-03T00:00:00Z' }
        ];
        const result = cursor(null, '2024-01-04T00:00:00Z', 10, items).result();
        assert(result.items.length === 1 && result.items[0].start === '2024-01-03T00:00:00Z');
    });

    it('returns items between cursors', function() {
        const items = [
            { start: '2024-01-05T00:00:00Z' },
            { start: '2024-01-04T00:00:00Z' },
            { start: '2024-01-03T00:00:00Z' },
            { start: '2024-01-02T00:00:00Z' }
        ];
        const result = cursor('2024-01-02T12:00:00Z', '2024-01-04T12:00:00Z', 10, items).result();
        assert(result.items.length === 2);
    });

    it('returns hasMore true when more items exist', function() {
        const items = [
            { start: '2024-01-05T00:00:00Z' },
            { start: '2024-01-04T00:00:00Z' },
            { start: '2024-01-03T00:00:00Z' }
        ];
        const result = cursor(null, null, 2, items).result();
        assert(result.hasMore === true);
    });

    it('returns hasMore false when no more items', function() {
        const items = [
            { start: '2024-01-05T00:00:00Z' },
            { start: '2024-01-04T00:00:00Z' }
        ];
        const result = cursor(null, null, 10, items).result();
        assert(result.hasMore === false);
    });

    it('returns nextCursor as last item start', function() {
        const items = [
            { start: '2024-01-05T00:00:00Z' },
            { start: '2024-01-04T00:00:00Z' },
            { start: '2024-01-03T00:00:00Z' }
        ];
        const result = cursor(null, null, 2, items).result();
        assert(result.nextCursor === '2024-01-04T00:00:00Z');
    });

    it('returns null nextCursor for empty result', function() {
        const items = [];
        const result = cursor(null, null, 10, items).result();
        assert(result.nextCursor === null);
    });

    it('treats zero limit as one', function() {
        const items = [
            { start: '2024-01-05T00:00:00Z' },
            { start: '2024-01-04T00:00:00Z' }
        ];
        const result = cursor(null, null, 0, items).result();
        assert(result.items.length === 1);
    });

    it('treats negative limit as one', function() {
        const items = [
            { start: '2024-01-05T00:00:00Z' },
            { start: '2024-01-04T00:00:00Z' }
        ];
        const result = cursor(null, null, -5, items).result();
        assert(result.items.length === 1);
    });
});
