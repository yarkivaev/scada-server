/**
 * Parser for time expressions per API contract.
 * Supports: now, beginning, ISO8601, with +/- duration operators.
 *
 * @param {string} expression - time expression string
 * @param {function} clock - provides current time
 * @param {function} beginning - provides first data timestamp
 * @returns {object} parsed time with resolve() method
 *
 * @example
 *   const te = timeExpression('now-1h', clock, beginning);
 *   te.resolve(); // Date object 1 hour ago
 */
export default function timeExpression(expression, clock, beginning) {
    const durations = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
        w: 7 * 24 * 60 * 60 * 1000,
        M: 30 * 24 * 60 * 60 * 1000
    };
    return {
        resolve() {
            const match = expression.match(/^(now|beginning|[\dT:.Z-]+)([+-]\d+[smhdwM])?$/u);
            if (!match) {
                return clock();
            }
            const [, base, delta] = match;
            let time;
            if (base === 'now') {
                time = clock().getTime();
            } else if (base === 'beginning') {
                time = beginning().getTime();
            } else {
                time = new Date(base).getTime();
            }
            if (delta) {
                const sign = delta[0] === '+' ? 1 : -1;
                const amount = parseInt(delta.slice(1, -1), 10);
                const unit = delta.slice(-1);
                time += sign * amount * durations[unit];
            }
            return new Date(time);
        }
    };
}
