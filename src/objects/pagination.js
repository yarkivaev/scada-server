/**
 * Page-based pagination for alerts.
 * Returns immutable object with result() method.
 *
 * @param {number} page - 1-based page number
 * @param {number} size - items per page
 * @param {array} items - full item collection
 * @returns {object} paginated with result() method
 *
 * @example
 *   const pg = pagination(1, 10, items);
 *   pg.result(); // { items: [...], page: 1, size: 10, total: 100 }
 */
export default function pagination(page, size, items) {
    const pg = Math.max(1, page);
    const sz = Math.max(1, size);
    const start = (pg - 1) * sz;
    const end = start + sz;
    return {
        result() {
            return {
                items: items.slice(start, end),
                page: pg,
                size: sz,
                total: items.length
            };
        }
    };
}
