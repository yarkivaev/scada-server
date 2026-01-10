/**
 * Cursor-based pagination for meltings.
 * Items must have a 'start' property with ISO8601 timestamp.
 *
 * @param {string} after - ISO8601 cursor (fetch after this time)
 * @param {string} before - ISO8601 cursor (fetch before this time)
 * @param {number} limit - max items to return
 * @param {array} items - full item collection sorted by start desc
 * @param {boolean} active - filter to show only active items (no end property)
 * @returns {object} cursored with result() method
 *
 * @example
 *   const cs = cursor(undefined, undefined, 10, items);
 *   cs.result(); // { items: [...], nextCursor: '...', hasMore: true }
 */
export default function cursor(after, before, limit, items, active) {
    const lim = Math.max(1, limit);
    return {
        result() {
            let filtered = items;
            if (after) {
                const afterTime = new Date(after).getTime();
                filtered = filtered.filter((item) => {
                    return new Date(item.start).getTime() > afterTime;
                });
            }
            if (before) {
                const beforeTime = new Date(before).getTime();
                filtered = filtered.filter((item) => {
                    return new Date(item.start).getTime() < beforeTime;
                });
            }
            if (active) {
                filtered = filtered.filter((item) => {
                    return !item.end;
                });
            }
            const sliced = filtered.slice(0, lim);
            const hasMore = filtered.length > lim;
            const nextCursor = sliced.length > 0
                ? sliced[sliced.length - 1].start
                : undefined;
            return {
                items: sliced,
                nextCursor,
                hasMore
            };
        }
    };
}
