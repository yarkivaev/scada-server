import assert from 'assert';
import pagination from '../../src/objects/pagination.js';

describe('pagination', function() {
    it('returns first page items', function() {
        const items = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
        const result = pagination(1, 2, items).result();
        assert(result.items.length === 2 && result.items[0].id === 1);
    });

    it('returns second page items', function() {
        const items = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
        const result = pagination(2, 2, items).result();
        assert(result.items.length === 2 && result.items[0].id === 3);
    });

    it('returns partial last page', function() {
        const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
        const result = pagination(2, 2, items).result();
        assert(result.items.length === 1 && result.items[0].id === 3);
    });

    it('returns empty items for page beyond data', function() {
        const items = [{ id: 1 }, { id: 2 }];
        const result = pagination(10, 2, items).result();
        assert(result.items.length === 0);
    });

    it('returns correct page number', function() {
        const page = Math.floor(Math.random() * 10) + 1;
        const items = [];
        for (let i = 0; i < 100; i += 1) {
            items.push({ id: i });
        }
        const result = pagination(page, 5, items).result();
        assert(result.page === page);
    });

    it('returns correct size', function() {
        const size = Math.floor(Math.random() * 10) + 1;
        const items = [];
        for (let i = 0; i < 100; i += 1) {
            items.push({ id: i });
        }
        const result = pagination(1, size, items).result();
        assert(result.size === size);
    });

    it('returns total count', function() {
        const total = Math.floor(Math.random() * 100) + 10;
        const items = [];
        for (let i = 0; i < total; i += 1) {
            items.push({ id: i });
        }
        const result = pagination(1, 5, items).result();
        assert(result.total === total);
    });

    it('treats zero page as page one', function() {
        const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
        const result = pagination(0, 2, items).result();
        assert(result.items[0].id === 1 && result.page === 1);
    });

    it('treats negative page as page one', function() {
        const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
        const result = pagination(-5, 2, items).result();
        assert(result.items[0].id === 1 && result.page === 1);
    });

    it('treats zero size as size one', function() {
        const items = [{ id: 1 }, { id: 2 }];
        const result = pagination(1, 0, items).result();
        assert(result.size === 1 && result.items.length === 1);
    });
});
