/**
 * Creates a fake plant object for testing route factories.
 * Simulates the scada domain structure.
 *
 * @param {object} config - configuration for the fake plant
 * @returns {object} fake plant with shops, machines, sensors, alerts, meltings
 */
export default function fakePlant(config = {}) {
    const machineId = config.machineId || `machine${Math.random()}`;
    const alertItems = config.alerts || [];
    const meltingItems = config.meltings || [];
    const voltageData = config.voltage || [];
    const cosphiData = config.cosphi || [];
    const subscribers = [];
    const alertSubscribers = [];
    function fakeSensor(data, unit, sensorName) {
        return {
            name() {
                return sensorName;
            },
            measurements(range, step) {
                return data.length > 0 ? data : [{ timestamp: new Date(), value: Math.random(), unit }];
            },
            stream(since, step, callback) {
                const items = this.measurements({ start: since, end: new Date() }, step);
                items.forEach((item) => {
                    callback(item);
                });
                const timer = setInterval(() => {
                    callback({ timestamp: new Date(), value: Math.random(), unit });
                }, step);
                return {
                    cancel() {
                        clearInterval(timer);
                    }
                };
            }
        };
    }
    const machine = {
        name() {
            return machineId;
        },
        sensors: {
            voltage: fakeSensor(voltageData, 'V', 'Напряжение'),
            cosphi: fakeSensor(cosphiData, 'cos(φ)', 'Косинус φ')
        },
        alerts() {
            return alertItems;
        }
    };
    const meltings = {
        all() {
            return meltingItems;
        },
        find(m) {
            return meltingItems.filter((item) => {
                return item.machineId === m.name();
            });
        },
        stream(callback) {
            subscribers.push(callback);
            return {
                cancel() {
                    const index = subscribers.indexOf(callback);
                    subscribers.splice(index, 1);
                }
            };
        },
        notify(event) {
            subscribers.forEach((cb) => {
                cb(event);
            });
        }
    };
    const alerts = {
        all() {
            return alertItems;
        },
        stream(callback) {
            alertSubscribers.push(callback);
            return {
                cancel() {
                    const index = alertSubscribers.indexOf(callback);
                    alertSubscribers.splice(index, 1);
                }
            };
        },
        notify(event) {
            alertSubscribers.forEach((cb) => {
                cb(event);
            });
        }
    };
    const shop = {
        name() {
            return 'testShop';
        },
        machines: {
            init() {},
            get() {
                return { [machineId]: machine };
            }
        },
        meltings,
        alerts
    };
    return {
        shops: {
            init() {},
            get() {
                return { testShop: shop };
            }
        },
        init() {},
        machine,
        meltings,
        alerts,
        addAlert(alert) {
            alertItems.push(alert);
        },
        addMelting(melting) {
            meltingItems.push(melting);
        }
    };
}
