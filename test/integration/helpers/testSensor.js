/**
 * Test sensor that generates random values around a base value.
 * Used for integration testing without external dependencies.
 *
 * @param {string} sensorName - display name for the sensor
 * @param {string} unit - measurement unit
 * @param {number} base - base value for random generation
 * @returns {object} sensor with name, measurements, stream methods
 */
export default function testSensor(sensorName, unit, base) {
    function generate() {
        const variation = (Math.random() - 0.5) * 20;
        return base + variation;
    }
    return {
        name() {
            return sensorName;
        },
        current() {
            return Promise.resolve({ value: generate(), unit });
        },
        measurements(range, step) {
            const results = [];
            const start = range.start.getTime();
            const end = range.end.getTime();
            for (let time = start; time <= end; time += step) {
                results.push({ timestamp: new Date(time), value: generate(), unit });
            }
            return results;
        },
        stream(since, step, callback) {
            const now = new Date();
            const historical = this.measurements({ start: since, end: now }, step);
            historical.forEach((item) => {
                callback(item);
            });
            const timer = setInterval(() => {
                callback({ timestamp: new Date(), value: generate(), unit });
            }, step);
            return {
                cancel() {
                    clearInterval(timer);
                }
            };
        }
    };
}
