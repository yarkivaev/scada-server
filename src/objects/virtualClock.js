/**
 * Virtual clock with mutable time offset for simulation.
 * Callable as a function (backward-compatible with clock()),
 * with jump(), reset(), and offset() methods.
 *
 * @param {function} source - real time provider returning Date
 * @returns {function} clock function with jump, reset, offset methods
 *
 * @example
 *   const clock = virtualClock(() => new Date());
 *   clock(); // returns current real time
 *   clock.jump(new Date('2025-01-01T00:00:00Z'));
 *   clock(); // returns time offset from 2025-01-01
 *   clock.reset();
 *   clock(); // returns current real time again
 */
export default function virtualClock(source) {
    let shift = 0;
    /**
     * Returns current virtual time as Date.
     *
     * @returns {Date} virtual time shifted from source
     */
    function clock() {
        return new Date(source().getTime() + shift);
    }
    /**
     * Jumps virtual time to target date.
     *
     * @param {Date} target - date to jump to
     */
    clock.jump = function jump(target) {
        shift = target.getTime() - source().getTime();
    };
    /**
     * Resets virtual time offset to zero.
     */
    clock.reset = function reset() {
        shift = 0;
    };
    /**
     * Returns current time offset in milliseconds.
     *
     * @returns {number} offset in milliseconds
     */
    clock.offset = function offset() {
        return shift;
    };
    return clock;
}
